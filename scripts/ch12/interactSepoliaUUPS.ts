/**
 * Ch12 — UUPS EnterpriseNFT Sepolia 배포 검증 스크립트 (deployer 단일 계정)
 *
 * Sepolia 는 .env 의 DEPLOYER_PRIVATE_KEY 하나로만 접속하므로 signer 가 deployer 한 명뿐.
 * 여러 계정 필요한 시나리오 (권한 없는 user 의 mint 시도 revert · minter 별도 계정) 는
 * scripts/ch12/interactUUPS.ts (로컬 전용) 를 쓰세요.
 *
 * 이 스크립트는 Sepolia 실배포 후 아래 항목을 실측:
 *   [1] 프록시·구현체 주소 + Etherscan 링크
 *   [2] 5개 역할 부트스트랩 확인 (ADMIN·MINTER·PAUSER·UPGRADER·URI_SETTER)
 *   [3] encodeTokenId
 *   [4] mint 단건 (deployer 자신에게)
 *   [5] mintBatch 표준 wrapper
 *   [6] balanceOfBatch
 *   [7] Pause → mint revert → Unpause
 *   [8] initialize 재호출 → InvalidInitialization revert (UUPS 학습 포인트 · 실제 tx 발송 안 됨)
 *   [9] version() = "1.0.0" 확인 (V2 업그레이드 대비)
 *
 * 실행 전:
 *   1) npm run deploy:ch12:sepolia 로 배포 → 나온 Proxy 주소를 .env 에
 *      PROXY_ADDRESS 로 저장
 *   2) npx hardhat run scripts/ch12/interactSepoliaUUPS.ts --network sepolia
 *
 * ⚠️  각 트랜잭션은 실제 Sepolia gas 를 소비합니다. Sepolia faucet 잔액 확인.
 */
