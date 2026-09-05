// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title OverflowDemo
 * @dev Ch13 실습 — 정수 오버플로 실증 (대본 13-1 슬라이드 16~18 대응)
 *
 * 0.8.0 이후 컴파일러가 산술 오버플로/언더플로를 자동 감지·revert 한다.
 * 다만 unchecked 블록 안에서는 이 검사가 꺼진다 → 예전(0.8 이전)의 조용한 오버플로 재현.
 *
 * ❌ VulnerableOverflow: unchecked 남용으로 언더플로가 조용히 통과 → 잔액 조작 가능
 * ✅ SafeOverflow: 0.8+ 기본 동작으로 언더플로 시 자동 revert
 *
 * ⚠️  이 컨트랙트는 취약점 시연 목적으로만 사용. 실제 사용 금지.
 */

// ❌ 취약: unchecked 로 인해 언더플로 조용히 통과 → 잔액이 uint256 최댓값 근처로 튀는 사고
contract VulnerableOverflow {
    mapping(address => uint256) public balances;

    function deposit() external payable {
        // 사용자가 예치
        balances[msg.sender] += msg.value;
    }

    // ❌ unchecked 안에서 balance -= amount 를 그대로 실행 → amount > balance 면 언더플로
    //   → 잔액이 갑자기 uint256 최댓값 근처가 되어 이후 임의 인출 가능
    function transfer(address to, uint256 amount) external {
        unchecked {
            balances[msg.sender] -= amount;  // ← 검사 없음, 언더플로 조용히 통과
            balances[to] += amount;
        }
    }
}

// ✅ 안전: 0.8+ 기본 산술 검사에 맡김 → 언더플로 시 자동 revert
contract SafeOverflow {
    mapping(address => uint256) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    // ✅ unchecked 없음 → amount > balance 면 컴파일러가 자동으로 panic(0x11) revert
    function transfer(address to, uint256 amount) external {
        balances[msg.sender] -= amount;
        balances[to] += amount;
    }
}
