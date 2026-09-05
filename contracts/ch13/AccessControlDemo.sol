// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title AccessControlDemo
 * @dev Ch13 실습 — 접근 제어 실수 (대본 13-1 슬라이드 14 대응)
 *
 * 슬라이드 원문 코드 매칭:
 *   ❌ function setAdmin(address newAdmin) public { admin = newAdmin; }       // 취약
 *   ✅ function setAdmin(address newAdmin) external onlyRole(DEFAULT_ADMIN_ROLE) { ... }   // 방어
 *
 * 유형 1 (미인증 함수) 만 실습으로 다룬다.
 * 유형 2 (초기화 미보호) 는 Ch12 UUPS 강의에서 다루었고, 유형 3 (중앙화) 는 운영 구조 문제이므로 코드 실습 대상이 아니다.
 *
 * ⚠️  이 컨트랙트는 취약점 시연 목적으로만 사용. 실제 사용 금지.
 */

// ❌ 취약: setAdmin 에 modifier 가 없음 → 누구나 자기를 관리자로 지정 가능
contract VulnerableAccess {
    address public admin;

    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);

    constructor() {
        admin = msg.sender;
    }

    // ❌ public 무제한 — 대본 슬라이드 14의 왼쪽 코드
    function setAdmin(address newAdmin) public {
        emit AdminChanged(admin, newAdmin);
        admin = newAdmin;
    }
}

// ✅ 안전: OpenZeppelin AccessControl + DEFAULT_ADMIN_ROLE 로 방어
contract SafeAccess is AccessControl {
    address public admin;

    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        admin = msg.sender;
    }

    // ✅ onlyRole(DEFAULT_ADMIN_ROLE) 한 줄로 열린 문을 잠근다 — 대본 슬라이드 14의 오른쪽 코드
    function setAdmin(address newAdmin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit AdminChanged(admin, newAdmin);
        admin = newAdmin;
    }
}
