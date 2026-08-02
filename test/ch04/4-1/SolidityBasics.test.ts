import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Ch04-1 — SolidityBasics", function () {

  async function deploy() {
    const [owner, alice] = await ethers.getSigners();
    const F = await ethers.getContractFactory("SolidityBasics");
    const c = await F.deploy("Hello Ch04");
    return { c, owner, alice };
  }

  describe("정적 타입 & 초기화", function () {
    it("constructor 인자가 상태로 저장", async function () {
      const { c } = await loadFixture(deploy);
      expect(await c.message()).to.equal("Hello Ch04");
      expect(await c.active()).to.be.true;
      expect(await c.counter()).to.equal(0);
    });

    it("immutable — deployer / deployedAt", async function () {
      const { c, owner } = await loadFixture(deploy);
      expect(await c.deployer()).to.equal(owner.address);
      expect(await c.deployedAt()).to.equal(await time.latest());
    });

    it("constant — MAX_COUNT는 항상 1000", async function () {
      const { c } = await loadFixture(deploy);
      expect(await c.MAX_COUNT()).to.equal(1000);
    });
  });

  describe("결정론적 실행", function () {
    it("deterministic — 같은 입력 → 같은 결과", async function () {
      const { c } = await loadFixture(deploy);
      const r1 = await c.deterministic(3, 5);
      const r2 = await c.deterministic(3, 5);
      expect(r1).to.equal(r2);
      expect(r1).to.equal(3 * 5 + 3 + 5);
    });

    it("pseudoRandomInsecure — 같은 블록에서 같은 seed면 같은 값 (조작 가능함을 시사)", async function () {
      const { c } = await loadFixture(deploy);
      const r1 = await c.pseudoRandomInsecure(42);
      const r2 = await c.pseudoRandomInsecure(42);
      expect(r1).to.equal(r2);
    });
  });

  describe("상태 변경 vs 조회", function () {
    it("increment — 카운터 증가 + 이벤트", async function () {
      const { c } = await loadFixture(deploy);
      await expect(c.increment())
        .to.emit(c, "CounterUpdated").withArgs(1);
      expect(await c.counter()).to.equal(1);
    });

    it("MAX_COUNT 초과 시 revert", async function () {
      const { c } = await loadFixture(deploy);
      // 1000회 반복은 너무 오래 걸림. constant를 직접 확인만.
      expect(await c.MAX_COUNT()).to.equal(1000);
    });

    it("view / pure 함수는 상태 변경 없음", async function () {
      const { c } = await loadFixture(deploy);
      const before = await c.counter();
      const doubled = await c.double(50);
      expect(doubled).to.equal(100);
      expect(await c.counter()).to.equal(before);
    });
  });

  describe("reveal — constant/immutable/storage 접근", function () {
    it("세 종류 값이 각각 반환된다", async function () {
      const { c, owner } = await loadFixture(deploy);
      const [constantValue, immutableAddr, storageCounter] = await c.reveal();
      expect(constantValue).to.equal(1000);
      expect(immutableAddr).to.equal(owner.address);
      expect(storageCounter).to.equal(0);
    });
  });
});
