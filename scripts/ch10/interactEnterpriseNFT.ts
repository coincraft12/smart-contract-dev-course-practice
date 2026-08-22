/**
 * Ch10 — EnterpriseNFT 상호작용 스크립트
 *
 * 실습 흐름:
 *   [1] 컨트랙트 정보 (URI · 4역할 부트스트랩 상태)
 *   [2] encodeTokenId — productCode + eventCode → tokenId
 *   [3] mint 단건 — Alice 에게 검(id1) 1개
 *   [4] mintBatch 표준 wrapper — Alice 한 명에게 검·방패·포션 세트
 *   [5] mintBatch 커스텀 오버로드 (다품종) — Alice 검, Bob 방패, Carol 포션
 *   [6] mintBatch 커스텀 오버로드 (일괄) — Alice·Bob·Carol 모두에게 같은 배지
 *   [7] balanceOfBatch — 여러 (계정, tokenId) 쌍 동시 조회
 *   [8] safeBatchTransferFrom — Alice → Bob 여러 종류 원자적 이동
 *   [9] Pause → mint 시도 실패 확인 → Unpause
 *
 * 실행 전:
 *   1) 로컬 노드 별도 터미널: npx hardhat node
 *   2) 배포: npm run deploy:ch10:local
 *   3) 아래 ENTERPRISE_NFT_ADDRESS 환경변수를 .env 에 배포 주소로 설정
 *   4) 실행: npx hardhat run scripts/ch10/interactEnterpriseNFT.ts --network localhost
 */
