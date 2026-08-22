/**
 * Ch10 — EnterpriseNFT Sepolia 배포 검증 스크립트 (deployer 단일 계정)
 *
 * Sepolia 는 .env 의 PRIVATE_KEY 하나로만 접속하므로 signer 가 deployer 한 명뿐.
 * 여러 계정 필요한 시나리오 (transferFrom · 다품종 커스텀 오버로드) 는
 * scripts/ch10/interactEnterpriseNFT.ts (로컬 전용) 를 쓰세요.
 *
 * 이 스크립트는 Sepolia 실배포 후 아래 4가지만 실측:
 *   [1] 컨트랙트 정보 (URI · 4역할 부트스트랩 상태)
 *   [2] encodeTokenId — productCode + eventCode → tokenId
 *   [3] mint 단건 (deployer 자신에게)
 *   [4] mintBatch 표준 wrapper (deployer 에게 여러 종류)
 *   [5] mintBatch 커스텀 오버로드 (deployer 자신에게 다른 tokenId 반복 · 오버로드 시그니처 검증)
 *   [6] balanceOfBatch
 *   [7] setURI (URI_SETTER_ROLE 실측)
 *   [8] Pause → mint 시도 실패 확인 → Unpause
 *
 * 실행 전:
 *   1) npm run deploy:ch10:sepolia 로 배포 → 나온 주소를 .env 에
 *      ENTERPRISE_NFT_ADDRESS 로 저장
 *   2) npx hardhat run scripts/ch10/interactSepoliaEnterpriseNFT.ts --network sepolia
 *
 * ⚠️  각 트랜잭션은 실제 Sepolia gas 를 소비합니다. Sepolia faucet 잔액 확인.
 */
