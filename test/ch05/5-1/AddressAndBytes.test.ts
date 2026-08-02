import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Ch05-1 (2/4) — AddressAndBytes", function () {

  async function deploy() {
    const [owner, alice] = await ethers.getSigners();
    const F = await ethers.getContractFactory("AddressAndBytes");
    const c = await F.deploy();
    // prefund 5 ETH via receive()
    await owner.sendTransaction({
      to: await c.getAddress(),
      value: ethers.parseEther("5"),
    });
    return { c, owner, alice };
  }

  describe("address 속성", function () {
    it("selfBalance — 예치된 잔액 반환", async function () {
      const { c } = await loadFixture(deploy);
      expect(await c.selfBalance()).to.equal(ethers.parseEther("5"));
    });

    it("targetBalance — 임의 주소 잔액 조회", async function () {
      const { c, alice } = await loadFixture(deploy);
      const bal = await ethers.provider.getBalance(alice.address);
      expect(await c.targetBalance(alice.address)).to.equal(bal);
    });

    it("isContract — 컨트랙트는 true, EOA는 false", async function () {
      const { c, alice } = await loadFixture(deploy);
      expect(await c.isContract(await c.getAddress())).to.be.true;
      expect(await c.isContract(alice.address)).to.be.false;
    });
  });

  describe("address 변환", function () {
    it("toPayable / uint160 왕복", async function () {
      const { c, alice } = await loadFixture(deploy);
      const asUint = await c.toUint(alice.address);
      const back = await c.fromUint(asUint);
      expect(back).to.equal(alice.address);
    });
  });

  describe("ETH 전송 3방식", function () {
    it("call — 정상 전송", async function () {
      const { c, alice } = await loadFixture(deploy);
      const before = await ethers.provider.getBalance(alice.address);
      await c.sendViaCall(alice.address, ethers.parseEther("1"));
      const after = await ethers.provider.getBalance(alice.address);
      expect(after - before).to.equal(ethers.parseEther("1"));
    });

    it("transfer — 정상 전송", async function () {
      const { c, alice } = await loadFixture(deploy);
      const before = await ethers.provider.getBalance(alice.address);
      await c.sendViaTransfer(alice.address, ethers.parseEther("0.5"));
      const after = await ethers.provider.getBalance(alice.address);
      expect(after - before).to.equal(ethers.parseEther("0.5"));
    });

    it("send — 정상 전송 시 이벤트에 ok=true", async function () {
      const { c, alice } = await loadFixture(deploy);
      await expect(c.sendViaSend(alice.address, 100n))
        .to.emit(c, "SentVia")
        .withArgs("send", alice.address, 100n, true);
    });
  });

  describe("bytes32 & 함수 선택자", function () {
    it("computeKeccak — 문자열 해시", async function () {
      const { c } = await loadFixture(deploy);
      const hash = await c.computeKeccak("hello");
      expect(hash).to.equal(ethers.keccak256(ethers.toUtf8Bytes("hello")));
    });

    it("storeHash — 상태에 저장", async function () {
      const { c } = await loadFixture(deploy);
      await c.storeHash("world");
      expect(await c.storedHash()).to.equal(
        ethers.keccak256(ethers.toUtf8Bytes("world"))
      );
    });

    it("selectorOf — transfer(address,uint256) = 0xa9059cbb", async function () {
      const { c } = await loadFixture(deploy);
      expect(await c.selectorOf("transfer(address,uint256)")).to.equal("0xa9059cbb");
    });

    it("bytesIndexing — 첫/마지막 바이트 추출", async function () {
      const { c } = await loadFixture(deploy);
      const h = "0xdeadbeef" + "00".repeat(28);
      const [first, last] = await c.bytesIndexing(h);
      expect(first).to.equal("0xde");
      expect(last).to.equal("0x00");
    });
  });

  describe("가변 bytes / string", function () {
    it("concatBytes — 이어붙임", async function () {
      const { c } = await loadFixture(deploy);
      const r = await c.concatBytes("0xdead", "0xbeef");
      expect(r).to.equal("0xdeadbeef");
    });

    it("concatStrings — 이어붙임", async function () {
      const { c } = await loadFixture(deploy);
      expect(await c.concatStrings("Hello, ", "World!")).to.equal("Hello, World!");
    });

    it("stringByteLength — UTF-8 바이트 길이", async function () {
      const { c } = await loadFixture(deploy);
      expect(await c.stringByteLength("hello")).to.equal(5);
      // 한글은 3바이트씩 → "안녕" = 6바이트
      expect(await c.stringByteLength("안녕")).to.equal(6);
    });

    it("packedHash — 결정론적 해시", async function () {
      const { c, alice } = await loadFixture(deploy);
      const h1 = await c.packedHash(alice.address, 100n, 1n);
      const h2 = await c.packedHash(alice.address, 100n, 1n);
      expect(h1).to.equal(h2);
      const h3 = await c.packedHash(alice.address, 100n, 2n);
      expect(h1).to.not.equal(h3);
    });
  });
});
