import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Ch12-14 — EnterpriseNFTV1 (UUPS Proxy)", function () {

  const URI = "https://api.example.com/token/{id}.json";

  async function deploy() {
    const [admin, alice, bob] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EnterpriseNFTV1");
    const proxy = await upgrades.deployProxy(
      Factory,
      [admin.address, URI],
      { kind: "uups", initializer: "initialize" }
    );
    await proxy.waitForDeployment();
    return { proxy, admin, alice, bob, Factory };
  }

  describe("초기화", function () {
    it("initialize()가 호출되었고 URI가 설정된다", async function () {
      const { proxy } = await loadFixture(deploy);
      expect(await (proxy as any).uri(0)).to.equal(URI);
    });

    it("version() = 1.0.0", async function () {
      const { proxy } = await loadFixture(deploy);
      expect(await (proxy as any).version()).to.equal("1.0.0");
    });

    it("초기화 후 재호출은 revert (initializer)", async function () {
      const { proxy, admin } = await loadFixture(deploy);
      await expect((proxy as any).initialize(admin.address, "x"))
        .to.be.revertedWithCustomError(proxy as any, "InvalidInitialization");
    });
  });

  describe("역할과 mint", function () {
    it("admin이 DEFAULT_ADMIN_ROLE 보유", async function () {
      const { proxy, admin } = await loadFixture(deploy);
      const ROLE = await (proxy as any).DEFAULT_ADMIN_ROLE();
      expect(await (proxy as any).hasRole(ROLE, admin.address)).to.be.true;
    });

    it("MINTER가 mint 가능", async function () {
      const { proxy, admin, alice } = await loadFixture(deploy);
      const tid = await (proxy as any).encodeTokenId(1, 1);
      await (proxy as any).connect(admin).mint(alice.address, tid, 10, "0x");
      expect(await (proxy as any).balanceOf(alice.address, tid)).to.equal(10);
    });

    it("표준 mintBatch (한 명에게 여러 종류)", async function () {
      const { proxy, admin, alice } = await loadFixture(deploy);
      const id1 = await (proxy as any).encodeTokenId(1, 100);
      const id2 = await (proxy as any).encodeTokenId(1, 101);
      await (proxy as any).connect(admin)
        ["mintBatch(address,uint256[],uint256[],bytes)"](
          alice.address, [id1, id2], [5, 10], "0x"
        );
      expect(await (proxy as any).balanceOfBatch([alice.address, alice.address], [id1, id2]))
        .to.deep.equal([5n, 10n]);
    });

    it("커스텀 mintBatch (여러 명에게 각각) — 이벤트 달성자 배포 시나리오", async function () {
      const { proxy, admin, alice, bob } = await loadFixture(deploy);
      const badge = await (proxy as any).encodeTokenId(2, 42);
      await (proxy as any).connect(admin)
        ["mintBatch(address[],uint256[],uint256[])"](
          [alice.address, bob.address], [badge, badge], [1, 1]
        );
      expect(await (proxy as any).balanceOfBatch([alice.address, bob.address], [badge, badge]))
        .to.deep.equal([1n, 1n]);
    });

    it("커스텀 mintBatch 세 배열 길이 불일치 → LengthMismatch", async function () {
      const { proxy, admin, alice, bob } = await loadFixture(deploy);
      const badge = await (proxy as any).encodeTokenId(2, 42);
      await expect(
        (proxy as any).connect(admin)
          ["mintBatch(address[],uint256[],uint256[])"](
            [alice.address, bob.address], [badge], [1, 1]
          )
      ).to.be.revertedWithCustomError(proxy as any, "LengthMismatch");
    });
  });

  describe("프록시 구조 확인", function () {
    it("Implementation 주소가 Proxy와 다르다", async function () {
      const { proxy } = await loadFixture(deploy);
      const proxyAddr = await (proxy as any).getAddress();
      const implAddr = await upgrades.erc1967.getImplementationAddress(proxyAddr);
      expect(implAddr).to.not.equal(proxyAddr);
      expect(implAddr).to.not.equal(ethers.ZeroAddress);
    });

    it("Implementation의 initialize 직접 호출은 disabled", async function () {
      const { proxy, admin } = await loadFixture(deploy);
      const proxyAddr = await (proxy as any).getAddress();
      const implAddr = await upgrades.erc1967.getImplementationAddress(proxyAddr);
      const impl = await ethers.getContractAt("EnterpriseNFTV1", implAddr);
      await expect(impl.initialize(admin.address, "x"))
        .to.be.revertedWithCustomError(impl, "InvalidInitialization");
    });
  });
});
