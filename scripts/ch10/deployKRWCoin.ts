import { ethers, network } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("=".repeat(50));
  console.log("Ch10 — KRWCoin 배포");
  console.log("=".repeat(50));
  console.log("네트워크:", network.name);
  console.log("배포자 :", deployer.address);
  console.log("잔액   :", ethers.formatEther(
    await ethers.provider.getBalance(deployer.address)
  ), "ETH");

  // Mint Cap: 10억 KRWC (decimals=2이므로 * 100)
  const MINT_CAP = ethers.parseUnits("1000000000", 2);

  console.log("\n배포 중...");
  const Factory = await ethers.getContractFactory("KRWCoin");
  const krwc = await Factory.deploy(MINT_CAP);
  await krwc.waitForDeployment();

  const address = await krwc.getAddress();
  console.log("\n✅ 배포 완료!");
  console.log("컨트랙트:", address);

  if (network.name === "baseSepolia") {
    console.log("Basescan :", `https://sepolia.basescan.org/address/${address}`);
  }

  console.log("\n토큰 정보:");
  console.log("  이름    :", await krwc.name());
  console.log("  심볼    :", await krwc.symbol());
  console.log("  Decimals:", await krwc.decimals());
  console.log("  MintCap :", ethers.formatUnits(await krwc.mintCap(), 2), "KRWC");

  console.log("\n.env에 추가:");
  console.log(`KRWCOIN_ADDRESS=${address}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
