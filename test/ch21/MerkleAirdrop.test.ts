import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Ch21 — MerkleAirdrop", function () {

  // 오프체인에서 준비된 화이트리스트로 Merkle root 생성
  function leaf(addr: string, amount: bigint): string {
    // OpenZeppelin MerkleProof v5는 double-hashed leaf 규격 사용
    const inner = ethers.solidityPackedKeccak256(
      ["bytes"],
      [ethers.AbiCoder.defaultAbiCoder().encode(["address", "uint256"], [addr, amount])]
    );
    return ethers.keccak256(inner);
  }

  function pairHash(a: string, b: string): string {
    return a < b
      ? ethers.solidityPackedKeccak256(["bytes32", "bytes32"], [a, b])
      : ethers.solidityPackedKeccak256(["bytes32", "bytes32"], [b, a]);
  }

  async function deploy() {
    const [admin, alice, bob, eve] = await ethers.getSigners();

    // 화이트리스트: alice = 100 tokens, bob = 200 tokens
    const aliceAmt = 100n * 10n ** 18n;
    const bobAmt = 200n * 10n ** 18n;
    const l1 = leaf(alice.address, aliceAmt);
    const l2 = leaf(bob.address, bobAmt);
    const root = pairHash(l1, l2);

    // 테스트용 ERC-20 배포
    const Token = await ethers.getContractFactory("MyERC20");
    const token = await Token.deploy("Test", "TST", 18);
    await token.mint(admin.address, 10_000n * 10n ** 18n);

    const Airdrop = await ethers.getContractFactory("MerkleAirdrop");
    const airdrop = await Airdrop.deploy(await token.getAddress(), root);

    await token.transfer(await airdrop.getAddress(), 1_000n * 10n ** 18n);

    return { airdrop, token, admin, alice, bob, eve, aliceAmt, bobAmt, l1, l2, root };
  }

  it("화이트리스트 계정이 정확한 proof로 청구", async function () {
    const { airdrop, token, alice, bob, aliceAmt, l2 } = await loadFixture(deploy);

    // alice의 proof는 sibling = l2 (bob의 leaf)
    await expect(airdrop.connect(alice).claim(aliceAmt, [l2]))
      .to.emit(airdrop, "Claimed").withArgs(alice.address, aliceAmt);

    expect(await token.balanceOf(alice.address)).to.equal(aliceAmt);
    expect(await airdrop.claimed(alice.address)).to.be.true;
  });

  it("중복 청구 시 AlreadyClaimed", async function () {
    const { airdrop, alice, aliceAmt, l2 } = await loadFixture(deploy);
    await airdrop.connect(alice).claim(aliceAmt, [l2]);
    await expect(airdrop.connect(alice).claim(aliceAmt, [l2]))
      .to.be.revertedWithCustomError(airdrop, "AlreadyClaimed");
  });

  it("잘못된 proof는 InvalidProof", async function () {
    const { airdrop, eve, l2 } = await loadFixture(deploy);
    await expect(airdrop.connect(eve).claim(100n * 10n ** 18n, [l2]))
      .to.be.revertedWithCustomError(airdrop, "InvalidProof");
  });

  it("잘못된 amount로 청구 시 InvalidProof", async function () {
    const { airdrop, alice, l2 } = await loadFixture(deploy);
    // alice의 정상 amount는 100이지만 500으로 시도
    await expect(airdrop.connect(alice).claim(500n * 10n ** 18n, [l2]))
      .to.be.revertedWithCustomError(airdrop, "InvalidProof");
  });
});