import { ethers, upgrades, network } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const PROXY = process.env.PROXY_ADDRESS;
  if (!PROXY) throw new Error("PROXY_ADDRESS not set in .env");

  if (network.name !== "sepolia") {
    throw new Error(
      `이 스크립트는 --network sepolia 로 실행해야 합니다. 현재 network: ${network.name}\n` +
      "  npx hardhat run scripts/ch12/interactSepoliaUUPS.ts --network sepolia\n\n" +
      "로컬 노드용은 interactUUPS.ts + --network localhost 를 쓰세요."
    );
  }

  const [deployer] = await ethers.getSigners();
  const nft = await ethers.getContractAt("EnterpriseNFTV1", PROXY);
  const implAddr = await upgrades.erc1967.getImplementationAddress(PROXY);

  console.log("=== UUPS EnterpriseNFT Sepolia 배포 검증 ===\n");
  console.log("Network       :", network.name);
  console.log("Proxy         :", PROXY);
  console.log("Implementation:", implAddr);
  console.log("Deployer      :", deployer.address);
  console.log("Proxy Etherscan:", `https://sepolia.etherscan.io/address/${PROXY}`);
  console.log("Impl  Etherscan:", `https://sepolia.etherscan.io/address/${implAddr}`);

  // ─────────────────────────────────────────────
  console.log("\n[1] 프록시·구현체 관계 (UUPS 정체성)");
  console.log("  Proxy 주소는 영구불변 · Implementation 은 업그레이드로 교체됨");
  console.log("  사용자·프론트엔드는 Proxy 주소 하나만 알면 되고, 뒤 로직은 뒤에서 진화");

  // ─────────────────────────────────────────────
  console.log("\n[2] 5개 역할 부트스트랩 확인");
  const ADMIN_ROLE    = await nft.DEFAULT_ADMIN_ROLE();
  const MINTER_ROLE   = await nft.MINTER_ROLE();
  const PAUSER_ROLE   = await nft.PAUSER_ROLE();
  const UPGRADER_ROLE = await nft.UPGRADER_ROLE();
  const URI_ROLE      = await nft.URI_SETTER_ROLE();
  console.log("  Deployer 5개 역할:");
  console.log("    ADMIN    :", await nft.hasRole(ADMIN_ROLE,    deployer.address));
  console.log("    MINTER   :", await nft.hasRole(MINTER_ROLE,   deployer.address));
  console.log("    PAUSER   :", await nft.hasRole(PAUSER_ROLE,   deployer.address));
  console.log("    UPGRADER :", await nft.hasRole(UPGRADER_ROLE, deployer.address));
  console.log("    URI      :", await nft.hasRole(URI_ROLE,      deployer.address));

  // ─────────────────────────────────────────────
  console.log("\n[3] encodeTokenId — productCode(1) + eventCode(42) → tokenId");
  const idSword  = await nft.encodeTokenId(1, 42);
  const idShield = await nft.encodeTokenId(1, 43);
  const idPotion = await nft.encodeTokenId(2, 42);
  console.log("  검(1,42)    :", idSword.toString());
  console.log("  방패(1,43)  :", idShield.toString());
  console.log("  포션(2,42)  :", idPotion.toString());

  // ─────────────────────────────────────────────
  console.log("\n[4] mint 단건 — Deployer 자신에게 검 1개");
  const tx1 = await nft.mint(deployer.address, idSword, 1, "0x");
  const r1  = await tx1.wait();
  console.log("  tx hash    :", r1?.hash);
  console.log("  gas used   :", r1?.gasUsed.toString());
  console.log("  Etherscan  :", `https://sepolia.etherscan.io/tx/${r1?.hash}`);
  console.log("  Deployer 검:", (await nft.balanceOf(deployer.address, idSword)).toString());

  // ─────────────────────────────────────────────
  console.log("\n[5] mintBatch 표준 wrapper — Deployer 에게 검·방패·포션 세트");
  const tx2 = await nft["mintBatch(address,uint256[],uint256[],bytes)"](
    deployer.address,
    [idSword, idShield, idPotion],
    [5, 3, 10],
    "0x"
  );
  const r2 = await tx2.wait();
  console.log("  tx hash    :", r2?.hash);
  console.log("  gas used   :", r2?.gasUsed.toString());
  console.log("  Deployer 검   :", (await nft.balanceOf(deployer.address, idSword)).toString(),  "(누적 · 이전 1 + 이번 5)");
  console.log("  Deployer 방패 :", (await nft.balanceOf(deployer.address, idShield)).toString());
  console.log("  Deployer 포션 :", (await nft.balanceOf(deployer.address, idPotion)).toString());

  // ─────────────────────────────────────────────
  console.log("\n[6] balanceOfBatch — Deployer 여러 tokenId 동시 조회");
  const bals = await nft.balanceOfBatch(
    [deployer.address, deployer.address, deployer.address],
    [idSword,          idShield,         idPotion]
  );
  console.log("  Deployer 검   :", bals[0].toString());
  console.log("  Deployer 방패 :", bals[1].toString());
  console.log("  Deployer 포션 :", bals[2].toString());

  // ─────────────────────────────────────────────
  console.log("\n[7] Pause 중 mint → EnforcedPause revert → Unpause 후 성공");
  await (await nft.pause()).wait();
  console.log("  paused    :", await nft.paused());
  try {
    await nft.mint(deployer.address, idSword, 1, "0x");
    console.log("  ⚠️ 예상과 달리 mint 성공");
  } catch (e: any) {
    console.log("  mint 시도 : EnforcedPause revert (예상대로)");
    console.log("  error     :", e.shortMessage ?? e.message?.split("\n")[0]);
  }
  await (await nft.unpause()).wait();
  console.log("  paused    :", await nft.paused());

  // ─────────────────────────────────────────────
  console.log("\n[8] initialize 재호출 → InvalidInitialization revert (UUPS 학습 포인트)");
  console.log("  ℹ️  estimateGas 단계에서 revert 감지되어 실제 tx 는 발송되지 않음 · gas 소비 없음");
  try {
    await nft.initialize(deployer.address, "https://re-init.example/{id}.json");
    console.log("  ⚠️ 예상과 달리 재초기화 성공 (심각한 취약점)");
  } catch (e: any) {
    console.log("  revert 관찰됨 :", e.shortMessage ?? e.message?.split("\n")[0]);
    console.log("  (InvalidInitialization — initializer modifier 가 재호출 차단)");
  }

  // ─────────────────────────────────────────────
  console.log("\n[9] version() = \"1.0.0\" 확인");
  console.log("  version   :", await nft.version());
  console.log("  (Part III 에서 V2 로 업그레이드 후 \"2.0.0\" 로 바뀜)");

  console.log("\n✅ 완료 · Sepolia 실배포 검증 완료. 컨트랙트 상태 최종 확인:");
  console.log("  ", `https://sepolia.etherscan.io/address/${PROXY}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
