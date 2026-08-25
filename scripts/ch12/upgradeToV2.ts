import { ethers, upgrades, network, run } from "hardhat";

/**
 * v1 → v2 UUPS 업그레이드 스크립트
 *
 * ▶ 실행 전
 *   1) v1이 이미 배포되어 있어야 함
 *   2) PROXY_ADDRESS 환경변수 또는 아래 상수를 세팅
 *
 * ▶ Sepolia 실행 시 자동 verify 포함 (구현체만 — 프록시는 OZ 표준이라 이미 verified)
 */
async function main() {
  const PROXY_ADDRESS = process.env.PROXY_ADDRESS;
  if (!PROXY_ADDRESS) {
    throw new Error("PROXY_ADDRESS env var required");
  }

  const V2 = await ethers.getContractFactory("EnterpriseNFTV2");
  console.log(`Upgrading proxy ${PROXY_ADDRESS} to V2...`);

  const upgraded = await upgrades.upgradeProxy(PROXY_ADDRESS, V2, {
    kind: "uups",
    call: { fn: "initializeV2", args: [] },
  });
  await upgraded.waitForDeployment();

  const implAddr = await upgrades.erc1967.getImplementationAddress(PROXY_ADDRESS);
  console.log("New implementation:", implAddr);
  console.log("Version:           ", await (upgraded as any).version());

  // ── Etherscan verify (Sepolia 등 실 네트워크에서만) ────────────
  if (network.name === "sepolia") {
    console.log("\n→ Verifying new implementation on Etherscan (15초 대기)...");
    await new Promise((r) => setTimeout(r, 15_000));
    try {
      await run("verify:verify", {
        address: implAddr,
        constructorArguments: [],
      });
      console.log("✅ Implementation verified.");
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      if (msg.includes("Already Verified") || msg.includes("already verified")) {
        console.log("ℹ️  이미 검증됨.");
      } else {
        console.warn("⚠️  Verify skipped:", msg);
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
