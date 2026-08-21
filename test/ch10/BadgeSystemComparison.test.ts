import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Ch10 — Badge System 표준 비교", function () {

  async function deploy() {
    const [admin, alice, bob] = await ethers.getSigners();
    const F = await ethers.getContractFactory("BadgeSystemFactory");
    const factory = await F.deploy();
    return { factory, admin, alice, bob };
  }

  describe("ERC-20 방식 (배지 종류별 컨트랙트)", function () {
    it("배지 3종을 각 3개씩 발급", async function () {
      const { factory, alice } = await loadFixture(deploy);
      for (let i = 0; i < 3; i++) {
        const addr = await factory.asERC20(i);
        const c = await ethers.getContractAt("BadgeAsERC20", addr);
        await c.issue(alice.address, 3);
        expect(await c.balanceOf(alice.address)).to.equal(3);
      }
    });

    it("각 종류가 별도 컨트랙트 주소를 갖는다", async function () {
      const { factory } = await loadFixture(deploy);
      const addrs = await Promise.all(
        [0, 1, 2].map((i) => factory.asERC20(i))
      );
      expect(new Set(addrs).size).to.equal(3);
    });
  });

  describe("ERC-721 방식 (배지 = 유일한 tokenId)", function () {
    it("같은 종류를 여러 번 발급하면 tokenId가 각각 다름", async function () {
      const { factory, alice } = await loadFixture(deploy);
      const addr = await factory.asERC721(0); // Onboarding
      const c = await ethers.getContractAt("BadgeAsERC721", addr);
      await c.issue(alice.address); // token 1
      await c.issue(alice.address); // token 2
      expect(await c.ownerOf(1)).to.equal(alice.address);
      expect(await c.ownerOf(2)).to.equal(alice.address);
      expect(await c.balanceOf(alice.address)).to.equal(2);
    });
  });

  describe("ERC-1155 방식 (통합 컨트랙트)", function () {
    it("한 컨트랙트가 3 종류의 배지 관리", async function () {
      const { factory, alice } = await loadFixture(deploy);
      const addr = await factory.asERC1155();
      const c = await ethers.getContractAt("BadgeAsERC1155", addr);

      await c.issue(alice.address, 1, 2); // Onboarding 2개
      await c.issue(alice.address, 2, 1); // Leadership 1개
      expect(await c.balanceOf(alice.address, 1)).to.equal(2);
      expect(await c.balanceOf(alice.address, 2)).to.equal(1);
      expect(await c.nameOf(1)).to.equal("Onboarding");
    });
  });

  describe("발급 비용 비교 — 배지 3종 각 1개", function () {

    it("issueAll_1155가 가장 저렴 (단일 스토리지 슬롯 계정)", async function () {
      const { factory, alice } = await loadFixture(deploy);
      const gas20   = await factory.issueAll_20.estimateGas(alice.address);
      const gas721  = await factory.issueAll_721.estimateGas(alice.address);
      const gas1155 = await factory.issueAll_1155.estimateGas(alice.address);

      // 1155가 20 / 721 대비 저렴해야 함
      expect(gas1155).to.be.lt(gas20);
      expect(gas1155).to.be.lt(gas721);
    });

    it("발급 결과가 세 방식 모두 동일 (배지 3종 1개씩)", async function () {
      const { factory, alice } = await loadFixture(deploy);
      await factory.issueAll_20(alice.address);
      await factory.issueAll_721(alice.address);
      await factory.issueAll_1155(alice.address);

      // ERC-20
      for (let i = 0; i < 3; i++) {
        const c = await ethers.getContractAt("BadgeAsERC20", await factory.asERC20(i));
        expect(await c.balanceOf(alice.address)).to.equal(1);
      }
      // ERC-721
      for (let i = 0; i < 3; i++) {
        const c = await ethers.getContractAt("BadgeAsERC721", await factory.asERC721(i));
        expect(await c.balanceOf(alice.address)).to.equal(1);
      }
      // ERC-1155
      const c1155 = await ethers.getContractAt("BadgeAsERC1155", await factory.asERC1155());
      for (let i = 1; i <= 3; i++) {
        expect(await c1155.balanceOf(alice.address, i)).to.equal(1);
      }
    });
  });

  describe("트레이드오프 요약 (개념 검증)", function () {
    it("ERC-20: 배지 종류 늘면 배포 개수 늘어남 (관리 부담)", async function () {
      const { factory } = await loadFixture(deploy);
      // 3종 배포됨
      for (let i = 0; i < 3; i++) {
        const addr = await factory.asERC20(i);
        expect(addr).to.not.equal(ethers.ZeroAddress);
      }
    });

    it("ERC-721: 발급 이력 = tokenId 시퀀스 (감사 유리, 저장소 폭발 위험)", async function () {
      const { factory, alice, bob } = await loadFixture(deploy);
      const addr = await factory.asERC721(0);
      const c = await ethers.getContractAt("BadgeAsERC721", addr);
      // 발급마다 tokenId 별도 → 이력 자체가 온체인
      await c.issue(alice.address);
      await c.issue(bob.address);
      await c.issue(alice.address);
      expect(await c.ownerOf(1)).to.equal(alice.address);
      expect(await c.ownerOf(2)).to.equal(bob.address);
      expect(await c.ownerOf(3)).to.equal(alice.address);
    });

    it("ERC-1155: 한 컨트랙트로 여러 종류 + 수량 (가장 유연)", async function () {
      const { factory, alice } = await loadFixture(deploy);
      const addr = await factory.asERC1155();
      const c = await ethers.getContractAt("BadgeAsERC1155", addr);
      await c.issue(alice.address, 1, 5);
      // 동시에 여러 종류 자연스러움
      expect(await c.balanceOf(alice.address, 1)).to.equal(5);
    });
  });
});