import { ethers, network } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const ADDR = process.env.ENTERPRISE_NFT_ADDRESS;
  if (!ADDR) throw new Error("ENTERPRISE_NFT_ADDRESS not set in .env");

  if (network.name !== "sepolia") {
    throw new Error(
      `이 스크립트는 --network sepolia 로 실행해야 합니다. 현재 network: ${network.name}\n` +
      "  npx hardhat run scripts/ch10/interactSepoliaEnterpriseNFT.ts --network sepolia\n\n" +
      "로컬 노드용은 interactEnterpriseNFT.ts + --network localhost 를 쓰세요."
    );
  }

  const [deployer] = await ethers.getSigners();
  const nft = await ethers.getContractAt("EnterpriseNFT", ADDR);

  console.log("=== EnterpriseNFT Sepolia 배포 검증 ===\n");
  console.log("Network  :", network.name);
  console.log("Contract :", ADDR);
  console.log("Deployer :", deployer.address);
  console.log("Etherscan:", `https://sepolia.etherscan.io/address/${ADDR}`);

  // ─────────────────────────────────────────────
  console.log("\n[1] 컨트랙트 정보");
  console.log("  URI     :", await nft.uri(0));
  const ADMIN_ROLE  = await nft.DEFAULT_ADMIN_ROLE();
  const MINTER_ROLE = await nft.MINTER_ROLE();
  const PAUSER_ROLE = await nft.PAUSER_ROLE();
  const URI_ROLE    = await nft.URI_SETTER_ROLE();
  console.log("  Deployer 역할 4개 부트스트랩 확인:");
  console.log("    ADMIN  :", await nft.hasRole(ADMIN_ROLE,  deployer.address));
  console.log("    MINTER :", await nft.hasRole(MINTER_ROLE, deployer.address));
  console.log("    PAUSER :", await nft.hasRole(PAUSER_ROLE, deployer.address));
  console.log("    URI    :", await nft.hasRole(URI_ROLE,    deployer.address));

  // ─────────────────────────────────────────────
  console.log("\n[2] encodeTokenId — 상품 코드 + 이벤트 코드 → tokenId");
  const idSword  = await nft.encodeTokenId(1, 1);
  const idShield = await nft.encodeTokenId(1, 2);
  const idPotion = await nft.encodeTokenId(2, 1);
  const idBadge  = await nft.encodeTokenId(9, 100);
  console.log("  검(1,1)   tokenId :", idSword.toString());
  console.log("  방패(1,2) tokenId :", idShield.toString());
  console.log("  포션(2,1) tokenId :", idPotion.toString());
  console.log("  배지(9,100) tokenId:", idBadge.toString());

  // ─────────────────────────────────────────────
  console.log("\n[3] mint 단건 — Deployer 자신에게 검 1개");
  const tx1 = await nft.mint(deployer.address, idSword, 1, "0x");
  const r1  = await tx1.wait();
  console.log("  tx hash    :", r1?.hash);
  console.log("  gas used   :", r1?.gasUsed.toString());
  console.log("  Etherscan  :", `https://sepolia.etherscan.io/tx/${r1?.hash}`);
  console.log("  Deployer 검:", (await nft.balanceOf(deployer.address, idSword)).toString());

  // ─────────────────────────────────────────────
  console.log("\n[4] mintBatch 표준 wrapper — Deployer 에게 검·방패·포션 세트");
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
  console.log("\n[5] mintBatch 커스텀 오버로드 — Deployer 3반복 (오버로드 시그니처 검증용)");
  console.log("  ℹ️  실무에서는 여러 명 주소가 들어가지만, Sepolia 단일 signer 환경이므로");
  console.log("      같은 주소를 3번 반복해 오버로드 자체의 동작만 확인.");
  const tx3 = await nft["mintBatch(address[],uint256[],uint256[])"](
    [deployer.address, deployer.address, deployer.address],
    [idSword, idShield, idPotion],
    [10, 10, 10]
  );
  const r3 = await tx3.wait();
  console.log("  tx hash    :", r3?.hash);
  console.log("  gas used   :", r3?.gasUsed.toString());
  console.log("  Deployer 검   :", (await nft.balanceOf(deployer.address, idSword)).toString());
  console.log("  Deployer 방패 :", (await nft.balanceOf(deployer.address, idShield)).toString());
  console.log("  Deployer 포션 :", (await nft.balanceOf(deployer.address, idPotion)).toString());

  // ─────────────────────────────────────────────
  console.log("\n[6] balanceOfBatch — Deployer 여러 tokenId 동시 조회");
  const bals = await nft.balanceOfBatch(
    [deployer.address, deployer.address, deployer.address, deployer.address],
    [idSword,          idShield,         idPotion,         idBadge]
  );
  console.log("  Deployer 검   :", bals[0].toString());
  console.log("  Deployer 방패 :", bals[1].toString());
  console.log("  Deployer 포션 :", bals[2].toString());
  console.log("  Deployer 배지 :", bals[3].toString(), "(발행 안 함 · 0)");

  // ─────────────────────────────────────────────
  console.log("\n[7] setURI — URI_SETTER_ROLE 실측 (URI 갱신)");
  const oldUri = await nft.uri(0);
  const newUri = "https://api.example.com/token-v2/{id}.json";
  const tx4 = await nft.setURI(newUri);
  const r4 = await tx4.wait();
  console.log("  tx hash    :", r4?.hash);
  console.log("  gas used   :", r4?.gasUsed.toString());
  console.log("  이전 URI  :", oldUri);
  console.log("  현재 URI  :", await nft.uri(0));
  // 원상복구 (다음 실행 재현성)
  await (await nft.setURI(oldUri)).wait();
  console.log("  원복 URI  :", await nft.uri(0));

  // ─────────────────────────────────────────────
  console.log("\n[8] Pause → mint 시도 실패 확인 → Unpause");
  await (await nft.pause()).wait();
  console.log("  paused     :", await nft.paused());
  try {
    await nft.mint(deployer.address, idSword, 1, "0x");
    console.log("  ⚠️ 예상과 달리 mint 성공했음 (버그)");
  } catch (e: any) {
    console.log("  mint 시도  : EnforcedPause revert (예상대로)");
    console.log("  error      :", e.shortMessage ?? e.message?.split("\n")[0]);
  }
  await (await nft.unpause()).wait();
  console.log("  paused     :", await nft.paused());

  console.log("\n✅ 완료 · 컨트랙트 상태는 Etherscan 에서 최종 확인:");
  console.log("  ", `https://sepolia.etherscan.io/address/${ADDR}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
