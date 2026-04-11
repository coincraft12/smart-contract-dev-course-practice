/**
 * Ch07 — SimpleBank 상호작용 스크립트
 *
 * 실행 전: .env에 SIMPLE_BANK_ADDRESS 설정 필요
 *
 * 로컬:    npx hardhat run scripts/ch07/interactSimpleBank.ts --network localhost
 * 테스트넷: npx hardhat run scripts/ch07/interactSimpleBank.ts --network baseSepolia
 */
import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const BANK_ADDR = process.env.SIMPLE_BANK_ADDRESS;
  if (!BANK_ADDR) throw new Error("SIMPLE_BANK_ADDRESS not set in .env");

  const [deployer] = await ethers.getSigners();
  const bank = await ethers.getContractAt("SimpleBank", BANK_ADDR);

  console.log("=== SimpleBank 상호작용 ===\n");
  console.log("컨트랙트:", BANK_ADDR);
  console.log("사용 계정:", deployer.address, "\n");

  // 1. 현재 상태
  console.log("[1] 현재 상태");
  console.log("  totalDeposited:", ethers.formatEther(await bank.totalDeposited()), "ETH");
  console.log("  내 잔액       :", ethers.formatEther(await bank.balanceOf(deployer.address)), "ETH");

  // 2. 예치
  const depositAmount = ethers.parseEther("0.01");
  console.log("\n[2] 예치:", ethers.formatEther(depositAmount), "ETH");
  const tx1 = await bank.deposit({ value: depositAmount });
  await tx1.wait();
  console.log("  TX:", tx1.hash);
  console.log("  내 잔액:", ethers.formatEther(await bank.balanceOf(deployer.address)), "ETH");

  // 3. 잔액 조회
  console.log("\n[3] 잔액 조회");
  console.log("  내 잔액       :", ethers.formatEther(await bank.balanceOf(deployer.address)), "ETH");
  console.log("  totalDeposited:", ethers.formatEther(await bank.totalDeposited()), "ETH");
  console.log("  contractBalance:", ethers.formatEther(await bank.contractBalance()), "ETH");

  // 4. 인출
  const withdrawAmount = ethers.parseEther("0.005");
  console.log("\n[4] 인출:", ethers.formatEther(withdrawAmount), "ETH");
  const tx2 = await bank.withdraw(withdrawAmount);
  await tx2.wait();
  console.log("  TX:", tx2.hash);
  console.log("  내 잔액:", ethers.formatEther(await bank.balanceOf(deployer.address)), "ETH");

  console.log("\n✅ 완료");
}

main().catch(console.error);
