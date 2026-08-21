// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Logic
 * @dev Ch11 실습 — Proxy가 call/delegatecall로 호출하는 구현체
 *
 * setValue() 호출 시 msg.sender / tx.origin을 함께 기록해
 * 두 호출 방식의 context 차이를 직접 확인한다.
 *
 * ── 확인 시나리오 (test/ch12/ProxyDelegatecall.test.ts 참조) ──
 *   Proxy.forwardDelegate(42) 후:
 *     Logic.value  → 0      (Logic storage 변화 없음)
 *     Logic.sender → 0x0
 *
 *   Proxy.forwardCall(99) 후:
 *     Logic.value  → 99                (Logic 자신의 storage에 기록)
 *     Logic.sender → Proxy 주소        (msg.sender = Proxy)
 *     Logic.origin → 최초 EOA 주소     (tx.origin은 항상 최초 EOA)
 */

contract Logic {
    uint256 public value;   // 슬롯 0
    address public sender;  // 슬롯 1
    address public origin;  // 슬롯 2

    function setValue(uint256 _value) public {
        value  = _value;
        sender = msg.sender;
        origin = tx.origin;
    }
}
