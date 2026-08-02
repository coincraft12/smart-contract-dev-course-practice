import { ethers, network } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("=".repeat(50));
  console.log("Ch04 — SimpleStorage 배포");
  console.log("=".repeat(50));
  console.log("네트워크:", network.name);
  console.log("배포자 :", deployer.address);
  console.log("잔액   :", ethers.formatEther(
    await ethers.provider.getBalance(deployer.address)
  ), "ETH");

  console.log("\n배포 중...");
  const Factory = await ethers.getContractFactory("SimpleStorage");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("\n✅ 배포 완료!");
  console.log("컨트랙트:", address);

  if (network.name === "sepolia") {
    console.log("Etherscan:", `https://sepolia.etherscan.io/address/${address}`);
  }

  console.log("\n초기 상태 확인:");
  console.log("  storedNumber:", await contract.retrieve());
  console.log("  updateCount :", await contract.updateCount());

  console.log("\n.env에 추가:");
  console.log(`SIMPLE_STORAGE_ADDRESS=${address}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
