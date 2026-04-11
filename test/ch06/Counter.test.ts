import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Ch06 — Counter", function () {

  async function deploy() {
    const [owner, alice, bob] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Counter");
    const counter = await Factory.deploy();
    return { counter, owner, alice, bob };
  }

  // ── 초기 상태 ────────────────────────────────────
  describe("초기 상태", function () {
    it("count 초기값은 0이어야 한다", async function () {
      const { counter } = await loadFixture(deploy);
      expect(await counter.count()).to.equal(0);
    });

    it("owner가 배포자로 설정되어야 한다", async function () {
      const { counter, owner } = await loadFixture(deploy);
      expect(await counter.owner()).to.equal(owner.address);
    });
  });

  // ── increment() ──────────────────────────────────
  describe("increment()", function () {
    it("count가 1 증가해야 한다", async function () {
      const { counter } = await loadFixture(deploy);
      await counter.increment();
      expect(await counter.count()).to.equal(1);
    });

    it("여러 번 호출하면 누적된다", async function () {
      const { counter, alice } = await loadFixture(deploy);
      await counter.connect(alice).increment();
      await counter.connect(alice).increment();
      await counter.connect(alice).increment();
      expect(await counter.count()).to.equal(3);
    });

    it("Incremented 이벤트가 발생해야 한다", async function () {
      const { counter, alice } = await loadFixture(deploy);
      await expect(counter.connect(alice).increment())
        .to.emit(counter, "Incremented")
        .withArgs(alice.address, 1);
    });
  });

  // ── decrement() ──────────────────────────────────
  describe("decrement()", function () {
    it("count가 1 감소해야 한다", async function () {
      const { counter } = await loadFixture(deploy);
      await counter.increment();
      await counter.increment();
      await counter.decrement();
      expect(await counter.count()).to.equal(1);
    });

    it("count가 0일 때 decrement 시 CannotGoNegative 에러가 발생해야 한다", async function () {
      const { counter } = await loadFixture(deploy);
      await expect(counter.decrement())
        .to.be.revertedWithCustomError(counter, "CannotGoNegative");
    });

    it("Decremented 이벤트가 발생해야 한다", async function () {
      const { counter } = await loadFixture(deploy);
      await counter.increment();
      await expect(counter.decrement())
        .to.emit(counter, "Decremented")
        .withArgs((await ethers.getSigners())[0].address, 0);
    });
  });

  // ── incrementBy() ────────────────────────────────
  describe("incrementBy()", function () {
    it("지정한 만큼 증가해야 한다", async function () {
      const { counter } = await loadFixture(deploy);
      await counter.incrementBy(10);
      expect(await counter.count()).to.equal(10);
    });

    it("0 입력 시 revert되어야 한다", async function () {
      const { counter } = await loadFixture(deploy);
      await expect(counter.incrementBy(0))
        .to.be.revertedWith("Amount must be positive");
    });
  });

  // ── reset() ──────────────────────────────────────
  describe("reset()", function () {
    it("owner가 reset하면 count가 0이 되어야 한다", async function () {
      const { counter, owner } = await loadFixture(deploy);
      await counter.incrementBy(100);
      await counter.connect(owner).reset();
      expect(await counter.count()).to.equal(0);
    });

    it("non-owner가 reset하면 NotOwner 에러가 발생해야 한다", async function () {
      const { counter, alice } = await loadFixture(deploy);
      await counter.incrementBy(10);
      await expect(counter.connect(alice).reset())
        .to.be.revertedWithCustomError(counter, "NotOwner")
        .withArgs(alice.address);
    });

    it("Reset 이벤트가 발생해야 한다", async function () {
      const { counter, owner } = await loadFixture(deploy);
      await expect(counter.connect(owner).reset())
        .to.emit(counter, "Reset")
        .withArgs(owner.address);
    });
  });
});
