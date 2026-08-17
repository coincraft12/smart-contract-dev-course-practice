import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const baseURI = "https://ipfs.io/ipfs/YOUR_CID/";

  const Factory = await ethers.getContractFactory("MyNFT");
  const nft = await Factory.deploy("MyNFT", "MNFT", baseURI);
  await nft.waitForDeployment();

  const addr = await nft.getAddress();
  console.log("MyNFT deployed to:", addr);

  // 3 tokens
  for (let i = 0; i < 3; i++) {
    const tx = await nft.mint(deployer.address);
    const receipt = await tx.wait();
    console.log(`Minted tokenId ${i + 1} — tx ${receipt?.hash}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
