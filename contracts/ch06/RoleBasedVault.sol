// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title RoleBasedVault
 * @dev Ch06 실습 — AccessControl 역할 기반 권한 설계
 *
 * 학습 포인트:
 * - DEFAULT_ADMIN_ROLE: 역할 부여/회수 권한
 * - MINTER_ROLE / PAUSER_ROLE / WITHDRAWER_ROLE 분리
 * - 역할 계층 (setRoleAdmin)
 */
contract RoleBasedVault is AccessControl, Pausable {

    bytes32 public constant MINTER_ROLE     = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE     = keccak256("PAUSER_ROLE");
    bytes32 public constant WITHDRAWER_ROLE = keccak256("WITHDRAWER_ROLE");

    // 역할 계층: MINTER는 admin이 관리, WITHDRAWER는 MINTER가 관리
    mapping(address => uint256) public credits;
    uint256 public totalCredits;

    event CreditIssued(address indexed to, uint256 amount);
    event CreditWithdrawn(address indexed from, uint256 amount);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);

        // 역할 계층: WITHDRAWER_ROLE은 MINTER_ROLE이 부여 가능
        _setRoleAdmin(WITHDRAWER_ROLE, MINTER_ROLE);
    }

    // ── Mint ─────────────────────────────────────────
    function issue(address to, uint256 amount)
        external
        onlyRole(MINTER_ROLE)
        whenNotPaused
    {
        credits[to] += amount;
        totalCredits += amount;
        emit CreditIssued(to, amount);
    }

    // ── Withdraw ────────────────────────────────────
    function withdraw(address from, uint256 amount)
        external
        onlyRole(WITHDRAWER_ROLE)
        whenNotPaused
    {
        require(credits[from] >= amount, "insufficient");
        credits[from] -= amount;
        totalCredits -= amount;
        emit CreditWithdrawn(from, amount);
    }

    // ── Pause ───────────────────────────────────────
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
}
