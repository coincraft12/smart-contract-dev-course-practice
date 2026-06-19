// 슬라이드 2 실습 — 로컬 노드 고급 기능
//
// ▶ 실행 방법
//   이 파일만 실행:   npx hardhat test test/advanced.ts
//   전체 테스트 실행: npx hardhat test
//
// ※ 별도 노드 실행 불필요 — Hardhat 내장 네트워크에서 자동 실행됨

import {
  time,
  mine,
  setBalance,
  impersonateAccount,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers } from "hardhat";
import { expect } from "chai";

describe("로컬 노드 고급 기능", function () {

  // ─────────────────────────────────────────────
  //  시간 조작
  // ─────────────────────────────────────────────
  describe("시간 조작", function () {
    it("time.increase — 1시간 증가", async function () {
      const before = await time.latest();
      await time.increase(3600);
      const after = await time.latest();
      expect(after - before).to.be.gte(3600);
      console.log("⏰ 1시간 경과:", after - before, "초");
    });

    it("time.increaseTo — 1년 후로 점프", async function () {
      const now = await time.latest();
      const oneYearLater = now + 365 * 24 * 3600;
      await time.increaseTo(oneYearLater);
      const after = await time.latest();
      expect(after).to.be.gte(oneYearLater);
      console.log("📅 현재 타임스탬프:", after, "(1년 후)");
    });
  });

  // ─────────────────────────────────────────────
  //  블록 마이닝
  // ─────────────────────────────────────────────
  describe("블록 마이닝", function () {
    it("mine(100) — 100블록 즉시 생성", async function () {
      const before = await ethers.provider.getBlockNumber();
      await mine(100);
      const after = await ethers.provider.getBlockNumber();
      expect(after - before).to.equal(100);
      console.log("⛏  블록:", before, "→", after);
    });

    it("mine(10, { interval: 12 }) — 12초 간격으로 10블록", async function () {
      const beforeBlock = await ethers.provider.getBlockNumber();
      const beforeTime = await time.latest();
      await mine(10, { interval: 12 });
      const afterBlock = await ethers.provider.getBlockNumber();
      const afterTime = await time.latest();
      expect(afterBlock - beforeBlock).to.equal(10);
      console.log("⛏  +10블록, 경과 시간:", afterTime - beforeTime, "초 (≈120초 예상)");
    });
  });

  // ─────────────────────────────────────────────
  //  잔액 설정
  // ─────────────────────────────────────────────
  describe("잔액 설정", function () {
    it("setBalance — 임의 주소에 100 ETH 강제 설정", async function () {
      const [addr] = await ethers.getSigners();
      await setBalance(addr.address, ethers.parseEther("100"));
      const balance = await ethers.provider.getBalance(addr.address);
      expect(balance).to.equal(ethers.parseEther("100"));
      console.log("💰 잔액:", ethers.formatEther(balance), "ETH");
    });
  });

  // ─────────────────────────────────────────────
  //  Impersonation (계정 사칭)
  // ─────────────────────────────────────────────
  describe("Impersonation", function () {
    it("임의 주소를 impersonate해 SimpleStorage 호출", async function () {
      // 1. SimpleStorage 배포
      const Factory = await ethers.getContractFactory("SimpleStorage");
      const contract = await Factory.deploy();
      await contract.waitForDeployment();

      // 2. 임의 주소 선택 후 ETH 지급 (가스비용)
      const target = "0x1234567890123456789012345678901234567890";
      await setBalance(target, ethers.parseEther("10"));

      // 3. 해당 주소를 signer로 사용
      await impersonateAccount(target);
      const whale = await ethers.getSigner(target);

      // 4. impersonate된 계정으로 컨트랙트 함수 호출
      await contract.connect(whale).store(42);
      const value = await contract.retrieve();
      expect(value).to.equal(42n);

      console.log("🎭 impersonated:", target);
      console.log("📦 저장된 값:", value.toString());
    });
  });
});
