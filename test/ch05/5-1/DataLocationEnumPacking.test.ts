import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Ch05-1 (4/4) — DataLocationEnumPacking", function () {

  async function deploy() {
    const [owner, alice] = await ethers.getSigners();
    const F = await ethers.getContractFactory("DataLocationEnumPacking");
    const c = await F.deploy();
    return { c, owner, alice };
  }

  describe("데이터 위치 — calldata / memory / storage", function () {
    it("sumCalldata — 읽기 전용 참조로 합 계산", async function () {
      const { c } = await loadFixture(deploy);
      expect(await c.sumCalldata([1, 2, 3, 4, 5])).to.equal(15);
    });

    it("doubleInMemory — memory에 복사 후 수정", async function () {
      const { c } = await loadFixture(deploy);
      const result = await c.doubleInMemory([1, 2, 3]);
      expect(result.map((n: bigint) => Number(n))).to.deep.equal([2, 4, 6]);
    });

    it("push + incrementFirstStorage — storage 참조로 상태 변경", async function () {
      const { c } = await loadFixture(deploy);
      await c.push(10);
      await c.incrementFirstStorage();
      expect(await c.numbers(0)).to.equal(11);
    });

    it("incrementFirstMemoryNoEffect — memory 복사는 원본 유지", async function () {
      const { c } = await loadFixture(deploy);
      await c.push(10);
      const orig = await c.incrementFirstMemoryNoEffect();
      expect(orig).to.equal(10); // 원본 그대로
      expect(await c.numbers(0)).to.equal(10);
    });
  });

  describe("타입 변환", function () {
    it("explicitConvert(int→uint) — 양수는 그대로", async function () {
      const { c } = await loadFixture(deploy);
      expect(await c.explicitConvert(42)).to.equal(42n);
    });

    it("explicitConvert(-1) — 매우 큰 uint 값으로 wrap", async function () {
      const { c } = await loadFixture(deploy);
      expect(await c.explicitConvert(-1)).to.equal(ethers.MaxUint256);
    });

    it("narrowConvert(uint256→uint8) — 하위 8비트만", async function () {
      const { c } = await loadFixture(deploy);
      expect(await c.narrowConvert(300n)).to.equal(300 % 256);
    });

    it("implicitWiden(uint8→uint256)", async function () {
      const { c } = await loadFixture(deploy);
      expect(await c.implicitWiden(200)).to.equal(200n);
    });

    it("bytesToAddress — bytes32 하위 20바이트 → address", async function () {
      const { c } = await loadFixture(deploy);
      const [signer] = await ethers.getSigners();
      // signer 주소 앞에 12바이트 zero 붙여 bytes32 생성
      const padded = ethers.zeroPadValue(signer.address, 32);
      expect(await c.bytesToAddress(padded)).to.equal(signer.address);
    });
  });

  describe("Enum 상태 기계", function () {
    it("초기 상태 = Created (0)", async function () {
      const { c } = await loadFixture(deploy);
      expect(await c.status()).to.equal(0);
    });

    it("정상 전이 흐름: Created → Paid → Shipped → Delivered", async function () {
      const { c } = await loadFixture(deploy);
      await c.transition(1); // Paid
      expect(await c.status()).to.equal(1);
      await c.transition(2); // Shipped
      await c.transition(3); // Delivered
      expect(await c.status()).to.equal(3);
    });

    it("Created → Cancelled 허용", async function () {
      const { c } = await loadFixture(deploy);
      await c.transition(4); // Cancelled
      expect(await c.status()).to.equal(4);
    });

    it("Paid → Cancelled 허용", async function () {
      const { c } = await loadFixture(deploy);
      await c.transition(1);
      await c.transition(4);
      expect(await c.status()).to.equal(4);
    });

    it("잘못된 전이 (Created → Shipped)는 revert", async function () {
      const { c } = await loadFixture(deploy);
      await expect(c.transition(2))
        .to.be.revertedWithCustomError(c, "InvalidTransition")
        .withArgs(0, 2);
    });

    it("Delivered에서 다른 상태로 전이 불가", async function () {
      const { c } = await loadFixture(deploy);
      await c.transition(1);
      await c.transition(2);
      await c.transition(3); // Delivered
      await expect(c.transition(4)).to.be.revertedWithCustomError(c, "InvalidTransition");
    });
  });

  describe("Struct packing 최적화", function () {
    it("setGood / setBad 결과 조회", async function () {
      const { c } = await loadFixture(deploy);
      await c.setBad(1, 5, 999);
      const bad = await c.bad();
      expect(bad.id).to.equal(1);
      expect(bad.level).to.equal(5);
      expect(bad.score).to.equal(999);

      await c.setGood(1, 999, 5, true, 82);
      const good = await c.good();
      expect(good.id).to.equal(1);
      expect(good.score).to.equal(999);
      expect(good.level).to.equal(5);
      expect(good.active).to.be.true;
      expect(good.region).to.equal(82);
    });

    it("packing 최적화의 트레이드오프 (모든 필드 쓰기는 비교 미미)", async function () {
      const { c } = await loadFixture(deploy);
      // Solidity의 struct packing은 이론상 slot 수를 줄여 SSTORE를 절약하지만,
      // 실제로는 packed slot에 여러 필드를 쓰기 위한 bit-shift/mask 오버헤드가 있어
      // "모든 필드를 항상 함께 쓰는" 시나리오에서는 gas 차이가 크지 않을 수 있다.
      // packing이 확실히 이득인 경우:
      //   1) 하나의 packed slot의 필드만 부분 수정 시 (SLOAD 후 mask+SSTORE 1회)
      //   2) 여러 필드를 함께 READ 할 때 (SLOAD 1회로 여러 값)
      // 여기서는 함수 동작 검증만 수행하고, 개념을 comment로 남긴다.
      await c.setBad(1, 5, 999);
      await c.setGood(1, 999, 5, true, 82);
      expect((await c.bad()).level).to.equal(5);
      expect((await c.good()).level).to.equal(5);
    });
  });
});
