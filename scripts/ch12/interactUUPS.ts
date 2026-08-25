/**
 * Ch12 — UUPS EnterpriseNFT 상호작용 스크립트
 *
 * 실습 흐름 (강의자료 §12-8 실습 파트 대응):
 *   [1] 프록시·구현체 주소 표시 (UUPS 정체성)
 *   [2] 5개 역할 부트스트랩 확인 (ADMIN·MINTER·PAUSER·UPGRADER·URI_SETTER)
 *   [3] encodeTokenId — productCode + eventCode → tokenId
 *   [4] user (MINTER_ROLE 없음) mint 시도 → AccessControl revert
 *   [5] minter mint 성공 → balanceOf 확인
 *   [6] mintBatch 표준 wrapper — Alice 한 명에게 검·방패·포션 세트
 *   [7] Pause 중 mint 시도 → EnforcedPause revert → Unpause 후 성공
 *   [8] initialize 재호출 → InvalidInitialization revert (UUPS 학습 포인트)
 *   [9] version() = "1.0.0" 확인
 *
 * 실행 전:
 *   1) 별도 터미널: npx hardhat node
 *   2) npm run deploy:ch12:local  → 콘솔에 출력된 Proxy address 를 .env 에 PROXY_ADDRESS 로 저장
 *   3) npm run interact:ch12:local
 */
import { ethers, upgrades } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const PROXY = process.env.PROXY_ADDRESS;
  if (!PROXY) throw new Error("PROXY_ADDRESS not set in .env");

  const signers = await ethers.getSigners();
  if (signers.length < 3) {
    throw new Error(
      `이 스크립트는 3개 계정(deployer/minter/user)이 필요합니다. 현재 ${signers.length}개.\n` +
      "로컬 hardhat node 에서만 실행하세요:\n" +
      "  1) 별도 터미널: npx hardhat node\n" +
      "  2) npm run deploy:ch12:local  → .env 에 PROXY_ADDRESS 저장\n" +
      "  3) npm run interact:ch12:local"
    );
  }
  const [deployer, minter, user] = signers;

  const nft = await ethers.getContractAt("EnterpriseNFTV1", PROXY);
  const implAddr = await upgrades.erc1967.getImplementationAddress(PROXY);

  console.log("=== UUPS EnterpriseNFT 상호작용 ===\n");
  console.log("Proxy       :", PROXY);
  console.log("Implementation:", implAddr);
  console.log("Deployer    :", deployer.address);
  console.log("Minter (별도):", minter.address);
  console.log("User        :", user.address);

  // ─────────────────────────────────────────────
  console.log("\n[1] 프록시·구현체 관계 (UUPS 정체성)");
  console.log("  Proxy 주소는 영구불변 · Implementation 은 업그레이드로 교체 가능");
  console.log("  Proxy 에 대고 호출하지만, 실제 로직은 Implementation 코드에서 delegatecall 실행");

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
  console.log("  User (권한 없음):");
  console.log("    MINTER   :", await nft.hasRole(MINTER_ROLE, user.address));

  // Minter 별도 계정에 MINTER_ROLE 부여 (권한 위임 실습)
  await (await nft.grantRole(MINTER_ROLE, minter.address)).wait();
  console.log("  → grantRole(MINTER, minter) 실행");
  console.log("    Minter MINTER :", await nft.hasRole(MINTER_ROLE, minter.address));

  // ─────────────────────────────────────────────
  console.log("\n[3] encodeTokenId — productCode(1) + eventCode(42) → tokenId");
  const idSword  = await nft.encodeTokenId(1, 42);   // 상품1·이벤트42
  const idShield = await nft.encodeTokenId(1, 43);
  const idPotion = await nft.encodeTokenId(2, 42);
  console.log("  검(1,42)    :", idSword.toString());
  console.log("  방패(1,43)  :", idShield.toString());
  console.log("  포션(2,42)  :", idPotion.toString());
  // 상위 192bit = productCode, 하위 64bit = eventCode 로 복원 (컨트랙트 내 decode 함수 없어 JS 로 계산)
  const decodedProduct = idSword >> 64n;
  const decodedEvent   = idSword & ((1n << 64n) - 1n);
  console.log("  JS decode → productCode:", decodedProduct.toString(), "· eventCode:", decodedEvent.toString());

  // ─────────────────────────────────────────────
  console.log("\n[4] user (MINTER_ROLE 없음) mint 시도 → AccessControl revert");
  try {
    await nft.connect(user).mint(user.address, idSword, 1, "0x");
    console.log("  ⚠️ 예상과 달리 성공했음 (버그)");
  } catch (e: any) {
    console.log("  revert 관찰됨 :", e.shortMessage ?? e.message?.split("\n")[0]);
    console.log("  (AccessControlUnauthorizedAccount — 권한 검증 정상 동작)");
  }

  // ─────────────────────────────────────────────
  console.log("\n[5] minter mint 성공 → balanceOf 확인");
  const tx1 = await nft.connect(minter).mint(user.address, idSword, 1, "0x");
  const r1  = await tx1.wait();
  console.log("  tx hash   :", r1?.hash);
  console.log("  gas used  :", r1?.gasUsed.toString());
  console.log("  user 검   :", (await nft.balanceOf(user.address, idSword)).toString());

  // ─────────────────────────────────────────────
  console.log("\n[6] mintBatch 표준 wrapper — Alice(user) 한 명에게 검·방패·포션 세트");
  const tx2 = await nft.connect(minter)["mintBatch(address,uint256[],uint256[],bytes)"](
    user.address,
    [idSword, idShield, idPotion],
    [5, 3, 10],
    "0x"
  );
  const r2 = await tx2.wait();
  console.log("  tx hash   :", r2?.hash);
  console.log("  gas used  :", r2?.gasUsed.toString());
  console.log("  user 검   :", (await nft.balanceOf(user.address, idSword)).toString(),  "(누적 · 이전 1 + 이번 5)");
  console.log("  user 방패 :", (await nft.balanceOf(user.address, idShield)).toString());
  console.log("  user 포션 :", (await nft.balanceOf(user.address, idPotion)).toString());

  // ─────────────────────────────────────────────
  console.log("\n[7] Pause 중 mint → EnforcedPause revert → Unpause 후 성공");
  await (await nft.pause()).wait();
  console.log("  paused    :", await nft.paused());
  try {
    await nft.connect(minter).mint(user.address, idSword, 1, "0x");
    console.log("  ⚠️ 예상과 달리 mint 성공");
  } catch (e: any) {
    console.log("  mint 시도 : EnforcedPause revert (예상대로)");
    console.log("  error     :", e.shortMessage ?? e.message?.split("\n")[0]);
  }
  await (await nft.unpause()).wait();
  console.log("  paused    :", await nft.paused());
  await (await nft.connect(minter).mint(user.address, idSword, 1, "0x")).wait();
  console.log("  unpause 후 mint 성공 · user 검 :", (await nft.balanceOf(user.address, idSword)).toString());

  // ─────────────────────────────────────────────
  console.log("\n[8] initialize 재호출 → InvalidInitialization revert (UUPS 학습 포인트)");
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

  console.log("\n✅ 완료 — UUPS 프록시가 정상 동작 · 권한·pause·재초기화 방어 모두 검증됨");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
