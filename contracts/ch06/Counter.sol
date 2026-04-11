// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Counter
 * @dev Ch06 실습 — 카운터 컨트랙트
 *
 * 학습 포인트:
 * - 상태 변수와 초기값
 * - 조건문 (require)
 * - 커스텀 에러
 * - modifier
 * - 이벤트
 */
contract Counter {

    // ── 에러 ─────────────────────────────────────────
    error CannotGoNegative();
    error NotOwner(address caller);

    // ── 상태 변수 ────────────────────────────────────
    uint256 public count;
    address public owner;

    // ── 이벤트 ───────────────────────────────────────
    event Incremented(address indexed by, uint256 newValue);
    event Decremented(address indexed by, uint256 newValue);
    event Reset(address indexed by);

    // ── Modifier ─────────────────────────────────────
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner(msg.sender);
        _;
    }

    // ── 생성자 ───────────────────────────────────────
    constructor() {
        owner = msg.sender;
        count = 0;
    }

    // ── 함수 ────────────────────────────────────────

    /// @dev count를 1 증가
    function increment() public {
        count += 1;
        emit Incremented(msg.sender, count);
    }

    /// @dev count를 1 감소 (0 미만이 되면 revert)
    function decrement() public {
        if (count == 0) revert CannotGoNegative();
        count -= 1;
        emit Decremented(msg.sender, count);
    }

    /// @dev count를 amount만큼 증가
    function incrementBy(uint256 amount) public {
        require(amount > 0, "Amount must be positive");
        count += amount;
        emit Incremented(msg.sender, count);
    }

    /// @dev count를 0으로 초기화 (owner 전용)
    function reset() public onlyOwner {
        count = 0;
        emit Reset(msg.sender);
    }

    /// @dev 현재 count 반환
    function getCount() public view returns (uint256) {
        return count;
    }
}
