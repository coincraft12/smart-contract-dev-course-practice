import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Ch05-2 (2/4) — Modifiers", function () {

  async function deploy() {
    const [owner, alice] = await ethers.getSigners();
    const F = await ethers.getContractFactory("Modifiers");
    const c = await F.deploy();
    return { c, owner, alice };
  }

  describe("onlyOwner", function () {
    it("owner가 pause/unpause 가능", async function () {
      const { c } = await loadFixture(deploy);
      await c.pause();
      expect(await c.paused()).to.be.true;
      await c.unpause();
      expect(await c.paused()).to.be.false;
    });

    it("non-owner는 pause 시 NotOwner", async function () {
      const { c, alice } = await loadFixture(deploy);
      await expect(c.connect(alice).pause())
        .to.be.revertedWithCustomError(c, "NotOwner");
    });
  });

  describe("modifier 체이닝 (좌 → 우 실행)", function () {
    it("owner + not paused + range OK 시 성공", async function () {
      const { c, owner } = await loadFixture(deploy);
      await c.guardedAction(500);
      expect(await c.actionCount()).to.equal(1);
    });

    it("첫 modifier 실패 시 뒤 modifier 검사 안 함 (onlyOwner)", async function () {
      const { c, alice } = await loadFixture(deploy);
      // paused=false, range 안이지만 non-owner
      await expect(c.connect(alice).guardedAction(500))
        .to.be.revertedWithCustomError(c, "NotOwner");
    });

    it("두 번째 modifier에서 실패 (whenNotPaused)", async function () {
      const { c } = await loadFixture(deploy);
      await c.pause();
      await expect(c.guardedAction(500))
        .to.be.revertedWithCustomError(c, "ContractPaused");
    });

    it("세 번째 modifier에서 실패 (withinRange)", async function () {
      const { c } = await loadFixture(deploy);
      await expect(c.guardedAction(0))
        .to.be.revertedWithCustomError(c, "InvalidRange");
      await expect(c.guardedAction(1001))
        .to.be.revertedWithCustomError(c, "InvalidRange");
    });
  });

  describe("_; 위치 — after (countAfter)", function () {
    it("본문 실행 후 카운터 증가 + 이벤트 발행", async function () {
      const { c } = await loadFixture(deploy);
      await expect(c.guardedAction(1))
        .to.emit(c, "ActionPerformed").withArgs(1);
      await expect(c.guardedAction(1))
        .to.emit(c, "ActionPerformed").withArgs(2);
    });

    it("본문에서 revert 시 카운터 증가하지 않음", async function () {
      const { c } = await loadFixture(deploy);
      // range 밖 → withinRange가 revert → countAfter의 후처리 미실행
      await expect(c.guardedAction(9999)).to.be.reverted;
      expect(await c.actionCount()).to.equal(0);
    });
  });

  describe("_; 위치 — around (measureGas)", function () {
    it("heavyLoop 실행 후 lastGasCost > 0", async function () {
      const { c } = await loadFixture(deploy);
      await c.heavyLoop(100);
      const cost = await c.lastGasCost();
      expect(cost).to.be.gt(0);
    });

    it("루프 크기 늘리면 가스 비용 증가", async function () {
      const { c } = await loadFixture(deploy);
      await c.heavyLoop(10);
      const small = await c.lastGasCost();
      await c.heavyLoop(1000);
      const large = await c.lastGasCost();
      expect(large).to.be.gt(small);
    });
  });

  describe("_; 위치 — around (nonReentrant)", function () {
    it("재귀 호출 시 ReentrantCall", async function () {
      const { c } = await loadFixture(deploy);
      await expect(c.recurse(2))
        .to.be.revertedWithCustomError(c, "ReentrantCall");
    });

    it("depth=0은 재진입 없음 → 정상", async function () {
      const { c } = await loadFixture(deploy);
      // depth=0이면 재귀 진입 없이 바로 종료
      expect(await c.recurse.staticCall(0)).to.equal(0);
    });

    it("정상 완료 후 락 해제됨 (isLocked=false)", async function () {
      const { c } = await loadFixture(deploy);
      await c.recurse(0);
      expect(await c.isLocked()).to.be.false;
    });
  });
});
