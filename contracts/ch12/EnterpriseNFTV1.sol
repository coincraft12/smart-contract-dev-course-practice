// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title EnterpriseNFTV1 (UUPS Upgradeable)
 * @dev Ch12-14 실습 — 업그레이드 가능한 EnterpriseNFT v1
 *
 * 학습 포인트:
 * - Initializable: constructor 대신 initialize()
 * - UUPSUpgradeable: 프록시 뒤에서 로직만 교체
 * - _authorizeUpgrade: UPGRADER_ROLE만 업그레이드 가능
 * - 5개 부모 상속 (Initializable, ERC1155, AccessControl, Pausable, UUPS)
 * - _disableInitializers()로 로직 컨트랙트 재초기화 방지
 *
 * ⚠️ constructor에서 상태 초기화 금지 — initialize()에서만.
 */
contract EnterpriseNFTV1 is
    Initializable,
    ERC1155Upgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    bytes32 public constant MINTER_ROLE     = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE     = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE   = keccak256("UPGRADER_ROLE");
    bytes32 public constant URI_SETTER_ROLE = keccak256("URI_SETTER_ROLE");

    error ZeroProductCode();
    error LengthMismatch();

    event TokenMinted(address indexed to, uint256 indexed tokenId, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address admin, string memory uri_) public initializer {
        __ERC1155_init(uri_);
        __AccessControl_init();
        __Pausable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE,        admin);
        _grantRole(PAUSER_ROLE,        admin);
        _grantRole(UPGRADER_ROLE,      admin);
        _grantRole(URI_SETTER_ROLE,    admin);
    }

    // ── tokenId 인코딩 ──────────────────────────────
    function encodeTokenId(uint192 productCode, uint64 eventCode)
        public pure returns (uint256)
    {
        if (productCode == 0) revert ZeroProductCode();
        return (uint256(productCode) << 64) | uint256(eventCode);
    }

    // ── Mint ────────────────────────────────────────
    function mint(address to, uint256 tokenId, uint256 amount, bytes memory data)
        external
        onlyRole(MINTER_ROLE)
    {
        _mint(to, tokenId, amount, data);
        emit TokenMinted(to, tokenId, amount);
    }

    /**
     * @dev 표준 wrapper — 한 명에게 여러 종류 발행 (OZ _mintBatch 활용)
     */
    function mintBatch(
        address to,
        uint256[] memory tokenIds,
        uint256[] memory amounts,
        bytes memory data
    ) external onlyRole(MINTER_ROLE) {
        if (tokenIds.length != amounts.length) revert LengthMismatch();
        _mintBatch(to, tokenIds, amounts, data);
        for (uint256 i = 0; i < tokenIds.length; ) {
            emit TokenMinted(to, tokenIds[i], amounts[i]);
            unchecked { ++i; }
        }
    }

    /**
     * @dev 커스텀 오버로드 — 여러 명에게 각각 발행 (이벤트 달성자 배포 시나리오)
     *      슬라이드 30·31·32 참고. 실무 배치 크기 상한 ≈ 500건.
     */
    function mintBatch(
        address[] memory to,
        uint256[] memory tokenIds,
        uint256[] memory amounts
    ) external onlyRole(MINTER_ROLE) {
        if (to.length != tokenIds.length || tokenIds.length != amounts.length) {
            revert LengthMismatch();
        }
        for (uint256 i = 0; i < to.length; ) {
            _mint(to[i], tokenIds[i], amounts[i], "");
            emit TokenMinted(to[i], tokenIds[i], amounts[i]);
            unchecked { ++i; }
        }
    }

    // ── URI ─────────────────────────────────────────
    function setURI(string memory newUri) external onlyRole(URI_SETTER_ROLE) {
        _setURI(newUri);
    }

    // ── Pause ───────────────────────────────────────
    function pause() external onlyRole(PAUSER_ROLE) { _pause(); }
    function unpause() external onlyRole(PAUSER_ROLE) { _unpause(); }

    // ── Version (initialize된 로직 확인용) ──────────
    function version() external pure virtual returns (string memory) {
        return "1.0.0";
    }

    // ── 업그레이드 권한 ──────────────────────────────
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}

    // ── Pause hook ──────────────────────────────────
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override whenNotPaused {
        super._update(from, to, ids, values);
    }

    // ── Multi-inherited interface ───────────────────
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
