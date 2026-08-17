// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Proxy
 * @dev Ch11 실습 — call / delegatecall 차이 시연
 *
 * ── 배포 순서 ────────────────────────────────────────────────
 *   1. Logic.sol 먼저 배포 → 주소 복사
 *   2. Proxy(Logic주소) 배포
 *
 * ── 핵심 비교 ────────────────────────────────────────────────
 *   구분            storage 기록 위치   msg.sender      tx.origin
 *   delegatecall    Proxy (호출자)      최초 EOA         최초 EOA
 *   call            Logic (피호출자)    Proxy 주소       최초 EOA
 *
 *   tx.origin은 call/delegatecall 무관하게 항상 최초 EOA 고정.
 *   msg.sender는 직전 호출자로 매 단계마다 바뀐다.
 *
 * 검증은 test/ch12/ProxyDelegatecall.test.ts 실행으로 자동화됨.
 */

contract Proxy {
    uint256 public value;   // 슬롯 0 — Logic과 동일 배치 (delegatecall 필수 조건)
    address public sender;  // 슬롯 1
    address public origin;  // 슬롯 2

    address public logicAddr;

    constructor(address _logic) {
        logicAddr = _logic;
    }

    // delegatecall — Logic 코드를 Proxy의 context에서 실행
    //   storage → Proxy에 기록
    //   msg.sender → 원래 호출자(내 지갑) 유지
    function forwardDelegate(uint256 _value) public {
        (bool ok, ) = logicAddr.delegatecall(
            abi.encodeWithSignature("setValue(uint256)", _value)
        );
        require(ok, "delegatecall failed");
    }

    // call — Logic을 독립 컨트랙트로 호출
    //   storage → Logic에 기록
    //   msg.sender → Proxy 주소로 변경됨
    function forwardCall(uint256 _value) public {
        (bool ok, ) = logicAddr.call(
            abi.encodeWithSignature("setValue(uint256)", _value)
        );
        require(ok, "call failed");
    }
}
