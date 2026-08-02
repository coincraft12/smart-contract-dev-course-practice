import { ethers, network, run } from "hardhat";

/**
 * Ch04-4 실습 — Sepolia 배포 + Etherscan verify
 *
 * ▶ 실행 전 준비
 *   1) .env
 *      SEPOLIA_RPC_URL=<Alchemy or Infura>
 *      DEPLOYER_PRIVATE_KEY=<0x...>
 *      ETHERSCAN_API_KEY=<...>
 *
 *   2) Sepolia ETH 확보:
 *      https://sepoliafaucet.com/
 *      https://www.alchemy.com/faucets/ethereum-sepolia
 *
 * ▶ 실행
 *   npx hardhat run scripts/ch04/4-4/deployGreeter.ts --network sepolia
 *
 * ▶ 검증 (배포 후 15초 정도 대기 후 자동 시도)
 *   실패 시 수동:
 *   npx hardhat verify --network sepolia <ADDRESS> "Hello Sepolia"
 */
async function main() {
  const INITIAL_GREETING = "Hello Sepolia";

  const [deployer] = await ethers.getSigners();
  console.log("Network :", network.name);
  console.log("Deployer:", deployer.address);
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log("Balance :", ethers.formatEther(bal), "ETH");
  if (bal === 0n && network.name === "sepolia") {
    console.warn("⚠️  Balance is 0. Get Sepolia ETH from https://sepoliafaucet.com/");
  }

  const F = await ethers.getContractFactory("Greeter");
  const c = await F.deploy(INITIAL_GREETING);
  await c.waitForDeployment();

  const addr = await c.getAddress();
  console.log("\n✅ Deployed at:", addr);
  console.log("Explorer:", `https://sepolia.etherscan.io/address/${addr}`);

  // Etherscan verify — Sepolia에서만
  if (network.name === "sepolia") {
    console.log("\n→ Waiting 15s for indexing before verify...");
    await new Promise((r) => setTimeout(r, 15_000));
    try {
      await run("verify:verify", {
        address: addr,
        constructorArguments: [INITIAL_GREETING],
      });
      console.log("✅ Verified on Etherscan.");
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      if (msg.toLowerCase().includes("already verified")) {
        console.log("ℹ️  Already verified.");
      } else {
        console.warn("⚠️  Verify failed:", msg);
        console.warn("Manual retry:");
        console.warn(`  npx hardhat verify --network sepolia ${addr} "${INITIAL_GREETING}"`);
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
