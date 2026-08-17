import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Ch15 — UUPS Upgrade (V1 → V2)", function () {

  const URI = "https://api.example.com/token/{id}.json";

  async function deployV1() {
    const [admin, alice] = await ethers.getSigners();
    const V1 = await ethers.getContractFactory("EnterpriseNFTV1");
    const proxy = await upgrades.deployProxy(
      V1,
      [admin.address, URI],
      { kind: "uups", initializer: "initialize" }
    );
    await proxy.waitForDeployment();
    return { proxy, admin, alice, V1 };
  }

  describe("업그레이드 전 상태 보존", function () {
    it("v1에서 mint한 balance가 v2 업그레이드 후에도 유지된다", async function () {
      const { proxy, admin, alice } = await loadFixture(deployV1);

      const tid = await (proxy as any).encodeTokenId(1, 1);
      await (proxy as any).connect(admin).mint(alice.address, tid, 100, "0x");

      const proxyAddr = await (proxy as any).getAddress();
      const V2 = await ethers.getContractFactory("EnterpriseNFTV2");
      const upgraded = await upgrades.upgradeProxy(proxyAddr, V2, {
        kind: "uups",
        call: { fn: "initializeV2", args: [] },
      });

      // 잔액 보존
      expect(await (upgraded as any).balanceOf(alice.address, tid)).to.equal(100);
      // 버전 갱신
      expect(await (upgraded as any).version()).to.equal("2.0.0");
    });

    it("업그레이드 후 새 기능 (setExpiry) 사용 가능", async function () {
      const { proxy, admin } = await loadFixture(deployV1);
      const proxyAddr = await (proxy as any).getAddress();

      const V2 = await ethers.getContractFactory("EnterpriseNFTV2");
      const upgraded = await upgrades.upgradeProxy(proxyAddr, V2, {
        kind: "uups",
        call: { fn: "initializeV2", args: [] },
      });

      const future = (await time.latest()) + 3600;
      await (upgraded as any).setExpiry(1, future);
      expect(await (upgraded as any).tokenExpiry(1)).to.equal(future);
      expect(await (upgraded as any).isExpired(1)).to.be.false;
    });

    it("Implementation 주소가 바뀐다", async function () {
      const { proxy } = await loadFixture(deployV1);
      const proxyAddr = await (proxy as any).getAddress();
      const before = await upgrades.erc1967.getImplementationAddress(proxyAddr);

      const V2 = await ethers.getContractFactory("EnterpriseNFTV2");
      await upgrades.upgradeProxy(proxyAddr, V2, {
        kind: "uups",
        call: { fn: "initializeV2", args: [] },
      });
      const after = await upgrades.erc1967.getImplementationAddress(proxyAddr);

      expect(after).to.not.equal(before);
    });
  });

  describe("Storage layout 검증", function () {
    it("V2_BAD로 업그레이드 시 hardhat-upgrades가 revert", async function () {
      const { proxy } = await loadFixture(deployV1);
      const proxyAddr = await (proxy as any).getAddress();

      const BAD = await ethers.getContractFactory("EnterpriseNFTV2_BAD");
      await expect(
        upgrades.upgradeProxy(proxyAddr, BAD, { kind: "uups" })
      ).to.be.rejected;
    });
  });

  describe("reinitializer(2) 재실행 방지", function () {
    it("initializeV2()는 딱 한 번만 실행된다", async function () {
      const { proxy } = await loadFixture(deployV1);
      const proxyAddr = await (proxy as any).getAddress();

      const V2 = await ethers.getContractFactory("EnterpriseNFTV2");
      const upgraded = await upgrades.upgradeProxy(proxyAddr, V2, {
        kind: "uups",
        call: { fn: "initializeV2", args: [] },
      });

      // 두 번째 호출은 revert
      await expect((upgraded as any).initializeV2())
        .to.be.revertedWithCustomError(upgraded as any, "InvalidInitialization");
    });
  });
});
