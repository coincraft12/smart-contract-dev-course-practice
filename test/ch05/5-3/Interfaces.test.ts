import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Ch05-3 (2/4) — Interfaces", function () {

  const FAKE_TOKEN = "0x1111111111111111111111111111111111111111";

  async function deploy() {
    const [owner] = await ethers.getSigners();
    const Oracle = await ethers.getContractFactory("MockOracle");
    const oracle = await Oracle.deploy();

    const Reader = await ethers.getContractFactory("PriceReader");
    const reader = await Reader.deploy(await oracle.getAddress());

    const Raw = await ethers.getContractFactory("RawCaller");
    const raw = await Raw.deploy();

    return { oracle, reader, raw, owner };
  }

  describe("인터페이스 구현 (MockOracle is IPriceOracle)", function () {
    it("set → price / updatedAt 반영", async function () {
      const { oracle } = await loadFixture(deploy);
      await oracle.set(FAKE_TOKEN, 12345);
      expect(await oracle.price(FAKE_TOKEN)).to.equal(12345);
      expect(await oracle.updatedAt(FAKE_TOKEN)).to.equal(await time.latest());
    });
  });

  describe("인터페이스로 외부 호출 (PriceReader → IPriceOracle)", function () {
    it("정상 가격 조회", async function () {
      const { oracle, reader } = await loadFixture(deploy);
      await oracle.set(FAKE_TOKEN, 1000);
      expect(await reader.priceOf(FAKE_TOKEN, 3600)).to.equal(1000);
    });

    it("price=0 이면 ZeroPrice", async function () {
      const { reader } = await loadFixture(deploy);
      await expect(reader.priceOf(FAKE_TOKEN, 3600))
        .to.be.revertedWithCustomError(reader, "ZeroPrice");
    });

    it("maxAge 초과 시 StalePrice", async function () {
      const { oracle, reader } = await loadFixture(deploy);
      await oracle.set(FAKE_TOKEN, 1000);
      await time.increase(7200); // 2시간 경과
      await expect(reader.priceOf(FAKE_TOKEN, 3600))
        .to.be.revertedWithCustomError(reader, "StalePrice");
    });
  });

  describe("ABI만으로 low-level 호출 (RawCaller)", function () {
    it("encodeWithSignature 방식", async function () {
      const { oracle, raw } = await loadFixture(deploy);
      await oracle.set(FAKE_TOKEN, 500);
      expect(await raw.callPrice(await oracle.getAddress(), FAKE_TOKEN)).to.equal(500);
    });

    it("encodeWithSelector 방식", async function () {
      const { oracle, raw } = await loadFixture(deploy);
      await oracle.set(FAKE_TOKEN, 500);
      expect(
        await raw.callPriceViaSelector(await oracle.getAddress(), FAKE_TOKEN)
      ).to.equal(500);
    });

    it("encodeCall (타입 안전) 방식", async function () {
      const { oracle, raw } = await loadFixture(deploy);
      await oracle.set(FAKE_TOKEN, 500);
      expect(
        await raw.callPriceTyped(await oracle.getAddress(), FAKE_TOKEN)
      ).to.equal(500);
    });

    it("존재하지 않는 컨트랙트 호출 시 CallFailed", async function () {
      const { raw } = await loadFixture(deploy);
      // EOA로 staticcall 시 코드 없어 실패
      const [wallet] = await ethers.getSigners();
      await expect(raw.callPrice(wallet.address, FAKE_TOKEN))
        .to.be.reverted;
    });
  });
});
