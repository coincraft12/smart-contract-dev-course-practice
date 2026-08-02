// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Inheritance
 * @dev Ch05-3 실습 (1/4) — 상속
 *
 * 학습 포인트:
 * - 기본 상속 (is 키워드)
 * - 상속되는 것 vs 안 되는 것
 * - 생성자 인자 전달 방식 2가지 (선언 시 / 자식 constructor에서)
 * - virtual / override / super
 * - 다중 상속과 C3 선형화 (MRO)
 * - 추상 컨트랙트 (abstract)
 */

// ── 추상 컨트랙트 ──────────────────────────────────
abstract contract Animal {
    string public species;

    constructor(string memory _species) {
        species = _species;
    }

    /// 자식이 반드시 구현 (본문 없음)
    function sound() external view virtual returns (string memory);

    /// 자식이 확장 가능 (override 가능)
    function describe() external view virtual returns (string memory) {
        return species;
    }

    /// 자식이 재정의 불가
    function isLiving() external pure returns (bool) {
        return true;
    }
}

// ── 기본 상속 ──────────────────────────────────────
contract Dog is Animal {
    // 방법 1: 상속 선언 시 인자 전달 (하드코딩)
    constructor() Animal("Canis lupus") {}

    function sound() external pure override returns (string memory) {
        return "Woof!";
    }

    // Animal.describe를 확장 — super 사용해 부모 결과 활용
    function describe() external view override returns (string memory) {
        return string.concat("Dog: ", species);
    }
}

// ── 생성자 인자 전달 — 방법 2 ──────────────────────
contract NamedAnimal is Animal {
    string public name;

    // 자식 constructor 인자로 부모 constructor 인자 전달
    constructor(string memory _species, string memory _name) Animal(_species) {
        name = _name;
    }

    function sound() external pure override returns (string memory) {
        return "???";
    }
}

// ── 다중 상속 + C3 선형화 (MRO) ────────────────────

/**
 * @dev A → B → C → D 다이아몬드 상속에서 super 호출 순서를 확인.
 *      Solidity는 C3 linearization을 쓰며,
 *      선언 순서 오른쪽에 가까울수록 "더 base(부모)"에 해당.
 *
 *      contract D is B, C  → 선형화 순서: D → C → B → A
 *      D.foo() 안에서 super.foo() 호출 시 C.foo가 먼저,
 *      C.foo가 super.foo 호출 시 B.foo가 실행.
 */

contract A {
    string public trace;
    function foo() public virtual {
        trace = string.concat(trace, "A");
    }
}

contract B is A {
    function foo() public virtual override {
        super.foo();
        trace = string.concat(trace, "B");
    }
}

contract C is A {
    function foo() public virtual override {
        super.foo();
        trace = string.concat(trace, "C");
    }
}

/**
 * @dev is B, C 순서 → linearization: D → C → B → A
 *      D.foo() → super = C.foo → super = B.foo → super = A.foo
 *      결과 trace: "ACB D"  (append 순서: A→C→B→D)
 */
contract D is B, C {
    function foo() public override(B, C) {
        super.foo(); // C.foo 호출 (linearization 상 첫 super)
        trace = string.concat(trace, "D");
    }
}

/**
 * @dev is C, B 순서 → linearization: E → B → C → A
 *      E.foo() → super = B.foo → super = C.foo → super = A.foo
 *      결과 trace: "ACB" → "ACBE" ... 실제로는 A→(next)→...
 *      정확히는 A → C → B → E
 */
contract E is C, B {
    function foo() public override(B, C) {
        super.foo();
        trace = string.concat(trace, "E");
    }
}
