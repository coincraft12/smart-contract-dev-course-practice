// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title StrategyPattern
 * @dev Ch05-3 실습 (4/4) — 다형성 · 전략 패턴
 *
 * 학습 포인트:
 * - interface로 다형성 확보
 * - 실행자(Executor)는 인터페이스만 알고 실제 구현체는 알 필요 없음
 * - 런타임에 전략 교체 가능
 * - 상속 vs 인터페이스 vs 라이브러리 — 실전 활용 위치
 *
 * 시나리오:
 *   시장 상황에 따라 이자율 계산 전략을 바꾼다.
 *   - StrategyFixed: 고정 이자 (단순)
 *   - StrategyTiered: 잔액 구간별 차등 이자
 *   Executor는 전략 인터페이스만 알고 이자를 계산.
 */

// ── 전략 인터페이스 ─────────────────────────────
interface IInterestStrategy {
    /// @return interest amount에 대해 지급할 이자 (wei)
    function computeInterest(uint256 amount) external pure returns (uint256 interest);

    /// 전략 식별용 (감사/모니터링용)
    function name() external pure returns (string memory);
}

// ── 전략 A — 고정 이율 (5%) ─────────────────────
contract StrategyFixed is IInterestStrategy {
    function computeInterest(uint256 amount) external pure returns (uint256) {
        return (amount * 500) / 10000; // 5%
    }

    function name() external pure returns (string memory) {
        return "Fixed 5%";
    }
}

// ── 전략 B — 잔액 구간별 차등 ───────────────────
contract StrategyTiered is IInterestStrategy {
    /**
     * @dev
     *   0    ~ 1 ether:      3%
     *   1 ~ 10 ether:        5%
     *   10 ether 초과:       7%
     */
    function computeInterest(uint256 amount) external pure returns (uint256) {
        uint256 bps;
        if      (amount < 1 ether)  bps = 300;
        else if (amount < 10 ether) bps = 500;
        else                        bps = 700;
        return (amount * bps) / 10000;
    }

    function name() external pure returns (string memory) {
        return "Tiered 3/5/7%";
    }
}

// ── 실행자 (Executor) ───────────────────────────

/**
 * @dev Executor는 전략의 구체 구현을 모르고 인터페이스만 통해 사용.
 *      새 전략이 필요하면 IInterestStrategy를 구현한 새 컨트랙트를 배포해
 *      setStrategy로 교체하기만 하면 됨. (Executor 재배포 불필요)
 */
contract InterestBank {

    IInterestStrategy public strategy;
    address public admin;

    mapping(address => uint256) public deposits;

    event StrategyChanged(address indexed oldStrategy, address indexed newStrategy);
    event InterestClaimed(address indexed user, uint256 principal, uint256 interest);

    error NotAdmin();
    error NoDeposit();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    constructor(IInterestStrategy _strategy) {
        admin = msg.sender;
        strategy = _strategy;
    }

    // 런타임 전략 교체
    function setStrategy(IInterestStrategy newStrategy) external onlyAdmin {
        emit StrategyChanged(address(strategy), address(newStrategy));
        strategy = newStrategy;
    }

    function deposit() external payable {
        require(msg.value > 0, "no eth");
        deposits[msg.sender] += msg.value;
    }

    /// 사용자의 예치금에 대해 현재 전략의 이자를 반환
    function previewInterest(address user) external view returns (uint256) {
        uint256 principal = deposits[user];
        if (principal == 0) return 0;
        return strategy.computeInterest(principal);
    }

    /// 실제 이자를 예치금에 반영 (교육용 단순화 — 실제로는 자금 필요)
    function accrueInterest() external {
        uint256 principal = deposits[msg.sender];
        if (principal == 0) revert NoDeposit();

        uint256 interest = strategy.computeInterest(principal);
        deposits[msg.sender] += interest;
        emit InterestClaimed(msg.sender, principal, interest);
    }

    function currentStrategyName() external view returns (string memory) {
        return strategy.name();
    }
}
