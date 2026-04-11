/**
 * Ch10 — KRWCoin 상호작용 스크립트
 * transfer / approve / transferFrom / burn 전체 흐름 실습
 *
 * 실행 전: .env에 KRWCOIN_ADDRESS 설정 필요
 */
import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

const fmt = (v: bigint) => ethers.formatUnits(v, 2);

async function main() {
  const ADDR = process.env.KRWCOIN_ADDRESS;
  if (!ADDR) throw new Error("KRWCOIN_ADDRESS not set in .env");

  const [deployer, alice] = await ethers.getSigners();
  const krwc = await ethers.getContractAt("KRWCoin", ADDR);

  console.log("=== KRWCoin 상호작용 ===\n");

  // 1. 토큰 정보
  console.log("[1] 토큰 정보");
  console.log("  이름   :", await krwc.name());
  console.log("  심볼   :", await krwc.symbol());
  console.log("  발행량 :", fmt(await krwc.totalSupply()), "KRWC");

  // 2. Mint
  console.log("\n[2] Mint — Alice에게 10,000 KRWC");
  const tx1 = await krwc.mint(alice.address, 1_000_000); // 10,000.00
  await tx1.wait();
  console.log("  Alice 잔액:", fmt(await krwc.balanceOf(alice.address)), "KRWC");
  console.log("  총 발행량 :", fmt(await krwc.totalSupply()), "KRWC");

  // 3. Transfer
  console.log("\n[3] Transfer — Alice → Deployer 1,000 KRWC");
  const tx2 = await krwc.connect(alice).transfer(deployer.address, 100_000);
  await tx2.wait();
  console.log("  Alice 잔액  :", fmt(await krwc.balanceOf(alice.address)), "KRWC");
  console.log("  Deployer 잔액:", fmt(await krwc.balanceOf(deployer.address)), "KRWC");

  // 4. Approve + TransferFrom
  console.log("\n[4] Approve — Alice가 Deployer에게 2,000 KRWC 허용");
  const tx3 = await krwc.connect(alice).approve(deployer.address, 200_000);
  await tx3.wait();
  console.log("  Allowance:", fmt(await krwc.allowance(alice.address, deployer.address)), "KRWC");

  console.log("\n[5] TransferFrom — Deployer가 Alice→Deployer로 500 KRWC 이동");
  const tx4 = await krwc.transferFrom(alice.address, deployer.address, 50_000);
  await tx4.wait();
  console.log("  Alice 잔액  :", fmt(await krwc.balanceOf(alice.address)), "KRWC");
  console.log("  남은 Allowance:", fmt(await krwc.allowance(alice.address, deployer.address)), "KRWC");

  // 5. Burn
  console.log("\n[6] Burn — Alice 500 KRWC 소각");
  const tx5 = await krwc.connect(alice).burn(50_000);
  await tx5.wait();
  console.log("  Alice 잔액 :", fmt(await krwc.balanceOf(alice.address)), "KRWC");
  console.log("  총 발행량  :", fmt(await krwc.totalSupply()), "KRWC");

  console.log("\n✅ 완료");
}

main().catch(console.error);
