import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Ch10 — KRWCoin", function () {

  // ── Fixture ──────────────────────────────────────
  async function deploy() {
    const [owner, minter, pauser, blacklister, alice, bob, charlie] =
      await ethers.getSigners();

    const MINT_CAP = ethers.parseUnits("1000000000", 2); // 10억 KRWC

    const Factory = await ethers.getContractFactory("KRWCoin");
    const krwc = await Factory.deploy(MINT_CAP);

    const MINTER_ROLE      = await krwc.MINTER_ROLE();
    const PAUSER_ROLE      = await krwc.PAUSER_ROLE();
    const BLACKLISTER_ROLE = await krwc.BLACKLISTER_ROLE();
    const DEFAULT_ADMIN_ROLE = await krwc.DEFAULT_ADMIN_ROLE();

    return {
      krwc, owner, minter, pauser, blacklister,
      alice, bob, charlie,
      MINTER_ROLE, PAUSER_ROLE, BLACKLISTER_ROLE, DEFAULT_ADMIN_ROLE,
      MINT_CAP
    };
  }

  // alice 100,000 (1,000.00 KRWC), bob 50,000 (500.00 KRWC) 발행된 상태
  async function withMint() {
    const base = await deploy();
    await base.krwc.mint(base.alice.address, 100_000);
    await base.krwc.mint(base.bob.address,   50_000);
    return base;
  }

  // ── 배포 ─────────────────────────────────────────
  describe("배포", function () {
    it("이름과 심볼이 올바르게 설정되어야 한다", async function () {
      const { krwc } = await loadFixture(deploy);
      expect(await krwc.name()).to.equal("Korean Won Coin");
      expect(await krwc.symbol()).to.equal("KRWC");
    });

    it("decimals이 2여야 한다", async function () {
      const { krwc } = await loadFixture(deploy);
      expect(await krwc.decimals()).to.equal(2);
    });

    it("초기 totalSupply는 0이어야 한다", async function () {
      const { krwc } = await loadFixture(deploy);
      expect(await krwc.totalSupply()).to.equal(0);
    });

    it("배포자가 모든 역할을 가져야 한다", async function () {
      const { krwc, owner, MINTER_ROLE, PAUSER_ROLE, BLACKLISTER_ROLE, DEFAULT_ADMIN_ROLE } =
        await loadFixture(deploy);
      expect(await krwc.hasRole(MINTER_ROLE,        owner.address)).to.be.true;
      expect(await krwc.hasRole(PAUSER_ROLE,         owner.address)).to.be.true;
      expect(await krwc.hasRole(BLACKLISTER_ROLE,    owner.address)).to.be.true;
      expect(await krwc.hasRole(DEFAULT_ADMIN_ROLE,  owner.address)).to.be.true;
    });
  });

  // ── Mint ─────────────────────────────────────────
  describe("mint()", function () {
    it("MINTER_ROLE이 토큰을 발행할 수 있어야 한다", async function () {
      const { krwc, alice } = await loadFixture(deploy);
      await krwc.mint(alice.address, 100_000);
      expect(await krwc.balanceOf(alice.address)).to.equal(100_000);
      expect(await krwc.totalSupply()).to.equal(100_000);
    });

    it("MINTER_ROLE이 없으면 발행이 실패해야 한다", async function () {
      const { krwc, alice } = await loadFixture(deploy);
      await expect(krwc.connect(alice).mint(alice.address, 100_000))
        .to.be.reverted;
    });

    it("mint 시 Transfer(address(0), to, amount) 이벤트가 발생해야 한다", async function () {
      const { krwc, alice } = await loadFixture(deploy);
      await expect(krwc.mint(alice.address, 100_000))
        .to.emit(krwc, "Transfer")
        .withArgs(ethers.ZeroAddress, alice.address, 100_000);
    });

    it("mintCap 초과 시 ExceedsMintCap 에러가 발생해야 한다", async function () {
      const { krwc, alice, MINT_CAP } = await loadFixture(deploy);
      await krwc.mint(alice.address, MINT_CAP);
      await expect(krwc.mint(alice.address, 1))
        .to.be.revertedWithCustomError(krwc, "ExceedsMintCap");
    });
  });

  // ── Transfer ─────────────────────────────────────
  describe("transfer()", function () {
    it("토큰을 전송할 수 있어야 한다", async function () {
      const { krwc, alice, bob } = await loadFixture(withMint);
      await krwc.connect(alice).transfer(bob.address, 10_000);
      expect(await krwc.balanceOf(alice.address)).to.equal(90_000);
      expect(await krwc.balanceOf(bob.address)).to.equal(60_000);
    });

    it("잔액 초과 전송 시 revert되어야 한다", async function () {
      const { krwc, alice, bob } = await loadFixture(withMint);
      await expect(krwc.connect(alice).transfer(bob.address, 999_999))
        .to.be.reverted;
    });

    it("Transfer 이벤트가 발생해야 한다", async function () {
      const { krwc, alice, bob } = await loadFixture(withMint);
      await expect(krwc.connect(alice).transfer(bob.address, 5_000))
        .to.emit(krwc, "Transfer")
        .withArgs(alice.address, bob.address, 5_000);
    });
  });

  // ── Approve + TransferFrom ────────────────────────
  describe("approve() + transferFrom()", function () {
    it("approve 후 transferFrom이 동작해야 한다", async function () {
      const { krwc, alice, bob, charlie } = await loadFixture(withMint);
      await krwc.connect(alice).approve(charlie.address, 20_000);
      await krwc.connect(charlie).transferFrom(alice.address, bob.address, 10_000);
      expect(await krwc.balanceOf(alice.address)).to.equal(90_000);
      expect(await krwc.balanceOf(bob.address)).to.equal(60_000);
    });

    it("Approval 이벤트가 발생해야 한다", async function () {
      const { krwc, alice, charlie } = await loadFixture(withMint);
      await expect(krwc.connect(alice).approve(charlie.address, 30_000))
        .to.emit(krwc, "Approval")
        .withArgs(alice.address, charlie.address, 30_000);
    });

    it("transferFrom 후 allowance가 올바르게 감소해야 한다", async function () {
      const { krwc, alice, bob, charlie } = await loadFixture(withMint);
      await krwc.connect(alice).approve(charlie.address, 20_000);
      await krwc.connect(charlie).transferFrom(alice.address, bob.address, 7_000);
      expect(await krwc.allowance(alice.address, charlie.address)).to.equal(13_000);
    });

    it("allowance 초과 transferFrom 시 revert되어야 한다", async function () {
      const { krwc, alice, bob, charlie } = await loadFixture(withMint);
      await krwc.connect(alice).approve(charlie.address, 5_000);
      await expect(
        krwc.connect(charlie).transferFrom(alice.address, bob.address, 10_000)
      ).to.be.reverted;
    });

    it("approve 없이 transferFrom 시 revert되어야 한다", async function () {
      const { krwc, alice, bob, charlie } = await loadFixture(withMint);
      await expect(
        krwc.connect(charlie).transferFrom(alice.address, bob.address, 1_000)
      ).to.be.reverted;
    });

    it("무제한 approve는 transferFrom 후 allowance가 감소하지 않아야 한다", async function () {
      const { krwc, alice, bob, charlie } = await loadFixture(withMint);
      await krwc.connect(alice).approve(charlie.address, ethers.MaxUint256);
      await krwc.connect(charlie).transferFrom(alice.address, bob.address, 10_000);
      expect(await krwc.allowance(alice.address, charlie.address)).to.equal(ethers.MaxUint256);
    });
  });

  // ── Burn ─────────────────────────────────────────
  describe("burn()", function () {
    it("본인 토큰을 소각할 수 있어야 한다", async function () {
      const { krwc, alice } = await loadFixture(withMint);
      await krwc.connect(alice).burn(10_000);
      expect(await krwc.balanceOf(alice.address)).to.equal(90_000);
      expect(await krwc.totalSupply()).to.equal(140_000);
    });

    it("burn 시 Transfer(from, address(0), amount) 이벤트가 발생해야 한다", async function () {
      const { krwc, alice } = await loadFixture(withMint);
      await expect(krwc.connect(alice).burn(5_000))
        .to.emit(krwc, "Transfer")
        .withArgs(alice.address, ethers.ZeroAddress, 5_000);
    });

    it("approve 후 burnFrom이 동작해야 한다", async function () {
      const { krwc, alice, charlie } = await loadFixture(withMint);
      await krwc.connect(alice).approve(charlie.address, 20_000);
      await krwc.connect(charlie).burnFrom(alice.address, 10_000);
      expect(await krwc.balanceOf(alice.address)).to.equal(90_000);
      expect(await krwc.allowance(alice.address, charlie.address)).to.equal(10_000);
    });
  });

  // ── Pause ─────────────────────────────────────────
  describe("pause() / unpause()", function () {
    it("pause 상태에서 transfer가 실패해야 한다", async function () {
      const { krwc, owner, alice, bob } = await loadFixture(withMint);
      await krwc.connect(owner).pause();
      await expect(krwc.connect(alice).transfer(bob.address, 1_000))
        .to.be.reverted;
    });

    it("pause 상태에서 mint도 실패해야 한다", async function () {
      const { krwc, owner, alice } = await loadFixture(withMint);
      await krwc.connect(owner).pause();
      await expect(krwc.mint(alice.address, 1_000))
        .to.be.reverted;
    });

    it("unpause 후 transfer가 다시 동작해야 한다", async function () {
      const { krwc, owner, alice, bob } = await loadFixture(withMint);
      await krwc.connect(owner).pause();
      await krwc.connect(owner).unpause();
      await krwc.connect(alice).transfer(bob.address, 1_000);
      expect(await krwc.balanceOf(alice.address)).to.equal(99_000);
    });

    it("PAUSER_ROLE이 없으면 pause가 실패해야 한다", async function () {
      const { krwc, alice } = await loadFixture(withMint);
      await expect(krwc.connect(alice).pause()).to.be.reverted;
    });
  });

  // ── Blacklist ─────────────────────────────────────
  describe("blacklist()", function () {
    it("블랙리스트 주소는 토큰을 전송할 수 없어야 한다", async function () {
      const { krwc, owner, alice, bob } = await loadFixture(withMint);
      await krwc.connect(owner).blacklist(alice.address);
      await expect(krwc.connect(alice).transfer(bob.address, 1_000))
        .to.be.revertedWithCustomError(krwc, "Blacklisted")
        .withArgs(alice.address);
    });

    it("블랙리스트 주소로 토큰을 전송받을 수 없어야 한다", async function () {
      const { krwc, owner, alice, bob } = await loadFixture(withMint);
      await krwc.connect(owner).blacklist(bob.address);
      await expect(krwc.connect(alice).transfer(bob.address, 1_000))
        .to.be.revertedWithCustomError(krwc, "Blacklisted")
        .withArgs(bob.address);
    });

    it("unblacklist 후 전송이 다시 가능해야 한다", async function () {
      const { krwc, owner, alice, bob } = await loadFixture(withMint);
      await krwc.connect(owner).blacklist(alice.address);
      await krwc.connect(owner).unblacklist(alice.address);
      await krwc.connect(alice).transfer(bob.address, 1_000);
      expect(await krwc.balanceOf(alice.address)).to.equal(99_000);
    });

    it("Blacklisted_ 이벤트가 발생해야 한다", async function () {
      const { krwc, owner, alice } = await loadFixture(deploy);
      await expect(krwc.connect(owner).blacklist(alice.address))
        .to.emit(krwc, "Blacklisted_")
        .withArgs(alice.address, owner.address);
    });
  });

  // ── MintCap ───────────────────────────────────────
  describe("updateMintCap()", function () {
    it("mintCap을 증가시킬 수 있어야 한다", async function () {
      const { krwc, MINT_CAP } = await loadFixture(deploy);
      const newCap = MINT_CAP * 2n;
      await krwc.updateMintCap(newCap);
      expect(await krwc.mintCap()).to.equal(newCap);
    });

    it("현재 totalSupply보다 낮게 설정하면 revert되어야 한다", async function () {
      const { krwc, alice } = await loadFixture(deploy);
      await krwc.mint(alice.address, 100_000);
      await expect(krwc.updateMintCap(50_000))
        .to.be.revertedWith("Cap below current supply");
    });
  });

  // ── 역할 관리 ─────────────────────────────────────
  describe("역할 관리", function () {
    it("DEFAULT_ADMIN이 MINTER_ROLE을 부여할 수 있어야 한다", async function () {
      const { krwc, owner, alice, MINTER_ROLE } = await loadFixture(deploy);
      await krwc.connect(owner).grantRole(MINTER_ROLE, alice.address);
      expect(await krwc.hasRole(MINTER_ROLE, alice.address)).to.be.true;

      await krwc.connect(alice).mint(alice.address, 10_000);
      expect(await krwc.balanceOf(alice.address)).to.equal(10_000);
    });

    it("DEFAULT_ADMIN이 MINTER_ROLE을 회수할 수 있어야 한다", async function () {
      const { krwc, owner, alice, MINTER_ROLE } = await loadFixture(deploy);
      await krwc.connect(owner).grantRole(MINTER_ROLE, alice.address);
      await krwc.connect(owner).revokeRole(MINTER_ROLE, alice.address);

      expect(await krwc.hasRole(MINTER_ROLE, alice.address)).to.be.false;
      await expect(krwc.connect(alice).mint(alice.address, 10_000)).to.be.reverted;
    });
  });
});
