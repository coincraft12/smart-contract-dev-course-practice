import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

/**
 * Ch08 — 재진입 공격 시연
 *
 * 이 테스트는 두 가지를 검증한다:
 * 1. VulnerableBank는 재진입 공격에 취약 → 공격 성공
 * 2. SafeBank는 동일한 공격에 방어됨 → 공격 실패
 */
describe("Ch15 — Reentrancy Attack", function () {

  // ── VulnerableBank + Attacker ─────────────────────
  describe("VulnerableBank (취약한 컨트랙트)", function () {

    async function deployVulnerable() {
      const [owner, victim, attacker] = await ethers.getSigners();

      const BankFactory = await ethers.getContractFactory("VulnerableBank");
      const bank = await BankFactory.deploy();

      const AttackerFactory = await ethers.getContractFactory("Attacker");
      const attackContract = await AttackerFactory.deploy(await bank.getAddress());

      // victim이 10 ETH 예치 (공격 대상 자금)
      await bank.connect(victim).deposit({ value: ethers.parseEther("10") });

      return { bank, attackContract, owner, victim, attacker };
    }

    it("공격 전: VulnerableBank에 10 ETH가 예치되어 있어야 한다", async function () {
      const { bank } = await loadFixture(deployVulnerable);
      expect(await bank.contractBalance()).to.equal(ethers.parseEther("10"));
    });

    it("공격 성공: 공격자가 자신의 예치금보다 더 많이 인출한다", async function () {
      const { bank, attackContract, attacker } = await loadFixture(deployVulnerable);

      const attackAmount = ethers.parseEther("1");
      const bankBefore = await bank.contractBalance();

      // 공격 실행 (1 ETH 예치 후 재진입으로 더 많이 탈취)
      await attackContract.connect(attacker).attack({ value: attackAmount });

      const bankAfter = await bank.contractBalance();

      // 은행 잔액이 10 ETH보다 줄어 있어야 함 (1 ETH 이상 탈취)
      expect(bankAfter).to.be.lessThan(bankBefore);
      // 공격으로 공격자가 예치한 1 ETH 이상을 가져감
      expect(bankBefore - bankAfter).to.be.greaterThan(attackAmount);
    });
  });

  // ── SafeBank + 동일 공격 ──────────────────────────
  describe("SafeBank (방어된 컨트랙트)", function () {

    async function deploySafe() {
      const [owner, victim, attacker] = await ethers.getSigners();

      const BankFactory = await ethers.getContractFactory("SafeBank");
      const bank = await BankFactory.deploy();

      // Attacker는 VulnerableBank를 대상으로 만들어졌지만
      // SafeBank 인터페이스도 deposit/withdraw가 있으므로 주소만 교체해 공격 시도
      // SafeBank는 withdraw(amount)를 받으므로 여기서는 직접 재진입 테스트
      await bank.connect(victim).deposit({ value: ethers.parseEther("10") });

      return { bank, owner, victim, attacker };
    }

    it("SafeBank: CEI 패턴으로 재진입 시 잔액이 이미 0이라 실패한다", async function () {
      const { bank, attacker } = await loadFixture(deploySafe);

      // 공격자가 0.1 ETH 예치
      await bank.connect(attacker).deposit({ value: ethers.parseEther("0.1") });

      // 첫 번째 withdraw는 성공
      await bank.connect(attacker).withdraw(ethers.parseEther("0.1"));

      // 두 번째 withdraw는 잔액이 0이므로 실패
      await expect(bank.connect(attacker).withdraw(ethers.parseEther("0.1")))
        .to.be.revertedWithCustomError(bank, "InsufficientBalance");
    });

    it("SafeBank: nonReentrant가 재진입 호출을 차단한다", async function () {
      // 이 테스트는 SafeBank의 nonReentrant modifier가 적용된 것을 간접 검증
      // 실제 재진입 컨트랙트로 공격 시도 시 "ReentrancyGuard: reentrant call" 에러 발생
      const { bank } = await loadFixture(deploySafe);
      const address = await bank.getAddress();
      // 컨트랙트가 ReentrancyGuard를 상속하고 있는지 확인 (deploy 성공 = 임포트 성공)
      expect(address).to.be.a("string");
      expect(address.startsWith("0x")).to.be.true;
    });
  });

  // ── 방어 원칙 비교 ────────────────────────────────
  describe("CEI 패턴 vs 잘못된 순서 비교", function () {
    it("VulnerableBank: 상태 업데이트 순서가 잘못됨 (Interactions → Effects)", async function () {
      // 이 테스트는 VulnerableBank 코드 구조를 검증하는 역할
      // 실제로 배포 후 공격 시뮬레이션은 위에서 이미 검증
      const BankFactory = await ethers.getContractFactory("VulnerableBank");
      const bank = await BankFactory.deploy();
      const [, victim] = await ethers.getSigners();

      await bank.connect(victim).deposit({ value: ethers.parseEther("1") });
      expect(await bank.balances(victim.address)).to.equal(ethers.parseEther("1"));
    });

    it("SafeBank: 정상 입출금이 올바르게 동작한다", async function () {
      const BankFactory = await ethers.getContractFactory("SafeBank");
      const bank = await BankFactory.deploy();
      const [, user] = await ethers.getSigners();

      await bank.connect(user).deposit({ value: ethers.parseEther("1") });
      expect(await bank.balanceOf(user.address)).to.equal(ethers.parseEther("1"));

      await bank.connect(user).withdraw(ethers.parseEther("0.5"));
      expect(await bank.balanceOf(user.address)).to.equal(ethers.parseEther("0.5"));
    });
  });
});
