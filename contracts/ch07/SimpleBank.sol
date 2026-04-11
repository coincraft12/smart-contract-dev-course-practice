// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title SimpleBank
 * @dev Ch07 실습 — ETH 예치·인출 은행 컨트랙트
 *
 * 학습 포인트:
 * - payable 함수 (ETH 수신)
 * - address.call{value: ...} 패턴
 * - CEI 패턴 (Checks-Effects-Interactions)
 * - Ownable + Pausable 패턴 직접 구현
 * - 커스텀 에러
 * - receive() fallback
 */
contract SimpleBank {

    // ── 에러 ─────────────────────────────────────────
    error NotOwner(address caller);
    error ContractPaused();
    error ZeroAmount();
    error InsufficientBalance(uint256 available, uint256 required);
    error TransferFailed();

    // ── 상태 변수 ────────────────────────────────────
    address public owner;
    bool public paused;

    mapping(address => uint256) private _balances;
    uint256 public totalDeposited;

    // ── 이벤트 ───────────────────────────────────────
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event InterestDistributed(address indexed user, uint256 amount);
    event Paused(address indexed by);
    event Unpaused(address indexed by);
    event OwnershipTransferred(address indexed from, address indexed to);

    // ── Modifier ─────────────────────────────────────
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner(msg.sender);
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    // ── 생성자 ───────────────────────────────────────
    constructor() {
        owner = msg.sender;
    }

    // ── 예치 ────────────────────────────────────────

    /**
     * @dev ETH를 예치한다
     * payable: 이 함수와 함께 ETH를 보낼 수 있음
     * msg.value: 이 호출과 함께 전송된 ETH (wei)
     */
    function deposit() public payable whenNotPaused {
        // Checks
        if (msg.value == 0) revert ZeroAmount();

        // Effects
        _balances[msg.sender] += msg.value;
        totalDeposited += msg.value;

        // (Interactions 없음 — ETH는 이미 받음)
        emit Deposited(msg.sender, msg.value);
    }

    // ── 인출 ────────────────────────────────────────

    /**
     * @dev ETH를 인출한다
     * CEI 패턴: 상태 업데이트(Effects) 먼저, ETH 전송(Interactions) 나중
     * → 재진입 공격 방지
     */
    function withdraw(uint256 amount) public whenNotPaused {
        // Checks
        if (amount == 0) revert ZeroAmount();
        uint256 available = _balances[msg.sender];
        if (available < amount) revert InsufficientBalance(available, amount);

        // Effects — 반드시 전송 전에 상태 업데이트
        _balances[msg.sender] -= amount;
        totalDeposited -= amount;

        // Interactions
        (bool ok, ) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit Withdrawn(msg.sender, amount);
    }

    // ── 조회 ────────────────────────────────────────

    function balanceOf(address user) public view returns (uint256) {
        return _balances[user];
    }

    function contractBalance() public view returns (uint256) {
        return address(this).balance;
    }

    // ── Owner 전용 ───────────────────────────────────

    /**
     * @dev 이자 배분 (basis points 단위, 100 = 1%)
     */
    function distributeInterest(address[] calldata users, uint256 interestRate)
        external
        onlyOwner
        whenNotPaused
    {
        require(interestRate > 0 && interestRate <= 10000, "Invalid rate");

        for (uint256 i = 0; i < users.length; ) {
            address user = users[i];
            uint256 bal = _balances[user];
            if (bal > 0) {
                uint256 interest = bal * interestRate / 10000;
                _balances[user] += interest;
                totalDeposited += interest;
                emit InterestDistributed(user, interest);
            }
            unchecked { i++; }
        }
    }

    function pause() external onlyOwner {
        require(!paused, "Already paused");
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyOwner {
        require(paused, "Not paused");
        paused = false;
        emit Unpaused(msg.sender);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ── receive ─────────────────────────────────────
    // 직접 ETH 전송 시 deposit()으로 라우팅
    receive() external payable {
        deposit();
    }
}
