// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title NumericTypes
 * @dev Ch05-1 실습 (1/4) — 정수·불리언·단위·연산
 *
 * 학습 포인트:
 * - uint / int 크기와 슬롯 사용량
 * - 산술 · 비교 · 비트 연산자
 * - 0.8.0 이후 자동 오버플로 체크 vs unchecked
 * - 정수 나눗셈은 내림 → 고정소수점(basis points) 패턴
 * - bool 타입
 * - 이더 단위 (wei / gwei / ether) · 시간 단위 (seconds / days)
 */
contract NumericTypes {

    // ── 정수형 다양한 크기 ──────────────────────────
    uint8   public u8;
    uint16  public u16;
    uint256 public u256;
    int256  public i256;

    // ── 오버플로/언더플로 데모 ───────────────────────

    /// 0.8.0 이후 오버플로 시 자동 revert (Panic 0x11)
    function overflow(uint8 x, uint8 y) external pure returns (uint8) {
        return x + y; // x + y > 255 → panic
    }

    /// unchecked — 명시적으로 체크 비활성화 (오버플로 시 wrap-around)
    function overflowUnchecked(uint8 x, uint8 y) external pure returns (uint8) {
        unchecked {
            return x + y;
        }
    }

    function underflowUnchecked(uint8 x, uint8 y) external pure returns (uint8) {
        unchecked {
            return x - y; // wrap-around
        }
    }

    // ── 산술 · 비교 · 비트 연산자 ────────────────────

    function arithmetic(uint256 a, uint256 b)
        external
        pure
        returns (uint256 add_, uint256 sub_, uint256 mul_, uint256 div_, uint256 mod_)
    {
        add_ = a + b;
        sub_ = a - b;
        mul_ = a * b;
        div_ = a / b;
        mod_ = a % b;
    }

    function compare(uint256 a, uint256 b) external pure returns (bool eq, bool lt, bool gt) {
        eq = (a == b);
        lt = (a <  b);
        gt = (a >  b);
    }

    function bitwise(uint256 a, uint256 b)
        external
        pure
        returns (uint256 and_, uint256 or_, uint256 xor_, uint256 not_, uint256 shl_, uint256 shr_)
    {
        and_ = a & b;
        or_  = a | b;
        xor_ = a ^ b;
        not_ = ~a;
        shl_ = a << 2;
        shr_ = a >> 2;
    }

    // ── 나눗셈 내림 & 고정소수점 패턴 ──────────────

    /// Solidity는 부동소수점이 없어 정수 나눗셈은 내림
    function divisionFloor(uint256 a, uint256 b) external pure returns (uint256) {
        return a / b; // 예: 7 / 2 = 3
    }

    /**
     * @dev basis points 패턴 — 1 bp = 0.01%, 10000 bp = 100%
     *      정밀도가 필요한 비율은 큰 단위로 표현
     */
    function percentBps(uint256 value, uint256 bps) external pure returns (uint256) {
        return (value * bps) / 10000;
    }

    /// mulDiv — overflow 방지 위해 곱 먼저 나눗셈 나중
    function mulDiv(uint256 a, uint256 b, uint256 c) external pure returns (uint256) {
        return (a * b) / c;
    }

    // ── 불리언 (bool) ────────────────────────────────

    function logical(bool a, bool b) external pure returns (bool and_, bool or_, bool not_) {
        and_ = a && b;
        or_  = a || b;
        not_ = !a;
    }

    /// 단락 평가 — 왼쪽으로 확정되면 오른쪽 미평가
    function shortCircuit(bool a) external pure returns (bool) {
        // a가 false면 뒤 식은 실행되지 않음 (div by zero 회피)
        uint256 x = 1;
        return a && (x / 1 == 1);
    }

    // ── 단위 리터럴 ──────────────────────────────────

    /// 이더 단위
    function etherUnits()
        external
        pure
        returns (uint256 oneWei, uint256 oneGwei, uint256 oneEther)
    {
        oneWei   = 1 wei;
        oneGwei  = 1 gwei;   // 1e9 wei
        oneEther = 1 ether;  // 1e18 wei
    }

    /// 시간 단위
    function timeUnits()
        external
        pure
        returns (uint256 oneMin, uint256 oneHour, uint256 oneDay, uint256 oneWeek_)
    {
        oneMin    = 1 minutes;
        oneHour   = 1 hours;
        oneDay    = 1 days;
        oneWeek_  = 1 weeks;
    }

    /// 숫자 리터럴 언더스코어 — 가독성 향상
    function readableLiterals() external pure returns (uint256) {
        return 1_000_000; // = 1000000
    }

    /// 상태 변수 저장
    function setStates(uint8 a, uint16 b, uint256 c, int256 d) external {
        u8 = a; u16 = b; u256 = c; i256 = d;
    }
}
