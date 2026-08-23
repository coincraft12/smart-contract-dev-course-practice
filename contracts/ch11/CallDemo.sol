// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CallDemo — call vs delegatecall 콜 컨텍스트 시연
 * @dev Ch11 실습 파일 ① (강의자료 슬라이드 20 참조)
 *
 * ── 학습 목표 ────────────────────────────────────────────────
 *   1) 같은 Callee 를 call 로도 delegatecall 로도 불러 보고
 *      msg.sender / storage 가 어디에 기록되는지 눈으로 확인한다.
 *   2) 저수준 call 의 반환값 ok 를 무시하면 어떻게 되는지 관찰한다.
 *
 * ── 핵심 대조 (강의자료 슬라이드 11) ─────────────────────────
 *   구분            실행 storage      msg.sender        tx.origin
 *   call            Callee (피호출)   Caller 주소       최초 EOA
 *   delegatecall    Caller (호출자)   최초 EOA          최초 EOA
 *
 *   tx.origin 은 call/delegatecall 무관하게 항상 최초 EOA.
 *   msg.sender 는 직전 호출자로 매 단계마다 바뀐다.
 */

contract Callee {
    uint256 public value;   // 슬롯 0
    address public sender;  // 슬롯 1
    address public origin;  // 슬롯 2

    function setValue(uint256 _value) public {
        value  = _value;
        sender = msg.sender;
        origin = tx.origin;
    }

    // 항상 실패하는 함수 — 저수준 call 의 ok 반환값 관찰용
    function alwaysRevert() public pure {
        revert("Callee: intentional revert");
    }
}

contract Caller {
    // ⚠️ Callee 와 동일한 슬롯 배치 — delegatecall 정확성의 전제.
    //    (다음 슬라이드에서 이 전제를 일부러 깬 SlotCollision 을 본다.)
    uint256 public value;   // 슬롯 0
    address public sender;  // 슬롯 1
    address public origin;  // 슬롯 2

    address public calleeAddr;

    constructor(address _callee) {
        calleeAddr = _callee;
    }

    /// delegatecall — Callee 코드를 Caller 의 context 에서 실행
    ///   storage    → Caller 에 기록 ★
    ///   msg.sender → 원래 EOA 유지
    function forwardDelegate(uint256 _value) public {
        (bool ok, ) = calleeAddr.delegatecall(
            abi.encodeWithSignature("setValue(uint256)", _value)
        );
        require(ok, "delegatecall failed");
    }

    /// call — Callee 를 독립 컨트랙트로 호출
    ///   storage    → Callee 자신에게 기록
    ///   msg.sender → Caller 주소로 바뀐다
    function forwardCall(uint256 _value) public {
        (bool ok, ) = calleeAddr.call(
            abi.encodeWithSignature("setValue(uint256)", _value)
        );
        require(ok, "call failed");
    }

    /// 저수준 call 반환값 ok 를 require 로 검사하는 안전한 형태 (권장)
    function callChecked() public returns (bool) {
        (bool ok, ) = calleeAddr.call(
            abi.encodeWithSignature("alwaysRevert()")
        );
        require(ok, "external call failed");
        return ok;
    }

    /// 반환값을 무시하는 위험한 형태 — 실패해도 조용히 다음 줄로 진행한다.
    /// 실행 후 didRunAfter 가 true 로 남는 것을 관찰한다.
    bool public didRunAfter;
    function callIgnored() public {
        // solhint-disable-next-line
        calleeAddr.call(abi.encodeWithSignature("alwaysRevert()"));
        // ↑ ok 를 검사하지 않는다. 실패해도 아래 줄이 실행된다.
        didRunAfter = true;
    }
}
