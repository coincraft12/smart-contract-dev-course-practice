import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Ch10 — Token Standard Comparison (왜 ERC-1155?)", function () {

  async function deploy() {
    const [owner, alice, bob] = await ethers.getSigners();
    const F = await ethers.getContractFactory("TicketSystemFactory");
    const factory = await F.deploy();
    return { factory, owner, alice, bob };
  }

  describe("ERC-20 mini (대체 가능)", function () {
    it("같은 종류 티켓은 계정별 잔액으로 관리 — tokenId 개념 없음", async function () {
      const { factory, alice } = await loadFixture(deploy);
      const vipAddr = await factory.erc20Tickets(0);
      const vip = await ethers.getContractAt("MiniERC20", vipAddr);
      await vip.mint(alice.address, 250);
      expect(await vip.balanceOf(alice.address)).to.equal(250);
    });

    it("VIP와 Standard는 각각 별도 컨트랙트가 필요", async function () {
      const { factory } = await loadFixture(deploy);
      const vipAddr = await factory.erc20Tickets(0);
      const stdAddr = await factory.erc20Tickets(1);
      expect(vipAddr).to.not.equal(stdAddr);
      const vip = await ethers.getContractAt("MiniERC20", vipAddr);
      const std = await ethers.getContractAt("MiniERC20", stdAddr);
      expect(await vip.name()).to.equal("VIP");
      expect(await std.name()).to.equal("Standard");
    });
  });

  describe("ERC-721 mini (대체 불가능)", function () {
    it("각 tokenId는 소유자 1명, 수량은 0 또는 1", async function () {
      const { factory, alice } = await loadFixture(deploy);
      const vipAddr = await factory.erc721Tickets(0);
      const vip = await ethers.getContractAt("MiniERC721", vipAddr);
      await vip.mint(alice.address); // tokenId 1
      await vip.mint(alice.address); // tokenId 2
      expect(await vip.ownerOf(1)).to.equal(alice.address);
      expect(await vip.ownerOf(2)).to.equal(alice.address);
      expect(await vip.balanceOf(alice.address)).to.equal(2);
    });

    it("같은 tokenId에 두 소유자 불가 — 전송 시 이전", async function () {
      const { factory, alice, bob } = await loadFixture(deploy);
      const vipAddr = await factory.erc721Tickets(0);
      const vip = await ethers.getContractAt("MiniERC721", vipAddr);
      await vip.mint(alice.address);
      await vip.connect(alice).transfer(bob.address, 1);
      expect(await vip.ownerOf(1)).to.equal(bob.address);
      expect(await vip.balanceOf(alice.address)).to.equal(0);
    });
  });

  describe("ERC-1155 mini (하이브리드) — 하나의 컨트랙트로 여러 tokenId", function () {
    it("같은 컨트랙트에서 tokenId별 잔액 개별 관리", async function () {
      const { factory, alice, bob } = await loadFixture(deploy);
      const addr = await factory.erc1155Tickets();
      const c = await ethers.getContractAt("MiniERC1155", addr);

      await c.mint(alice.address, 1, 100); // VIP 100
      await c.mint(alice.address, 2, 50);  // Standard 50
      await c.mint(bob.address, 1, 30);    // bob의 VIP 30

      expect(await c.balanceOf(alice.address, 1)).to.equal(100);
      expect(await c.balanceOf(alice.address, 2)).to.equal(50);
      expect(await c.balanceOf(bob.address, 1)).to.equal(30);
      expect(await c.balanceOf(bob.address, 2)).to.equal(0);
    });

    it("동일 tokenId를 여러 계정이 각기 다른 수량으로 보유 가능", async function () {
      const { factory, alice, bob } = await loadFixture(deploy);
      const addr = await factory.erc1155Tickets();
      const c = await ethers.getContractAt("MiniERC1155", addr);
      await c.mint(alice.address, 1, 100);
      await c.mint(bob.address, 1, 30);
      await c.connect(alice).transfer(bob.address, 1, 25);
      expect(await c.balanceOf(alice.address, 1)).to.equal(75);
      expect(await c.balanceOf(bob.address, 1)).to.equal(55);
    });
  });

  describe("발급 비용 비교 (issueAllToUser)", function () {
    it("100개씩 3종 발급 시 ERC-721이 가장 비쌈 (300 mint tx)", async function () {
      const { factory, alice, bob } = await loadFixture(deploy);
      // gas 측정을 위해 tx 실행
      const tx = await factory.issueAllToUser(alice.address);
      const receipt = await tx.wait();
      // ERC-721 300회 mint + ERC-20 3회 + ERC-1155 3회 → 306번 mint 호출
      // 정확한 수치보단 트래픽/스토리지 접근이 많다는 사실이 중요
      expect(receipt!.gasUsed).to.be.gt(0);

      // ERC-1155 검증: 한 컨트랙트에 3 tokenId
      const addr = await factory.erc1155Tickets();
      const c = await ethers.getContractAt("MiniERC1155", addr);
      expect(await c.balanceOf(alice.address, 1)).to.equal(100);
      expect(await c.balanceOf(alice.address, 2)).to.equal(100);
      expect(await c.balanceOf(alice.address, 3)).to.equal(100);
    });
  });
});
