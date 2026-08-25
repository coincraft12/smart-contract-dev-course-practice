// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../ch12/EnterpriseNFTV1.sol";

/**
 * @title EnterpriseNFTV2 (Good upgrade)
 * @dev Ch12 실습 — 안전한 UUPS 업그레이드
 *
 * ✅ 새 storage 변수는 반드시 v1 storage 뒤에 추가.
 *    v1의 변수 순서/타입 변경 금지.
 *
 * ✅ reinitializer(2) 로 v2 상태 초기화.
 *    (initializer는 최초 1회, reinitializer(n)은 버전 n에 한 번)
 */
contract EnterpriseNFTV2 is EnterpriseNFTV1 {

    // ← v1 뒤에 추가된 신규 storage
    mapping(uint256 => uint256) public tokenExpiry;

    event ExpirySet(uint256 indexed tokenId, uint256 expiryTimestamp);

    /**
     * @dev v2 초기화. reinitializer(2)는 딱 한 번 실행됨.
     */
    function initializeV2() public reinitializer(2) {
        // v2에서 추가된 상태가 있다면 여기서 초기화
    }

    function setExpiry(uint256 tokenId, uint256 expiryTimestamp)
        external
        onlyRole(MINTER_ROLE)
    {
        tokenExpiry[tokenId] = expiryTimestamp;
        emit ExpirySet(tokenId, expiryTimestamp);
    }

    function isExpired(uint256 tokenId) external view returns (bool) {
        uint256 exp = tokenExpiry[tokenId];
        if (exp == 0) return false;
        return block.timestamp >= exp;
    }

    function version() external pure override returns (string memory) {
        return "2.0.0";
    }
}
