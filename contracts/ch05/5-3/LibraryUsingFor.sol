// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title LibraryUsingFor
 * @dev Ch05-3 실습 (3/4) — library와 using for
 *
 * 학습 포인트:
 * - library 정의 규칙 (state variable X, receive X, 배포되지만 내부 함수는 인라인)
 * - using for → 타입에 메서드처럼 붙임
 * - Math library — sqrt, min, max, avg
 * - SafeERC20 스타일 — 반환값 없는/false 반환하는 legacy 토큰까지 안전하게 처리
 */

// ── 유틸리티 라이브러리 ──────────────────────────

library Math {

    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a : b;
    }

    function avg(uint256 a, uint256 b) internal pure returns (uint256) {
        // (a + b) / 2 → 오버플로 위험. 안전한 대체 공식.
        return (a & b) + ((a ^ b) >> 1);
    }

    /**
     * @dev Babylonian method 정수 제곱근
     */
    function sqrt(uint256 x) internal pure returns (uint256 z) {
        if (x == 0) return 0;
        z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}

// ── using for 예제 ───────────────────────────────

contract MathUser {

    // uint256 타입에 Math의 함수들을 메서드처럼 연결
    using Math for uint256;

    function testMethods(uint256 a, uint256 b)
        external
        pure
        returns (uint256 min_, uint256 max_, uint256 avg_, uint256 sqrtA)
    {
        // a.min(b) == Math.min(a, b)
        min_  = a.min(b);
        max_  = a.max(b);
        avg_  = a.avg(b);
        sqrtA = a.sqrt();
    }
}

// ── SafeERC20 스타일 (반환값 검증 라이브러리) ───

/**
 * @dev legacy 토큰 (USDT처럼 return값 없음) 처리를 위한 안전 호출 라이브러리
 *      - 성공적으로 return true 반환하는 표준 토큰
 *      - return false 반환하는 (실패 알림형) 토큰
 *      - 아예 return값 없는 (USDT 같은) 토큰
 *      세 경우 모두 처리
 */

interface IMinimalERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

library SafeCall {

    error TransferFailed();

    /**
     * @dev 실행 → 반환값 없거나 (data length 0) 또는 true 반환 시 성공
     *      false 반환 또는 revert 시 실패
     */
    function safeTransfer(address token, address to, uint256 amount) internal {
        // low-level call — return값 없는 legacy 토큰도 처리 가능
        (bool ok, bytes memory data) = token.call(
            abi.encodeCall(IMinimalERC20.transfer, (to, amount))
        );

        // 실패 판정:
        //   1) call 실패
        //   2) call은 성공했지만 false 반환
        if (!ok) revert TransferFailed();
        if (data.length > 0 && !abi.decode(data, (bool))) revert TransferFailed();
    }
}

/**
 * @dev SafeCall.safeTransfer 사용 예 — 여러 종류의 토큰과 안전하게 상호작용
 */
contract SafeTokenUser {
    using SafeCall for address;

    function forward(address token, address to, uint256 amount) external {
        token.safeTransfer(to, amount);
    }
}

// ── 테스트용 3가지 토큰 (정상/false 반환/return값 없음) ──

contract GoodToken is IMinimalERC20 {
    mapping(address => uint256) private _balances;

    constructor() {
        _balances[msg.sender] = 1_000_000 ether;
    }

    function balanceOf(address a) external view returns (uint256) {
        return _balances[a];
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(_balances[msg.sender] >= amount, "insufficient");
        _balances[msg.sender] -= amount;
        _balances[to] += amount;
        return true;
    }
}

contract FalseReturningToken is IMinimalERC20 {
    mapping(address => uint256) private _balances;

    function balanceOf(address a) external view returns (uint256) {
        return _balances[a];
    }

    /// 항상 false 반환 (실패 알림형)
    function transfer(address, uint256) external pure returns (bool) {
        return false;
    }
}

/// USDT처럼 return값이 없는 토큰
contract NoReturnToken {
    mapping(address => uint256) public balances;

    constructor() {
        balances[msg.sender] = 1_000_000 ether;
    }

    function balanceOf(address a) external view returns (uint256) {
        return balances[a];
    }

    /// 반환값 없음 — 표준 위반이지만 실전에는 존재
    function transfer(address to, uint256 amount) external {
        require(balances[msg.sender] >= amount, "insufficient");
        balances[msg.sender] -= amount;
        balances[to] += amount;
    }
}
