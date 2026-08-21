import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

/**
 * Ch09 실습 — MyNFT_OZ (OpenZeppelin 상속 버전) 테스트
 *
 * MyNFT.test.ts (직접 구현) 와 나란히 두고 같은 describe/it 구조 유지.
 * 두 컨트랙트가 같은 인터페이스·같은 동작을 하므로 테스트 의도가 동일.
 * 차이는 revert 시 커스텀 에러 이름 (OZ v5 표준 에러 사용):
 *   - NotOwner → AccessControlUnauthorizedAccount
 *   - NonexistentToken → ERC721NonexistentToken
 *   - NotAuthorized → ERC721InsufficientApproval / ERC721IncorrectOwner
 *   - NotERC721Receiver → ERC721InvalidReceiver
 */
describe("Ch09 — MyNFT_OZ (ERC-721 OpenZeppelin 상속)", function () {

  const BASE_URI = "https://example.com/nft/";

  async function deploy() {
    const [owner, alice, bob, spender] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyNFT_OZ");
    const nft = await Factory.deploy("MyNFT", "MNFT", BASE_URI);
    return { nft, owner, alice, bob, spender };
  }

  async function withMinted() {
    const base = await deploy();
    await base.nft.mint(base.alice.address);        // tokenId 1
    await base.nft.mint(base.alice.address);        // tokenId 2
    await base.nft.mint(base.bob.address);          // tokenId 3
    return base;
  }

  describe("메타데이터", function () {
    it("name/symbol/baseURI 설정 확인", async function () {
      const { nft } = await loadFixture(deploy);
      expect(await nft.name()).to.equal("MyNFT");
      expect(await nft.symbol()).to.equal("MNFT");
      expect(await nft.baseURI()).to.equal(BASE_URI);
    });

    it("tokenURI = baseURI + tokenId + .json", async function () {
      const { nft, alice } = await loadFixture(deploy);
      await nft.mint(alice.address);
      expect(await nft.tokenURI(1)).to.equal(BASE_URI + "1.json");
    });

    it("존재하지 않는 tokenId의 tokenURI 조회 시 revert", async function () {
      const { nft } = await loadFixture(deploy);
      await expect(nft.tokenURI(99))
        .to.be.revertedWithCustomError(nft, "ERC721NonexistentToken");
    });
  });

  describe("ERC-165 supportsInterface", function () {
    it("IERC165 (0x01ffc9a7) 지원", async function () {
      const { nft } = await loadFixture(deploy);
      expect(await nft.supportsInterface("0x01ffc9a7")).to.be.true;
    });

    it("IERC721 (0x80ac58cd) 지원", async function () {
      const { nft } = await loadFixture(deploy);
      expect(await nft.supportsInterface("0x80ac58cd")).to.be.true;
    });

    it("IERC721Metadata (0x5b5e139f) 지원", async function () {
      const { nft } = await loadFixture(deploy);
      expect(await nft.supportsInterface("0x5b5e139f")).to.be.true;
    });

    it("IAccessControl (0x7965db0b) 지원 — OZ 추가 인터페이스", async function () {
      const { nft } = await loadFixture(deploy);
      expect(await nft.supportsInterface("0x7965db0b")).to.be.true;
    });

    it("미지원 인터페이스는 false", async function () {
      const { nft } = await loadFixture(deploy);
      expect(await nft.supportsInterface("0xffffffff")).to.be.false;
    });
  });

  describe("mint", function () {
    it("MINTER_ROLE 없는 계정은 mint 불가", async function () {
      const { nft, alice } = await loadFixture(deploy);
      await expect(nft.connect(alice).mint(alice.address))
        .to.be.revertedWithCustomError(nft, "AccessControlUnauthorizedAccount");
    });

    it("mint 후 ownerOf/balanceOf 확인", async function () {
      const { nft, alice } = await loadFixture(withMinted);
      expect(await nft.ownerOf(1)).to.equal(alice.address);
      expect(await nft.balanceOf(alice.address)).to.equal(2);
    });

    it("mint 시 Transfer(from=0) 이벤트 발행", async function () {
      const { nft, alice } = await loadFixture(deploy);
      await expect(nft.mint(alice.address))
        .to.emit(nft, "Transfer")
        .withArgs(ethers.ZeroAddress, alice.address, 1);
    });
  });

  describe("transferFrom", function () {
    it("owner가 자신의 토큰을 이동시킬 수 있다", async function () {
      const { nft, alice, bob } = await loadFixture(withMinted);
      await nft.connect(alice).transferFrom(alice.address, bob.address, 1);
      expect(await nft.ownerOf(1)).to.equal(bob.address);
      expect(await nft.balanceOf(alice.address)).to.equal(1);
    });

    it("owner가 아닌 계정이 이동 시도하면 ERC721InsufficientApproval", async function () {
      const { nft, alice, bob, spender } = await loadFixture(withMinted);
      await expect(
        nft.connect(spender).transferFrom(alice.address, bob.address, 1)
      ).to.be.revertedWithCustomError(nft, "ERC721InsufficientApproval");
    });

    it("from이 실제 owner가 아니면 ERC721IncorrectOwner", async function () {
      const { nft, alice, bob } = await loadFixture(withMinted);
      await expect(nft.connect(alice).transferFrom(bob.address, alice.address, 1))
        .to.be.revertedWithCustomError(nft, "ERC721IncorrectOwner");
    });
  });

  describe("approve / getApproved", function () {
    it("approve 시 특정 spender만 이동 가능", async function () {
      const { nft, alice, bob, spender } = await loadFixture(withMinted);
      await nft.connect(alice).approve(spender.address, 1);
      expect(await nft.getApproved(1)).to.equal(spender.address);
      await nft.connect(spender).transferFrom(alice.address, bob.address, 1);
      expect(await nft.ownerOf(1)).to.equal(bob.address);
    });

    it("전송 후 approval 자동 해제 — v5 _update 통합점이 처리", async function () {
      const { nft, alice, bob, spender } = await loadFixture(withMinted);
      await nft.connect(alice).approve(spender.address, 1);
      await nft.connect(spender).transferFrom(alice.address, bob.address, 1);
      expect(await nft.getApproved(1)).to.equal(ethers.ZeroAddress);
    });
  });

  describe("setApprovalForAll", function () {
    it("operator가 모든 토큰 이동 가능", async function () {
      const { nft, alice, bob, spender } = await loadFixture(withMinted);
      await nft.connect(alice).setApprovalForAll(spender.address, true);
      expect(await nft.isApprovedForAll(alice.address, spender.address)).to.be.true;

      await nft.connect(spender).transferFrom(alice.address, bob.address, 1);
      await nft.connect(spender).transferFrom(alice.address, bob.address, 2);
      expect(await nft.balanceOf(bob.address)).to.equal(3);
    });

    it("ApprovalForAll 이벤트 발행", async function () {
      const { nft, alice, spender } = await loadFixture(deploy);
      await expect(nft.connect(alice).setApprovalForAll(spender.address, true))
        .to.emit(nft, "ApprovalForAll")
        .withArgs(alice.address, spender.address, true);
    });
  });

  describe("safeTransferFrom", function () {
    it("EOA로 전송 성공", async function () {
      const { nft, alice, bob } = await loadFixture(withMinted);
      await nft.connect(alice)["safeTransferFrom(address,address,uint256)"](
        alice.address, bob.address, 1
      );
      expect(await nft.ownerOf(1)).to.equal(bob.address);
    });

    it("IERC721Receiver 구현체로 전송 성공", async function () {
      const { nft, alice } = await loadFixture(withMinted);
      const Recv = await ethers.getContractFactory("MockERC721Receiver");
      const recv = await Recv.deploy();
      await nft.connect(alice)["safeTransferFrom(address,address,uint256)"](
        alice.address, await recv.getAddress(), 1
      );
      expect(await nft.ownerOf(1)).to.equal(await recv.getAddress());
    });

    it("잘못된 selector를 반환하는 receiver는 ERC721InvalidReceiver revert", async function () {
      const { nft, alice } = await loadFixture(withMinted);
      const Recv = await ethers.getContractFactory("MockERC721Receiver");
      const recv = await Recv.deploy();
      await recv.setReject(true);
      await expect(
        nft.connect(alice)["safeTransferFrom(address,address,uint256)"](
          alice.address, await recv.getAddress(), 1
        )
      ).to.be.revertedWithCustomError(nft, "ERC721InvalidReceiver");
    });

    it("리시버 인터페이스 미구현 컨트랙트로 전송 시 ERC721InvalidReceiver revert", async function () {
      const { nft, alice } = await loadFixture(withMinted);
      const NR = await ethers.getContractFactory("NonReceiver");
      const nr = await NR.deploy();
      await expect(
        nft.connect(alice)["safeTransferFrom(address,address,uint256)"](
          alice.address, await nr.getAddress(), 1
        )
      ).to.be.revertedWithCustomError(nft, "ERC721InvalidReceiver");
    });
  });

  describe("Pausable — v5 _update 통합의 실증", function () {
    it("paused 상태에서는 mint/transfer 모두 EnforcedPause revert", async function () {
      const { nft, alice, bob } = await loadFixture(withMinted);
      await nft.pause();

      // mint 차단
      await expect(nft.mint(alice.address))
        .to.be.revertedWithCustomError(nft, "EnforcedPause");

      // transfer 차단 (같은 _update 통과)
      await expect(nft.connect(alice).transferFrom(alice.address, bob.address, 1))
        .to.be.revertedWithCustomError(nft, "EnforcedPause");
    });
  });
});
