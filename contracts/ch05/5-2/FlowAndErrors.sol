// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title FlowAndErrors
 * @dev Ch05-2 실습 (4/4) — 흐름 제어 · 에러 처리
 *
 * 학습 포인트:
 * - if / else / 삼항 연산자
 * - for 루프 + 가스 최적화 (unchecked, length 캐싱)
 * - while / do-while
 * - continue / break
 * - require / revert with string / revert with custom error / assert
 * - try / catch (외부 호출 실패 처리)
 * - 세 방식 가스 비교 개념 (커스텀 에러 < revert string < require string)
 */

// ── try/catch 데모용 외부 컨트랙트 ─────────────────────
contract MayFail {
    error CustomFailure(uint256 code);

    function work(uint256 mode) external pure returns (uint256) {
        if (mode == 1) revert("string failure");
        if (mode == 2) revert CustomFailure(42);
        if (mode == 3) {
            // panic (division by zero) → 잡을 수 있는 low-level 에러
            uint256 z = 0;
            return 100 / z;
        }
        return mode + 1;
    }
}

contract FlowAndErrors {

    // ── 조건문 ────────────────────────────────────────

    function classify(int256 x) external pure returns (string memory) {
        if (x > 0)      return "positive";
        else if (x < 0) return "negative";
        else            return "zero";
    }

    /// 삼항 연산자
    function absolute(int256 x) external pure returns (uint256) {
        return x >= 0 ? uint256(x) : uint256(-x);
    }

    // ── 반복문 for + 가스 최적화 ──────────────────────

    /**
     * @dev 기본 for — 매 반복마다 arr.length 재계산 (비효율)
     */
    function sumBasic(uint256[] calldata arr) external pure returns (uint256 s) {
        for (uint256 i = 0; i < arr.length; i++) {
            s += arr[i];
        }
    }

    /**
     * @dev 최적화 for — length 캐싱 + unchecked 카운터
     *      정수 오버플로가 없다고 확신할 수 있는 카운터는 unchecked로 뺀다
     */
    function sumOptimized(uint256[] calldata arr) external pure returns (uint256 s) {
        uint256 len = arr.length; // ← 한 번만 읽기
        for (uint256 i; i < len; ) {
            s += arr[i];
            unchecked { ++i; }    // ← 오버플로 체크 생략
        }
    }

    // ── while / do-while ─────────────────────────────

    /// while — 조건이 처음부터 거짓이면 본문 실행 X
    function countDown(uint256 from) external pure returns (uint256 count) {
        while (from > 0) {
            count += 1;
            from -= 1;
        }
    }

    /// do-while — 조건 관계없이 최소 1회 실행
    function doOnce(uint256 seed) external pure returns (uint256 result) {
        do {
            result = seed + 1;
            seed = 0;
        } while (seed > 0);
        // seed=0으로 넘어와도 최소 1회 실행됨
    }

    // ── continue / break ─────────────────────────────

    /// continue — 홀수만 건너뛰고 짝수 합
    function sumEven(uint256[] calldata arr) external pure returns (uint256 s) {
        for (uint256 i = 0; i < arr.length; ) {
            if (arr[i] % 2 == 1) {
                unchecked { ++i; }
                continue;
            }
            s += arr[i];
            unchecked { ++i; }
        }
    }

    /// break — 첫 임계값 초과 요소에서 즉시 종료
    function findFirstOver(uint256[] calldata arr, uint256 threshold)
        external
        pure
        returns (int256 index, bool found)
    {
        for (uint256 i = 0; i < arr.length; ) {
            if (arr[i] > threshold) {
                found = true;
                index = int256(i);
                break;
            }
            unchecked { ++i; }
        }
        if (!found) index = -1;
    }

    // ── 에러 처리 — require ──────────────────────────

    function withRequire(uint256 amount) external pure returns (uint256) {
        require(amount > 0, "amount=0");
        require(amount <= 1000, "amount>1000");
        return amount;
    }

    // ── 에러 처리 — revert with string ───────────────

    function withRevertString(uint256 amount) external pure returns (uint256) {
        if (amount == 0)    revert("amount=0");
        if (amount > 1000)  revert("amount>1000");
        return amount;
    }

    // ── 에러 처리 — custom error (가장 가스 저렴) ────

    error AmountOutOfRange(uint256 provided, uint256 min, uint256 max);

    function withCustomError(uint256 amount) external pure returns (uint256) {
        if (amount == 0 || amount > 1000) {
            revert AmountOutOfRange(amount, 1, 1000);
        }
        return amount;
    }

    // ── 에러 처리 — assert (내부 불변 조건) ──────────

    /**
     * @dev assert는 절대 깨져선 안 되는 불변 조건에만.
     *      사용자 입력 검증에는 require/revert 사용.
     *      assert 실패는 Panic(0x01)
     */
    function safeMul(uint256 a, uint256 b) external pure returns (uint256 r) {
        r = a * b;
        // 불변: b > 0 이면 결과를 b로 나눴을 때 a와 같아야 함
        if (b > 0) {
            assert(r / b == a);
        }
    }

    // ── try / catch — 외부 호출 실패 잡기 ────────────

    /**
     * @dev MayFail.work를 try/catch로 감싼다
     * @return code 0 = 성공, 1 = string error, 2 = custom error, 3 = panic, 4 = 기타
     * @return value 성공 시 반환값, 실패 시 0
     */
    function tryExternal(address target, uint256 mode)
        external
        returns (uint256 code, uint256 value)
    {
        try MayFail(target).work(mode) returns (uint256 v) {
            return (0, v);
        } catch Error(string memory /*reason*/) {
            // revert("...") 또는 require(..., "...")로 발생
            return (1, 0);
        } catch (bytes memory data) {
            // custom error, panic, 기타 low-level 실패
            // Panic 시그니처: 0x4e487b71
            if (data.length >= 4 && bytes4(data) == 0x4e487b71) {
                return (3, 0);
            }
            // MayFail.CustomFailure의 selector와 비교
            if (data.length >= 4 && bytes4(data) == MayFail.CustomFailure.selector) {
                return (2, 0);
            }
            return (4, 0);
        }
    }
}
