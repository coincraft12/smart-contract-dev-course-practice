import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Ch06 — MyOwnableToken (Ownable2Step + Pausable)", function () {

  async function deploy() {
    const [owner, alice, bob] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyOwnableToken");
    const token = await Factory.deploy();
    return { token, owner, alice, bob };
  }

  describe("Ownable2Step 소유권 이전", function () {
    it("owner가 배포자로 설정된다", async function () {
      const { token, owner } = await loadFixture(deploy);
      expect(await token.owner()).to.equal(owner.address);
    });

    it("transferOwnership 즉시에는 owner가 바뀌지 않는다 (2단계)", async function () {
      const { token, owner, alice } = await loadFixture(deploy);
      await token.transferOwnership(alice.address);
      expect(await token.owner()).to.equal(owner.address);
      expect(await token.pendingOwner()).to.equal(alice.address);
    });

    it("acceptOwnership 후에야 owner가 바뀐다", async function () {
      const { token, alice } = await loadFixture(deploy);
      await token.transferOwnership(alice.address);
      await token.connect(alice).acceptOwnership();
      expect(await token.owner()).to.equal(alice.address);
    });

    it("pending이 아닌 계정이 accept하면 revert", async function () {
      const { token, alice, bob } = await loadFixture(deploy);
      await token.transferOwnership(alice.address);
      await expect(token.connect(bob).acceptOwnership())
        .to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });
  });

  describe("Pausable", function () {
    it("owner가 pause하면 mint가 revert", async function () {
      const { token, alice } = await loadFixture(deploy);
      await token.pause();
      await expect(token.mint(alice.address, 100))
        .to.be.revertedWithCustomError(token, "EnforcedPause");
    });

    it("unpause 후 mint 정상 동작", async function () {
      const { token, alice } = await loadFixture(deploy);
      await token.pause();
      await token.unpause();
      await token.mint(alice.address, 100);
      expect(await token.balances(alice.address)).to.equal(100);
    });

    it("non-owner가 pause 시도 시 revert", async function () {
      const { token, alice } = await loadFixture(deploy);
      await expect(token.connect(alice).pause())
        .to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });
  });

  describe("mint", function () {
    it("owner만 mint 가능", async function () {
      const { token, alice, bob } = await loadFixture(deploy);
      await expect(token.connect(alice).mint(bob.address, 100))
        .to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });

    it("Minted 이벤트 발행", async function () {
      const { token, alice } = await loadFixture(deploy);
      await expect(token.mint(alice.address, 100))
        .to.emit(token, "Minted")
        .withArgs(alice.address, 100);
    });
  });
});
