import { ethers } from "hardhat";

/**
 * Ch11 실습 ② — SlotCollision (LogicWithStorage + BrokenProxy + SafeProxy) 배포
 *
 * 사용:
 *   npx hardhat run scripts/ch11/deploySlotCollision.ts --network localhost
 *
 * 절차:
 *   1) 로컬 노드 실행: npx hardhat node
 *   2) 이 스크립트로 세 컨트랙트 배포
 *   3) .env 에 LOGIC_ADDRESS · BROKEN_PROXY_ADDRESS · SAFE_PROXY_ADDRESS 저장
 *   4) interactSlotCollision.ts 로 프록시가 죽는 순간을 눈으로 확인
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer :", deployer.address);

  const Logic = await ethers.getContractFactory("LogicWithStorage");
  const logic = await Logic.deploy();
  await logic.waitForDeployment();
  const logicAddr = await logic.getAddress();
  console.log("Logic       :", logicAddr);

  const Broken = await ethers.getContractFactory("BrokenProxy");
  const broken = await Broken.deploy(logicAddr);
  await broken.waitForDeployment();
  const brokenAddr = await broken.getAddress();
  console.log("BrokenProxy :", brokenAddr);

  const Safe = await ethers.getContractFactory("SafeProxy");
  const safe = await Safe.deploy(logicAddr);
  await safe.waitForDeployment();
  const safeAddr = await safe.getAddress();
  console.log("SafeProxy   :", safeAddr);

  console.log("");
  console.log(".env 에 다음 세 줄을 추가하세요:");
  console.log(`  LOGIC_ADDRESS=${logicAddr}`);
  console.log(`  BROKEN_PROXY_ADDRESS=${brokenAddr}`);
  console.log(`  SAFE_PROXY_ADDRESS=${safeAddr}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
