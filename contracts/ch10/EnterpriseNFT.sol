// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title EnterpriseNFT (base, non-upgradeable)
 * @dev Ch10 실습 — ERC-1155 기업 배지/증서 발행 컨트랙트
 *
 * 학습 포인트:
 * - ERC-1155: 하나의 컨트랙트가 여러 tokenId 관리
 * - tokenId = (productCode << 64) | eventCode 인코딩
 * - AccessControl: MINTER_ROLE / PAUSER_ROLE / URI_SETTER_ROLE
 * - batch mint / batch transfer
 * - URI 라이프사이클
 *
 * ⚠️ 이 파일은 non-upgradeable 버전 (Ch10 학습용).
 *    Ch13-15에서 UUPS Upgradeable 버전을 다룬다.
 */
contract EnterpriseNFT is ERC1155, AccessControl, Pausable {

    bytes32 public constant MINTER_ROLE     = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE     = keccak256("PAUSER_ROLE");
    bytes32 public constant URI_SETTER_ROLE = keccak256("URI_SETTER_ROLE");

    error ZeroProductCode();
    error LengthMismatch();

    event TokenMinted(address indexed to, uint256 indexed tokenId, uint256 amount);
    event BaseUriUpdated(string oldUri, string newUri);

    constructor(string memory uri_) ERC1155(uri_) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE,        msg.sender);
        _grantRole(PAUSER_ROLE,        msg.sender);
        _grantRole(URI_SETTER_ROLE,    msg.sender);
    }

    // ── tokenId 인코딩/디코딩 ────────────────────────

    /**
     * @dev productCode (192bit) + eventCode (64bit) → tokenId (256bit)
     *      productCode=0은 예약 (mint 시 tokenId 충돌 방지)
     */
    function encodeTokenId(uint192 productCode, uint64 eventCode)
        public pure returns (uint256)
    {
        if (productCode == 0) revert ZeroProductCode();
        return (uint256(productCode) << 64) | uint256(eventCode);
    }

    function decodeTokenId(uint256 tokenId)
        public pure returns (uint192 productCode, uint64 eventCode)
    {
        productCode = uint192(tokenId >> 64);
        eventCode   = uint64(tokenId);
    }

    // ── Mint / Batch Mint ───────────────────────────

    function mint(address to, uint256 tokenId, uint256 amount, bytes memory data)
        external
        onlyRole(MINTER_ROLE)
    {
        _mint(to, tokenId, amount, data);
        emit TokenMinted(to, tokenId, amount);
    }

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
     * @dev 커스텀 오버로드 — 여러 명에게 인덱스별 1:1 발행.
     *      to[i] 가 tokenIds[i] 를 amounts[i] 만큼 받음.
     *      tokenIds 를 모두 같게 넣으면 "같은 종류 뿌리기",
     *      각각 다르게 넣으면 "각자 다른 종류 지급".
     *      실무 배치 크기 상한 ≈ 500건.
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

    // ── URI 관리 ────────────────────────────────────
    function setURI(string memory newUri) external onlyRole(URI_SETTER_ROLE) {
        string memory old = super.uri(0);
        _setURI(newUri);
        emit BaseUriUpdated(old, newUri);
    }

    // ── Pausable ────────────────────────────────────
    function pause() external onlyRole(PAUSER_ROLE) { _pause(); }
    function unpause() external onlyRole(PAUSER_ROLE) { _unpause(); }

    // ── 훅: pause 상태에서 전송 차단 ────────────────
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override whenNotPaused {
        super._update(from, to, ids, values);
    }

    // ── 인터페이스 지원 ─────────────────────────────
    function supportsInterface(bytes4 interfaceId)
        public view override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
