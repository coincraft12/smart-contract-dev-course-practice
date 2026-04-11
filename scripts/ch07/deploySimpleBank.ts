import { ethers, network } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("=".repeat(50));
  console.log("Ch07 — SimpleBank 배포");
  console.log("=".repeat(50));
  console.log("네트워크:", network.name);
  console.log("배포자 :", deployer.address);
  console.log("잔액   :", ethers.formatEther(
    await ethers.provider.getBalance(deployer.address)
  ), "ETH");

  console.log("\n배포 중...");
  const Factory = await ethers.getContractFactory("SimpleBank");
  const bank = await Factory.deploy();
  await bank.waitForDeployment();

  const address = await bank.getAddress();
  console.log("\n✅ 배포 완료!");
  console.log("컨트랙트:", address);

  if (network.name === "sepolia") {
    console.log("Etherscan:", `https://sepolia.etherscan.io/address/${address}`);
  }

  console.log("\n초기 상태 확인:");
  console.log("  owner         :", await bank.owner());
  console.log("  paused        :", await bank.paused());
  console.log("  totalDeposited:", await bank.totalDeposited());

  console.log("\n.env에 추가:");
  console.log(`SIMPLE_BANK_ADDRESS=${address}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
