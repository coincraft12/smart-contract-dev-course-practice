import { ethers, upgrades } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const Factory = await ethers.getContractFactory("EnterpriseNFTV1");
  const initialUri = "https://api.example.com/token/{id}.json";

  console.log("Deploying UUPS proxy...");
  const proxy = await upgrades.deployProxy(
    Factory,
    [deployer.address, initialUri],
    { kind: "uups", initializer: "initialize" }
  );
  await proxy.waitForDeployment();

  const proxyAddr = await proxy.getAddress();
  const implAddr = await upgrades.erc1967.getImplementationAddress(proxyAddr);

  console.log("Proxy address:         ", proxyAddr);
  console.log("Implementation address:", implAddr);
  console.log("Version:               ", await (proxy as any).version());
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
