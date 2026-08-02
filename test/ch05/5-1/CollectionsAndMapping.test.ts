import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Ch05-1 (3/4) — CollectionsAndMapping", function () {

  async function deploy() {
    const [owner, alice, bob, carol] = await ethers.getSigners();
    const F = await ethers.getContractFactory("CollectionsAndMapping");
    const c = await F.deploy();
    return { c, owner, alice, bob, carol };
  }

  describe("동적 배열", function () {
    it("push / pop / length", async function () {
      const { c } = await loadFixture(deploy);
      await c.pushDynamic(10);
      await c.pushDynamic(20);
      await c.pushDynamic(30);
      expect(await c.lengthDynamic()).to.equal(3);

      await c.popDynamic();
      expect(await c.lengthDynamic()).to.equal(2);
    });

    it("clearArray — 전체 초기화", async function () {
      const { c } = await loadFixture(deploy);
      await c.pushDynamic(1);
      await c.pushDynamic(2);
      await c.clearArray();
      expect(await c.lengthDynamic()).to.equal(0);
    });
  });

  describe("원소 제거 트레이드오프", function () {
    it("removeSwapPop — 순서 미보장, 마지막이 index 자리로", async function () {
      const { c } = await loadFixture(deploy);
      // [10, 20, 30, 40]
      for (const v of [10, 20, 30, 40]) await c.pushDynamic(v);

      await c.removeSwapPop(1);
      // [10, 40, 30] (마지막 40이 index 1로 swap)
      expect(await c.dynamic(0)).to.equal(10);
      expect(await c.dynamic(1)).to.equal(40);
      expect(await c.dynamic(2)).to.equal(30);
      expect(await c.lengthDynamic()).to.equal(3);
    });

    it("removeShift — 순서 보장, O(n)", async function () {
      const { c } = await loadFixture(deploy);
      for (const v of [10, 20, 30, 40]) await c.pushDynamic(v);

      await c.removeShift(1);
      // [10, 30, 40]
      expect(await c.dynamic(0)).to.equal(10);
      expect(await c.dynamic(1)).to.equal(30);
      expect(await c.dynamic(2)).to.equal(40);
    });

    it("removeShift가 removeSwapPop보다 가스 많이 소비 (긴 배열)", async function () {
      const { c } = await loadFixture(deploy);
      for (let i = 0; i < 20; i++) await c.pushDynamic(i);

      // 두 번째 컨트랙트 배포 (두 함수 별도 측정)
      const F = await ethers.getContractFactory("CollectionsAndMapping");
      const c2 = await F.deploy();
      for (let i = 0; i < 20; i++) await c2.pushDynamic(i);

      const gasSwap = await c.removeSwapPop.estimateGas(0);
      const gasShift = await c2.removeShift.estimateGas(0);
      expect(gasShift).to.be.gt(gasSwap);
    });
  });

  describe("배열 순회 — pagination", function () {
    it("sumPage — 부분 합", async function () {
      const { c } = await loadFixture(deploy);
      for (const v of [10, 20, 30, 40, 50]) await c.pushDynamic(v);
      expect(await c.sumPage(0, 3)).to.equal(60);  // 10+20+30
      expect(await c.sumPage(2, 5)).to.equal(120); // 30+40+50
    });

    it("범위 초과 시 revert", async function () {
      const { c } = await loadFixture(deploy);
      await c.pushDynamic(1);
      await expect(c.sumPage(0, 10)).to.be.revertedWith("invalid range");
    });
  });

  describe("구조체 & storage 참조 함정", function () {
    it("addBook — Book 저장 후 조회", async function () {
      const { c } = await loadFixture(deploy);
      await c.addBook("Solidity 101", 300);
      const [title, pages, inStock] = await c.books(0);
      expect(title).to.equal("Solidity 101");
      expect(pages).to.equal(300);
      expect(inStock).to.be.true;
    });

    it("markOutOfStock (storage 참조) — 실제로 상태 변경", async function () {
      const { c } = await loadFixture(deploy);
      await c.addBook("Test", 100);
      await c.markOutOfStock(0);
      const [, , inStock] = await c.books(0);
      expect(inStock).to.be.false;
    });

    it("markOutOfStockBad (memory 복사) — 상태 그대로 (함정)", async function () {
      const { c } = await loadFixture(deploy);
      await c.addBook("Test", 100);
      await c.markOutOfStockBad(0);
      const [, , inStock] = await c.books(0);
      expect(inStock).to.be.true; // ← 변경 안 됨
    });
  });

  describe("Mapping 기본", function () {
    it("setBalance / balances 조회", async function () {
      const { c, alice } = await loadFixture(deploy);
      await c.setBalance(alice.address, 1000);
      expect(await c.balances(alice.address)).to.equal(1000);
    });

    it("미설정 키는 0 반환 (존재/부재 구분 불가)", async function () {
      const { c, alice } = await loadFixture(deploy);
      expect(await c.balances(alice.address)).to.equal(0);
    });

    it("getBalanceOr — fallback 처리", async function () {
      const { c, alice, bob } = await loadFixture(deploy);
      await c.setBalance(alice.address, 500);
      expect(await c.getBalanceOr(alice.address, 999)).to.equal(500);
      expect(await c.getBalanceOr(bob.address, 999)).to.equal(999);
    });

    it("중첩 매핑 (allowances)", async function () {
      const { c, alice, bob } = await loadFixture(deploy);
      await c.setAllowance(alice.address, bob.address, 700);
      expect(await c.allowances(alice.address, bob.address)).to.equal(700);
    });
  });

  describe("Mapping — 키 목록 관리 패턴", function () {
    it("addHolder → holderCount / holderAt / totalBalance", async function () {
      const { c, alice, bob, carol } = await loadFixture(deploy);
      await c.addHolder(alice.address, 100);
      await c.addHolder(bob.address, 200);
      await c.addHolder(carol.address, 300);

      expect(await c.holderCount()).to.equal(3);
      expect(await c.holderAt(0)).to.equal(alice.address);
      expect(await c.totalBalance()).to.equal(600);
    });

    it("addHolder 중복 호출은 배열에 두 번 안 들어감", async function () {
      const { c, alice } = await loadFixture(deploy);
      await c.addHolder(alice.address, 100);
      await c.addHolder(alice.address, 250); // balance만 갱신
      expect(await c.holderCount()).to.equal(1);
      expect(await c.balances(alice.address)).to.equal(250);
    });
  });
});
