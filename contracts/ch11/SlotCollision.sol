// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SlotCollision — 프록시 슬롯 충돌로 컨트랙트가 죽는 과정
 * @dev Ch11 실습 파일 ② (강의자료 슬라이드 15·20 · "슬롯 충돌 실습" 핵심 과제)
 *
 * ── 시나리오 ─────────────────────────────────────────────────
 *   BrokenProxy 는 슬롯 0 에 로직 컨트랙트 주소를 저장한다.
 *   LogicWithStorage 도 슬롯 0 에 totalSupply(uint256) 를 선언했다.
 *   delegatecall 은 LogicWithStorage 의 코드를 BrokenProxy 의 storage 에서
 *   실행하므로, mint(1000) 을 부르면 슬롯 0 에 1000 이 쓰인다.
 *
 *   그 순간 프록시가 가리키던 로직 주소가 숫자 1000 으로 덮어써지고,
 *   다음 forward() 는 코드 없는 주소로 delegatecall 하게 되어
 *   되돌아온다 → 프록시가 죽는다.
 *
 * ── 강의 슬라이드 15 인용 ───────────────────────────────────
 *   "delegatecall 로 B 가 totalSupply 를 쓰는 순간,
 *    A 의 로직 주소가 숫자로 덮어써진다 → 프록시가 죽는다."
 *
 * ── 실무 해법 ────────────────────────────────────────────────
 *   ERC-1967 이 keccak256("eip1967.proxy.implementation") - 1 의
 *   먼 슬롯에 로직 주소를 두어 이 충돌을 구조적으로 막는다.
 *   실습에서 UUPSUpgradeable 을 상속하는 순간 이 처리가 내장된다 (Ch12~14).
 */

contract LogicWithStorage {
    uint256 public totalSupply;                        // 슬롯 0 ← 여기가 문제
    mapping(address => uint256) public balanceOf;      // 슬롯 1

    function mint(uint256 amount) public {
        totalSupply += amount;
        balanceOf[msg.sender] += amount;
    }
}

contract BrokenProxy {
    // ⚠️ 순차 슬롯에 로직 주소를 둔 잘못된 프록시 (ERC-1967 미준수)
    address public implementation;   // 슬롯 0 ← LogicWithStorage.totalSupply 와 충돌

    constructor(address _impl) {
        implementation = _impl;
    }

    /// 로직으로 mint 를 위임한다. 성공하는 순간 슬롯 0 이 오염된다.
    function forward(uint256 amount) public {
        (bool ok, ) = implementation.delegatecall(
            abi.encodeWithSignature("mint(uint256)", amount)
        );
        require(ok, "delegatecall failed");
    }
}

/**
 * @title SafeProxy — 슬롯 충돌을 구조적으로 회피하는 최소 프록시
 * @dev ERC-1967 방식의 축약 — 로직 주소를 keccak256("eip1967...")-1 의
 *      먼 슬롯에 assembly 로 저장/읽어 순차 슬롯과 겹치지 않게 한다.
 *      실습에서 forward(1000) 후 여전히 로직을 가리키는지 확인한다.
 */
contract SafeProxy {
    // keccak256("eip1967.proxy.implementation") - 1
    bytes32 private constant _IMPL_SLOT =
        0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    constructor(address _impl) {
        assembly { sstore(_IMPL_SLOT, _impl) }
    }

    function implementation() public view returns (address impl) {
        assembly { impl := sload(_IMPL_SLOT) }
    }

    function forward(uint256 amount) public {
        address impl;
        assembly { impl := sload(_IMPL_SLOT) }
        (bool ok, ) = impl.delegatecall(
            abi.encodeWithSignature("mint(uint256)", amount)
        );
        require(ok, "delegatecall failed");
    }
}
