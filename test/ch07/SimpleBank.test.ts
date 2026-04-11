import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Ch07 — SimpleBank", function () {

  async function deploy() {
    const [owner, alice, bob, charlie] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleBank");
    const bank = await Factory.deploy();
    return { bank, owner, alice, bob, charlie };
  }

  // alice 2 ETH, bob 1 ETH 예치된 상태
  async function withDeposits() {
    const base = await deploy();
    await base.bank.connect(base.alice).deposit({ value: ethers.parseEther("2") });
    await base.bank.connect(base.bob).deposit({ value: ethers.parseEther("1") });
    return base;
  }

  // ── 배포 ─────────────────────────────────────────
  describe("배포", function () {
    it("owner가 배포자로 설정되어야 한다", async function () {
      const { bank, owner } = await loadFixture(deploy);
      expect(await bank.owner()).to.equal(owner.address);
    });

    it("초기 paused 상태는 false여야 한다", async function () {
      const { bank } = await loadFixture(deploy);
      expect(await bank.paused()).to.be.false;
    });

    it("초기 totalDeposited는 0이어야 한다", async function () {
      const { bank } = await loadFixture(deploy);
      expect(await bank.totalDeposited()).to.equal(0);
    });
  });

  // ── deposit() ────────────────────────────────────
  describe("deposit()", function () {
    it("ETH를 예치하면 잔액이 증가해야 한다", async function () {
      const { bank, alice } = await loadFixture(deploy);
      const amount = ethers.parseEther("1");
      await bank.connect(alice).deposit({ value: amount });
      expect(await bank.balanceOf(alice.address)).to.equal(amount);
    });

    it("totalDeposited가 증가해야 한다", async function () {
      const { bank, alice, bob } = await loadFixture(deploy);
      await bank.connect(alice).deposit({ value: ethers.parseEther("1") });
      await bank.connect(bob).deposit({ value: ethers.parseEther("2") });
      expect(await bank.totalDeposited()).to.equal(ethers.parseEther("3"));
    });

    it("Deposited 이벤트가 발생해야 한다", async function () {
      const { bank, alice } = await loadFixture(deploy);
      const amount = ethers.parseEther("0.5");
      await expect(bank.connect(alice).deposit({ value: amount }))
        .to.emit(bank, "Deposited")
        .withArgs(alice.address, amount);
    });

    it("0 ETH 예치 시 ZeroAmount 에러가 발생해야 한다", async function () {
      const { bank, alice } = await loadFixture(deploy);
      await expect(bank.connect(alice).deposit({ value: 0 }))
        .to.be.revertedWithCustomError(bank, "ZeroAmount");
    });

    it("pause 상태에서 예치 시 ContractPaused 에러가 발생해야 한다", async function () {
      const { bank, owner, alice } = await loadFixture(deploy);
      await bank.connect(owner).pause();
      await expect(bank.connect(alice).deposit({ value: ethers.parseEther("1") }))
        .to.be.revertedWithCustomError(bank, "ContractPaused");
    });

    it("ETH를 직접 보내면 deposit()으로 처리되어야 한다 (receive)", async function () {
      const { bank, alice } = await loadFixture(deploy);
      const amount = ethers.parseEther("1");
      await alice.sendTransaction({ to: await bank.getAddress(), value: amount });
      expect(await bank.balanceOf(alice.address)).to.equal(amount);
    });
  });

  // ── withdraw() ───────────────────────────────────
  describe("withdraw()", function () {
    it("예치한 ETH를 인출할 수 있어야 한다", async function () {
      const { bank, alice } = await loadFixture(withDeposits);
      await bank.connect(alice).withdraw(ethers.parseEther("1"));
      expect(await bank.balanceOf(alice.address)).to.equal(ethers.parseEther("1"));
    });

    it("Withdrawn 이벤트가 발생해야 한다", async function () {
      const { bank, alice } = await loadFixture(withDeposits);
      const amount = ethers.parseEther("1");
      await expect(bank.connect(alice).withdraw(amount))
        .to.emit(bank, "Withdrawn")
        .withArgs(alice.address, amount);
    });

    it("잔액 초과 인출 시 InsufficientBalance 에러가 발생해야 한다", async function () {
      const { bank, alice } = await loadFixture(withDeposits);
      await expect(bank.connect(alice).withdraw(ethers.parseEther("5")))
        .to.be.revertedWithCustomError(bank, "InsufficientBalance");
    });

    it("0 금액 인출 시 ZeroAmount 에러가 발생해야 한다", async function () {
      const { bank, alice } = await loadFixture(withDeposits);
      await expect(bank.connect(alice).withdraw(0))
        .to.be.revertedWithCustomError(bank, "ZeroAmount");
    });

    it("인출 후 실제 ETH 잔액이 증가해야 한다", async function () {
      const { bank, alice } = await loadFixture(withDeposits);
      const amount = ethers.parseEther("1");

      const before = await ethers.provider.getBalance(alice.address);
      const tx = await bank.connect(alice).withdraw(amount);
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * receipt!.gasPrice;
      const after = await ethers.provider.getBalance(alice.address);

      // 가스 비용 감안하여 대략적으로 확인
      const diff = after - before + gasCost;
      expect(diff).to.be.closeTo(amount, ethers.parseEther("0.001"));
    });
  });

  // ── distributeInterest() ─────────────────────────
  describe("distributeInterest()", function () {
    it("1% 이자가 정확히 지급되어야 한다 (basis points 100)", async function () {
      const { bank, owner, alice, bob } = await loadFixture(withDeposits);
      // alice: 2 ETH, bob: 1 ETH → 1% 이자
      await bank.connect(owner).distributeInterest([alice.address, bob.address], 100);

      expect(await bank.balanceOf(alice.address)).to.equal(ethers.parseEther("2.02"));
      expect(await bank.balanceOf(bob.address)).to.equal(ethers.parseEther("1.01"));
    });

    it("owner가 아닌 경우 NotOwner 에러가 발생해야 한다", async function () {
      const { bank, alice } = await loadFixture(withDeposits);
      await expect(
        bank.connect(alice).distributeInterest([alice.address], 100)
      ).to.be.revertedWithCustomError(bank, "NotOwner");
    });

    it("유효하지 않은 이율에서 revert되어야 한다", async function () {
      const { bank, owner, alice } = await loadFixture(withDeposits);
      await expect(
        bank.connect(owner).distributeInterest([alice.address], 0)
      ).to.be.revertedWith("Invalid rate");
      await expect(
        bank.connect(owner).distributeInterest([alice.address], 10001)
      ).to.be.revertedWith("Invalid rate");
    });
  });

  // ── pause / unpause ──────────────────────────────
  describe("pause() / unpause()", function () {
    it("owner가 pause하면 paused가 true여야 한다", async function () {
      const { bank, owner } = await loadFixture(deploy);
      await bank.connect(owner).pause();
      expect(await bank.paused()).to.be.true;
    });

    it("owner가 unpause하면 paused가 false여야 한다", async function () {
      const { bank, owner } = await loadFixture(deploy);
      await bank.connect(owner).pause();
      await bank.connect(owner).unpause();
      expect(await bank.paused()).to.be.false;
    });

    it("non-owner가 pause하면 NotOwner 에러가 발생해야 한다", async function () {
      const { bank, alice } = await loadFixture(deploy);
      await expect(bank.connect(alice).pause())
        .to.be.revertedWithCustomError(bank, "NotOwner");
    });
  });

  // ── transferOwnership() ──────────────────────────
  describe("transferOwnership()", function () {
    it("owner가 소유권을 이전할 수 있어야 한다", async function () {
      const { bank, owner, alice } = await loadFixture(deploy);
      await bank.connect(owner).transferOwnership(alice.address);
      expect(await bank.owner()).to.equal(alice.address);
    });

    it("이전 후 새 owner가 pause할 수 있어야 한다", async function () {
      const { bank, owner, alice } = await loadFixture(deploy);
      await bank.connect(owner).transferOwnership(alice.address);
      await bank.connect(alice).pause();
      expect(await bank.paused()).to.be.true;
    });

    it("OwnershipTransferred 이벤트가 발생해야 한다", async function () {
      const { bank, owner, alice } = await loadFixture(deploy);
      await expect(bank.connect(owner).transferOwnership(alice.address))
        .to.emit(bank, "OwnershipTransferred")
        .withArgs(owner.address, alice.address);
    });
  });
});
