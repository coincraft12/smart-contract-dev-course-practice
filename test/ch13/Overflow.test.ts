import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

/**
 * Ch13 — 정수 오버플로/언더플로 (대본 13-1 슬라이드 16~18 대응)
 *
 * 0.8.0 이후 컴파일러가 산술 오버플로를 자동 revert 하지만, unchecked 블록은 그 검사를 끈다.
 *
 * 검증 시나리오:
 * 1. VulnerableOverflow: unchecked 로 언더플로 조용히 통과 → 잔액 조작 성공 (공격 성공 = 취약)
 * 2. SafeOverflow: 0.8+ 기본 산술 검사 → 언더플로 시 panic(0x11) revert (방어 성공)
 */
describe("Ch13 — Integer Overflow / Underflow", function () {

  // ── VulnerableOverflow: unchecked 남용 ─────────────
  describe("VulnerableOverflow (unchecked 남용)", function () {

    async function deployVulnerable() {
      const [owner, attacker, victim] = await ethers.getSigners();
      const Factory = await ethers.getContractFactory("VulnerableOverflow");
      const vuln = await Factory.deploy();
      await vuln.waitForDeployment();
      return { vuln, owner, attacker, victim };
    }

    it("잔액 0 상태에서 transfer 하면 unchecked 로 언더플로 → 잔액이 uint256 최댓값 근처가 됨", async function () {
      const { vuln, attacker, victim } = await loadFixture(deployVulnerable);
      // attacker 는 잔액 0 상태
      expect(await vuln.balances(attacker.address)).to.equal(0n);

      // 그런데도 1 wei 를 victim 에게 transfer → unchecked 로 통과
      await vuln.connect(attacker).transfer(victim.address, 1n);

      // attacker 잔액이 uint256 최댓값 - 1 이 됨 (조용한 언더플로)
      const MAX_UINT256 = (1n << 256n) - 1n;
      expect(await vuln.balances(attacker.address)).to.equal(MAX_UINT256);
    });
  });

  // ── SafeOverflow: 기본 산술 검사 ─────────────────────
  describe("SafeOverflow (0.8+ 기본 검사)", function () {

    async function deploySafe() {
      const [owner, attacker, victim] = await ethers.getSigners();
      const Factory = await ethers.getContractFactory("SafeOverflow");
      const safe = await Factory.deploy();
      await safe.waitForDeployment();
      return { safe, owner, attacker, victim };
    }

    it("잔액 0 상태의 transfer 는 panic(0x11) 로 자동 revert", async function () {
      const { safe, attacker, victim } = await loadFixture(deploySafe);
      await expect(
        safe.connect(attacker).transfer(victim.address, 1n)
      ).to.be.revertedWithPanic(0x11); // arithmetic overflow/underflow
    });
  });
});
