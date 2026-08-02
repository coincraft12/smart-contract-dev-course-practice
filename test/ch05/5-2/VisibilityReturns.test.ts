import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Ch05-2 (1/4) — VisibilityReturns", function () {

  async function deploy() {
    const [owner] = await ethers.getSigners();
    const F = await ethers.getContractFactory("VisibilityReturns");
    const c = await F.deploy();
    return { c, owner };
  }

  describe("가시성", function () {
    it("public increment()는 외부에서 호출되어 counter 증가", async function () {
      const { c } = await loadFixture(deploy);
      await c.increment();
      await c.increment();
      expect(await c.counter()).to.equal(2);
    });

    it("external sumFromCalldata는 배열 합을 반환하고 totalSpent에 반영", async function () {
      const { c } = await loadFixture(deploy);
      await c.sumFromCalldata([1, 2, 3, 4]);
      expect(await c.totalSpent()).to.equal(10);
    });

    it("internal 함수는 public wrapper computeInternal을 통해서만 접근", async function () {
      const { c } = await loadFixture(deploy);
      expect(await c.computeInternal(5)).to.equal(10); // 5*2
    });

    it("private 함수도 wrapper를 통해서만 접근", async function () {
      const { c } = await loadFixture(deploy);
      expect(await c.computePrivate(5)).to.equal(6); // 5+1
    });

    it("_double / _addOne은 ABI에 노출되지 않는다", async function () {
      const { c } = await loadFixture(deploy);
      // internal/private 함수는 ABI에 존재하지 않음
      expect((c as any)._double).to.be.undefined;
      expect((c as any)._addOne).to.be.undefined;
    });
  });

  describe("반환값", function () {
    it("single — 단일 반환", async function () {
      const { c } = await loadFixture(deploy);
      expect(await c.single(7)).to.equal(49);
    });

    it("multiple — 튜플 반환 + destructuring", async function () {
      const { c } = await loadFixture(deploy);
      const [sum, diff, product] = await c.multiple(10, 3);
      expect(sum).to.equal(13);
      expect(diff).to.equal(7);
      expect(product).to.equal(30);
    });

    it("multiple — a < b 인 경우 절대차", async function () {
      const { c } = await loadFixture(deploy);
      const [, diff] = await c.multiple(3, 10);
      expect(diff).to.equal(7);
    });

    it("namedReturn — named return 값 반환 (return 문 없어도 됨)", async function () {
      const { c } = await loadFixture(deploy);
      // 10000의 1% (100 bps) → fee = 100, net = 9900
      const [fee, net] = await c.namedReturn(10000, 100);
      expect(fee).to.equal(100);
      expect(net).to.equal(9900);
    });

    it("returnStruct — 구조체 반환", async function () {
      const { c } = await loadFixture(deploy);
      const q = await c.returnStruct(10000, 200); // 2% 세금
      expect(q.price).to.equal(10000);
      expect(q.tax).to.equal(200);
      expect(q.total).to.equal(10200);
    });

    it("summary — view로 여러 상태 한 번에 조회", async function () {
      const { c } = await loadFixture(deploy);
      await c.increment();
      await c.sumFromCalldata([5, 5]);
      const [counter, spent] = await c.summary();
      expect(counter).to.equal(1);
      expect(spent).to.equal(10);
    });
  });
});
