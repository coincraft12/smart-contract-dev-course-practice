import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Ch08 — MyERC20 (직접 구현)", function () {

  const NAME = "MyToken";
  const SYMBOL = "MTK";
  const DECIMALS = 18;
  const INITIAL = 1_000_000n * 10n ** BigInt(DECIMALS);

  async function deploy() {
    const [owner, alice, bob, spender] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyERC20");
    const token = await Factory.deploy(NAME, SYMBOL, DECIMALS);
    await token.mint(owner.address, INITIAL);
    return { token, owner, alice, bob, spender };
  }

  describe("메타데이터", function () {
    it("name/symbol/decimals가 올바르게 설정된다", async function () {
      const { token } = await loadFixture(deploy);
      expect(await token.name()).to.equal(NAME);
      expect(await token.symbol()).to.equal(SYMBOL);
      expect(await token.decimals()).to.equal(DECIMALS);
    });

    it("mint 후 totalSupply 확인", async function () {
      const { token } = await loadFixture(deploy);
      expect(await token.totalSupply()).to.equal(INITIAL);
    });
  });

  describe("transfer", function () {
    it("정상 전송 시 balance 이동 + Transfer 이벤트", async function () {
      const { token, owner, alice } = await loadFixture(deploy);
      const amount = 100n * 10n ** 18n;
      await expect(token.transfer(alice.address, amount))
        .to.emit(token, "Transfer")
        .withArgs(owner.address, alice.address, amount);
      expect(await token.balanceOf(alice.address)).to.equal(amount);
    });

    it("잔액 부족 시 InsufficientBalance", async function () {
      const { token, alice, bob } = await loadFixture(deploy);
      await expect(token.connect(alice).transfer(bob.address, 1))
        .to.be.revertedWithCustomError(token, "InsufficientBalance");
    });

    it("zero address로 전송 시 revert", async function () {
      const { token } = await loadFixture(deploy);
      await expect(token.transfer(ethers.ZeroAddress, 100))
        .to.be.revertedWithCustomError(token, "ZeroAddress");
    });
  });

  describe("approve / allowance", function () {
    it("approve 후 allowance 확인 + Approval 이벤트", async function () {
      const { token, owner, spender } = await loadFixture(deploy);
      const amt = 500n;
      await expect(token.approve(spender.address, amt))
        .to.emit(token, "Approval")
        .withArgs(owner.address, spender.address, amt);
      expect(await token.allowance(owner.address, spender.address)).to.equal(amt);
    });
  });

  describe("transferFrom", function () {
    it("allowance 내에서 spender가 이동시킬 수 있다", async function () {
      const { token, owner, spender, alice } = await loadFixture(deploy);
      const amt = 1000n;
      await token.approve(spender.address, amt);
      await token.connect(spender).transferFrom(owner.address, alice.address, 400n);
      expect(await token.balanceOf(alice.address)).to.equal(400n);
      expect(await token.allowance(owner.address, spender.address)).to.equal(600n);
    });

    it("allowance 초과 시 InsufficientAllowance", async function () {
      const { token, owner, spender, alice } = await loadFixture(deploy);
      await token.approve(spender.address, 100n);
      await expect(
        token.connect(spender).transferFrom(owner.address, alice.address, 101n)
      ).to.be.revertedWithCustomError(token, "InsufficientAllowance");
    });

    it("무한 승인(max)은 감소하지 않는다", async function () {
      const { token, owner, spender, alice } = await loadFixture(deploy);
      const MAX = ethers.MaxUint256;
      await token.approve(spender.address, MAX);
      await token.connect(spender).transferFrom(owner.address, alice.address, 500n);
      expect(await token.allowance(owner.address, spender.address)).to.equal(MAX);
    });
  });

  describe("mint / burn", function () {
    it("owner만 mint 가능", async function () {
      const { token, alice } = await loadFixture(deploy);
      await expect(token.connect(alice).mint(alice.address, 100))
        .to.be.revertedWithCustomError(token, "NotOwner");
    });

    it("burn 시 totalSupply와 balance 감소", async function () {
      const { token, owner } = await loadFixture(deploy);
      const before = await token.totalSupply();
      const amt = 1000n * 10n ** 18n;
      await token.burn(amt);
      expect(await token.totalSupply()).to.equal(before - amt);
    });
  });
});
