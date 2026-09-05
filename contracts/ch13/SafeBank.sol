// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SafeBank
 * @dev Ch13 실습 — 재진입 공격을 방어한 안전한 은행 (Ch08에서 도입 후 Ch13 보안 감사에서 재사용)
 *
 * VulnerableBank와 비교해서 배울 것:
 * 1. CEI 패턴 (Checks-Effects-Interactions) — 상태 먼저, 전송 나중
 * 2. ReentrancyGuard.nonReentrant — 이중 방어
 * 3. Ownable2Step — 소유권 이전 2단계 확인
 *
 * 동일한 Attacker 컨트랙트로 공격 시도 → 실패해야 함
 */
contract SafeBank is Ownable2Step, ReentrancyGuard {

    // ── 에러 ─────────────────────────────────────────
    error ZeroAmount();
    error InsufficientBalance(uint256 available, uint256 required);
    error TransferFailed();
    error ContractPaused();

    // ── 상태 변수 ────────────────────────────────────
    bool public paused;
    mapping(address => uint256) private _balances;
    uint256 public totalDeposited;

    // ── 이벤트 ───────────────────────────────────────
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    // ── 생성자 ───────────────────────────────────────
    constructor() Ownable(msg.sender) {}

    // ── Modifier ─────────────────────────────────────
    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    // ── 예치 ────────────────────────────────────────
    function deposit() public payable whenNotPaused {
        if (msg.value == 0) revert ZeroAmount();
        _balances[msg.sender] += msg.value;
        totalDeposited += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    /**
     * @dev ✅ 안전한 withdraw
     * 방어 1: CEI 패턴 — balances[msg.sender] = 0 먼저, transfer 나중
     * 방어 2: nonReentrant — 재진입 시 즉시 revert
     */
    function withdraw(uint256 amount) public whenNotPaused nonReentrant {
        // Checks
        if (amount == 0) revert ZeroAmount();
        uint256 available = _balances[msg.sender];
        if (available < amount) revert InsufficientBalance(available, amount);

        // Effects — 전송 전에 상태 업데이트
        _balances[msg.sender] -= amount;
        totalDeposited -= amount;

        // Interactions — 상태 업데이트 후 전송
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
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }

    receive() external payable {
        deposit();
    }
}
