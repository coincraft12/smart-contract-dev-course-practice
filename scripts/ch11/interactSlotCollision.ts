/**
 * Ch11 — SlotCollision 상호작용 스크립트 (강의자료 슬라이드 14~16 핵심 실습)
 *
 * 실습 흐름:
 *   [BrokenProxy]
 *     [1] 초기 slot 0 = 로직 주소 확인
 *     [2] forward(1000) → slot 0 오염 (로직 주소 소실) 을 raw 로 관찰
 *     [3] 오염된 impl 주소로 다시 forward → 조용히 무동작
 *   [SafeProxy · ERC-1967]
 *     [4] slot 0 은 비어 있고 로직 주소는 먼 고정 슬롯에 저장돼 있음
 *     [5] 반복 forward 후에도 impl 유지 · totalSupply 누적 확인
 *
 * 실행 전:
 *   1) npx hardhat node
 *   2) npm run deploy:ch11:slot:local
 *   3) .env 에 LOGIC_ADDRESS · BROKEN_PROXY_ADDRESS · SAFE_PROXY_ADDRESS 저장
 *   4) npx hardhat run scripts/ch11/interactSlotCollision.ts --network localhost
 */
import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

const IMPL_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

function slotToAddress(slotHex: string): string {
  return ethers.getAddress("0x" + slotHex.slice(-40));
}

async function main() {
  const LOGIC = process.env.LOGIC_ADDRESS;
  const BROKEN = process.env.BROKEN_PROXY_ADDRESS;
  const SAFE = process.env.SAFE_PROXY_ADDRESS;
  if (!LOGIC || !BROKEN || !SAFE) {
    throw new Error(
      "LOGIC_ADDRESS · BROKEN_PROXY_ADDRESS · SAFE_PROXY_ADDRESS not set in .env"
    );
  }

  const [signer] = await ethers.getSigners();
  const broken = await ethers.getContractAt("BrokenProxy", BROKEN);
  const safe = await ethers.getContractAt("SafeProxy", SAFE);

  console.log("=== SlotCollision 상호작용 ===\n");
  console.log("Signer      :", signer.address);
  console.log("Logic       :", LOGIC);
  console.log("BrokenProxy :", BROKEN);
  console.log("SafeProxy   :", SAFE);

  // ─────────── BrokenProxy — 슬롯 0 충돌 ───────────
  console.log("\n[1] BrokenProxy 초기 slot 0 (= 로직 주소여야 함)");
  let slot0 = await ethers.provider.getStorage(BROKEN, 0);
  console.log("  raw slot 0   :", slot0);
  console.log("  as address   :", slotToAddress(slot0));
  console.log("  implementation() :", await broken.implementation());

  console.log("\n[2] BrokenProxy.forward(1000) — delegatecall 로 mint 위임");
  await (await broken.forward(1000)).wait();
  slot0 = await ethers.provider.getStorage(BROKEN, 0);
  console.log("  raw slot 0   :", slot0, " ← totalSupply += 1000 결과가 여기 씌워짐");
  console.log("  as address   :", slotToAddress(slot0));
  console.log("  implementation() :", await broken.implementation(), " ← 로직 주소 오염!");

  console.log("\n[3] 오염된 impl 로 다시 forward(500)");
  const slot1Before = await ethers.provider.getStorage(BROKEN, 1);
  await (await broken.forward(500)).wait();
  const slot0After = await ethers.provider.getStorage(BROKEN, 0);
  const slot1After = await ethers.provider.getStorage(BROKEN, 1);
  console.log("  slot 0 변화  :", slot0 === slot0After ? "없음" : "있음");
  console.log("  slot 1 변화  :", slot1Before === slot1After ? "없음" : "있음");
  console.log("  → 코드 없는 주소로 delegatecall 되어 mint 로직이 실행되지 않는다.");
  console.log("     require(ok) 는 통과하지만 프록시는 사실상 죽었다.");

  // ─────────── SafeProxy — ERC-1967 ───────────
  console.log("\n[4] SafeProxy 초기 상태 — slot 0 비어 있음, 로직은 먼 고정 슬롯");
  const safeSlot0 = await ethers.provider.getStorage(SAFE, 0);
  const safeImplSlot = await ethers.provider.getStorage(SAFE, IMPL_SLOT);
  console.log("  slot 0                       :", safeSlot0);
  console.log("  slot keccak(eip1967...)-1    :", safeImplSlot);
  console.log("  implementation()             :", await safe.implementation());

  console.log("\n[5] SafeProxy.forward(1000) → forward(500) — 누적 확인");
  await (await safe.forward(1000)).wait();
  await (await safe.forward(500)).wait();
  const safeTotal = await ethers.provider.getStorage(SAFE, 0);
  const balanceSlot = ethers.keccak256(
    ethers.concat([
      ethers.zeroPadValue(signer.address, 32),
      ethers.zeroPadValue("0x01", 32),
    ])
  );
  const safeBal = await ethers.provider.getStorage(SAFE, balanceSlot);
  console.log("  proxy slot 0 (totalSupply) :", BigInt(safeTotal).toString());
  console.log("  proxy balanceOf[signer]    :", BigInt(safeBal).toString());
  console.log("  implementation() (여전히)  :", await safe.implementation());

  console.log("\n✅ 완료 — 왜 ERC-1967 이 필요한지 몸으로 확인했다");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
