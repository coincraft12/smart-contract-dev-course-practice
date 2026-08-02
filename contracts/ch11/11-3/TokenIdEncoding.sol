// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title TokenIdEncoding
 * @dev Ch11-3 실습 — tokenId 인코딩 안전성 해부
 *
 * 학습 포인트:
 * - 256비트 tokenId를 논리적 두 부분(productCode + eventCode)으로 나누기
 * - encode/decode의 왕복 정합성
 * - productCode=0 예약 → 네임스페이스 충돌 회피
 * - packing으로 인한 오프-바이-원 실수 방지
 * - EnterpriseNFT의 실제 인코딩과 동일한 규칙 재확인
 *
 * 인코딩 규칙:
 *   tokenId = (productCode << 64) | eventCode
 *   상위 192bit = productCode (0은 예약)
 *   하위 64bit  = eventCode
 */
library TokenIdCodec {

    error ZeroProductCode();

    /// productCode + eventCode → tokenId
    function encode(uint192 productCode, uint64 eventCode)
        internal
        pure
        returns (uint256 tokenId)
    {
        if (productCode == 0) revert ZeroProductCode();
        tokenId = (uint256(productCode) << 64) | uint256(eventCode);
    }

    /// tokenId → productCode + eventCode
    function decode(uint256 tokenId)
        internal
        pure
        returns (uint192 productCode, uint64 eventCode)
    {
        productCode = uint192(tokenId >> 64);
        eventCode   = uint64(tokenId);
    }

    /// 두 productCode의 namespace가 겹치지 않는지 (즉 서로 다른 productCode의 tokenId가 절대 같아질 수 없는지)
    /// 항상 true — 이 함수는 정합성 문서화 목적
    function namespaceIsolated(uint192 pA, uint192 pB, uint64 eA, uint64 eB)
        internal
        pure
        returns (bool)
    {
        if (pA == 0 || pB == 0) return true; // 예약, 정의되지 않음
        uint256 tokenA = (uint256(pA) << 64) | uint256(eA);
        uint256 tokenB = (uint256(pB) << 64) | uint256(eB);
        // pA != pB 라면 상위 비트가 달라 tokenA != tokenB
        return pA == pB ? tokenA == tokenB : tokenA != tokenB;
    }
}

/**
 * @dev 실전 사용 예시 — 컨트랙트에서 라이브러리 어떻게 활용하는지
 */
contract TokenIdDemo {

    using TokenIdCodec for uint192;

    function make(uint192 productCode, uint64 eventCode) external pure returns (uint256) {
        return TokenIdCodec.encode(productCode, eventCode);
    }

    function unpack(uint256 tokenId) external pure returns (uint192 p, uint64 e) {
        return TokenIdCodec.decode(tokenId);
    }

    /// 라운드트립 정합성 검증
    function roundtrip(uint192 productCode, uint64 eventCode)
        external
        pure
        returns (bool)
    {
        uint256 tokenId = TokenIdCodec.encode(productCode, eventCode);
        (uint192 p, uint64 e) = TokenIdCodec.decode(tokenId);
        return (p == productCode && e == eventCode);
    }
}
