import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Ch04-2 — OwnedStorage (SimpleStorage 확장)", function () {

  async function deploy() {
    const [owner, alice, bob] = await ethers.getSigners();
    const F = await ethers.getContractFactory("OwnedStorage");
    const c = await F.deploy();
    return { c, owner, alice, bob };
  }

  describe("배포 상태", function () {
    it("owner가 배포자로 설정", async function () {
      const { c, owner } = await loadFixture(deploy);
      expect(await c.owner()).to.equal(owner.address);
    });

    it("초기 stored=0, history 비어있음", async function () {
      const { c } = await loadFixture(deploy);
      expect(await c.stored()).to.equal(0);
      expect(await c.historyLength()).to.equal(0);
    });
  });

  describe("store — 권한 있는 경우", function () {
    it("owner가 store하면 stored 갱신 + history 추가", async function () {
      const { c } = await loadFixture(deploy);
      await c.store(42);
      await c.store(100);
      expect(await c.stored()).to.equal(100);
      expect(await c.historyLength()).to.equal(2);
      expect(await c.history(0)).to.equal(42);
      expect(await c.history(1)).to.equal(100);
    });

    it("Stored 이벤트가 3개 인자와 함께 발행", async function () {
      const { c, owner } = await loadFixture(deploy);
      await expect(c.store(99))
        .to.emit(c, "Stored")
        .withArgs(owner.address, 99, 0);
    });
  });

  describe("store — 권한 없는 경우", function () {
    it("non-owner가 store 시도 시 revert", async function () {
      const { c, alice } = await loadFixture(deploy);
      await expect(c.connect(alice).store(42))
        .to.be.revertedWith("not owner");
    });
  });

  describe("transferOwnership", function () {
    it("owner가 이전 → 새 owner가 store 가능", async function () {
      const { c, owner, alice } = await loadFixture(deploy);
      await c.transferOwnership(alice.address);
      expect(await c.owner()).to.equal(alice.address);
      await c.connect(alice).store(1);
      expect(await c.stored()).to.equal(1);
    });

    it("이전 후 원 owner는 권한 잃음", async function () {
      const { c, owner, alice } = await loadFixture(deploy);
      await c.transferOwnership(alice.address);
      await expect(c.store(1)).to.be.revertedWith("not owner");
    });

    it("zero address로 이전 시 revert", async function () {
      const { c } = await loadFixture(deploy);
      await expect(c.transferOwnership(ethers.ZeroAddress))
        .to.be.revertedWith("zero addr");
    });
  });
});
