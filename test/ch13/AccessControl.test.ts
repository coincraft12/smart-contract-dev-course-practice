import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

/**
 * Ch13 — 접근 제어 실수 (대본 13-1 슬라이드 13~15 대응)
 *
 * 검증 시나리오:
 * 1. VulnerableAccess: 권한 검사 부재 → 임의 EOA가 owner 변경·자금 인출 성공 (공격 성공 = 취약)
 * 2. SafeAccess: OpenZeppelin AccessControl → 미인가 EOA는 revert (방어 성공)
 */
describe("Ch13 — Access Control", function () {

  // ── VulnerableAccess: 방치된 열린 문 ─────────────────
  describe("VulnerableAccess (권한 검사 없음)", function () {

    async function deployVulnerable() {
      const [owner, attacker] = await ethers.getSigners();
      const Factory = await ethers.getContractFactory("VulnerableAccess");
      const vuln = await Factory.connect(owner).deploy({ value: ethers.parseEther("10") });
      await vuln.waitForDeployment();
      return { vuln, owner, attacker };
    }

    it("공격자가 setOwner 로 소유권을 탈취한다", async function () {
      const { vuln, attacker } = await loadFixture(deployVulnerable);
      await vuln.connect(attacker).setOwner(attacker.address);
      expect(await vuln.owner()).to.equal(attacker.address);
    });

    it("공격자가 withdraw 로 자금 전액을 뽑아간다", async function () {
      const { vuln, attacker } = await loadFixture(deployVulnerable);
      const before = await ethers.provider.getBalance(attacker.address);
      const tx = await vuln.connect(attacker).withdraw(attacker.address, ethers.parseEther("10"));
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * receipt!.gasPrice;
      const after = await ethers.provider.getBalance(attacker.address);
      expect(after - before + gasCost).to.equal(ethers.parseEther("10"));
      expect(await ethers.provider.getBalance(await vuln.getAddress())).to.equal(0);
    });
  });

  // ── SafeAccess: onlyRole 로 잠긴 문 ─────────────────
  describe("SafeAccess (AccessControl · onlyRole)", function () {

    async function deploySafe() {
      const [owner, attacker, treasurer] = await ethers.getSigners();
      const Factory = await ethers.getContractFactory("SafeAccess");
      const safe = await Factory.connect(owner).deploy({ value: ethers.parseEther("10") });
      await safe.waitForDeployment();
      return { safe, owner, attacker, treasurer };
    }

    it("미인가 EOA 의 withdraw 는 AccessControlUnauthorizedAccount 로 revert", async function () {
      const { safe, attacker } = await loadFixture(deploySafe);
      await expect(
        safe.connect(attacker).withdraw(attacker.address, ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(safe, "AccessControlUnauthorizedAccount");
    });

    it("owner (TREASURER_ROLE 보유) 는 정상 인출 가능", async function () {
      const { safe, owner, attacker } = await loadFixture(deploySafe);
      const before = await safe.treasury();
      await safe.connect(owner).withdraw(attacker.address, ethers.parseEther("1"));
      const after = await safe.treasury();
      expect(before - after).to.equal(ethers.parseEther("1"));
    });
  });
});
