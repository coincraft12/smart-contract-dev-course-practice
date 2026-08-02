// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Modifiers
 * @dev Ch05-2 실습 (2/4) — modifier
 *
 * 학습 포인트:
 * - 기본 modifier 패턴
 * - modifier 체이닝과 실행 순서 (좌 → 우)
 * - _; 위치에 따른 3가지 형태:
 *     · 실행 전 검증 (before)      : 조건 후 _;
 *     · 실행 후 정리 (after)       : _; 후 정리 로직
 *     · 실행 전후 (around)         : _; 감싸기 → 재진입 방지 패턴
 * - ReentrancyGuard 패턴 실전 구현
 */
contract Modifiers {

    address public owner;
    bool    public paused;
    uint256 public actionCount;
    uint256 public lastGasCost;

    /// nonReentrant 락 상태
    /// 1 = idle, 2 = entered
    uint256 private _lock = 1;

    error NotOwner();
    error ContractPaused();
    error ReentrantCall();
    error InvalidRange(uint256 v, uint256 min, uint256 max);

    event ActionPerformed(uint256 count);
    event GasMeasured(uint256 used);

    constructor() {
        owner = msg.sender;
    }

    // ── 기본 modifier ────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _; // ← 함수 본문이 여기로 들어옴
    }

    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    modifier withinRange(uint256 v, uint256 min, uint256 max) {
        if (v < min || v > max) revert InvalidRange(v, min, max);
        _;
    }

    // ── _; 위치 — after (실행 후 정리) ────────────────

    /**
     * @dev 함수 실행 후 카운터를 올린다.
     *      모든 성공 호출을 자동 집계할 때 유용.
     */
    modifier countAfter() {
        _;
        actionCount += 1;
        emit ActionPerformed(actionCount);
    }

    // ── _; 위치 — around (전후 감싸기, 가스 측정) ──────

    /**
     * @dev _; 전후로 gasleft() 차이를 측정 → 함수 실제 소비 가스 계산
     */
    modifier measureGas() {
        uint256 before = gasleft();
        _;
        lastGasCost = before - gasleft();
        emit GasMeasured(lastGasCost);
    }

    // ── _; 위치 — around (재진입 방지) ────────────────

    /**
     * @dev nonReentrant — 함수 실행 전 락, 실행 후 언락
     *      OpenZeppelin ReentrancyGuard와 동일 아이디어
     */
    modifier nonReentrant() {
        if (_lock == 2) revert ReentrantCall();
        _lock = 2;
        _;
        _lock = 1;
    }

    // ── modifier 체이닝 (좌 → 우 실행) ─────────────────

    /**
     * @dev 체이닝: onlyOwner → whenNotPaused → withinRange → countAfter → 본문
     *      가장 먼저 쓰인 modifier가 가장 먼저 조건 검사.
     *      countAfter는 본문 뒤에서 카운터를 증가.
     */
    function guardedAction(uint256 v)
        external
        onlyOwner
        whenNotPaused
        withinRange(v, 1, 1000)
        countAfter
    {
        // 본문
    }

    // ── nonReentrant 데모 ─────────────────────────────

    /**
     * @dev 재귀 호출 시도 시 ReentrantCall revert
     *      recurse(3)은 nonReentrant 잠금 중 자기 자신 호출 → revert
     */
    function recurse(uint256 depth) external nonReentrant returns (uint256) {
        if (depth == 0) return 0;
        // 자기 자신 external call → 재진입
        this.recurse(depth - 1);
        return depth;
    }

    /// 재진입 방지 상태 확인용 (테스트 도구)
    function isLocked() external view returns (bool) {
        return _lock == 2;
    }

    // ── 가스 측정 데모 ────────────────────────────────

    function heavyLoop(uint256 n) external measureGas {
        uint256 x;
        for (uint256 i = 0; i < n; ) {
            x += i;
            unchecked { ++i; }
        }
    }

    // ── owner / pause 관리 ────────────────────────────

    function pause() external onlyOwner {
        paused = true;
    }

    function unpause() external onlyOwner {
        paused = false;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
}
