// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title AuditTarget
 * @dev Ch13 실습 — 감사(audit) 대상 컨트랙트 (의도적 취약점 포함)
 *
 * 학습자는 이 컨트랙트를 감사하고 아래 발견 항목들을 찾아 리포트를 작성한다.
 * 정답은 REPORT.md 참조.
 *
 * 학습 시나리오:
 *  - 판매 컨트랙트: 사용자가 ETH를 보내 tokenPrice 만큼 tokens[user] 증가
 *  - owner는 인출(withdraw) 가능
 *  - 목표 도달 시 sale 종료
 */
contract AuditTarget {

    address public owner;
    uint256 public tokenPrice;      // wei per token
    uint256 public goal;             // wei
    uint256 public raised;
    bool    public saleClosed;

    mapping(address => uint256) public tokens;

    event Bought(address indexed buyer, uint256 tokens_, uint256 paidWei);
    event Withdrawn(address indexed to, uint256 amount);
    event PriceUpdated(uint256 oldPrice, uint256 newPrice);
    event SaleClosed();

    constructor(uint256 _price, uint256 _goal) {
        owner = msg.sender;
        tokenPrice = _price;
        goal = _goal;
    }

    // 이슈 후보 (감사 시 확인):
    //  - saleClosed 확인이 buy 안에는 있지만 receive()에서는 부재
    //  - integer division: paidWei / tokenPrice가 나머지 없이 소진되지 않을 수 있음
    //  - raised >= goal 도달 시 saleClosed 자동 처리 없음
    //  - modifier onlyOwner 대신 require를 반복 사용
    //  - price=0으로 재설정 가능 (division by zero 위험)
    function buy() public payable {
        require(!saleClosed, "sale closed");
        require(msg.value > 0, "no eth");

        uint256 amount = msg.value / tokenPrice; // ← 나머지가 계정에 귀속되지 않음
        tokens[msg.sender] += amount;
        raised += msg.value;

        emit Bought(msg.sender, amount, msg.value);
    }

    receive() external payable {
        // ← saleClosed 체크 누락 — 판매 종료 후에도 ETH 수신
        buy();
    }

    function updatePrice(uint256 newPrice) external {
        require(msg.sender == owner, "not owner");
        // ← 0 검증 누락
        emit PriceUpdated(tokenPrice, newPrice);
        tokenPrice = newPrice;
    }

    function closeSale() external {
        require(msg.sender == owner, "not owner");
        saleClosed = true;
        emit SaleClosed();
    }

    function withdraw(uint256 amount) external {
        require(msg.sender == owner, "not owner");
        // ← reentrancy 위험 없음 (external EOA 전송이지만 CEI 여전히 미준수)
        (bool ok, ) = owner.call{value: amount}("");
        require(ok, "transfer failed");
        emit Withdrawn(owner, amount);
    }
}
