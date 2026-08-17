import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Ch11-2 — Batch Operations", function () {

  async function deploy() {
    const [owner, alice, bob] = await ethers.getSigners();
    const F = await ethers.getContractFactory("BatchOperations");
    const c = await F.deploy();
    return { c, owner, alice, bob };
  }

  const ids     = [1n, 2n, 3n, 4n, 5n];
  const amounts = [10n, 20n, 30n, 40n, 50n];

  describe("mint 개별 vs 배치", function () {
    it("mintLoop과 mintBatchOp은 동일한 최종 잔액", async function () {
      const { c, alice, bob } = await loadFixture(deploy);
      await c.mintLoop(alice.address, ids, amounts);
      await c.mintBatchOp(bob.address, ids, amounts);
      for (let i = 0; i < ids.length; i++) {
        expect(await c.balanceOf(alice.address, ids[i])).to.equal(amounts[i]);
        expect(await c.balanceOf(bob.address,   ids[i])).to.equal(amounts[i]);
      }
    });

    it("mintBatchOp이 mintLoop보다 가스 저렴", async function () {
      const { c, alice, bob } = await loadFixture(deploy);
      const gasLoop  = await c.mintLoop.estimateGas(alice.address, ids, amounts);
      const gasBatch = await c.mintBatchOp.estimateGas(bob.address, ids, amounts);
      expect(gasBatch).to.be.lt(gasLoop);
    });

    it("mintBatchOp은 TransferBatch 단일 이벤트", async function () {
      const { c, alice, owner } = await loadFixture(deploy);
      // TransferBatch: (operator, from, to, ids, values)
      await expect(c.mintBatchOp(alice.address, ids, amounts))
        .to.emit(c, "TransferBatch");
    });

    it("mintLoop은 여러 TransferSingle 이벤트 발행", async function () {
      const { c, alice } = await loadFixture(deploy);
      const tx = await c.mintLoop(alice.address, ids, amounts);
      const receipt = await tx.wait();
      const singleEventCount = receipt!.logs.filter((log) => {
        try {
          const parsed = c.interface.parseLog({
            topics: [...log.topics],
            data: log.data,
          });
          return parsed?.name === "TransferSingle";
        } catch {
          return false;
        }
      }).length;
      expect(singleEventCount).to.equal(ids.length);
    });
  });

  describe("safeBatchTransferFrom", function () {
    async function withMinted() {
      const base = await deploy();
      await base.c.mintBatchOp(base.alice.address, ids, amounts);
      return base;
    }

    it("배치 전송 후 잔액 이동", async function () {
      const { c, alice, bob } = await loadFixture(withMinted);
      const moves = [5n, 10n, 15n, 20n, 25n];
      await c.connect(alice).safeBatchTransferFrom(
        alice.address, bob.address, ids, moves, "0x"
      );
      for (let i = 0; i < ids.length; i++) {
        expect(await c.balanceOf(bob.address, ids[i])).to.equal(moves[i]);
        expect(await c.balanceOf(alice.address, ids[i])).to.equal(amounts[i] - moves[i]);
      }
    });

    it("safeBatch가 개별 반복 transfer보다 저렴", async function () {
      const { c, alice, bob } = await loadFixture(withMinted);
      const moves = [1n, 1n, 1n, 1n, 1n];
      const gasLoop = await c.connect(alice).transferLoop.estimateGas(
        alice.address, bob.address, ids, moves
      );
      const gasBatch = await c.connect(alice).safeBatchTransferFrom.estimateGas(
        alice.address, bob.address, ids, moves, "0x"
      );
      expect(gasBatch).to.be.lt(gasLoop);
    });
  });

  describe("IERC1155Receiver 훅", function () {
    async function withReceiver() {
      const base = await deploy();
      const R = await ethers.getContractFactory("BatchReceiver");
      const receiver = await R.deploy();
      await base.c.mintBatchOp(base.alice.address, ids, amounts);
      return { ...base, receiver };
    }

    it("safeBatchTransferFrom → onERC1155BatchReceived 호출", async function () {
      const { c, alice, receiver } = await loadFixture(withReceiver);
      const moves = [1n, 2n, 3n, 4n, 5n];
      await c.connect(alice).safeBatchTransferFrom(
        alice.address, await receiver.getAddress(), ids, moves, "0x"
      );
      // receiver 내부 배열에 기록되었는지
      expect(await receiver.lastBatchIds(0)).to.equal(1);
      expect(await receiver.lastBatchAmounts(4)).to.equal(5);
    });

    it("safeTransferFrom → onERC1155Received 호출", async function () {
      const { c, alice, receiver } = await loadFixture(withReceiver);
      await c.connect(alice).safeTransferFrom(
        alice.address, await receiver.getAddress(), 3, 7, "0x"
      );
      expect(await receiver.lastReceivedId()).to.equal(3);
      expect(await receiver.lastReceivedAmount()).to.equal(7);
    });

    it("receiver가 잘못된 selector 반환 시 전송 revert", async function () {
      const { c, alice, receiver } = await loadFixture(withReceiver);
      await receiver.setReject(true);
      await expect(
        c.connect(alice).safeTransferFrom(
          alice.address, await receiver.getAddress(), 3, 1, "0x"
        )
      ).to.be.reverted;
    });
  });
});
