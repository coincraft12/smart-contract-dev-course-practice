import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Ch04 — SimpleStorage", function () {

  async function deploy() {
    const [owner, alice, bob] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleStorage");
    const storage = await Factory.deploy();
    return { storage, owner, alice, bob };
  }

  // ── 초기 상태 ────────────────────────────────────
  describe("초기 상태", function () {
    it("초기 저장값은 0이어야 한다", async function () {
      const { storage } = await loadFixture(deploy);
      expect(await storage.retrieve()).to.equal(0);
    });

    it("updateCount 초기값은 0이어야 한다", async function () {
      const { storage } = await loadFixture(deploy);
      expect(await storage.updateCount()).to.equal(0);
    });

    it("lastUpdater 초기값은 zero address이어야 한다", async function () {
      const { storage } = await loadFixture(deploy);
      expect(await storage.lastUpdater()).to.equal(ethers.ZeroAddress);
    });
  });

  // ── store() ──────────────────────────────────────
  describe("store()", function () {
    it("숫자를 저장하고 retrieve()로 읽을 수 있다", async function () {
      const { storage } = await loadFixture(deploy);
      await storage.store(42);
      expect(await storage.retrieve()).to.equal(42);
    });

    it("여러 번 호출하면 마지막 값이 저장된다", async function () {
      const { storage } = await loadFixture(deploy);
      await storage.store(10);
      await storage.store(20);
      await storage.store(30);
      expect(await storage.retrieve()).to.equal(30);
    });

    it("lastUpdater가 호출자 주소로 업데이트된다", async function () {
      const { storage, alice } = await loadFixture(deploy);
      await storage.connect(alice).store(99);
      expect(await storage.lastUpdater()).to.equal(alice.address);
    });

    it("updateCount가 호출마다 1씩 증가한다", async function () {
      const { storage, alice, bob } = await loadFixture(deploy);
      await storage.connect(alice).store(1);
      await storage.connect(bob).store(2);
      await storage.connect(alice).store(3);
      expect(await storage.updateCount()).to.equal(3);
    });

    it("NumberStored 이벤트가 발생한다", async function () {
      const { storage, alice } = await loadFixture(deploy);
      await expect(storage.connect(alice).store(42))
        .to.emit(storage, "NumberStored")
        .withArgs(alice.address, 42);
    });
  });

  // ── doubled() ────────────────────────────────────
  describe("doubled()", function () {
    it("저장된 숫자의 두 배를 반환한다", async function () {
      const { storage } = await loadFixture(deploy);
      await storage.store(21);
      expect(await storage.doubled()).to.equal(42);
    });

    it("초기 상태에서는 0을 반환한다", async function () {
      const { storage } = await loadFixture(deploy);
      expect(await storage.doubled()).to.equal(0);
    });
  });
});
