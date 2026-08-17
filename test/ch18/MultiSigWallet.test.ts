import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Ch19 — MultiSigWallet (EIP-712, m-of-n)", function () {

  async function deploy() {
    const signers = await ethers.getSigners();
    // owner 주소가 오름차순이 되도록 정렬해서 재선택
    const sortedAddrs = signers.slice(1, 6).sort((a, b) =>
      a.address.toLowerCase() < b.address.toLowerCase() ? -1 : 1
    );
    const [alice, bob, carol, dave, eve] = sortedAddrs;
    const owners = [alice.address, bob.address, carol.address];

    const Factory = await ethers.getContractFactory("MultiSigWallet");
    const wallet = await Factory.deploy(owners, 2); // 2-of-3
    await wallet.waitForDeployment();

    // 지갑에 5 ETH 프리펀드
    await signers[0].sendTransaction({
      to: await wallet.getAddress(),
      value: ethers.parseEther("5"),
    });

    return { wallet, alice, bob, carol, dave, eve, owners };
  }

  async function signTx(
    wallet: any,
    signer: any,
    to: string,
    value: bigint,
    data: string
  ) {
    const domain = {
      name: "MultiSigWallet",
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await wallet.getAddress(),
    };
    const types = {
      Tx: [
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "data", type: "bytes" },
        { name: "nonce", type: "uint256" },
      ],
    };
    const nonce = await wallet.nonce();
    return await signer.signTypedData(domain, types, {
      to,
      value,
      data,
      nonce,
    });
  }

  describe("배포", function () {
    it("owners와 threshold가 설정된다", async function () {
      const { wallet } = await loadFixture(deploy);
      expect(await wallet.threshold()).to.equal(2);
      expect(await wallet.owners(0)).to.not.equal(ethers.ZeroAddress);
    });

    it("threshold=0 이면 revert", async function () {
      const [_, a, b] = await ethers.getSigners();
      const F = await ethers.getContractFactory("MultiSigWallet");
      await expect(F.deploy([a.address, b.address], 0))
        .to.be.revertedWithCustomError(F, "InvalidThreshold");
    });
  });

  describe("execute (2-of-3)", function () {
    it("정렬된 서명 2개로 ETH 전송 성공", async function () {
      const { wallet, alice, bob, dave } = await loadFixture(deploy);
      const to = dave.address;
      const value = ethers.parseEther("1");
      const data = "0x";

      const sigA = await signTx(wallet, alice, to, value, data);
      const sigB = await signTx(wallet, bob, to, value, data);

      // owner 주소가 sorted → 서명도 alice, bob 순 (setup에서 정렬)
      const sigs = alice.address.toLowerCase() < bob.address.toLowerCase()
        ? [sigA, sigB]
        : [sigB, sigA];

      const before = await ethers.provider.getBalance(dave.address);
      await wallet.execute(to, value, data, sigs);
      const after = await ethers.provider.getBalance(dave.address);
      expect(after - before).to.equal(value);
      expect(await wallet.nonce()).to.equal(1);
    });

    it("threshold 미달 시 InvalidSignatureCount", async function () {
      const { wallet, alice, dave } = await loadFixture(deploy);
      const sigA = await signTx(wallet, alice, dave.address, 0n, "0x");
      await expect(wallet.execute(dave.address, 0, "0x", [sigA]))
        .to.be.revertedWithCustomError(wallet, "InvalidSignatureCount");
    });

    it("owner 아닌 서명은 InvalidSigner", async function () {
      const { wallet, alice, dave, eve } = await loadFixture(deploy);
      const sigA = await signTx(wallet, alice, dave.address, 0n, "0x");
      const sigE = await signTx(wallet, eve, dave.address, 0n, "0x");
      const sigs = alice.address.toLowerCase() < eve.address.toLowerCase()
        ? [sigA, sigE]
        : [sigE, sigA];
      await expect(wallet.execute(dave.address, 0, "0x", sigs))
        .to.be.revertedWithCustomError(wallet, "InvalidSigner");
    });

    it("서명 순서가 잘못되면 SignersOutOfOrder", async function () {
      const { wallet, alice, bob, dave } = await loadFixture(deploy);
      const sigA = await signTx(wallet, alice, dave.address, 0n, "0x");
      const sigB = await signTx(wallet, bob, dave.address, 0n, "0x");
      // 강제로 역순
      const reversed = alice.address.toLowerCase() < bob.address.toLowerCase()
        ? [sigB, sigA]
        : [sigA, sigB];
      await expect(wallet.execute(dave.address, 0, "0x", reversed))
        .to.be.revertedWithCustomError(wallet, "SignersOutOfOrder");
    });

    it("nonce 소진 후 같은 서명 재사용 시 InvalidSigner (다른 nonce)", async function () {
      const { wallet, alice, bob, dave } = await loadFixture(deploy);
      const sigA = await signTx(wallet, alice, dave.address, 0n, "0x");
      const sigB = await signTx(wallet, bob, dave.address, 0n, "0x");
      const sigs = alice.address.toLowerCase() < bob.address.toLowerCase()
        ? [sigA, sigB] : [sigB, sigA];

      await wallet.execute(dave.address, 0, "0x", sigs);

      // 같은 서명 재사용은 nonce가 이미 증가했으므로 recover 결과가 달라져 owner 아님
      await expect(wallet.execute(dave.address, 0, "0x", sigs))
        .to.be.revertedWithCustomError(wallet, "InvalidSigner");
    });
  });

  describe("getDigest", function () {
    it("동일한 요청에 대해 결정론적 digest 반환", async function () {
      const { wallet, dave } = await loadFixture(deploy);
      const d1 = await wallet.getDigest(dave.address, 100n, "0x");
      const d2 = await wallet.getDigest(dave.address, 100n, "0x");
      expect(d1).to.equal(d2);
    });
  });
});
