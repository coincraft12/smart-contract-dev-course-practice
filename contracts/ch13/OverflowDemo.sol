// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title OverflowDemo
 * @dev Ch13 실습 — 정수 오버플로 (대본 13-1 슬라이드 17 대응)
 *
 * 슬라이드 원문 코드 매칭:
 *   0.8.0 이전 (SafeMath 필요): uint8 x = 255; x = x + 1;   // 조용히 0 으로 감쌈
 *   0.8.0 이후 (자동 revert):   uint8 x = 255; x = x + 1;   // panic(0x11) revert
 *   unchecked 블록: 검사 꺼짐 → 사용자 입력에 쓰면 0.8.0 이전으로 회귀
 *
 * ❌ VulnerableOverflow: unchecked 블록으로 0.8+ 자동 검사를 무력화 → 조용한 오버플로 재현
 * ✅ SafeOverflow: 0.8+ 기본 동작 → 오버플로 시 자동 revert
 *
 * ⚠️  이 컨트랙트는 취약점 시연 목적으로만 사용. 실제 사용 금지.
 */

// ❌ 취약: unchecked 안에서 uint8 산술 → 0.8 이전처럼 조용히 감쌈 (wraparound)
contract VulnerableOverflow {
    uint8 public x;

    constructor(uint8 _initial) {
        x = _initial;
    }

    // ❌ unchecked 로 컴파일러 자동 검사를 꺼서 wraparound 재현
    //   대본: "255 에 1 을 더하면 0 이 된다"
    function add(uint8 delta) external {
        unchecked {
            x = x + delta;
        }
    }
}

// ✅ 안전: 0.8+ 기본 동작 → 오버플로 시 자동 panic(0x11) revert
contract SafeOverflow {
    uint8 public x;

    constructor(uint8 _initial) {
        x = _initial;
    }

    // ✅ unchecked 없음 → 컴파일러가 자동 오버플로 검사 → 넘치면 panic(0x11) revert
    function add(uint8 delta) external {
        x = x + delta;
    }
}
