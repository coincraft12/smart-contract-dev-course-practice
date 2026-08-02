import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const Factory = await ethers.getContractFactory("MyERC20");
  const token = await Factory.deploy("MyToken", "MTK", 18);
  await token.waitForDeployment();

  const addr = await token.getAddress();
  console.log("MyERC20 deployed to:", addr);

  const initial = 1_000_000n * 10n ** 18n;
  await (await token.mint(deployer.address, initial)).wait();
  console.log(`Minted ${initial} to ${deployer.address}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
