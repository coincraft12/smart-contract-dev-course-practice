import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Ch05-3 (4/4) — StrategyPattern (다형성)", function () {

  async function deploy() {
    const [admin, alice, bob] = await ethers.getSigners();

    const Fixed = await ethers.getContractFactory("StrategyFixed");
    const fixed = await Fixed.deploy();

    const Tiered = await ethers.getContractFactory("StrategyTiered");
    const tiered = await Tiered.deploy();

    const Bank = await ethers.getContractFactory("InterestBank");
    const bank = await Bank.deploy(await fixed.getAddress());

    return { bank, fixed, tiered, admin, alice, bob };
  }

  describe("StrategyFixed (5%)", function () {
    it("1 ETH 예치 → 이자 0.05 ETH", async function () {
      const { bank, alice } = await loadFixture(deploy);
      await bank.connect(alice).deposit({ value: ethers.parseEther("1") });
      expect(await bank.previewInterest(alice.address))
        .to.equal(ethers.parseEther("0.05"));
    });
  });

  describe("전략 교체 → Tiered", function () {
    it("admin 전환 시 StrategyChanged 이벤트", async function () {
      const { bank, fixed, tiered, admin } = await loadFixture(deploy);
      await expect(bank.connect(admin).setStrategy(await tiered.getAddress()))
        .to.emit(bank, "StrategyChanged")
        .withArgs(await fixed.getAddress(), await tiered.getAddress());
    });

    it("non-admin은 setStrategy 불가", async function () {
      const { bank, tiered, alice } = await loadFixture(deploy);
      await expect(bank.connect(alice).setStrategy(await tiered.getAddress()))
        .to.be.revertedWithCustomError(bank, "NotAdmin");
    });

    it("Tiered 전략 — 0.5 ETH → 3% (0.015 ETH)", async function () {
      const { bank, tiered, admin, alice } = await loadFixture(deploy);
      await bank.connect(admin).setStrategy(await tiered.getAddress());
      await bank.connect(alice).deposit({ value: ethers.parseEther("0.5") });
      expect(await bank.previewInterest(alice.address))
        .to.equal(ethers.parseEther("0.015"));
    });

    it("Tiered 전략 — 5 ETH → 5% (0.25 ETH)", async function () {
      const { bank, tiered, admin, alice } = await loadFixture(deploy);
      await bank.connect(admin).setStrategy(await tiered.getAddress());
      await bank.connect(alice).deposit({ value: ethers.parseEther("5") });
      expect(await bank.previewInterest(alice.address))
        .to.equal(ethers.parseEther("0.25"));
    });

    it("Tiered 전략 — 20 ETH → 7% (1.4 ETH)", async function () {
      const { bank, tiered, admin, alice } = await loadFixture(deploy);
      await bank.connect(admin).setStrategy(await tiered.getAddress());
      await bank.connect(alice).deposit({ value: ethers.parseEther("20") });
      expect(await bank.previewInterest(alice.address))
        .to.equal(ethers.parseEther("1.4"));
    });
  });

  describe("accrueInterest 흐름", function () {
    it("이자 지급 후 deposits 증가 + 이벤트", async function () {
      const { bank, alice } = await loadFixture(deploy);
      const principal = ethers.parseEther("2");
      await bank.connect(alice).deposit({ value: principal });

      const interest = ethers.parseEther("0.1"); // 5%
      await expect(bank.connect(alice).accrueInterest())
        .to.emit(bank, "InterestClaimed")
        .withArgs(alice.address, principal, interest);

      expect(await bank.deposits(alice.address)).to.equal(principal + interest);
    });

    it("예치금 없으면 NoDeposit", async function () {
      const { bank, bob } = await loadFixture(deploy);
      await expect(bank.connect(bob).accrueInterest())
        .to.be.revertedWithCustomError(bank, "NoDeposit");
    });
  });
});
