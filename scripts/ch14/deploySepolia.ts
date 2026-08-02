import { ethers, upgrades, network, run } from "hardhat";

/**
 * Sepolia 배포 스크립트
 *
 * ▶ 실행 전 준비
 *   1) .env 에 SEPOLIA_RPC_URL, DEPLOYER_PRIVATE_KEY, ETHERSCAN_API_KEY 설정
 *   2) 배포자 주소에 Sepolia ETH 확보 (https://sepoliafaucet.com/)
 *
 * ▶ 실행
 *   npx hardhat run scripts/ch14/deploySepolia.ts --network sepolia
 */
async function main() {
  if (network.name !== "sepolia") {
    console.warn(`⚠️  Current network: ${network.name} (expected: sepolia)`);
  }

  const [deployer] = await ethers.getSigners();
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer:", deployer.address);
  console.log("Balance :", ethers.formatEther(bal), "ETH");

  const initialUri = "https://api.example.com/token/{id}.json";
  const Factory = await ethers.getContractFactory("EnterpriseNFTV1");

  console.log("\n→ Deploying UUPS proxy...");
  const proxy = await upgrades.deployProxy(
    Factory,
    [deployer.address, initialUri],
    { kind: "uups", initializer: "initialize" }
  );
  await proxy.waitForDeployment();

  const proxyAddr = await proxy.getAddress();
  const implAddr = await upgrades.erc1967.getImplementationAddress(proxyAddr);

  console.log("\n✅ Deployed.");
  console.log("Proxy         :", proxyAddr);
  console.log("Implementation:", implAddr);

  // ── Etherscan verify ─────────────────────────────
  if (network.name === "sepolia") {
    console.log("\n→ Verifying implementation on Etherscan (15초 대기)...");
    await new Promise((r) => setTimeout(r, 15_000));
    try {
      await run("verify:verify", {
        address: implAddr,
        constructorArguments: [],
      });
      console.log("✅ Implementation verified.");
    } catch (err: any) {
      console.warn("⚠️  Verify skipped:", err?.message ?? err);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
