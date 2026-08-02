import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Ch04-3 — Lock (Hardhat Starter)", function () {

  const ONE_YEAR = 365n * 24n * 60n * 60n;
  const ONE_GWEI = 1_000_000_000n;

  async function deploy() {
    const [owner, alice] = await ethers.getSigners();
    const now = BigInt(await time.latest());
    const unlockTime = now + ONE_YEAR;

    const F = await ethers.getContractFactory("Lock");
    const lock = await F.deploy(unlockTime, { value: ONE_GWEI });

    return { lock, owner, alice, unlockTime };
  }

  describe("배포", function () {
    it("unlockTime과 owner가 설정된다", async function () {
      const { lock, owner, unlockTime } = await loadFixture(deploy);
      expect(await lock.unlockTime()).to.equal(unlockTime);
      expect(await lock.owner()).to.equal(owner.address);
    });

    it("배포 시 보낸 ETH가 컨트랙트에 예치된다", async function () {
      const { lock } = await loadFixture(deploy);
      expect(await ethers.provider.getBalance(await lock.getAddress()))
        .to.equal(ONE_GWEI);
    });

    it("과거 시각으로 배포 시 revert", async function () {
      const past = BigInt(await time.latest()) - 100n;
      const F = await ethers.getContractFactory("Lock");
      await expect(F.deploy(past, { value: ONE_GWEI }))
        .to.be.revertedWith("Unlock time should be in the future");
    });
  });

  describe("withdraw", function () {
    it("unlockTime 전에는 revert", async function () {
      const { lock } = await loadFixture(deploy);
      await expect(lock.withdraw())
        .to.be.revertedWith("You can't withdraw yet");
    });

    it("unlockTime 이후 owner가 인출하면 잔액 이동", async function () {
      const { lock, owner, unlockTime } = await loadFixture(deploy);
      await time.increaseTo(unlockTime);

      await expect(lock.withdraw())
        .to.emit(lock, "Withdrawal");
      // 컨트랙트 잔액 0
      expect(await ethers.provider.getBalance(await lock.getAddress()))
        .to.equal(0);
    });

    it("unlockTime 이후 non-owner가 시도하면 revert", async function () {
      const { lock, alice, unlockTime } = await loadFixture(deploy);
      await time.increaseTo(unlockTime);
      await expect(lock.connect(alice).withdraw())
        .to.be.revertedWith("You aren't the owner");
    });
  });

  describe("time helper (Hardhat network-helpers)", function () {
    it("time.increaseTo — 특정 시각으로 점프", async function () {
      const { lock, unlockTime } = await loadFixture(deploy);
      expect(await time.latest()).to.be.lt(unlockTime);
      await time.increaseTo(unlockTime);
      expect(await time.latest()).to.equal(unlockTime);
    });
  });
});
