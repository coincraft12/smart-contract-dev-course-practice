import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Ch10 — TokenIdEncoding (네임스페이스 안전성)", function () {

  async function deploy() {
    const F = await ethers.getContractFactory("TokenIdDemo");
    const c = await F.deploy();
    return { c };
  }

  describe("encode / decode 라운드트립", function () {
    it("작은 값 (1, 42) 왕복", async function () {
      const { c } = await loadFixture(deploy);
      expect(await c.roundtrip(1, 42)).to.be.true;
    });

    it("큰 productCode + 큰 eventCode 왕복", async function () {
      const { c } = await loadFixture(deploy);
      const P = (1n << 191n) - 1n; // 큰 uint192
      const E = (1n << 63n)  - 1n; // 큰 uint64
      expect(await c.roundtrip(P, E)).to.be.true;
    });

    it("make(1, 0) = 1 << 64", async function () {
      const { c } = await loadFixture(deploy);
      expect(await c.make(1, 0)).to.equal(1n << 64n);
    });

    it("unpack — 상위 192bit, 하위 64bit", async function () {
      const { c } = await loadFixture(deploy);
      const tid = await c.make(5n, 7n);
      const [p, e] = await c.unpack(tid);
      expect(p).to.equal(5n);
      expect(e).to.equal(7n);
    });
  });

  describe("productCode=0 예약", function () {
    it("make(0, ...) 시 ZeroProductCode revert", async function () {
      const { c } = await loadFixture(deploy);
      await expect(c.make(0, 42))
        .to.be.revertedWithCustomError(c, "ZeroProductCode");
    });

    it("productCode=0이 예약된 이유 검증 — 만약 허용했다면", async function () {
      const { c } = await loadFixture(deploy);
      // encode(0, 42) = (0 << 64) | 42 = 42
      // encode(0, 43) = 43
      // 이 경우 tokenId = 42는 "product 0, event 42"인지 "product 0의 다른 어떤 것"인지
      // 모호해짐. 42만 보고는 (product=0, event=42)인지 알 수 없다는 위험.
      // 따라서 productCode=0을 예약해 상위 비트가 반드시 존재하도록 강제.
      const tid42 = await c.make(1n, 42n);
      const [p, e] = await c.unpack(tid42);
      expect(p).to.equal(1n); // 상위 비트 확보되므로 무조건 non-zero
      expect(e).to.equal(42n);
    });
  });

  describe("네임스페이스 격리 특성", function () {
    it("서로 다른 productCode → tokenId 절대 충돌 없음", async function () {
      const { c } = await loadFixture(deploy);
      const t1 = await c.make(1, 100);
      const t2 = await c.make(2, 100);
      expect(t1).to.not.equal(t2);
    });

    it("같은 productCode + 다른 eventCode → 다른 tokenId", async function () {
      const { c } = await loadFixture(deploy);
      const t1 = await c.make(1, 100);
      const t2 = await c.make(1, 101);
      expect(t1).to.not.equal(t2);
    });

    it("64bit eventCode 경계 — 최댓값도 안전", async function () {
      const { c } = await loadFixture(deploy);
      const MAX_E = (1n << 64n) - 1n;
      const tid = await c.make(1, MAX_E);
      const [p, e] = await c.unpack(tid);
      expect(p).to.equal(1n);
      expect(e).to.equal(MAX_E);
    });
  });
});
