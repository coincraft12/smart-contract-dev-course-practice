import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

/**
 * Ch11 실습 ① — CallDemo (call vs delegatecall 콜 컨텍스트)
 *
 * 슬라이드 08~11 · 20 검증:
 *   - forwardDelegate → Caller storage 변경 · msg.sender 원래 EOA 유지
 *   - forwardCall     → Callee storage 변경 · msg.sender = Caller 주소
 *   - tx.origin 은 어느 경로든 항상 최초 EOA
 *   - 저수준 call ok 무시 시 실패해도 다음 줄이 실행됨
 */
describe("Ch11 — CallDemo (msg.sender · call · delegatecall)", function () {

  async function deployFixture() {
    const [owner, alice] = await ethers.getSigners();
    const Callee = await ethers.getContractFactory("Callee");
    const callee = await Callee.deploy();
    const Caller = await ethers.getContractFactory("Caller");
    const caller = await Caller.deploy(await callee.getAddress());
    return { callee, caller, owner, alice };
  }

  describe("delegatecall — Caller storage 에 기록", function () {
    it("Caller.value 가 바뀌고 Callee.value 는 그대로다", async function () {
      const { callee, caller } = await loadFixture(deployFixture);
      await caller.forwardDelegate(42);
      expect(await caller.value()).to.equal(42);
      expect(await callee.value()).to.equal(0);
    });

    it("Caller.sender = 원래 EOA (msg.sender 유지)", async function () {
      const { caller, alice } = await loadFixture(deployFixture);
      await caller.connect(alice).forwardDelegate(42);
      expect(await caller.sender()).to.equal(alice.address);
    });

    it("Caller.origin = 원래 EOA (tx.origin 유지)", async function () {
      const { caller, alice } = await loadFixture(deployFixture);
      await caller.connect(alice).forwardDelegate(42);
      expect(await caller.origin()).to.equal(alice.address);
    });
  });

  describe("call — Callee storage 에 기록", function () {
    it("Callee.value 가 바뀌고 Caller.value 는 그대로다", async function () {
      const { callee, caller } = await loadFixture(deployFixture);
      await caller.forwardCall(99);
      expect(await callee.value()).to.equal(99);
      expect(await caller.value()).to.equal(0);
    });

    it("Callee.sender = Caller 주소 (msg.sender 가 바뀐다)", async function () {
      const { callee, caller, alice } = await loadFixture(deployFixture);
      await caller.connect(alice).forwardCall(99);
      expect(await callee.sender()).to.equal(await caller.getAddress());
    });

    it("Callee.origin = 원래 EOA (tx.origin 은 유지)", async function () {
      const { callee, caller, alice } = await loadFixture(deployFixture);
      await caller.connect(alice).forwardCall(99);
      expect(await callee.origin()).to.equal(alice.address);
    });
  });

  describe("저수준 call 의 반환값 처리 (슬라이드 9)", function () {
    it("ok 를 require 로 검사하면 실패가 revert 로 전파된다", async function () {
      const { caller } = await loadFixture(deployFixture);
      await expect(caller.callChecked()).to.be.revertedWith(
        "external call failed"
      );
    });

    it("ok 를 무시하면 실패해도 다음 줄이 실행된다 (didRunAfter = true)", async function () {
      const { caller } = await loadFixture(deployFixture);
      await caller.callIgnored();
      // 내부 alwaysRevert() 는 실패했지만 트랜잭션은 성공했고,
      // 그 다음 줄의 상태변경은 반영되었다.
      expect(await caller.didRunAfter()).to.equal(true);
    });
  });
});
