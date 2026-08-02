// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title DataLocationEnumPacking
 * @dev Ch05-1 실습 (4/4) — 데이터 위치·타입 변환·Enum·Struct packing
 *
 * 학습 포인트:
 * - storage / memory / calldata 실동작
 * - calldata → memory 복사 비교
 * - storage 참조로 배치 수정 vs memory 복사로 원본 유지
 * - 명시적/암묵적 타입 변환
 * - Enum 상태 기계 (상태 전이 규칙)
 * - Struct packing으로 슬롯 절약
 */
contract DataLocationEnumPacking {

    // ── 데이터 위치 실습용 상태 ──────────────────────
    uint256[] public numbers;

    // ── calldata: 읽기 전용 참조 (최저 가스) ─────────

    function sumCalldata(uint256[] calldata arr) external pure returns (uint256 s) {
        // arr[i] = ... 은 불가 (calldata는 immutable)
        for (uint256 i; i < arr.length; ) {
            s += arr[i];
            unchecked { ++i; }
        }
    }

    // ── memory: 수정 가능한 임시 복사 ────────────────

    function doubleInMemory(uint256[] calldata arr)
        external
        pure
        returns (uint256[] memory)
    {
        uint256[] memory copy = new uint256[](arr.length);
        for (uint256 i; i < arr.length; ) {
            copy[i] = arr[i] * 2; // memory는 수정 가능
            unchecked { ++i; }
        }
        return copy;
    }

    // ── storage: 상태 변수 직접 수정 ─────────────────

    function push(uint256 v) external {
        numbers.push(v);
    }

    /**
     * @dev storage 참조: 원본 수정 (블록체인 반영)
     */
    function incrementFirstStorage() external {
        require(numbers.length > 0, "empty");
        uint256[] storage ref = numbers;
        ref[0] += 1;
    }

    /**
     * @dev memory 복사: 로컬만 수정, 상태 그대로
     */
    function incrementFirstMemoryNoEffect() external view returns (uint256) {
        require(numbers.length > 0, "empty");
        uint256[] memory copy = numbers; // storage → memory 복사
        copy[0] += 999;                  // 로컬만 변화
        return numbers[0];               // 원본 값
    }

    // ── 타입 변환 (Type Conversion) ──────────────────

    /**
     * @dev 명시적: 좁은 → 넓은도 문법상 필요할 때 명시. int ↔ uint는 항상 명시.
     */
    function explicitConvert(int256 x) external pure returns (uint256) {
        // x < 0이면 매우 큰 값으로 wrap됨 (하위 비트 그대로 해석)
        return uint256(x);
    }

    function narrowConvert(uint256 x) external pure returns (uint8) {
        // 8비트 초과분은 잘림
        return uint8(x);
    }

    /**
     * @dev 암묵적: 좁은 크기 → 넓은 크기의 같은 부호 정수는 자동 변환
     */
    function implicitWiden(uint8 x) external pure returns (uint256) {
        return x; // uint8 → uint256 자동
    }

    // bytes32 → address (하위 20바이트 캐스팅)
    function bytesToAddress(bytes32 h) external pure returns (address) {
        return address(uint160(uint256(h)));
    }

    // ── Enum ─────────────────────────────────────────

    /**
     * @dev Enum은 내부적으로 uint8 (0부터 시작). 상태 기계 만들 때 유용.
     */
    enum Order {
        Created,   // 0
        Paid,      // 1
        Shipped,   // 2
        Delivered, // 3
        Cancelled  // 4
    }

    Order public status;

    error InvalidTransition(Order from, Order to);

    /**
     * @dev 유효한 상태 전이만 허용:
     *   Created → Paid → Shipped → Delivered
     *   Created → Cancelled
     *   Paid    → Cancelled
     */
    function transition(Order to) external {
        Order from = status;

        bool ok;
        if (from == Order.Created && (to == Order.Paid || to == Order.Cancelled)) ok = true;
        else if (from == Order.Paid && (to == Order.Shipped || to == Order.Cancelled)) ok = true;
        else if (from == Order.Shipped && to == Order.Delivered) ok = true;

        if (!ok) revert InvalidTransition(from, to);
        status = to;
    }

    // ── Struct Packing 최적화 ───────────────────────

    /**
     * @dev ❌ 비효율: uint256 → uint8 → uint256 순서
     *      256비트 값 사이의 8비트가 별도 슬롯 사용 (3 슬롯)
     */
    struct UserBad {
        uint256 id;    // 슬롯 0
        uint8   level; // 슬롯 1 (홀로 사용)
        uint256 score; // 슬롯 2
    }

    /**
     * @dev ✅ 효율: 작은 값들을 인접 배치
     *      → 컴파일러가 하나의 256비트 슬롯에 packing (2 슬롯)
     */
    struct UserGood {
        uint256 id;    // 슬롯 0
        uint256 score; // 슬롯 1
        uint8   level; // 슬롯 2 앞 8비트
        bool    active;// 슬롯 2 (같은 슬롯)
        uint16  region;// 슬롯 2 (같은 슬롯)
    }

    UserBad  public bad;
    UserGood public good;

    function setBad(uint256 id, uint8 level, uint256 score) external {
        bad = UserBad(id, level, score);
    }

    function setGood(uint256 id, uint256 score, uint8 level, bool active, uint16 region)
        external
    {
        good = UserGood(id, score, level, active, region);
    }
}
