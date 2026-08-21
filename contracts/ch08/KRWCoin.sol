// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title KRWCoin
 * @dev Ch10 실습 — 한국 원화 연동 스테이블코인 (연습용)
 *
 * 학습 포인트:
 * - OpenZeppelin ERC20 상속
 * - ERC20Burnable: burn(), burnFrom()
 * - ERC20Pausable: pause 시 전송 차단
 * - AccessControl: 역할 기반 권한 체계
 * - decimals 커스터마이징
 * - _update() 훅 오버라이드
 *
 * 역할:
 * - DEFAULT_ADMIN_ROLE: 역할 부여/회수, mintCap 변경
 * - MINTER_ROLE: 토큰 발행
 * - PAUSER_ROLE: 전송 중단/재개
 * - BLACKLISTER_ROLE: 주소 제재
 */
contract KRWCoin is ERC20, ERC20Burnable, ERC20Pausable, AccessControl {

    // ── 역할 정의 ────────────────────────────────────
    bytes32 public constant MINTER_ROLE      = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE      = keccak256("PAUSER_ROLE");
    bytes32 public constant BLACKLISTER_ROLE = keccak256("BLACKLISTER_ROLE");

    // ── 에러 ─────────────────────────────────────────
    error Blacklisted(address account);
    error ExceedsMintCap(uint256 amount, uint256 remaining);

    // ── 상태 변수 ────────────────────────────────────
    mapping(address => bool) private _blacklisted;
    uint256 public mintCap;

    // ── 이벤트 ───────────────────────────────────────
    event Blacklisted_(address indexed account, address indexed by);
    event Unblacklisted(address indexed account, address indexed by);
    event MintCapUpdated(uint256 oldCap, uint256 newCap);

    // ── 생성자 ───────────────────────────────────────
    constructor(uint256 _mintCap) ERC20("Korean Won Coin", "KRWC") {
        mintCap = _mintCap;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE,        msg.sender);
        _grantRole(PAUSER_ROLE,        msg.sender);
        _grantRole(BLACKLISTER_ROLE,   msg.sender);
    }

    // ── 메타데이터 ───────────────────────────────────
    /**
     * @dev 원화는 소수점 2자리 (전 단위)
     * 실전 스테이블코인은 보통 6 또는 18 사용
     */
    function decimals() public pure override returns (uint8) {
        return 2;
    }

    // ── Mint ─────────────────────────────────────────
    /**
     * @dev MINTER_ROLE만 발행 가능, mintCap 한도 내
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        if (totalSupply() + amount > mintCap)
            revert ExceedsMintCap(amount, mintCap - totalSupply());
        _mint(to, amount);
    }

    // ── Pause / Unpause ──────────────────────────────
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // ── Blacklist ────────────────────────────────────
    function blacklist(address account) external onlyRole(BLACKLISTER_ROLE) {
        require(!_blacklisted[account], "Already blacklisted");
        _blacklisted[account] = true;
        emit Blacklisted_(account, msg.sender);
    }

    function unblacklist(address account) external onlyRole(BLACKLISTER_ROLE) {
        require(_blacklisted[account], "Not blacklisted");
        _blacklisted[account] = false;
        emit Unblacklisted(account, msg.sender);
    }

    function isBlacklisted(address account) public view returns (bool) {
        return _blacklisted[account];
    }

    // ── MintCap 관리 ─────────────────────────────────
    function updateMintCap(uint256 newCap) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newCap >= totalSupply(), "Cap below current supply");
        emit MintCapUpdated(mintCap, newCap);
        mintCap = newCap;
    }

    // ── 내부 훅: 전송 전 블랙리스트 + 일시정지 체크 ────
    /**
     * @dev ERC20._update와 ERC20Pausable._update를 모두 상속받으므로
     *      override(ERC20, ERC20Pausable) 명시 필요
     */
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20, ERC20Pausable) {
        // 블랙리스트 체크 (mint/burn은 제외 — address(0) 확인)
        if (from != address(0) && _blacklisted[from]) revert Blacklisted(from);
        if (to   != address(0) && _blacklisted[to])   revert Blacklisted(to);

        super._update(from, to, value);
    }

    // ── 인터페이스 지원 ──────────────────────────────
    function supportsInterface(bytes4 interfaceId)
        public view override(AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
