# Smart Contract Dev Course — Practice Code

Solidity 스마트컨트랙트 개발 강좌 실습 (Ch04-Ch21)

## 시작하기

```bash
cd practice
npm install --legacy-peer-deps
npm run compile
npm test
```

## 챕터별 실습

| 챕터 | 주제 | 컨트랙트 | 테스트 개수 |
|---|---|---|---:|
| Ch04 | Remix→Hardhat | `SimpleStorage.sol` | 6 |
| Ch05 | Solidity 문법 | `Types`, `FunctionsErrors`, `InheritanceLib` | 24 |
| Ch06 | OpenZeppelin 권한 | `MyOwnableToken`, `RoleBasedVault` | 18 |
| Ch07 | SimpleBank 전체 실습 | `SimpleBank.sol` | 22 |
| Ch08 | ERC-20 직접 구현 | `MyERC20.sol` | 11 |
| Ch09 | KRWCoin (OZ ERC-20) | `KRWCoin.sol` | 32 |
| Ch10 | ERC-721 직접 구현 | `MyNFT.sol` | 21 |
| Ch11 | ERC-1155 EnterpriseNFT | `EnterpriseNFT.sol` | 15 |
| Ch12 | msg.sender / call / delegatecall | `Logic`, `Proxy` | 6 |
| Ch13-14 | UUPS Proxy 배포 | `EnterpriseNFTV1` | 7 |
| Ch15 | UUPS Upgrade | `EnterpriseNFTV2`, `V2_BAD` | 5 |
| Ch16 | 취약점 (재진입/tx.origin) | `VulnerableBank`, `TxOriginVictim` | 8 |
| Ch17 | Slither 정적 분석 | `SlitherTarget.sol` | (외부 도구) |
| Ch18 | 감사 리포트 | `AuditTarget.sol` + `REPORT.md` | 4 |
| Ch19 | 멀티시그 (EIP-712) | `MultiSigWallet.sol` | 8 |
| Ch20 | MultisigService + Travel Rule | `MultisigService.sol` | 10 |
| Ch21 | 캡스톤 스타터 | `SoulBoundBadge`, `MerkleAirdrop` | 10 |

## 챕터별 테스트 실행

```bash
npm run test:ch05
npm run test:ch06
npm run test:ch10
# ...
```

## 배포

### 로컬 배포
```bash
npx hardhat node        # 별도 터미널
npm run deploy:ch07:local
npm run deploy:ch08:local
npm run deploy:ch09:local
npm run deploy:ch10:local
npm run deploy:ch13:local
```

### Sepolia 배포 + 검증
```bash
cp .env.example .env
# .env에 DEPLOYER_PRIVATE_KEY, SEPOLIA_RPC_URL, ETHERSCAN_API_KEY 입력
npm run deploy:ch14:sepolia
```

### UUPS 업그레이드
```bash
PROXY_ADDRESS=0x... npm run upgrade:ch15
```

## Slither (Ch17)

```bash
pip install slither-analyzer
slither .
# 상세: scripts/ch17/run_slither.md
```

## 구조

```
practice/
├── contracts/
│   ├── ch04/  SimpleStorage.sol
│   ├── ch05/  Types.sol, FunctionsErrors.sol, InheritanceLib.sol
│   ├── ch06/  MyOwnableToken.sol, RoleBasedVault.sol
│   ├── ch07/  SimpleBank.sol
│   ├── ch08/  MyERC20.sol
│   ├── ch09/  KRWCoin.sol
│   ├── ch10/  MyNFT.sol
│   ├── ch11/  EnterpriseNFT.sol
│   ├── ch12/  Logic.sol, Proxy.sol
│   ├── ch13/  EnterpriseNFTV1.sol
│   ├── ch15/  EnterpriseNFTV2.sol, EnterpriseNFTV2_BAD.sol
│   ├── ch16/  VulnerableBank.sol, SafeBank.sol, Attacker.sol, TxOriginVictim.sol
│   ├── ch17/  SlitherTarget.sol
│   ├── ch18/  AuditTarget.sol + REPORT.md
│   ├── ch19/  MultiSigWallet.sol
│   ├── ch20/  MultisigService.sol
│   └── ch21/  SoulBoundBadge.sol, MerkleAirdrop.sol
├── test/       (챕터별 매핑)
├── scripts/    (챕터별 배포/업그레이드)
├── slither.config.json
├── hardhat.config.ts
└── package.json
```