import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const ADDR = process.env.ENTERPRISE_NFT_ADDRESS;
  if (!ADDR) throw new Error("ENTERPRISE_NFT_ADDRESS not set in .env");

  const signers = await ethers.getSigners();
  if (signers.length < 4) {
    throw new Error(
      `이 스크립트는 4개 계정(deployer/alice/bob/carol)이 필요합니다. 현재 ${signers.length}개 감지.\n` +
      "로컬 hardhat node 에서만 실행하세요:\n" +
      "  1) 별도 터미널: npx hardhat node\n" +
      "  2) npm run deploy:ch10:local  → .env 에 ENTERPRISE_NFT_ADDRESS 저장\n" +
      "  3) npx hardhat run scripts/ch10/interactEnterpriseNFT.ts --network localhost\n\n" +
      "Sepolia 배포 확인용은 interactSepoliaEnterpriseNFT.ts 를 쓰세요."
    );
  }
  const [deployer, alice, bob, carol] = signers;
  const nft = await ethers.getContractAt("EnterpriseNFT", ADDR);

  console.log("=== EnterpriseNFT 상호작용 ===\n");
  console.log("Contract :", ADDR);
  console.log("Deployer :", deployer.address);
  console.log("Alice    :", alice.address);
  console.log("Bob      :", bob.address);
  console.log("Carol    :", carol.address);

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
  const idSword  = await nft.encodeTokenId(1, 1);   // 상품1·이벤트1
  const idShield = await nft.encodeTokenId(1, 2);   // 상품1·이벤트2
  const idPotion = await nft.encodeTokenId(2, 1);   // 상품2·이벤트1
  const idBadge  = await nft.encodeTokenId(9, 100); // 상품9·이벤트100
  console.log("  검(1,1)   tokenId :", idSword.toString());
  console.log("  방패(1,2) tokenId :", idShield.toString());
  console.log("  포션(2,1) tokenId :", idPotion.toString());
  console.log("  배지(9,100) tokenId:", idBadge.toString());

  // ─────────────────────────────────────────────
  console.log("\n[3] mint 단건 — Alice 에게 검 1개");
  const tx1 = await nft.mint(alice.address, idSword, 1, "0x");
  const r1  = await tx1.wait();
  console.log("  tx hash    :", r1?.hash);
  console.log("  gas used   :", r1?.gasUsed.toString());
  console.log("  Alice 검   :", (await nft.balanceOf(alice.address, idSword)).toString());

  // ─────────────────────────────────────────────
  console.log("\n[4] mintBatch 표준 wrapper — Alice 한 명에게 검·방패·포션 세트");
  const tx2 = await nft["mintBatch(address,uint256[],uint256[],bytes)"](
    alice.address,
    [idSword, idShield, idPotion],
    [5, 3, 10],
    "0x"
  );
  const r2 = await tx2.wait();
  console.log("  tx hash    :", r2?.hash);
  console.log("  gas used   :", r2?.gasUsed.toString());
  console.log("  Alice 검   :", (await nft.balanceOf(alice.address, idSword)).toString(),  "(누적 · 이전 1 + 이번 5)");
  console.log("  Alice 방패 :", (await nft.balanceOf(alice.address, idShield)).toString());
  console.log("  Alice 포션 :", (await nft.balanceOf(alice.address, idPotion)).toString());

  // ─────────────────────────────────────────────
  console.log("\n[5] mintBatch 커스텀 오버로드 (다품종) — Alice 검, Bob 방패, Carol 포션");
  const tx3 = await nft["mintBatch(address[],uint256[],uint256[])"](
    [alice.address, bob.address, carol.address],
    [idSword, idShield, idPotion],
    [10, 10, 10]
  );
  const r3 = await tx3.wait();
  console.log("  tx hash    :", r3?.hash);
  console.log("  gas used   :", r3?.gasUsed.toString());
  console.log("  Alice 검   :", (await nft.balanceOf(alice.address, idSword)).toString());
  console.log("  Bob   방패 :", (await nft.balanceOf(bob.address,   idShield)).toString());
  console.log("  Carol 포션 :", (await nft.balanceOf(carol.address, idPotion)).toString());

  // ─────────────────────────────────────────────
  console.log("\n[6] mintBatch 커스텀 오버로드 (일괄) — Alice·Bob·Carol 모두에게 같은 배지");
  const tx4 = await nft["mintBatch(address[],uint256[],uint256[])"](
    [alice.address, bob.address, carol.address],
    [idBadge, idBadge, idBadge],
    [1, 1, 1]
  );
  const r4 = await tx4.wait();
  console.log("  tx hash    :", r4?.hash);
  console.log("  gas used   :", r4?.gasUsed.toString());
  console.log("  Alice 배지 :", (await nft.balanceOf(alice.address, idBadge)).toString());
  console.log("  Bob   배지 :", (await nft.balanceOf(bob.address,   idBadge)).toString());
  console.log("  Carol 배지 :", (await nft.balanceOf(carol.address, idBadge)).toString());

  // ─────────────────────────────────────────────
  console.log("\n[7] balanceOfBatch — 여러 (계정, tokenId) 쌍 동시 조회");
  const bals = await nft.balanceOfBatch(
    [alice.address, bob.address, carol.address, alice.address],
    [idSword,       idShield,    idPotion,      idBadge]
  );
  console.log("  Alice 검   :", bals[0].toString());
  console.log("  Bob   방패 :", bals[1].toString());
  console.log("  Carol 포션 :", bals[2].toString());
  console.log("  Alice 배지 :", bals[3].toString());

  // ─────────────────────────────────────────────
  console.log("\n[8] safeBatchTransferFrom — Alice → Bob 원자적 배치 전송");
  const tx5 = await nft.connect(alice).safeBatchTransferFrom(
    alice.address, bob.address,
    [idSword, idShield, idPotion],
    [2, 1, 3],
    "0x"
  );
  const r5 = await tx5.wait();
  console.log("  tx hash    :", r5?.hash);
  console.log("  gas used   :", r5?.gasUsed.toString());
  console.log("  Alice 검   :", (await nft.balanceOf(alice.address, idSword)).toString());
  console.log("  Bob   검   :", (await nft.balanceOf(bob.address,   idSword)).toString());
  console.log("  Alice 방패 :", (await nft.balanceOf(alice.address, idShield)).toString());
  console.log("  Bob   방패 :", (await nft.balanceOf(bob.address,   idShield)).toString());
  console.log("  Alice 포션 :", (await nft.balanceOf(alice.address, idPotion)).toString());
  console.log("  Bob   포션 :", (await nft.balanceOf(bob.address,   idPotion)).toString());

  // ─────────────────────────────────────────────
  console.log("\n[9] Pause → mint 시도 실패 확인 → Unpause");
  await (await nft.pause()).wait();
  console.log("  paused     :", await nft.paused());
  try {
    await nft.mint(alice.address, idSword, 1, "0x");
    console.log("  ⚠️ 예상과 달리 mint 성공했음 (버그)");
  } catch (e: any) {
    console.log("  mint 시도  : EnforcedPause revert (예상대로)");
    console.log("  error      :", e.shortMessage ?? e.message?.split("\n")[0]);
  }
  await (await nft.unpause()).wait();
  console.log("  paused     :", await nft.paused());

  console.log("\n✅ 완료");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
