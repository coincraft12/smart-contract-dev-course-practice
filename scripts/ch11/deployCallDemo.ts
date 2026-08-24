import { ethers } from "hardhat";

/**
 * Ch11 실습 ① — CallDemo (B + A) 배포
 *
 * 사용:
 *   npx hardhat run scripts/ch11/deployCallDemo.ts --network localhost
 *
 * 절차:
 *   1) 별도 터미널에서 로컬 노드 실행: npx hardhat node
 *   2) 이 스크립트로 두 컨트랙트 배포 → 주소 출력
 *   3) .env 에 B_ADDRESS, A_ADDRESS 저장
 *   4) interactCallDemo.ts 로 call vs delegatecall 을 눈으로 확인
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer :", deployer.address);

  const B = await ethers.getContractFactory("BContract");
  const b = await B.deploy();
  await b.waitForDeployment();
  const bAddr = await b.getAddress();
  console.log("B        :", bAddr);

  const A = await ethers.getContractFactory("AContract");
  const a = await A.deploy(bAddr);
  await a.waitForDeployment();
  const aAddr = await a.getAddress();
  console.log("A        :", aAddr);

  console.log("");
  console.log(".env 에 다음 두 줄을 추가하세요:");
  console.log(`  B_ADDRESS=${bAddr}`);
  console.log(`  A_ADDRESS=${aAddr}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
