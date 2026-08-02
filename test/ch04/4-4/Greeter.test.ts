import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

/**
 * Sepolia에 실배포하기 전 로컬에서 최종 회귀 테스트.
 * 배포 후 setGreeting 동작 + 이벤트를 확인해 Etherscan verify 리허설 준비.
 */
describe("Ch04-4 — Greeter (Sepolia 배포 대상)", function () {

  async function deploy() {
    const [owner, alice] = await ethers.getSigners();
    const F = await ethers.getContractFactory("Greeter");
    const c = await F.deploy("Hello Sepolia");
    return { c, owner, alice };
  }

  it("배포 시 initial greeting 저장", async function () {
    const { c } = await loadFixture(deploy);
    expect(await c.greeting()).to.equal("Hello Sepolia");
  });

  it("setGreeting 성공 + 이벤트 발행", async function () {
    const { c, alice } = await loadFixture(deploy);
    await expect(c.connect(alice).setGreeting("nice"))
      .to.emit(c, "GreetingUpdated")
      .withArgs(alice.address, "Hello Sepolia", "nice");
    expect(await c.greeting()).to.equal("nice");
  });

  it("여러 번 갱신해도 정상 동작", async function () {
    const { c } = await loadFixture(deploy);
    await c.setGreeting("a");
    await c.setGreeting("b");
    await c.setGreeting("c");
    expect(await c.greeting()).to.equal("c");
  });
});
