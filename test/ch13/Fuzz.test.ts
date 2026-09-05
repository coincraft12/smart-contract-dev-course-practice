import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

/**
 * Ch13 — Hardhat Fuzz 미러 (Foundry `test/ch13/Fuzz.t.sol` 의 3함수를 1:1 미러)
 *
 * Foundry(`.t.sol`) 가 표준이며, 이 파일은 Foundry 미설치 학생을 위한 백업본이다.
 * 세 fuzz 함수를 무작위 입력 반복문으로 흉내낸다.
 *
 * 검증 대상 (Fuzz.t.sol 과 동일):
 *   I-3. tokens[user] == paid / PRICE        (크레딧 정확성)
 *   I-2. raised == paid                       (회계 무결성)
 *   I-1. credit * PRICE ≤ paid                (자산 유출 상한)
 *
 * 실행: npx hardhat test test/ch13/Fuzz.test.ts
 */
describe("Ch13 — Fuzz (Hardhat 반복문 · Foundry Fuzz.t.sol 미러)", function () {

  const PRICE = ethers.parseEther("0.001");    // 1e15 wei · Fuzz.t.sol 의 PRICE 와 동일
  const GOAL  = ethers.parseEther("1000");     // Fuzz.t.sol 의 GOAL 과 동일
  const RUNS  = 256;                            // Foundry fuzz runs 기본값과 동일

  async function deploy() {
    const signers = await ethers.getSigners();
    const [owner, alice] = signers;
    const Factory = await ethers.getContractFactory("AuditTarget");
    const target = await Factory.connect(owner).deploy(PRICE, GOAL);
    await target.waitForDeployment();
    return { target, owner, alice, signers };
  }

  // Node 내장 crypto 로 [min, max] 범위 무작위 bigint 생성 (vm.assume 역할)
  function randomBigInt(min: bigint, max: bigint): bigint {
    const range = max - min + 1n;
    const bits = range.toString(2).length;
    const bytes = Math.ceil(bits / 8);
    let rnd: bigint;
    do {
      const buf = new Uint8Array(bytes);
      globalThis.crypto.getRandomValues(buf);
      rnd = 0n;
      for (const b of buf) rnd = (rnd << 8n) | BigInt(b);
    } while (rnd >= range);
    return min + rnd;
  }

  /**
   * Foundry 대응: testFuzz_BuyMaintainsInvariants(uint96 paid)
   *
   *   vm.assume(paid > 0);
   *   vm.assume(paid < 100 ether);
   *   vm.deal(alice, paid); vm.prank(alice); target.buy{value: paid}();
   *   assertEq(tokens[alice], paid / PRICE);   // 검증 1: 크레딧 정확성
   *   assertEq(raised, paid);                  // 검증 2: 회계 무결성
   *   assertLe(credit * PRICE, paid);          // 검증 3: 자산 유출 상한
   */
  it(`testFuzz_BuyMaintainsInvariants — buy 불변식 3종 (${RUNS} runs)`, async function () {
    this.timeout(60_000);
    const maxPaid = ethers.parseEther("100") - 1n;

    for (let i = 0; i < RUNS; i++) {
      // 매 반복마다 fresh 배포 (Foundry setUp() 재실행 대응)
      const { target, alice } = await loadFixture(deploy);

      // vm.assume(paid > 0 && paid < 100 ether)
      const paid = randomBigInt(1n, maxPaid);

      // vm.prank(alice); target.buy{value: paid}();
      await target.connect(alice).buy({ value: paid });

      const expectedTokens = paid / PRICE;

      // 검증 1: 크레딧 정확성
      expect(await target.tokens(alice.address)).to.equal(
        expectedTokens,
        `[run ${i}] I-3: credit == paid / price · paid=${paid}`
      );
      // 검증 2: 회계 무결성
      expect(await target.raised()).to.equal(
        paid,
        `[run ${i}] I-2: raised == paid · paid=${paid}`
      );
      // 검증 3: 자산 유출 상한 (credit * PRICE ≤ paid)
      expect(expectedTokens * PRICE).to.be.lte(
        paid,
        `[run ${i}] I-1: credit*price <= paid · paid=${paid}`
      );
    }
  });

  /**
   * Foundry 대응: testFuzz_UpdatePrice(uint256 newPrice)
   *
   *   vm.assume(newPrice > 0);
   *   vm.prank(owner); target.updatePrice(newPrice);
   *   assertEq(tokenPrice, newPrice);
   */
  it(`testFuzz_UpdatePrice — owner postcondition (${RUNS} runs)`, async function () {
    this.timeout(60_000);
    const { target, owner } = await loadFixture(deploy);
    const maxPrice = ethers.parseEther("1");

    for (let i = 0; i < RUNS; i++) {
      // vm.assume(newPrice > 0)
      const newPrice = randomBigInt(1n, maxPrice);

      await target.connect(owner).updatePrice(newPrice);
      expect(await target.tokenPrice()).to.equal(
        newPrice,
        `[run ${i}] tokenPrice updated · newPrice=${newPrice}`
      );
    }
  });

  /**
   * Foundry 대응: testFuzz_UpdatePriceRevertsForNonOwner(address caller, uint256 newPrice)
   *
   *   vm.assume(caller != owner);
   *   vm.assume(newPrice > 0);
   *   vm.prank(caller);
   *   vm.expectRevert("not owner");
   *   target.updatePrice(newPrice);
   *
   * Hardhat 은 임의 address 서명이 불가하므로 impersonation + funding 조합으로 대응.
   */
  it(`testFuzz_UpdatePriceRevertsForNonOwner — non-owner negative invariant (${RUNS} runs)`, async function () {
    this.timeout(120_000);
    const { target, owner } = await loadFixture(deploy);
    const maxPrice = ethers.parseEther("1");

    for (let i = 0; i < RUNS; i++) {
      // 무작위 address 생성 (owner 와 다름을 보장)
      let caller = ethers.Wallet.createRandom().address;
      if (caller.toLowerCase() === owner.address.toLowerCase()) continue;

      // vm.deal 대응: impersonation + balance seed (가스비용)
      await ethers.provider.send("hardhat_impersonateAccount", [caller]);
      await ethers.provider.send("hardhat_setBalance", [caller, "0xDE0B6B3A7640000"]); // 1 ETH
      const impersonated = await ethers.getSigner(caller);

      const newPrice = randomBigInt(1n, maxPrice);

      // vm.expectRevert("not owner")
      await expect(
        target.connect(impersonated).updatePrice(newPrice),
        `[run ${i}] non-owner must revert · caller=${caller} newPrice=${newPrice}`
      ).to.be.revertedWith("not owner");

      await ethers.provider.send("hardhat_stopImpersonatingAccount", [caller]);
    }
  });
});
