import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Ch11 — msg.sender / call / delegatecall", function () {

  async function deploy() {
    const [owner, alice] = await ethers.getSigners();
    const Logic = await ethers.getContractFactory("Logic");
    const logic = await Logic.deploy();
    const Proxy = await ethers.getContractFactory("Proxy");
    const proxy = await Proxy.deploy(await logic.getAddress());
    return { logic, proxy, owner, alice };
  }

  describe("delegatecall (forwardDelegate)", function () {
    it("Proxy storage에 값이 저장된다", async function () {
      const { logic, proxy } = await loadFixture(deploy);
      await proxy.forwardDelegate(42);
      expect(await proxy.value()).to.equal(42);
      // Logic 자신의 storage는 변화 없음
      expect(await logic.value()).to.equal(0);
    });

    it("msg.sender는 최초 호출자 유지", async function () {
      const { proxy, alice } = await loadFixture(deploy);
      await proxy.connect(alice).forwardDelegate(42);
      expect(await proxy.sender()).to.equal(alice.address);
    });

    it("tx.origin은 최초 EOA로 고정", async function () {
      const { proxy, alice } = await loadFixture(deploy);
      await proxy.connect(alice).forwardDelegate(42);
      expect(await proxy.origin()).to.equal(alice.address);
    });
  });

  describe("call (forwardCall)", function () {
    it("Logic storage에 값이 저장된다 (Proxy는 그대로)", async function () {
      const { logic, proxy } = await loadFixture(deploy);
      await proxy.forwardCall(99);
      expect(await logic.value()).to.equal(99);
      expect(await proxy.value()).to.equal(0);
    });

    it("msg.sender는 Proxy 주소로 바뀐다", async function () {
      const { logic, proxy, alice } = await loadFixture(deploy);
      await proxy.connect(alice).forwardCall(99);
      expect(await logic.sender()).to.equal(await proxy.getAddress());
    });

    it("tx.origin은 여전히 최초 EOA", async function () {
      const { logic, proxy, alice } = await loadFixture(deploy);
      await proxy.connect(alice).forwardCall(99);
      expect(await logic.origin()).to.equal(alice.address);
    });
  });
});
