import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Ch13 — tx.origin 피싱 공격", function () {

  async function deploy() {
    const [owner, attacker] = await ethers.getSigners();

    const Victim = await ethers.getContractFactory("TxOriginVictim");
    const victim = await Victim.connect(owner).deploy();
    await victim.waitForDeployment();

    // owner가 victim에 10 ETH 예치
    await owner.sendTransaction({
      to: await victim.getAddress(),
      value: ethers.parseEther("10"),
    });

    const Att = await ethers.getContractFactory("TxOriginAttacker");
    const att = await Att.connect(attacker).deploy(await victim.getAddress());
    await att.waitForDeployment();

    return { victim, att, owner, attacker };
  }

  it("badWithdraw는 tx.origin 검증만 하므로 피싱 공격에 뚫린다", async function () {
    const { victim, att, owner, attacker } = await loadFixture(deploy);

    // owner가 피싱 링크를 클릭하듯 attacker 컨트랙트의 pwn()을 호출
    // → victim.badWithdraw에서 tx.origin = owner이므로 통과
    const before = await ethers.provider.getBalance(attacker.address);
    await att.connect(owner).pwn();
    const after = await ethers.provider.getBalance(attacker.address);

    // attacker EOA에 자금이 이동함
    expect(after - before).to.equal(ethers.parseEther("10"));
    expect(await ethers.provider.getBalance(await victim.getAddress())).to.equal(0);
  });

  it("goodWithdraw는 msg.sender를 검증하므로 owner만 직접 호출 가능", async function () {
    const { victim, owner, attacker } = await loadFixture(deploy);

    // owner가 직접 호출: 성공
    const attackerBefore = await ethers.provider.getBalance(attacker.address);
    await victim.connect(owner).goodWithdraw(attacker.address, ethers.parseEther("1"));
    const attackerAfter = await ethers.provider.getBalance(attacker.address);
    expect(attackerAfter - attackerBefore).to.equal(ethers.parseEther("1"));

    // attacker가 호출: revert
    await expect(
      victim.connect(attacker).goodWithdraw(attacker.address, ethers.parseEther("1"))
    ).to.be.revertedWith("not owner");
  });
});
