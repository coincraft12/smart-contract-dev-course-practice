/**
 * Ch11 — CallDemo 상호작용 스크립트
 *
 * 실습 흐름 (강의자료 슬라이드 4·10·11 · 20 대응):
 *   [1] 초기 상태 확인
 *   [2] forwardDelegate(42) → Caller.storage 변경 · msg.sender = 원래 EOA
 *   [3] forwardCall(99)     → Callee.storage 변경 · msg.sender = Caller 주소
 *   [4] 요약 대조 (Caller vs Callee 각 상태)
 *   [5] callChecked() → 실패가 revert 로 전파됨을 관찰
 *   [6] callIgnored() → 실패가 조용히 무시되고 다음 줄이 실행됨 (didRunAfter=true)
 *
 * 실행 전:
 *   1) 별도 터미널: npx hardhat node
 *   2) npm run deploy:ch11:calldemo:local
 *   3) .env 에 CALLEE_ADDRESS · CALLER_ADDRESS 저장
 *   4) npx hardhat run scripts/ch11/interactCallDemo.ts --network localhost
 */
import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const CALLEE = process.env.CALLEE_ADDRESS;
  const CALLER = process.env.CALLER_ADDRESS;
  if (!CALLEE || !CALLER) {
    throw new Error("CALLEE_ADDRESS · CALLER_ADDRESS not set in .env");
  }

  const [, alice] = await ethers.getSigners();
  const callee = await ethers.getContractAt("Callee", CALLEE);
  const caller = await ethers.getContractAt("Caller", CALLER);

  console.log("=== CallDemo 상호작용 ===\n");
  console.log("Alice   :", alice.address);
  console.log("Callee  :", CALLEE);
  console.log("Caller  :", CALLER);

  // ─────────────────────────────────────────────
  console.log("\n[1] 초기 상태");
  console.log("  Callee.value :", (await callee.value()).toString());
  console.log("  Caller.value :", (await caller.value()).toString());

  // ─────────────────────────────────────────────
  console.log("\n[2] Alice → Caller.forwardDelegate(42)  (delegatecall)");
  await (await caller.connect(alice).forwardDelegate(42)).wait();
  console.log("  Caller.value  :", (await caller.value()).toString(), "  ← 바뀜 (A storage)");
  console.log("  Caller.sender :", await caller.sender(),                "  ← Alice (원래 EOA 유지)");
  console.log("  Caller.origin :", await caller.origin());
  console.log("  Callee.value  :", (await callee.value()).toString(), "  ← 그대로");

  // ─────────────────────────────────────────────
  console.log("\n[3] Alice → Caller.forwardCall(99)      (call)");
  await (await caller.connect(alice).forwardCall(99)).wait();
  console.log("  Callee.value  :", (await callee.value()).toString(), "  ← 바뀜 (B storage)");
  console.log("  Callee.sender :", await callee.sender(),                "  ← Caller 주소로 바뀜");
  console.log("  Callee.origin :", await callee.origin(),                "  ← Alice (tx.origin 유지)");
  console.log("  Caller.value  :", (await caller.value()).toString(), "  ← forwardDelegate 결과 유지");

  // ─────────────────────────────────────────────
  console.log("\n[4] 대조 요약");
  console.log("  구분           storage 기록    msg.sender");
  console.log("  delegatecall   Caller (A)      원래 EOA");
  console.log("  call           Callee (B)      Caller 주소");

  // ─────────────────────────────────────────────
  console.log("\n[5] callChecked() — 실패를 require 로 잡아 revert 전파");
  try {
    await (await caller.callChecked()).wait();
    console.log("  ⚠️ 예상과 달리 성공했음");
  } catch (e: any) {
    console.log("  revert 관찰됨:", e.shortMessage ?? e.message?.split("\n")[0]);
  }

  // ─────────────────────────────────────────────
  console.log("\n[6] callIgnored() — 반환값 무시 시 조용히 다음 줄 실행");
  console.log("  didRunAfter (전):", await caller.didRunAfter());
  await (await caller.callIgnored()).wait();
  console.log("  didRunAfter (후):", await caller.didRunAfter(), " ← 실패했지만 다음 줄이 실행됨");

  console.log("\n✅ 완료 — 반환값 확인의 중요성을 눈으로 봤다");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
