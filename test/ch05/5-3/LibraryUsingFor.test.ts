import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Ch05-3 (3/4) — LibraryUsingFor", function () {

  describe("Math library + using for uint256", function () {
    async function deploy() {
      const F = await ethers.getContractFactory("MathUser");
      const c = await F.deploy();
      return { c };
    }

    it("min / max / avg / sqrt (a.foo() 문법)", async function () {
      const { c } = await loadFixture(deploy);
      const [min_, max_, avg_, sqrtA] = await c.testMethods(16n, 25n);
      expect(min_).to.equal(16n);
      expect(max_).to.equal(25n);
      expect(avg_).to.equal(20n); // (16+25)/2 = 20 (정수)
      expect(sqrtA).to.equal(4n); // sqrt(16) = 4
    });

    it("sqrt(0) = 0, sqrt(2) = 1 (내림)", async function () {
      const { c } = await loadFixture(deploy);
      const [, , , sqrt0] = await c.testMethods(0n, 0n);
      expect(sqrt0).to.equal(0n);
      const [, , , sqrt2] = await c.testMethods(2n, 0n);
      expect(sqrt2).to.equal(1n); // floor(sqrt(2)) = 1
    });

    it("sqrt(100) = 10, sqrt(1000000) = 1000", async function () {
      const { c } = await loadFixture(deploy);
      const [, , , s100] = await c.testMethods(100n, 0n);
      expect(s100).to.equal(10n);
      const [, , , s1m] = await c.testMethods(1_000_000n, 0n);
      expect(s1m).to.equal(1000n);
    });
  });

  describe("SafeCall — 3종류 토큰 통합 처리", function () {

    async function deploy() {
      const [owner, alice] = await ethers.getSigners();

      const Good = await ethers.getContractFactory("GoodToken");
      const good = await Good.deploy();

      const False = await ethers.getContractFactory("FalseReturningToken");
      const falseTok = await False.deploy();

      const NoRet = await ethers.getContractFactory("NoReturnToken");
      const noret = await NoRet.deploy();

      const User = await ethers.getContractFactory("SafeTokenUser");
      const user = await User.deploy();

      // good / noret 토큰을 SafeTokenUser에 전송
      await good.transfer(await user.getAddress(), ethers.parseEther("1000"));
      await noret.transfer(await user.getAddress(), ethers.parseEther("1000"));

      return { good, falseTok, noret, user, owner, alice };
    }

    it("GoodToken (return true) — 성공", async function () {
      const { good, user, alice } = await loadFixture(deploy);
      await user.forward(await good.getAddress(), alice.address, ethers.parseEther("100"));
      expect(await good.balanceOf(alice.address)).to.equal(ethers.parseEther("100"));
    });

    it("NoReturnToken (return값 없음) — 성공 (레거시 토큰 호환)", async function () {
      const { noret, user, alice } = await loadFixture(deploy);
      await user.forward(await noret.getAddress(), alice.address, ethers.parseEther("100"));
      expect(await noret.balanceOf(alice.address)).to.equal(ethers.parseEther("100"));
    });

    it("FalseReturningToken (return false) — TransferFailed", async function () {
      const { falseTok, user, alice } = await loadFixture(deploy);
      await expect(
        user.forward(await falseTok.getAddress(), alice.address, 100n)
      ).to.be.revertedWithCustomError(user, "TransferFailed");
    });
  });
});
