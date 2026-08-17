import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Ch19 — MultisigService + Travel Rule", function () {

  async function deploy() {
    const [funder, alice, bob, carol, dave, receiver] = await ethers.getSigners();

    const Oracle = await ethers.getContractFactory("MockTravelRuleOracle");
    const oracle = await Oracle.deploy();

    const Svc = await ethers.getContractFactory("MultisigService");
    const svc = await Svc.deploy(
      [alice.address, bob.address, carol.address],
      2, // 2-of-3
      await oracle.getAddress()
    );
    await svc.waitForDeployment();

    await funder.sendTransaction({
      to: await svc.getAddress(),
      value: ethers.parseEther("10"),
    });

    return { svc, oracle, alice, bob, carol, dave, receiver };
  }

  describe("propose", function () {
    it("signer가 propose하면 자동으로 자신도 confirm된다", async function () {
      const { svc, alice, receiver } = await loadFixture(deploy);
      await expect(svc.connect(alice).propose(receiver.address, ethers.parseEther("1"), "0x"))
        .to.emit(svc, "Proposed").withArgs(0, alice.address, receiver.address, ethers.parseEther("1"));

      const [, , , confirmations, status] = await svc.getTx(0);
      expect(confirmations).to.equal(1);
      expect(status).to.equal(1); // Pending
      expect(await svc.hasConfirmed(0, alice.address)).to.be.true;
    });

    it("non-signer는 propose 불가", async function () {
      const { svc, dave, receiver } = await loadFixture(deploy);
      await expect(svc.connect(dave).propose(receiver.address, 100n, "0x"))
        .to.be.revertedWithCustomError(svc, "NotSigner");
    });
  });

  describe("confirm", function () {
    it("두 번째 signer가 confirm하면 confirmations=2", async function () {
      const { svc, alice, bob, receiver } = await loadFixture(deploy);
      await svc.connect(alice).propose(receiver.address, ethers.parseEther("1"), "0x");
      await svc.connect(bob).confirm(0);
      const [, , , confirmations] = await svc.getTx(0);
      expect(confirmations).to.equal(2);
    });

    it("중복 confirm은 AlreadyConfirmed", async function () {
      const { svc, alice, receiver } = await loadFixture(deploy);
      await svc.connect(alice).propose(receiver.address, 100n, "0x");
      await expect(svc.connect(alice).confirm(0))
        .to.be.revertedWithCustomError(svc, "AlreadyConfirmed");
    });
  });

  describe("execute (2-of-3 통과 + Travel Rule OK)", function () {
    it("threshold 도달 시 ETH 전송 성공", async function () {
      const { svc, alice, bob, receiver } = await loadFixture(deploy);
      await svc.connect(alice).propose(receiver.address, ethers.parseEther("1"), "0x");
      await svc.connect(bob).confirm(0);

      const before = await ethers.provider.getBalance(receiver.address);
      await expect(svc.connect(alice).execute(0))
        .to.emit(svc, "Executed").withArgs(0);
      const after = await ethers.provider.getBalance(receiver.address);
      expect(after - before).to.equal(ethers.parseEther("1"));

      const [, , , , status] = await svc.getTx(0);
      expect(status).to.equal(2); // Executed
    });

    it("threshold 미달이면 BelowThreshold", async function () {
      const { svc, alice, receiver } = await loadFixture(deploy);
      await svc.connect(alice).propose(receiver.address, 100n, "0x");
      await expect(svc.connect(alice).execute(0))
        .to.be.revertedWithCustomError(svc, "BelowThreshold");
    });
  });

  describe("Travel Rule 실패", function () {
    it("oracle이 reject하면 TravelRuleFailed(code)", async function () {
      const { svc, oracle, alice, bob, receiver } = await loadFixture(deploy);
      await oracle.setPolicy(false, 2); // 2 = 제재
      await svc.connect(alice).propose(receiver.address, 100n, "0x");
      await svc.connect(bob).confirm(0);

      await expect(svc.connect(alice).execute(0))
        .to.be.revertedWithCustomError(svc, "TravelRuleFailed")
        .withArgs(2);
    });

    it("oracle 정책 복구 후 재실행 성공", async function () {
      const { svc, oracle, alice, bob, receiver } = await loadFixture(deploy);
      await oracle.setPolicy(false, 1);
      await svc.connect(alice).propose(receiver.address, 100n, "0x");
      await svc.connect(bob).confirm(0);
      await expect(svc.connect(alice).execute(0)).to.be.revertedWithCustomError(svc, "TravelRuleFailed");

      await oracle.setPolicy(true, 0);
      await expect(svc.connect(alice).execute(0)).to.emit(svc, "Executed");
    });
  });

  describe("cancel", function () {
    it("제안자만 cancel 가능", async function () {
      const { svc, alice, bob, receiver } = await loadFixture(deploy);
      await svc.connect(alice).propose(receiver.address, 100n, "0x");
      await expect(svc.connect(bob).cancel(0))
        .to.be.revertedWithCustomError(svc, "NotSigner");

      await expect(svc.connect(alice).cancel(0))
        .to.emit(svc, "Cancelled").withArgs(0);
    });

    it("cancel된 tx는 execute 불가", async function () {
      const { svc, alice, receiver } = await loadFixture(deploy);
      await svc.connect(alice).propose(receiver.address, 100n, "0x");
      await svc.connect(alice).cancel(0);
      await expect(svc.connect(alice).execute(0))
        .to.be.revertedWithCustomError(svc, "TxNotPending");
    });
  });
});
