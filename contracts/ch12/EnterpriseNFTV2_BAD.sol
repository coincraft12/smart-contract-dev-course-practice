// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title EnterpriseNFTV2_BAD (❌ 스토리지 레이아웃 파괴)
 * @dev Ch12 실습 — 잘못된 업그레이드 예시
 *
 * ❌ 문제점: v1이 사용하던 slot 앞에 신규 storage 삽입
 *    → hardhat-upgrades가 자동 감지하여 배포 거부
 *
 * ⚠️ 상속 순서 자체를 바꾸는 것도 storage layout을 파괴하는 대표 실수.
 *
 * 이 파일은 컴파일 및 upgrade 실패 실증 용도이며,
 *          hardhat-upgrades가 배포 시 revert하는 것을 확인하는 것이 실습 목표.
 */
contract EnterpriseNFTV2_BAD is
    Initializable,
    AccessControlUpgradeable,    // ❌ 순서 변경! v1은 ERC1155가 먼저였다
    ERC1155Upgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    bytes32 public constant MINTER_ROLE     = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE     = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE   = keccak256("UPGRADER_ROLE");
    bytes32 public constant URI_SETTER_ROLE = keccak256("URI_SETTER_ROLE");

    // ❌ v1이 사용하지 않던 새 변수를 앞에 추가하면 storage slot 침범
    uint256 public wronglyInsertedField;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
