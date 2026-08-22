import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

/**
 * Ch10 실습 — MyERC1155 (ERC-1155 최소 직접 구현) 테스트
 *
 * Ch09 MyNFT.test.ts 와 병렬 구조 · 8 describe · 총 23 it
 * ERC-1155 특유의 검증 포인트:
 *   - 이중 매핑 (같은 tokenId 를 여러 계정이 각자 보유)
 *   - 세미펀저블 (amount 로 FT/NFT 성격 갈림)
 *   - 배치 조회 · 배치 전송 (순서 대응)
 *   - 콜백 두 개 (single/batch)
 *   - 전체 위임만 존재 (개별 승인 없음)
 */
describe("Ch10 — MyERC1155 (ERC-1155 직접 구현)", function () {

  async function deploy() {
    const [owner, alice, bob, spender] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyERC1155");
    const nft = await Factory.deploy();
    return { nft, owner, alice, bob, spender };
  }

  async function withMinted() {
    const base = await deploy();
    // 걷기 배지 (id=1) : alice 1, bob 1 (NFT 성격 시뮬레이션)
    await base.nft.mint(base.alice.address, 1, 1, "0x");
    await base.nft.mint(base.bob.address, 1, 1, "0x");
    // 쿠폰 (id=2) : alice 5, bob 3 (FT 성격)
    await base.nft.mint(base.alice.address, 2, 5, "0x");
    await base.nft.mint(base.bob.address, 2, 3, "0x");
    return base;
  }

  describe("ERC-165 supportsInterface", function () {
    it("IERC165 (0x01ffc9a7) 지원", async function () {
      const { nft } = await loadFixture(deploy);
      expect(await nft.supportsInterface("0x01ffc9a7")).to.be.true;
    });

    it("IERC1155 (0xd9b67a26) 지원", async function () {
      const { nft } = await loadFixture(deploy);
      expect(await nft.supportsInterface("0xd9b67a26")).to.be.true;
    });

    it("미지원 인터페이스는 false (ERC-721 selector 등)", async function () {
      const { nft } = await loadFixture(deploy);
      expect(await nft.supportsInterface("0x80ac58cd")).to.be.false; // IERC721
      expect(await nft.supportsInterface("0xffffffff")).to.be.false;
    });
  });

  describe("이중 매핑 — 같은 tokenId 를 여러 계정이 각자 보유", function () {
    it("같은 id=1 을 alice 와 bob 이 각자 1개씩 보유 (Ch09 에서는 불가능)", async function () {
      const { nft, alice, bob } = await loadFixture(withMinted);
      expect(await nft.balanceOf(alice.address, 1)).to.equal(1);
      expect(await nft.balanceOf(bob.address, 1)).to.equal(1);
    });

    it("같은 id=2 를 alice 5개 · bob 3개 (수량 다름 · FT 성격)", async function () {
      const { nft, alice, bob } = await loadFixture(withMinted);
      expect(await nft.balanceOf(alice.address, 2)).to.equal(5);
      expect(await nft.balanceOf(bob.address, 2)).to.equal(3);
    });

    it("balanceOf 인자 두 개 필수 — 주소만으로는 물을 수 없다", async function () {
      const { nft, alice } = await loadFixture(withMinted);
      // ownerOf(tokenId) 는 존재하지 않음 → 잔액 조회는 (addr, id) 쌍
      expect(await nft.balanceOf(alice.address, 1)).to.equal(1);
      expect(await nft.balanceOf(alice.address, 2)).to.equal(5);
    });
  });

  describe("balanceOfBatch — 여러 조합 한 번에", function () {
    it("여러 (address, id) 쌍 배치 조회 · 순서 대응", async function () {
      const { nft, alice, bob } = await loadFixture(withMinted);
      const balances = await nft.balanceOfBatch(
        [alice.address, bob.address, alice.address, bob.address],
        [1, 1, 2, 2]
      );
      expect(balances).to.deep.equal([1n, 1n, 5n, 3n]);
    });

    it("배열 길이 불일치 시 LengthMismatch", async function () {
      const { nft, alice, bob } = await loadFixture(withMinted);
      await expect(
        nft.balanceOfBatch([alice.address, bob.address], [1])
      ).to.be.revertedWithCustomError(nft, "LengthMismatch");
    });
  });

  describe("mint", function () {
    it("owner 만 mint 가능", async function () {
      const { nft, alice } = await loadFixture(deploy);
      await expect(nft.connect(alice).mint(alice.address, 1, 10, "0x"))
        .to.be.revertedWithCustomError(nft, "NotOwner");
    });

    it("mint 시 TransferSingle 이벤트 (from=0)", async function () {
      const { nft, owner, alice } = await loadFixture(deploy);
      await expect(nft.mint(alice.address, 1, 5, "0x"))
        .to.emit(nft, "TransferSingle")
        .withArgs(owner.address, ethers.ZeroAddress, alice.address, 1, 5);
    });

    it("같은 id 재발행 시 잔액 누적 (ERC-721 과 결정적 차이)", async function () {
      const { nft, alice } = await loadFixture(deploy);
      await nft.mint(alice.address, 1, 3, "0x");
      await nft.mint(alice.address, 1, 5, "0x");
      expect(await nft.balanceOf(alice.address, 1)).to.equal(8);
    });

    it("mintBatch — 한 명에게 여러 종류 · TransferBatch 이벤트", async function () {
      const { nft, owner, alice } = await loadFixture(deploy);
      await expect(nft.mintBatch(alice.address, [1, 2, 3], [10, 20, 30], "0x"))
        .to.emit(nft, "TransferBatch")
        .withArgs(
          owner.address, ethers.ZeroAddress, alice.address,
          [1n, 2n, 3n], [10n, 20n, 30n]
        );
    });
  });

  describe("safeTransferFrom (단건)", function () {
    it("owner 가 자신의 토큰 이동", async function () {
      const { nft, alice, bob } = await loadFixture(withMinted);
      await nft.connect(alice).safeTransferFrom(alice.address, bob.address, 2, 2, "0x");
      expect(await nft.balanceOf(alice.address, 2)).to.equal(3);
      expect(await nft.balanceOf(bob.address, 2)).to.equal(5);
    });

    it("승인 없는 계정 이동 시도 → NotAuthorized", async function () {
      const { nft, alice, bob, spender } = await loadFixture(withMinted);
      await expect(
        nft.connect(spender).safeTransferFrom(alice.address, bob.address, 2, 1, "0x")
      ).to.be.revertedWithCustomError(nft, "NotAuthorized");
    });

    it("잔액 부족 시 InsufficientBalance", async function () {
      const { nft, alice, bob } = await loadFixture(withMinted);
      await expect(
        nft.connect(alice).safeTransferFrom(alice.address, bob.address, 2, 999, "0x")
      ).to.be.revertedWithCustomError(nft, "InsufficientBalance");
    });
  });

  describe("safeBatchTransferFrom (배치)", function () {
    it("여러 tokenId 한 번에 전송 · 순서 대응", async function () {
      const { nft, alice, bob } = await loadFixture(withMinted);
      await nft.connect(alice).safeBatchTransferFrom(
        alice.address, bob.address, [1, 2], [1, 3], "0x"
      );
      expect(await nft.balanceOf(alice.address, 1)).to.equal(0);
      expect(await nft.balanceOf(alice.address, 2)).to.equal(2);
      expect(await nft.balanceOf(bob.address, 1)).to.equal(2);
      expect(await nft.balanceOf(bob.address, 2)).to.equal(6);
    });

    it("배치 원자성 — 하나라도 실패하면 전체 롤백 (잔액 부족)", async function () {
      const { nft, alice, bob } = await loadFixture(withMinted);
      // id=2 amount=999 로 두 번째 항목이 실패해야 함
      await expect(
        nft.connect(alice).safeBatchTransferFrom(
          alice.address, bob.address, [1, 2], [1, 999], "0x"
        )
      ).to.be.revertedWithCustomError(nft, "InsufficientBalance");
      // 첫 번째 항목도 롤백됐는지 확인
      expect(await nft.balanceOf(alice.address, 1)).to.equal(1);
      expect(await nft.balanceOf(bob.address, 1)).to.equal(1);
    });

    it("배열 길이 불일치 시 LengthMismatch", async function () {
      const { nft, alice, bob } = await loadFixture(withMinted);
      await expect(
        nft.connect(alice).safeBatchTransferFrom(
          alice.address, bob.address, [1, 2], [1], "0x"
        )
      ).to.be.revertedWithCustomError(nft, "LengthMismatch");
    });
  });

  describe("setApprovalForAll — 전체 위임만 존재", function () {
    it("operator 가 여러 tokenId 이동 가능", async function () {
      const { nft, alice, bob, spender } = await loadFixture(withMinted);
      await nft.connect(alice).setApprovalForAll(spender.address, true);
      expect(await nft.isApprovedForAll(alice.address, spender.address)).to.be.true;

      await nft.connect(spender).safeTransferFrom(alice.address, bob.address, 1, 1, "0x");
      await nft.connect(spender).safeTransferFrom(alice.address, bob.address, 2, 3, "0x");
      expect(await nft.balanceOf(bob.address, 1)).to.equal(2);
      expect(await nft.balanceOf(bob.address, 2)).to.equal(6);
    });

    it("ApprovalForAll 이벤트 발행", async function () {
      const { nft, alice, spender } = await loadFixture(deploy);
      await expect(nft.connect(alice).setApprovalForAll(spender.address, true))
        .to.emit(nft, "ApprovalForAll")
        .withArgs(alice.address, spender.address, true);
    });

    it("자기 자신에게 승인 시도 → SelfApproval", async function () {
      const { nft, alice } = await loadFixture(deploy);
      await expect(nft.connect(alice).setApprovalForAll(alice.address, true))
        .to.be.revertedWithCustomError(nft, "SelfApproval");
    });
  });

  describe("수신 콜백 (safe transfer receiver check)", function () {
    it("EOA 로 전송 성공 (콜백 검사 skip)", async function () {
      const { nft, alice, bob } = await loadFixture(withMinted);
      await nft.connect(alice).safeTransferFrom(alice.address, bob.address, 2, 1, "0x");
      expect(await nft.balanceOf(bob.address, 2)).to.equal(4);
    });

    it("IERC1155Receiver 구현체 (단건 콜백 매직값 정상) → 성공", async function () {
      const { nft, alice } = await loadFixture(withMinted);
      const Recv = await ethers.getContractFactory("MockERC1155Receiver");
      const recv = await Recv.deploy();
      await nft.connect(alice).safeTransferFrom(
        alice.address, await recv.getAddress(), 2, 3, "0x"
      );
      expect(await nft.balanceOf(await recv.getAddress(), 2)).to.equal(3);
    });

    it("단건 콜백 잘못된 selector 반환 → InvalidReceiver revert", async function () {
      const { nft, alice } = await loadFixture(withMinted);
      const Recv = await ethers.getContractFactory("MockERC1155Receiver");
      const recv = await Recv.deploy();
      await recv.setRejectSingle(true);
      await expect(
        nft.connect(alice).safeTransferFrom(
          alice.address, await recv.getAddress(), 2, 1, "0x"
        )
      ).to.be.revertedWithCustomError(nft, "InvalidReceiver");
    });

    it("배치 콜백 잘못된 selector 반환 → InvalidReceiver revert", async function () {
      const { nft, alice } = await loadFixture(withMinted);
      const Recv = await ethers.getContractFactory("MockERC1155Receiver");
      const recv = await Recv.deploy();
      await recv.setRejectBatch(true);
      await expect(
        nft.connect(alice).safeBatchTransferFrom(
          alice.address, await recv.getAddress(), [1, 2], [1, 1], "0x"
        )
      ).to.be.revertedWithCustomError(nft, "InvalidReceiver");
    });

    it("단건 콜백만 구현 · 배치 콜백 실패 → 배치 전송 revert (둘 다 필요)", async function () {
      const { nft, alice } = await loadFixture(withMinted);
      const Recv = await ethers.getContractFactory("MockERC1155Receiver");
      const recv = await Recv.deploy();
      await recv.setImplementSingleOnly(true);
      // 단건은 성공
      await nft.connect(alice).safeTransferFrom(
        alice.address, await recv.getAddress(), 2, 1, "0x"
      );
      // 배치는 실패
      await expect(
        nft.connect(alice).safeBatchTransferFrom(
          alice.address, await recv.getAddress(), [1, 2], [1, 1], "0x"
        )
      ).to.be.revertedWithCustomError(nft, "InvalidReceiver");
    });

    it("리시버 인터페이스 미구현 컨트랙트로 전송 시 InvalidReceiver revert", async function () {
      const { nft, alice } = await loadFixture(withMinted);
      const NR = await ethers.getContractFactory("NonReceiver1155");
      const nr = await NR.deploy();
      await expect(
        nft.connect(alice).safeTransferFrom(
          alice.address, await nr.getAddress(), 2, 1, "0x"
        )
      ).to.be.revertedWithCustomError(nft, "InvalidReceiver");
    });
  });

  describe("전송 시 0 주소 방어", function () {
    it("safeTransferFrom to = 0 → ZeroAddress revert", async function () {
      const { nft, alice } = await loadFixture(withMinted);
      await expect(
        nft.connect(alice).safeTransferFrom(alice.address, ethers.ZeroAddress, 2, 1, "0x")
      ).to.be.revertedWithCustomError(nft, "ZeroAddress");
    });

    it("balanceOf 0 주소 조회 → ZeroAddress revert", async function () {
      const { nft } = await loadFixture(deploy);
      await expect(nft.balanceOf(ethers.ZeroAddress, 1))
        .to.be.revertedWithCustomError(nft, "ZeroAddress");
    });
  });
});
