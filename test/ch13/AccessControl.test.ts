import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

/**
 * Ch13 — Access Control 유형 1 (미인증 함수) 실습
 *   대본 13-1 슬라이드 14 대응
 *
 * 검증 시나리오:
 * 1. VulnerableAccess.setAdmin — modifier 없음 → 임의 EOA 가 관리자 탈취 성공 (공격 성공)
 * 2. SafeAccess.setAdmin — onlyRole(DEFAULT_ADMIN_ROLE) → 임의 EOA 호출 시 revert
 * 3. SafeAccess.setAdmin — 기존 admin 은 정상 호출 가능
 */
describe("Ch13 — Access Control (유형 1 · 미인증 함수)", function () {

  // ── VulnerableAccess: 잠기지 않은 문 ─────────────────
  describe("VulnerableAccess (setAdmin modifier 없음)", function () {

    async function deployVulnerable() {
      const [owner, attacker] = await ethers.getSigners();
      const Factory = await ethers.getContractFactory("VulnerableAccess");
      const vuln = await Factory.connect(owner).deploy();
      await vuln.waitForDeployment();
      return { vuln, owner, attacker };
    }

    it("배포 직후 admin 은 배포자", async function () {
      const { vuln, owner } = await loadFixture(deployVulnerable);
      expect(await vuln.admin()).to.equal(owner.address);
    });

    it("공격자가 setAdmin 을 호출해 관리자 권한을 탈취한다", async function () {
      const { vuln, attacker } = await loadFixture(deployVulnerable);
      await vuln.connect(attacker).setAdmin(attacker.address);
      expect(await vuln.admin()).to.equal(attacker.address);
    });
  });

  // ── SafeAccess: onlyRole 로 잠긴 문 ─────────────────
  describe("SafeAccess (onlyRole(DEFAULT_ADMIN_ROLE))", function () {

    async function deploySafe() {
      const [owner, attacker, newAdmin] = await ethers.getSigners();
      const Factory = await ethers.getContractFactory("SafeAccess");
      const safe = await Factory.connect(owner).deploy();
      await safe.waitForDeployment();
      return { safe, owner, attacker, newAdmin };
    }

    it("공격자의 setAdmin 호출은 AccessControlUnauthorizedAccount 로 revert", async function () {
      const { safe, attacker } = await loadFixture(deploySafe);
      await expect(
        safe.connect(attacker).setAdmin(attacker.address)
      ).to.be.revertedWithCustomError(safe, "AccessControlUnauthorizedAccount");
    });

    it("기존 admin(=배포자) 은 정상적으로 setAdmin 호출 가능", async function () {
      const { safe, owner, newAdmin } = await loadFixture(deploySafe);
      await safe.connect(owner).setAdmin(newAdmin.address);
      expect(await safe.admin()).to.equal(newAdmin.address);
    });
  });
});
