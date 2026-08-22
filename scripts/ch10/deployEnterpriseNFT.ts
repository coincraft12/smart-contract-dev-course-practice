import { ethers } from "hardhat";

/**
 * Ch10 실습 — EnterpriseNFT (비-업그레이더블 3-상속 · ERC1155 + AccessControl + Pausable) 배포
 *
 * 사용:
 *   npx hardhat run scripts/ch10/deployEnterpriseNFT.ts --network localhost
 *   npx hardhat run scripts/ch10/deployEnterpriseNFT.ts --network sepolia
 *
 * Sepolia 배포 후 검증:
 *   npx hardhat verify --network sepolia <배포주소> "https://api.example.com/token/{id}.json"
 *
 * Ch12 UUPS 업그레이더블 배포는 별도 (`scripts/ch12/deployProxy.ts`).
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const uri = "https://api.example.com/token/{id}.json";

  console.log("Deployer:", deployer.address);
  console.log("Base URI:", uri);

  const Factory = await ethers.getContractFactory("EnterpriseNFT");
  const nft = await Factory.deploy(uri);
  await nft.waitForDeployment();

  const addr = await nft.getAddress();
  console.log("EnterpriseNFT deployed to:", addr);

  // 초기 4 역할 (DEFAULT_ADMIN · MINTER · PAUSER · URI_SETTER) 은 constructor 에서 deployer 에게 부여됨
  console.log("Initial roles granted to deployer:");
  console.log("  - DEFAULT_ADMIN_ROLE");
  console.log("  - MINTER_ROLE");
  console.log("  - PAUSER_ROLE");
  console.log("  - URI_SETTER_ROLE");
  console.log("");
  console.log("운영 단계 원칙: DEFAULT_ADMIN 을 멀티시그로 이관 후 deployer renounceRole.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
