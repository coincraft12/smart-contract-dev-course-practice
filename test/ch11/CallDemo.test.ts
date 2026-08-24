import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

/**
 * Ch11 실습 ① — CallDemo (call vs delegatecall 콜 컨텍스트)
 *
 * 슬라이드 08~11 · 20 검증:
 *   - forwardDelegate → A storage 변경 · msg.sender 원래 EOA 유지
 *   - forwardCall     → B storage 변경 · msg.sender = A 주소
 *   - tx.origin 은 어느 경로든 항상 최초 EOA
 *   - 저수준 call ok 무시 시 실패해도 다음 줄이 실행됨
 */
describe("Ch11 — CallDemo (msg.sender · call · delegatecall)", function () {

  async function deployFixture() {
    const [owner, alice] = await ethers.getSigners();
    const B = await ethers.getContractFactory("BContract");
    const b = await B.deploy();
    const A = await ethers.getContractFactory("AContract");
    const a = await A.deploy(await b.getAddress());
    return { b, a, owner, alice };
  }

  describe("delegatecall — A storage 에 기록", function () {
    it("A.value 가 바뀌고 B.value 는 그대로다", async function () {
      const { b, a } = await loadFixture(deployFixture);
      await a.forwardDelegate(42);
      expect(await a.value()).to.equal(42);
      expect(await b.value()).to.equal(0);
    });

    it("A.sender = 원래 EOA (msg.sender 유지)", async function () {
      const { a, alice } = await loadFixture(deployFixture);
      await a.connect(alice).forwardDelegate(42);
      expect(await a.sender()).to.equal(alice.address);
    });

    it("A.origin = 원래 EOA (tx.origin 유지)", async function () {
      const { a, alice } = await loadFixture(deployFixture);
      await a.connect(alice).forwardDelegate(42);
      expect(await a.origin()).to.equal(alice.address);
    });
  });

  describe("call — B storage 에 기록", function () {
    it("B.value 가 바뀌고 A.value 는 그대로다", async function () {
      const { b, a } = await loadFixture(deployFixture);
      await a.forwardCall(99);
      expect(await b.value()).to.equal(99);
      expect(await a.value()).to.equal(0);
    });

    it("B.sender = A 주소 (msg.sender 가 바뀐다)", async function () {
      const { b, a, alice } = await loadFixture(deployFixture);
      await a.connect(alice).forwardCall(99);
      expect(await b.sender()).to.equal(await a.getAddress());
    });

    it("B.origin = 원래 EOA (tx.origin 은 유지)", async function () {
      const { b, a, alice } = await loadFixture(deployFixture);
      await a.connect(alice).forwardCall(99);
      expect(await b.origin()).to.equal(alice.address);
    });
  });

  describe("저수준 call 의 반환값 처리 (슬라이드 9)", function () {
    it("ok 를 require 로 검사하면 실패가 revert 로 전파된다", async function () {
      const { a } = await loadFixture(deployFixture);
      await expect(a.callChecked()).to.be.revertedWith(
        "external call failed"
      );
    });

    it("ok 를 무시하면 실패해도 다음 줄이 실행된다 (didRunAfter = true)", async function () {
      const { a } = await loadFixture(deployFixture);
      await a.callIgnored();
      // 내부 alwaysRevert() 는 실패했지만 트랜잭션은 성공했고,
      // 그 다음 줄의 상태변경은 반영되었다.
      expect(await a.didRunAfter()).to.equal(true);
    });
  });
});
