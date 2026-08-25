/**
 * Ch12 — Sepolia 전체 흐름 (진단·안전 재현 버전)
 *
 * upgradeProxy + call 옵션 조합이 hardhat-upgrades 에서 no-op 되는 케이스 회피.
 * 방식:
 *   [1] V1 프록시 배포
 *   [2] deployImplementation 로 V2 impl 강제 배포 (redeploy always)
 *      → 진짜 V2 bytecode 가 새 주소에 올라감을 눈으로 확인
 *   [3] upgradeProxy 로 프록시 slot 만 새 impl 로 교체 (call 옵션 없음)
 *   [4] 프록시에 대고 initializeV2() 를 별도 트랜잭션으로 호출
 *   [5] verify
 */
import { ethers, upgrades, network, run } from "hardhat";

async function main() {
  if (network.name !== "sepolia") {
    throw new Error(`network=${network.name} · sepolia 로 실행`);
  }

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance :", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // ── [1] V1 배포 ─────────────────────────────
  console.log("\n=== [1] V1 프록시 배포 ===");
  const V1 = await ethers.getContractFactory("EnterpriseNFTV1");
  const proxy = await upgrades.deployProxy(
    V1,
    [deployer.address, "https://api.example.com/token/{id}.json"],
    { kind: "uups", initializer: "initialize" }
  );
  await proxy.waitForDeployment();
  const proxyAddr = await proxy.getAddress();
  const impl1Addr = await upgrades.erc1967.getImplementationAddress(proxyAddr);
  console.log("Proxy         :", proxyAddr);
  console.log("V1 impl       :", impl1Addr);
  console.log("Proxy.version :", await (proxy as any).version());

  // ── [2] V2 impl 강제 배포 (redeployImplementation: 'always') ────
  console.log("\n=== [2] V2 impl 강제 배포 (deployImplementation) ===");
  const V2 = await ethers.getContractFactory("EnterpriseNFTV2");
  console.log("V2 factory bytecode length:", V2.bytecode.length, "· V1:", V1.bytecode.length);
  console.log("V1 == V2 factory?:", V1.bytecode === V2.bytecode);

  const v2ImplAddr = await upgrades.deployImplementation(V2, {
    kind: "uups",
    redeployImplementation: "always",
  });
  console.log("V2 impl (fresh):", v2ImplAddr);

  const v2Direct = await ethers.getContractAt("EnterpriseNFTV2", v2ImplAddr as string);
  console.log("V2 impl.version (direct):", await v2Direct.version(), "  ← 여기가 2.0.0 이어야 진짜 V2");

  // ── [3] 프록시를 V2 impl 로 upgrade (call 옵션 없음) ────────
  console.log("\n=== [3] 프록시 slot 교체 (call 옵션 없이) ===");
  const upgraded = await upgrades.upgradeProxy(proxyAddr, V2, {
    kind: "uups",
    redeployImplementation: "always",
    // ⚠️ call 옵션 없음 — hardhat-upgrades no-op 회피
  });
  await upgraded.waitForDeployment();
  const implAfter = await upgrades.erc1967.getImplementationAddress(proxyAddr);
  console.log("Proxy         :", proxyAddr, "(안 변함)");
  console.log("Proxy 의 impl :", implAfter, "(V2 impl 과 같아야)");
  console.log("Proxy.version :", await (upgraded as any).version(), "  ← 여기가 2.0.0 이어야");

  // ── [4] initializeV2 별도 호출 (v2 상태 초기화) ─────────
  console.log("\n=== [4] initializeV2 별도 호출 ===");
  try {
    const tx = await (upgraded as any).initializeV2();
    const rcpt = await tx.wait();
    console.log("initializeV2 tx:", rcpt?.hash);
  } catch (e: any) {
    console.warn("initializeV2 revert (아마 이미 실행됨):", e.shortMessage ?? e.message?.split("\n")[0]);
  }

  // ── [5] verify ──────────────────────────────
  console.log("\n=== [5] Etherscan verify ===");
  for (const [label, addr] of [["V1 impl", impl1Addr], ["V2 impl", v2ImplAddr as string]]) {
    console.log(`\n→ verify ${label} (${addr}) — 15초 대기`);
    await new Promise((r) => setTimeout(r, 15_000));
    try {
      await run("verify:verify", { address: addr, constructorArguments: [] });
      console.log(`✅ ${label} verified`);
    } catch (e: any) {
      const m = e?.message ?? String(e);
      if (m.includes("Already Verified") || m.includes("already verified")) {
        console.log(`ℹ️  ${label}: 이미 검증됨`);
      } else {
        console.warn(`⚠️  ${label} verify skipped:`, m.split("\n")[0]);
      }
    }
  }

  console.log("\n=== 최종 요약 ===");
  console.log("Proxy         :", proxyAddr);
  console.log("V1 impl       :", impl1Addr);
  console.log("V2 impl       :", v2ImplAddr);
  console.log("최종 version  :", await (upgraded as any).version());
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
