// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Interfaces
 * @dev Ch05-3 실습 (2/4) — 인터페이스와 외부 호출
 *
 * 학습 포인트:
 * - interface 정의 규칙 (constructor/상태변수/구현 X)
 * - 인터페이스로 다른 컨트랙트 호출
 * - ABI만 알아도 low-level call로 호출 가능
 * - 인터페이스 제약 vs 추상 컨트랙트 (구현 여부)
 */

// ── 인터페이스 정의 ─────────────────────────────

/**
 * @dev 인터페이스는:
 *   - 함수 시그니처만 (구현 X)
 *   - state variable, constructor 없음
 *   - 모든 함수 external
 *   - modifier 없음
 */
interface IPriceOracle {
    function price(address token) external view returns (uint256);
    function updatedAt(address token) external view returns (uint256);
}

// ── 인터페이스 구현체 ───────────────────────────
contract MockOracle is IPriceOracle {
    mapping(address => uint256) private _prices;
    mapping(address => uint256) private _timestamps;

    function set(address token, uint256 p) external {
        _prices[token] = p;
        _timestamps[token] = block.timestamp;
    }

    function price(address token) external view returns (uint256) {
        return _prices[token];
    }

    function updatedAt(address token) external view returns (uint256) {
        return _timestamps[token];
    }
}

// ── 인터페이스로 외부 호출 ─────────────────────

contract PriceReader {
    IPriceOracle public oracle;

    error StalePrice(uint256 age, uint256 maxAge);
    error ZeroPrice();

    constructor(address _oracle) {
        oracle = IPriceOracle(_oracle);
    }

    /**
     * @dev 오라클에서 가격 읽고 유효성 검증
     */
    function priceOf(address token, uint256 maxAge)
        external
        view
        returns (uint256)
    {
        uint256 p = oracle.price(token);
        if (p == 0) revert ZeroPrice();

        uint256 age = block.timestamp - oracle.updatedAt(token);
        if (age > maxAge) revert StalePrice(age, maxAge);
        return p;
    }
}

// ── ABI만으로 low-level 호출 (인터페이스 없이) ──

contract RawCaller {

    error CallFailed(bytes reason);

    /**
     * @dev target의 price(address) 함수를 인터페이스 없이 호출
     *      함수 selector = bytes4(keccak256("price(address)"))
     */
    function callPrice(address target, address token) external view returns (uint256 p) {
        // abi.encodeWithSignature — 시그니처 문자열로 encode
        (bool ok, bytes memory data) = target.staticcall(
            abi.encodeWithSignature("price(address)", token)
        );
        if (!ok) revert CallFailed(data);

        // 반환값 decode
        p = abi.decode(data, (uint256));
    }

    /**
     * @dev encodeWithSelector — 미리 계산된 selector로 encode (재사용 시 gas 저렴)
     */
    function callPriceViaSelector(address target, address token)
        external
        view
        returns (uint256 p)
    {
        bytes4 selector = bytes4(keccak256("price(address)"));
        (bool ok, bytes memory data) = target.staticcall(
            abi.encodeWithSelector(selector, token)
        );
        if (!ok) revert CallFailed(data);
        p = abi.decode(data, (uint256));
    }

    /**
     * @dev encodeCall — 타입 안전 (컴파일 타임 검증), OZ v5+에서 권장
     */
    function callPriceTyped(address target, address token)
        external
        view
        returns (uint256 p)
    {
        (bool ok, bytes memory data) = target.staticcall(
            abi.encodeCall(IPriceOracle.price, (token))
        );
        if (!ok) revert CallFailed(data);
        p = abi.decode(data, (uint256));
    }
}
