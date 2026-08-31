// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SoulBoundBadge
 * @dev Ch16 캡스톤 예제 — 양도 불가능한 배지 NFT (Soulbound Token)
 *
 * 학습 포인트:
 * - transfer 차단으로 SBT 구현
 * - AccessControl로 발급자 관리
 * - 발급/취소 이벤트
 *
 * 이 파일은 캡스톤 프로젝트의 참고 스타터. 학습자는 이를 확장하거나
 * 다른 도메인(회원권, 자격증 등)으로 응용해 자신만의 프로젝트를 구현한다.
 */
contract SoulBoundBadge is ERC721, AccessControl {

    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    uint256 private _nextId = 1;
    string  private _baseTokenURI;

    error SoulboundNoTransfer();
    error TokenNotFound(uint256 tokenId);

    event BadgeIssued(address indexed to, uint256 indexed tokenId, string category);
    event BadgeRevoked(uint256 indexed tokenId);

    constructor(string memory name_, string memory symbol_, string memory baseURI_)
        ERC721(name_, symbol_)
    {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ISSUER_ROLE, msg.sender);
        _baseTokenURI = baseURI_;
    }

    // ── 발급 / 취소 ─────────────────────────────────

    function issue(address to, string calldata category)
        external
        onlyRole(ISSUER_ROLE)
        returns (uint256 tokenId)
    {
        tokenId = _nextId++;
        _safeMint(to, tokenId);
        emit BadgeIssued(to, tokenId, category);
    }

    function revoke(uint256 tokenId) external onlyRole(ISSUER_ROLE) {
        if (_ownerOf(tokenId) == address(0)) revert TokenNotFound(tokenId);
        _burn(tokenId);
        emit BadgeRevoked(tokenId);
    }

    // ── Soulbound: 전송 차단 ─────────────────────────

    /**
     * @dev _update가 ERC721의 모든 소유권 변경 훅.
     *      from != 0 && to != 0 인 경우 (= transfer)에만 revert.
     *      mint(from=0)과 burn(to=0)은 허용.
     */
    function _update(address to, uint256 tokenId, address auth)
        internal override returns (address)
    {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert SoulboundNoTransfer();
        }
        return super._update(to, tokenId, auth);
    }

    // ── URI ─────────────────────────────────────────
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    // ── Interface ───────────────────────────────────
    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
