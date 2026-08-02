import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Ch06 — RoleBasedVault (AccessControl)", function () {

  async function deploy() {
    const [admin, minter, withdrawer, alice, bob] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("RoleBasedVault");
    const vault = await Factory.deploy(admin.address);

    const MINTER_ROLE     = await vault.MINTER_ROLE();
    const PAUSER_ROLE     = await vault.PAUSER_ROLE();
    const WITHDRAWER_ROLE = await vault.WITHDRAWER_ROLE();
    const DEFAULT_ADMIN_ROLE = await vault.DEFAULT_ADMIN_ROLE();

    await vault.connect(admin).grantRole(MINTER_ROLE, minter.address);

    return {
      vault, admin, minter, withdrawer, alice, bob,
      MINTER_ROLE, PAUSER_ROLE, WITHDRAWER_ROLE, DEFAULT_ADMIN_ROLE,
    };
  }

  describe("역할 부여/조회", function () {
    it("admin이 DEFAULT_ADMIN_ROLE을 보유", async function () {
      const { vault, admin, DEFAULT_ADMIN_ROLE } = await loadFixture(deploy);
      expect(await vault.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("minter는 MINTER_ROLE 보유", async function () {
      const { vault, minter, MINTER_ROLE } = await loadFixture(deploy);
      expect(await vault.hasRole(MINTER_ROLE, minter.address)).to.be.true;
    });
  });

  describe("역할 계층 (MINTER가 WITHDRAWER 부여)", function () {
    it("MINTER는 WITHDRAWER_ROLE을 부여할 수 있다", async function () {
      const { vault, minter, withdrawer, WITHDRAWER_ROLE } = await loadFixture(deploy);
      await vault.connect(minter).grantRole(WITHDRAWER_ROLE, withdrawer.address);
      expect(await vault.hasRole(WITHDRAWER_ROLE, withdrawer.address)).to.be.true;
    });

    it("admin은 WITHDRAWER_ROLE을 직접 부여할 수 없다", async function () {
      const { vault, admin, withdrawer, WITHDRAWER_ROLE } = await loadFixture(deploy);
      // admin은 WITHDRAWER의 admin이 아님 (MINTER가 admin)
      await expect(vault.connect(admin).grantRole(WITHDRAWER_ROLE, withdrawer.address))
        .to.be.revertedWithCustomError(vault, "AccessControlUnauthorizedAccount");
    });
  });

  describe("issue / withdraw 흐름", function () {
    it("MINTER가 issue 하면 credits 증가", async function () {
      const { vault, minter, alice } = await loadFixture(deploy);
      await vault.connect(minter).issue(alice.address, 1000);
      expect(await vault.credits(alice.address)).to.equal(1000);
      expect(await vault.totalCredits()).to.equal(1000);
    });

    it("MINTER가 아니면 issue revert", async function () {
      const { vault, alice, bob } = await loadFixture(deploy);
      await expect(vault.connect(alice).issue(bob.address, 100))
        .to.be.revertedWithCustomError(vault, "AccessControlUnauthorizedAccount");
    });

    it("WITHDRAWER가 아니면 withdraw revert", async function () {
      const { vault, minter, alice } = await loadFixture(deploy);
      await vault.connect(minter).issue(alice.address, 1000);
      await expect(vault.connect(alice).withdraw(alice.address, 500))
        .to.be.revertedWithCustomError(vault, "AccessControlUnauthorizedAccount");
    });

    it("WITHDRAWER가 withdraw 하면 credits 감소", async function () {
      const { vault, minter, withdrawer, alice, WITHDRAWER_ROLE } = await loadFixture(deploy);
      await vault.connect(minter).grantRole(WITHDRAWER_ROLE, withdrawer.address);
      await vault.connect(minter).issue(alice.address, 1000);
      await vault.connect(withdrawer).withdraw(alice.address, 300);
      expect(await vault.credits(alice.address)).to.equal(700);
    });
  });

  describe("Pausable", function () {
    it("PAUSER (admin)가 pause 후 issue revert", async function () {
      const { vault, admin, minter, alice } = await loadFixture(deploy);
      await vault.connect(admin).pause();
      await expect(vault.connect(minter).issue(alice.address, 100))
        .to.be.revertedWithCustomError(vault, "EnforcedPause");
    });
  });
});
