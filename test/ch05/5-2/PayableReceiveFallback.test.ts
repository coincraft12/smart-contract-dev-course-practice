import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Ch05-2 (3/4) — PayableReceiveFallback", function () {

  async function deploy() {
    const [owner, alice, bob] = await ethers.getSigners();
    const F = await ethers.getContractFactory("PayableReceiveFallback");
    const c = await F.deploy();
    return { c, owner, alice, bob };
  }

  describe("payable deposit()", function () {
    it("ETH를 예치하면 balances가 증가", async function () {
      const { c, alice } = await loadFixture(deploy);
      const amt = ethers.parseEther("1");
      await c.connect(alice)["deposit()"]({ value: amt });
      expect(await c.balances(alice.address)).to.equal(amt);
      expect(await c.totalReceived()).to.equal(amt);
    });

    it("ETH 없이 deposit 시 revert", async function () {
      const { c, alice } = await loadFixture(deploy);
      await expect(c.connect(alice)["deposit()"]({ value: 0 }))
        .to.be.revertedWith("no ETH");
    });

    it("ReceivedViaDeposit 이벤트 발행", async function () {
      const { c, alice } = await loadFixture(deploy);
      await expect(c.connect(alice)["deposit()"]({ value: 100n }))
        .to.emit(c, "ReceivedViaDeposit")
        .withArgs(alice.address, 100n, "deposit()");
    });
  });

  describe("함수 오버로딩 — deposit(string)", function () {
    it("label 붙여 예치 가능", async function () {
      const { c, alice } = await loadFixture(deploy);
      await expect(c.connect(alice)["deposit(string)"]("월세", { value: 500n }))
        .to.emit(c, "ReceivedViaDeposit")
        .withArgs(alice.address, 500n, "월세");
      expect(await c.balances(alice.address)).to.equal(500n);
    });
  });

  describe("receive() — 순수 ETH 전송", function () {
    it("data 없이 ETH만 보내면 receive 실행", async function () {
      const { c, alice } = await loadFixture(deploy);
      const amt = ethers.parseEther("0.5");
      await expect(
        alice.sendTransaction({ to: await c.getAddress(), value: amt })
      ).to.emit(c, "ReceivedViaReceive").withArgs(alice.address, amt);

      expect(await c.balances(alice.address)).to.equal(amt);
    });
  });

  describe("fallback() — 미매칭 호출 처리", function () {
    it("존재하지 않는 함수 호출은 fallback으로 라우팅", async function () {
      const { c, alice } = await loadFixture(deploy);
      const data = "0xdeadbeef";
      const amt = 100n;

      await expect(
        alice.sendTransaction({
          to: await c.getAddress(),
          value: amt,
          data,
        })
      )
        .to.emit(c, "ReceivedViaFallback")
        .withArgs(alice.address, amt, data);

      expect(await c.balances(alice.address)).to.equal(amt);
    });

    it("data 있는 호출 + ETH 0 → fallback (payable) 실행됨", async function () {
      const { c, alice } = await loadFixture(deploy);
      await expect(
        alice.sendTransaction({
          to: await c.getAddress(),
          value: 0,
          data: "0x12345678",
        })
      ).to.emit(c, "ReceivedViaFallback");
    });
  });

  describe("withdraw — call{value:}() 패턴", function () {
    it("잔액만큼 인출 가능", async function () {
      const { c, alice } = await loadFixture(deploy);
      const amt = ethers.parseEther("1");
      await c.connect(alice)["deposit()"]({ value: amt });

      const before = await ethers.provider.getBalance(alice.address);
      const tx = await c.connect(alice).withdraw(amt);
      const rc = await tx.wait();
      const gas = rc!.gasUsed * rc!.gasPrice;
      const after = await ethers.provider.getBalance(alice.address);
      // 오차 허용 범위
      expect(after - before + gas).to.be.closeTo(amt, ethers.parseEther("0.001"));
    });

    it("잔액 초과 인출 시 revert", async function () {
      const { c, alice } = await loadFixture(deploy);
      await c.connect(alice)["deposit()"]({ value: 100n });
      await expect(c.connect(alice).withdraw(1000n))
        .to.be.revertedWith("insufficient");
    });

    it("WithdrawnTo 이벤트 + contractBalance 감소", async function () {
      const { c, alice } = await loadFixture(deploy);
      const dep = ethers.parseEther("2");
      await c.connect(alice)["deposit()"]({ value: dep });
      await expect(c.connect(alice).withdraw(ethers.parseEther("1")))
        .to.emit(c, "WithdrawnTo")
        .withArgs(alice.address, ethers.parseEther("1"));
      expect(await c.contractBalance()).to.equal(ethers.parseEther("1"));
    });
  });
});
