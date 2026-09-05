import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

/**
 * Ch13 — 정수 오버플로 (대본 13-1 슬라이드 17 대응)
 *
 * 슬라이드 시나리오 그대로:
 *   uint8 x = 255;  x = x + 1;
 *   → 0.8.0 이전: 조용히 0 으로 감쌈 (wraparound)
 *   → 0.8.0 이후: 자동 panic(0x11) revert
 *   → unchecked 로 감싸면 0.8.0 이전으로 회귀
 *
 * 검증 시나리오:
 * 1. VulnerableOverflow (unchecked): 255 + 1 → 0 으로 조용히 감쌈 (공격 성공 = 취약)
 * 2. SafeOverflow: 255 + 1 → panic(0x11) revert (방어 성공)
 */
describe("Ch13 — Integer Overflow / Underflow", function () {

  // ── VulnerableOverflow: 0.8 이전 재현 (unchecked) ───
  describe("VulnerableOverflow (unchecked 로 검사 꺼짐)", function () {

    async function deployVulnerable() {
      const Factory = await ethers.getContractFactory("VulnerableOverflow");
      const vuln = await Factory.deploy(255);
      await vuln.waitForDeployment();
      return { vuln };
    }

    it("uint8 x = 255 에 1 을 더하면 wraparound 로 0 이 된다 (조용한 오버플로)", async function () {
      const { vuln } = await loadFixture(deployVulnerable);
      expect(await vuln.x()).to.equal(255n);

      // 대본 시나리오: 255 + 1 = 0 (wraparound)
      await vuln.add(1);
      expect(await vuln.x()).to.equal(0n);
    });
  });

  // ── SafeOverflow: 0.8+ 기본 검사 ─────────────────────
  describe("SafeOverflow (0.8+ 자동 오버플로 검사)", function () {

    async function deploySafe() {
      const Factory = await ethers.getContractFactory("SafeOverflow");
      const safe = await Factory.deploy(255);
      await safe.waitForDeployment();
      return { safe };
    }

    it("uint8 x = 255 에 1 을 더하면 panic(0x11) 로 자동 revert", async function () {
      const { safe } = await loadFixture(deploySafe);
      expect(await safe.x()).to.equal(255n);

      // 대본 시나리오: 255 + 1 → 컴파일러 자동 검사 → revert
      await expect(safe.add(1)).to.be.revertedWithPanic(0x11);
    });
  });
});
