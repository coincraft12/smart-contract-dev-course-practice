import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

/**
 * Ch13 — Fuzz 테스트 (대본 13-3 슬라이드 6 · 슬라이드 19 확인 포인트 2)
 *
 * 대본 원문:
 *   슬라이드 6 — "경계값은 사람이 못 찾는다 (fuzz)"
 *   슬라이드 19 확인 포인트 2 — "fuzz 테스트를 하나 써봅니다. Foundry가 설치돼 있으면
 *     그걸로, 없으면 Hardhat에서 반복문으로 무작위 값을 여러 번 넣는 식으로 흉내 내도 됩니다."
 *
 * 본 파일은 Foundry 미도입 프로젝트에서 Hardhat 반복문으로 fuzz 를 흉내 낸다.
 * 무작위 amount 를 100회 대입하여 AuditTarget.buy() 의 tokens · raised 불변식이
 * 유지되는지 검증한다.
 *
 * 검증 대상 불변식:
 *   I-1. tokens[user] * tokenPrice ≤ paid (정수 나눗셈에서 사용자 크레딧은 실 지불액 이하)
 *   I-2. raised == Σ paid (총 지불액 합계)
 *   I-3. paid > 0 이면 크레딧은 정확히 paid / tokenPrice (버림)
 */
describe("Ch13 — Fuzz (Hardhat 반복문 · 대본 슬라이드 19)", function () {

  async function deployTarget() {
    const [owner, alice] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AuditTarget");
    const price = ethers.parseEther("0.001"); // 1e15 wei
    const goal = ethers.parseEther("1000");   // 넉넉히
    const target = await Factory.connect(owner).deploy(price, goal);
    await target.waitForDeployment();
    return { target, owner, alice, price };
  }

  // Node 내장 crypto 로 uint256 범위 무작위 bigint 생성
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

  it("Fuzz: buy(amount) 100 회 무작위 대입 — tokens · raised 불변식 유지", async function () {
    const { target, alice, price } = await loadFixture(deployTarget);

    const ITERATIONS = 100;
    let totalPaid = 0n;
    let totalTokens = 0n;

    for (let i = 0; i < ITERATIONS; i++) {
      // 1 wei ~ 0.01 ETH 무작위 (아주 작은 값과 큰 값 섞임)
      const paid = randomBigInt(1n, ethers.parseEther("0.01"));

      // vm.assume 흉내: 무의미한 입력(0) 은 앞서 제외했으므로 스킵 케이스 없음
      await target.connect(alice).buy({ value: paid });

      totalPaid += paid;
      const expectedTokens = paid / price; // Solidity 정수 나눗셈과 동일
      totalTokens += expectedTokens;

      // 각 반복마다 tokens 일관성 확인
      expect(await target.tokens(alice.address)).to.equal(totalTokens);
    }

    // 최종 raised 합계 검증
    expect(await target.raised()).to.equal(totalPaid);
    expect(await target.tokens(alice.address)).to.equal(totalTokens);
  });

  it("Fuzz: updatePrice(newPrice) 50 회 무작위 대입 — newPrice > 0 이면 성공", async function () {
    const { target, owner } = await loadFixture(deployTarget);

    const ITERATIONS = 50;
    let lastPrice = ethers.parseEther("0.001");

    for (let i = 0; i < ITERATIONS; i++) {
      // vm.assume(newPrice > 0) 흉내: 0 은 스킵
      let newPrice = randomBigInt(0n, ethers.parseEther("1"));
      if (newPrice === 0n) continue;

      await target.connect(owner).updatePrice(newPrice);
      expect(await target.tokenPrice()).to.equal(newPrice);
      lastPrice = newPrice;
    }

    expect(await target.tokenPrice()).to.equal(lastPrice);
  });
});
