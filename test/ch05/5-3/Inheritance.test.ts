import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Ch05-3 (1/4) — Inheritance", function () {

  describe("기본 상속 (Dog is Animal)", function () {
    async function deploy() {
      const F = await ethers.getContractFactory("Dog");
      const dog = await F.deploy();
      return { dog };
    }

    it("부모 constructor 인자 하드코딩 (Animal(\"Canis lupus\"))", async function () {
      const { dog } = await loadFixture(deploy);
      expect(await dog.species()).to.equal("Canis lupus");
    });

    it("추상 함수 sound() 구현", async function () {
      const { dog } = await loadFixture(deploy);
      expect(await dog.sound()).to.equal("Woof!");
    });

    it("부모 함수 확장 (super 사용해 describe)", async function () {
      const { dog } = await loadFixture(deploy);
      expect(await dog.describe()).to.equal("Dog: Canis lupus");
    });

    it("자식이 재정의 불가한 함수 상속 (isLiving)", async function () {
      const { dog } = await loadFixture(deploy);
      expect(await dog.isLiving()).to.be.true;
    });
  });

  describe("생성자 인자 전달 — 자식 constructor에서", function () {
    it("NamedAnimal 배포 시 자식이 species/name 함께 전달", async function () {
      const F = await ethers.getContractFactory("NamedAnimal");
      const cat = await F.deploy("Felis catus", "Whiskers");
      expect(await cat.species()).to.equal("Felis catus");
      expect(await cat.name()).to.equal("Whiskers");
    });
  });

  describe("다중 상속 + C3 선형화 (MRO)", function () {

    async function deployD() {
      const F = await ethers.getContractFactory("D");
      const d = await F.deploy();
      return { d };
    }

    async function deployE() {
      const F = await ethers.getContractFactory("E");
      const e = await F.deploy();
      return { e };
    }

    /**
     * D is B, C  → linearization: D → C → B → A
     *   D.foo() → super = C.foo (linearization의 바로 다음)
     *   C.foo → super = B.foo
     *   B.foo → super = A.foo
     *   A.foo → trace += "A"
     *   그 다음 각 함수는 자기 문자 append
     *   최종 순서: A → B → C → D 로 append 되지만
     *   append 실행 순서는 A.foo(가장 안쪽), B.foo, C.foo, D.foo
     *   → trace = "A" + "B" + "C" + "D" = "ABCD"
     */
    it("D is B, C → trace = ABCD", async function () {
      const { d } = await loadFixture(deployD);
      await d.foo();
      expect(await d.trace()).to.equal("ABCD");
    });

    /**
     * E is C, B → linearization: E → B → C → A
     *   E.foo() → super = B.foo → super = C.foo → super = A.foo
     *   실행 append 순서: A, C, B, E → "ACBE"
     */
    it("E is C, B → trace = ACBE (순서 뒤집으면 결과도 달라짐)", async function () {
      const { e } = await loadFixture(deployE);
      await e.foo();
      expect(await e.trace()).to.equal("ACBE");
    });
  });
});
