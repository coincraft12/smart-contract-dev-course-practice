import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Ch04-3 실습 — Hardhat Ignition 배포 모듈
 *
 * 실행:
 *   npx hardhat ignition deploy ignition/modules/Lock.ts --network localhost
 *
 * Ignition은 idempotent — 같은 module id로 재실행해도 이미 배포된 인스턴스 재사용.
 * 결과는 ignition/deployments/chain-<id>/ 아래 JSON으로 기록.
 */

const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
const ONE_GWEI: bigint = 1_000_000_000n;

export default buildModule("LockModule", (m) => {
  const unlockTime = m.getParameter(
    "unlockTime",
    BigInt(Math.floor(Date.now() / 1000) + ONE_YEAR_IN_SECS)
  );
  const lockedAmount = m.getParameter("lockedAmount", ONE_GWEI);

  const lock = m.contract("Lock", [unlockTime], { value: lockedAmount });

  return { lock };
});
