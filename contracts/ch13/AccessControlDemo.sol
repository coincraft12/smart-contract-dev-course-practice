// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title AccessControlDemo
 * @dev Ch13 실습 — 접근 제어 실수 시연 (교육용)
 *
 * 대본 13-1 슬라이드 13~15 대응:
 *   "열려 있는 문으로 걸어 들어간다"
 *   세 가지 유형 중 (1) 미보호 함수 + (2) 방어 대비를 나란히 배치.
 *
 * ❌ VulnerableAccess: 관리자 함수에 권한 검사가 아예 없다 (누구나 호출 가능)
 * ✅ SafeAccess: OpenZeppelin AccessControl + onlyRole 로 방어
 *
 * ⚠️  이 컨트랙트는 취약점 시연 목적으로만 사용. 실제 사용 금지.
 */

// ❌ 취약: 관리자만 부를 수 있어야 할 함수에 권한 검사가 없다
contract VulnerableAccess {
    address public owner;
    uint256 public treasury;

    event OwnerChanged(address indexed oldOwner, address indexed newOwner);
    event Withdrawn(address indexed to, uint256 amount);

    constructor() payable {
        owner = msg.sender;
        treasury = msg.value;
    }

    // ❌ 권한 검사 없음 — 누구나 owner 변경 가능
    function setOwner(address newOwner) external {
        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }

    // ❌ 권한 검사 없음 — 누구나 자금 인출 가능
    function withdraw(address payable to, uint256 amount) external {
        require(amount <= treasury, "insufficient");
        treasury -= amount;
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "transfer failed");
        emit Withdrawn(to, amount);
    }

    receive() external payable {
        treasury += msg.value;
    }
}

// ✅ 안전: OpenZeppelin AccessControl 로 역할 기반 방어
contract SafeAccess is AccessControl {
    bytes32 public constant TREASURER_ROLE = keccak256("TREASURER_ROLE");

    uint256 public treasury;

    event Withdrawn(address indexed to, uint256 amount);

    constructor() payable {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(TREASURER_ROLE, msg.sender);
        treasury = msg.value;
    }

    // ✅ DEFAULT_ADMIN_ROLE 만 신규 역할 부여 가능 (AccessControl 기본 동작)
    // ✅ TREASURER_ROLE 만 인출 가능
    function withdraw(address payable to, uint256 amount) external onlyRole(TREASURER_ROLE) {
        require(amount <= treasury, "insufficient");
        treasury -= amount;
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "transfer failed");
        emit Withdrawn(to, amount);
    }

    receive() external payable {
        treasury += msg.value;
    }
}
