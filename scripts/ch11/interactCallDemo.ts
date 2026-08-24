/**
 * Ch11 — CallDemo 상호작용 스크립트
 *
 * 실습 흐름 (강의자료 슬라이드 4·10·11 · 20 대응):
 *   [1] 초기 상태 확인
 *   [2] forwardDelegate(42) → A.storage 변경 · msg.sender = 원래 EOA
 *   [3] forwardCall(99)     → B.storage 변경 · msg.sender = A 주소
 *   [4] 요약 대조 (A vs B 각 상태)
 *   [5] callChecked() → 실패가 revert 로 전파됨을 관찰
 *   [6] callIgnored() → 실패가 조용히 무시되고 다음 줄이 실행됨 (didRunAfter=true)
 *
 * 실행 전:
 *   1) 별도 터미널: npx hardhat node
 *   2) npm run deploy:ch11:calldemo:local
 *   3) .env 에 B_ADDRESS · A_ADDRESS 저장
 *   4) npx hardhat run scripts/ch11/interactCallDemo.ts --network localhost
 */
import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const B_ADDR = process.env.B_ADDRESS;
  const A_ADDR = process.env.A_ADDRESS;
  if (!B_ADDR || !A_ADDR) {
    throw new Error("B_ADDRESS · A_ADDRESS not set in .env");
  }

  const [, alice] = await ethers.getSigners();
  const b = await ethers.getContractAt("BContract", B_ADDR);
  const a = await ethers.getContractAt("AContract", A_ADDR);

  console.log("=== CallDemo 상호작용 ===\n");
  console.log("Alice   :", alice.address);
  console.log("B       :", B_ADDR);
  console.log("A       :", A_ADDR);

  // ─────────────────────────────────────────────
  console.log("\n[1] 초기 상태");
  console.log("  B.value :", (await b.value()).toString());
  console.log("  A.value :", (await a.value()).toString());

  // ─────────────────────────────────────────────
  console.log("\n[2] Alice → A.forwardDelegate(42)  (delegatecall)");
  await (await a.connect(alice).forwardDelegate(42)).wait();
  console.log("  A.value  :", (await a.value()).toString(), "  ← 바뀜 (A storage)");
  console.log("  A.sender :", await a.sender(),                "  ← Alice (원래 EOA 유지)");
  console.log("  A.origin :", await a.origin());
  console.log("  B.value  :", (await b.value()).toString(), "  ← 그대로");

  // ─────────────────────────────────────────────
  console.log("\n[3] Alice → A.forwardCall(99)      (call)");
  await (await a.connect(alice).forwardCall(99)).wait();
  console.log("  B.value  :", (await b.value()).toString(), "  ← 바뀜 (B storage)");
  console.log("  B.sender :", await b.sender(),                "  ← A 주소로 바뀜");
  console.log("  B.origin :", await b.origin(),                "  ← Alice (tx.origin 유지)");
  console.log("  A.value  :", (await a.value()).toString(), "  ← forwardDelegate 결과 유지");

  // ─────────────────────────────────────────────
  console.log("\n[4] 대조 요약");
  console.log("  구분           storage 기록    msg.sender");
  console.log("  delegatecall   A               원래 EOA");
  console.log("  call           B               A 주소");

  // ─────────────────────────────────────────────
  console.log("\n[5] callChecked() — 실패를 require 로 잡아 revert 전파");
  try {
    await (await a.callChecked()).wait();
    console.log("  ⚠️ 예상과 달리 성공했음");
  } catch (e: any) {
    console.log("  revert 관찰됨:", e.shortMessage ?? e.message?.split("\n")[0]);
  }

  // ─────────────────────────────────────────────
  console.log("\n[6] callIgnored() — 반환값 무시 시 조용히 다음 줄 실행");
  console.log("  didRunAfter (전):", await a.didRunAfter());
  await (await a.callIgnored()).wait();
  console.log("  didRunAfter (후):", await a.didRunAfter(), " ← 실패했지만 다음 줄이 실행됨");

  console.log("\n✅ 완료 — 반환값 확인의 중요성을 눈으로 봤다");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
