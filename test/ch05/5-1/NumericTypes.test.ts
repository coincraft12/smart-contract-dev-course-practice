import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Ch05-1 (1/4) — NumericTypes", function () {

  async function deploy() {
    const F = await ethers.getContractFactory("NumericTypes");
    const c = await F.deploy();
    return { c };
  }

  describe("오버플로 / unchecked", function () {
    it("overflow — 8bit 초과 시 panic(0x11)", async function () {
      const { c } = await loadFixture(deploy);
      await expect(c.overflow(200, 100)).to.be.revertedWithPanic(0x11);
    });

    it("정상 범위 덧셈은 성공", async function () {
      const { c } = await loadFixture(deploy);
      expect(await c.overflow(100, 50)).to.equal(150);
    });

    it("overflowUnchecked — wrap-around", async function () {
      const { c } = await loadFixture(deploy);
      // 200 + 100 = 300 → 300 - 256 = 44
      expect(await c.overflowUnchecked(200, 100)).to.equal(44);
    });

    it("underflowUnchecked — wrap-around", async function () {
      const { c } = await loadFixture(deploy);
      // 0 - 1 = 255 (uint8)
      expect(await c.underflowUnchecked(0, 1)).to.equal(255);
    });
  });

  describe("산술 / 비교 / 비트 연산자", function () {
    it("arithmetic — 5개 결과", async function () {
      const { c } = await loadFixture(deploy);
      const [add_, sub_, mul_, div_, mod_] = await c.arithmetic(17, 5);
      expect(add_).to.equal(22);
      expect(sub_).to.equal(12);
      expect(mul_).to.equal(85);
      expect(div_).to.equal(3);  // 정수 나눗셈
      expect(mod_).to.equal(2);
    });

    it("compare — eq / lt / gt", async function () {
      const { c } = await loadFixture(deploy);
      const [eq, lt, gt] = await c.compare(3, 5);
      expect(eq).to.be.false;
      expect(lt).to.be.true;
      expect(gt).to.be.false;
    });

    it("bitwise — AND/OR/XOR/NOT/SHL/SHR", async function () {
      const { c } = await loadFixture(deploy);
      const [and_, or_, xor_, , shl_, shr_] = await c.bitwise(0b1100n, 0b1010n);
      expect(and_).to.equal(0b1000n);
      expect(or_).to.equal(0b1110n);
      expect(xor_).to.equal(0b0110n);
      expect(shl_).to.equal(0b110000n); // 12 << 2 = 48
      expect(shr_).to.equal(0b11n);     // 12 >> 2 = 3
    });
  });

  describe("나눗셈 내림 & 고정소수점 (basis points)", function () {
    it("divisionFloor — 7/2 = 3", async function () {
      const { c } = await loadFixture(deploy);
      expect(await c.divisionFloor(7, 2)).to.equal(3);
    });

    it("percentBps — 10000의 1% = 100", async function () {
      const { c } = await loadFixture(deploy);
      expect(await c.percentBps(10000, 100)).to.equal(100);
    });

    it("percentBps — 100 bps (1%) 정밀도", async function () {
      const { c } = await loadFixture(deploy);
      expect(await c.percentBps(12345, 100)).to.equal(123); // 12345 * 100 / 10000 = 123.45 → 123
    });

    it("mulDiv — 오버플로 위험 회피", async function () {
      const { c } = await loadFixture(deploy);
      expect(await c.mulDiv(100n, 200n, 50n)).to.equal(400n);
    });
  });

  describe("불리언 & 단락 평가", function () {
    it("logical — AND/OR/NOT", async function () {
      const { c } = await loadFixture(deploy);
      const [and_, or_, not_] = await c.logical(true, false);
      expect(and_).to.be.false;
      expect(or_).to.be.true;
      expect(not_).to.be.false;
    });

    it("shortCircuit — false && ... → false 반환", async function () {
      const { c } = await loadFixture(deploy);
      expect(await c.shortCircuit(false)).to.be.false;
      expect(await c.shortCircuit(true)).to.be.true;
    });
  });

  describe("단위 리터럴", function () {
    it("etherUnits — wei / gwei / ether", async function () {
      const { c } = await loadFixture(deploy);
      const [w, g, e] = await c.etherUnits();
      expect(w).to.equal(1n);
      expect(g).to.equal(10n ** 9n);
      expect(e).to.equal(10n ** 18n);
    });

    it("timeUnits — minutes / hours / days / weeks", async function () {
      const { c } = await loadFixture(deploy);
      const [m, h, d, wk] = await c.timeUnits();
      expect(m).to.equal(60n);
      expect(h).to.equal(3600n);
      expect(d).to.equal(86400n);
      expect(wk).to.equal(604800n);
    });

    it("readableLiterals — 언더스코어 리터럴", async function () {
      const { c } = await loadFixture(deploy);
      expect(await c.readableLiterals()).to.equal(1000000n);
    });
  });

  describe("상태 변수 저장 (다양한 크기)", function () {
    it("setStates → 조회", async function () {
      const { c } = await loadFixture(deploy);
      await c.setStates(200, 60000, 1234n, -42n);
      expect(await c.u8()).to.equal(200);
      expect(await c.u16()).to.equal(60000);
      expect(await c.u256()).to.equal(1234n);
      expect(await c.i256()).to.equal(-42n);
    });
  });
});
