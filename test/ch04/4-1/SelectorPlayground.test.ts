import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Ch04-1 — SelectorPlayground", function () {

  async function deploy() {
    const F = await ethers.getContractFactory("SelectorPlayground");
    const c = await F.deploy();
    return { c };
  }

  describe("함수 selector 계산", function () {
    it("computeSelector — transfer(address,uint256) = 0xa9059cbb", async function () {
      const { c } = await loadFixture(deploy);
      expect(await c.computeSelector("transfer(address,uint256)")).to.equal("0xa9059cbb");
    });

    it("computeSelector — approve(address,uint256) = 0x095ea7b3", async function () {
      const { c } = await loadFixture(deploy);
      expect(await c.computeSelector("approve(address,uint256)")).to.equal("0x095ea7b3");
    });

    it("knownSelectors — 컴파일러가 계산한 selector와 오프체인 계산이 동일", async function () {
      const { c } = await loadFixture(deploy);
      const [setValueSel, setLabelSel, setBothSel] = await c.knownSelectors();

      expect(setValueSel).to.equal(
        ethers.id("setValue(uint256)").slice(0, 10)
      );
      expect(setLabelSel).to.equal(
        ethers.id("setLabel(string)").slice(0, 10)
      );
      expect(setBothSel).to.equal(
        ethers.id("setBoth(uint256,string)").slice(0, 10)
      );
    });
  });

  describe("ABI encoding 3방식", function () {
    it("세 방식 모두 동일한 calldata 생성", async function () {
      const { c } = await loadFixture(deploy);
      const v = 42n;
      const bySignature = await c.encodeVia_Signature(v);
      const bySelector  = await c.encodeVia_Selector(v);
      const byCall      = await c.encodeVia_Call(v);

      expect(bySignature).to.equal(bySelector);
      expect(bySelector).to.equal(byCall);
    });

    it("결과 앞 4바이트가 setValue selector", async function () {
      const { c } = await loadFixture(deploy);
      const [selValue] = await c.knownSelectors();
      const payload = await c.encodeVia_Call(100n);
      expect(payload.slice(0, 10)).to.equal(selValue);
    });
  });

  describe("low-level self-call", function () {
    it("selfCallSetValue — self.call로 상태 변경 성공", async function () {
      const { c } = await loadFixture(deploy);
      await c.selfCallSetValue(777);
      expect(await c.value()).to.equal(777);
    });

    it("Called 이벤트가 setValue selector로 발행됨", async function () {
      const { c } = await loadFixture(deploy);
      const [selValue] = await c.knownSelectors();
      await expect(c.selfCallSetValue(1))
        .to.emit(c, "Called")
        .withArgs(selValue, await c.getAddress());
    });
  });

  describe("calldata layout", function () {
    it("extractSelector — 임의 calldata의 앞 4바이트 추출", async function () {
      const { c } = await loadFixture(deploy);
      const [selValue] = await c.knownSelectors();
      const payload = await c.encodeVia_Call(100n);
      expect(await c.extractSelector(payload)).to.equal(selValue);
    });

    it("data 길이가 4 미만이면 revert", async function () {
      const { c } = await loadFixture(deploy);
      await expect(c.extractSelector("0x123456")).to.be.revertedWith("too short");
    });
  });
});
