import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Ch10 — EnterpriseNFT (ERC-1155)", function () {

  const BASE_URI = "https://api.example.com/token/{id}.json";

  async function deploy() {
    const [admin, minter, alice, bob] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EnterpriseNFT");
    const nft = await Factory.deploy(BASE_URI);
    const MINTER_ROLE = await nft.MINTER_ROLE();
    const PAUSER_ROLE = await nft.PAUSER_ROLE();
    await nft.grantRole(MINTER_ROLE, minter.address);
    return { nft, admin, minter, alice, bob, MINTER_ROLE, PAUSER_ROLE };
  }

  describe("배포 및 역할", function () {
    it("URI가 설정된다", async function () {
      const { nft } = await loadFixture(deploy);
      expect(await nft.uri(0)).to.equal(BASE_URI);
    });

    it("admin이 DEFAULT_ADMIN_ROLE 보유", async function () {
      const { nft, admin } = await loadFixture(deploy);
      const ADMIN = await nft.DEFAULT_ADMIN_ROLE();
      expect(await nft.hasRole(ADMIN, admin.address)).to.be.true;
    });
  });

  describe("tokenId 인코딩/디코딩", function () {
    it("encodeTokenId(1, 42) → 디코딩 시 원복", async function () {
      const { nft } = await loadFixture(deploy);
      const tokenId = await nft.encodeTokenId(1, 42);
      const [prod, evt] = await nft.decodeTokenId(tokenId);
      expect(prod).to.equal(1);
      expect(evt).to.equal(42);
    });

    it("productCode=0 인코딩 시 ZeroProductCode", async function () {
      const { nft } = await loadFixture(deploy);
      await expect(nft.encodeTokenId(0, 42))
        .to.be.revertedWithCustomError(nft, "ZeroProductCode");
    });
  });

  describe("mint", function () {
    it("MINTER_ROLE 보유자만 mint 가능", async function () {
      const { nft, alice } = await loadFixture(deploy);
      const tid = await nft.encodeTokenId(1, 1);
      await expect(nft.connect(alice).mint(alice.address, tid, 10, "0x"))
        .to.be.revertedWithCustomError(nft, "AccessControlUnauthorizedAccount");
    });

    it("mint 후 balanceOf 확인 + TokenMinted 이벤트", async function () {
      const { nft, minter, alice } = await loadFixture(deploy);
      const tid = await nft.encodeTokenId(1, 1);
      await expect(nft.connect(minter).mint(alice.address, tid, 10, "0x"))
        .to.emit(nft, "TokenMinted")
        .withArgs(alice.address, tid, 10);
      expect(await nft.balanceOf(alice.address, tid)).to.equal(10);
    });

    it("같은 tokenId를 두 계정에게 mint 가능 (ERC-1155 특성)", async function () {
      const { nft, minter, alice, bob } = await loadFixture(deploy);
      const tid = await nft.encodeTokenId(1, 1);
      await nft.connect(minter).mint(alice.address, tid, 5, "0x");
      await nft.connect(minter).mint(bob.address,   tid, 3, "0x");
      expect(await nft.balanceOf(alice.address, tid)).to.equal(5);
      expect(await nft.balanceOf(bob.address,   tid)).to.equal(3);
    });
  });

  describe("mintBatch", function () {
    it("여러 tokenId를 한 번에 mint 가능", async function () {
      const { nft, minter, alice } = await loadFixture(deploy);
      const ids = [
        await nft.encodeTokenId(1, 1),
        await nft.encodeTokenId(1, 2),
        await nft.encodeTokenId(2, 1),
      ];
      const amounts = [10, 20, 30];
      await nft.connect(minter).mintBatch(alice.address, ids, amounts, "0x");
      expect(await nft.balanceOf(alice.address, ids[0])).to.equal(10);
      expect(await nft.balanceOf(alice.address, ids[2])).to.equal(30);
    });

    it("배열 길이 불일치 시 LengthMismatch", async function () {
      const { nft, minter, alice } = await loadFixture(deploy);
      await expect(nft.connect(minter).mintBatch(alice.address, [1, 2], [10], "0x"))
        .to.be.revertedWithCustomError(nft, "LengthMismatch");
    });
  });

  describe("safeBatchTransferFrom", function () {
    it("여러 tokenId를 한 번의 tx로 전송", async function () {
      const { nft, minter, alice, bob } = await loadFixture(deploy);
      const ids = [
        await nft.encodeTokenId(1, 1),
        await nft.encodeTokenId(1, 2),
      ];
      await nft.connect(minter).mintBatch(alice.address, ids, [10, 20], "0x");

      await nft.connect(alice).safeBatchTransferFrom(
        alice.address, bob.address, ids, [3, 5], "0x"
      );
      expect(await nft.balanceOf(bob.address, ids[0])).to.equal(3);
      expect(await nft.balanceOf(bob.address, ids[1])).to.equal(5);
      expect(await nft.balanceOf(alice.address, ids[0])).to.equal(7);
    });
  });

  describe("Pausable", function () {
    it("pause 후 transfer 시 EnforcedPause", async function () {
      const { nft, minter, alice, bob, admin } = await loadFixture(deploy);
      const tid = await nft.encodeTokenId(1, 1);
      await nft.connect(minter).mint(alice.address, tid, 10, "0x");
      await nft.connect(admin).pause();
      await expect(nft.connect(alice).safeTransferFrom(alice.address, bob.address, tid, 1, "0x"))
        .to.be.revertedWithCustomError(nft, "EnforcedPause");
    });
  });

  describe("URI 관리", function () {
    it("URI_SETTER_ROLE만 setURI 가능", async function () {
      const { nft, alice } = await loadFixture(deploy);
      await expect(nft.connect(alice).setURI("https://new.example.com/{id}.json"))
        .to.be.revertedWithCustomError(nft, "AccessControlUnauthorizedAccount");
    });

    it("setURI 후 uri()가 새 값을 반환", async function () {
      const { nft, admin } = await loadFixture(deploy);
      const NEW = "https://new.example.com/{id}.json";
      await nft.connect(admin).setURI(NEW);
      expect(await nft.uri(0)).to.equal(NEW);
    });
  });

  describe("supportsInterface", function () {
    it("IERC1155 (0xd9b67a26) 지원", async function () {
      const { nft } = await loadFixture(deploy);
      expect(await nft.supportsInterface("0xd9b67a26")).to.be.true;
    });

    it("IAccessControl (0x7965db0b) 지원", async function () {
      const { nft } = await loadFixture(deploy);
      expect(await nft.supportsInterface("0x7965db0b")).to.be.true;
    });
  });
});
