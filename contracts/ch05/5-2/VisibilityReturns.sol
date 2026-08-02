// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title VisibilityReturns
 * @dev Ch05-2 실습 (1/4) — 가시성 · 반환값
 *
 * 학습 포인트:
 * - public / external / internal / private 실동작 차이
 * - external 함수의 calldata 이점
 * - internal → 상속 컨트랙트에서만 접근
 * - private → 이 컨트랙트만 접근 (상속 컨트랙트에서 X)
 * - 단일 반환 / 다중 반환 / named returns / destructuring
 * - 네이밍 관례 (_ prefix for internal/private)
 */
contract VisibilityReturns {

    uint256 public counter;
    uint256 public totalSpent;

    // ── 가시성 4종 ───────────────────────────────────

    /// public — 외부·내부 모두 호출 가능
    function increment() public {
        counter += 1;
    }

    /// external — 오직 외부에서만 호출 가능 (내부 호출 불가)
    /// calldata를 쓸 수 있어 memory 복사 없이 배열 처리 → 가스 절약
    function sumFromCalldata(uint256[] calldata items) external returns (uint256 total) {
        for (uint256 i = 0; i < items.length; ) {
            total += items[i];
            unchecked { ++i; }
        }
        totalSpent += total;
    }

    /// internal — 이 컨트랙트 + 상속 컨트랙트에서 호출
    function _double(uint256 v) internal pure returns (uint256) {
        return v * 2;
    }

    /// private — 이 컨트랙트에서만 호출 (상속받은 컨트랙트 접근 X)
    function _addOne(uint256 v) private pure returns (uint256) {
        return v + 1;
    }

    /// public이면서 view — 내부 헬퍼 호출 확인용
    function computeInternal(uint256 v) public pure returns (uint256) {
        return _double(v); // internal 접근
    }

    function computePrivate(uint256 v) public pure returns (uint256) {
        return _addOne(v); // private 접근
    }

    // ── 반환값 — 단일 ──────────────────────────────────

    function single(uint256 a) external pure returns (uint256) {
        return a * a;
    }

    // ── 반환값 — 다중 ──────────────────────────────────

    function multiple(uint256 a, uint256 b)
        external
        pure
        returns (uint256, uint256, uint256)
    {
        // 순서대로 sum, diff, product
        return (a + b, a > b ? a - b : b - a, a * b);
    }

    // ── 반환값 — Named returns ────────────────────────

    /**
     * @dev named returns — 명시 return 문 없이도 값이 반환됨
     *      (변수 이름이 반환 슬롯)
     */
    function namedReturn(uint256 amount, uint256 rateBps)
        external
        pure
        returns (uint256 fee, uint256 net)
    {
        fee = amount * rateBps / 10000;
        net = amount - fee;
        // 명시적 return 문 없음
    }

    // ── 반환값 — 구조체 ───────────────────────────────

    struct Quote {
        uint256 price;
        uint256 tax;
        uint256 total;
    }

    function returnStruct(uint256 basePrice, uint256 taxBps)
        external
        pure
        returns (Quote memory)
    {
        uint256 tax = basePrice * taxBps / 10000;
        return Quote({
            price: basePrice,
            tax: tax,
            total: basePrice + tax
        });
    }

    // ── external 호출자 도움용: 상태 조회 ─────────────

    function summary() external view returns (uint256 c, uint256 s) {
        // 두 상태 변수를 한 번의 view call로 반환
        c = counter;
        s = totalSpent;
    }
}
