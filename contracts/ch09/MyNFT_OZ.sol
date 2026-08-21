// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MyNFT_OZ
 * @dev Ch09 실습 — ERC-721 OpenZeppelin 상속 버전
 *
 * 직접 구현 MyNFT.sol 과 나란히 두고 같은 테스트를 통과시키는 확장 실습.
 * 강의노트 §4.1 EnterprisePolicyNFT_OZ 참고. MyNFT.sol 과 생성자·mint 시그니처 호환.
 *
 * 학습 포인트:
 * - 직접 구현 200+ 줄이 상속 3개로 압축
 * - AccessControl: MINTER_ROLE / PAUSER_ROLE 역할 분리
 * - Pausable + _update 단일 통과점 (v5 핵심 설계 · mint/transfer/burn 전부 여기)
 * - _safeMint 자동 receiver 검사 (직접 구현 _checkReceiver 대응)
 * - supportsInterface 다중 상속 override (ERC-165)
 * - tokenURI 는 .json 확장자 명시 override (직접 구현과 동일 형식 · 슬라이드 41 함정 방어)
 */

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract MyNFT_OZ is ERC721, AccessControl, Pausable {

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    uint256 private _nextTokenId = 1;   // 0 회피 (직접 구현과 동일 관례)
    string  public baseURI;             // public 자동 getter — MyNFT.sol 시그니처 일치

    constructor(string memory _name, string memory _symbol, string memory _baseURI)
        ERC721(_name, _symbol)
    {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        baseURI = _baseURI;
    }

    // ── 발행 (MyNFT.sol 과 동일 시그니처: mint(address) → tokenId) ──
    function mint(address to) external onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        tokenId = _nextTokenId++;
        _safeMint(to, tokenId);   // receiver 검사 자동 처리
    }

    // ── tokenURI — MyNFT.sol 과 동일 형식 (baseURI + tokenId + .json) ──
    // OZ 기본 tokenURI 는 확장자를 안 붙임. 슬라이드 41 의 "조용히 틀리는" 함정 방어.
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);   // OZ v5 헬퍼: 없으면 ERC721NonexistentToken revert
        return string(abi.encodePacked(baseURI, Strings.toString(tokenId), ".json"));
    }

    // ── _update — v5 통합점 (mint/transfer/burn 전부 여기 통과) ──
    // 직접 구현에서 함수마다 붙였던 whenNotPaused 를 이 한 곳으로 통일.
    function _update(address to, uint256 tokenId, address auth)
        internal override returns (address)
    {
        if (paused()) revert EnforcedPause();
        return super._update(to, tokenId, auth);
    }

    function pause()   external onlyRole(PAUSER_ROLE) { _pause(); }
    function unpause() external onlyRole(PAUSER_ROLE) { _unpause(); }

    // ── ERC-165 다중 상속 충돌 해소 (필수 override) ──
    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, AccessControl) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
