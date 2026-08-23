import { ethers } from "hardhat";

/**
 * Ch11 실습 ① — CallDemo (Callee + Caller) 배포
 *
 * 사용:
 *   npx hardhat run scripts/ch11/deployCallDemo.ts --network localhost
 *
 * 절차:
 *   1) 별도 터미널에서 로컬 노드 실행: npx hardhat node
 *   2) 이 스크립트로 두 컨트랙트 배포 → 주소 출력
 *   3) .env 에 CALLEE_ADDRESS, CALLER_ADDRESS 저장
 *   4) interactCallDemo.ts 로 call vs delegatecall 을 눈으로 확인
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer :", deployer.address);

  const Callee = await ethers.getContractFactory("Callee");
  const callee = await Callee.deploy();
  await callee.waitForDeployment();
  const calleeAddr = await callee.getAddress();
  console.log("Callee   :", calleeAddr);

  const Caller = await ethers.getContractFactory("Caller");
  const caller = await Caller.deploy(calleeAddr);
  await caller.waitForDeployment();
  const callerAddr = await caller.getAddress();
  console.log("Caller   :", callerAddr);

  console.log("");
  console.log(".env 에 다음 두 줄을 추가하세요:");
  console.log(`  CALLEE_ADDRESS=${calleeAddr}`);
  console.log(`  CALLER_ADDRESS=${callerAddr}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
