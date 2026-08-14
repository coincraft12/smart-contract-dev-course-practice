# Smart Contract Dev Course — Practice Code

**coincraft.io 솔리디티 스마트컨트랙트 개발자 과정 · 수강생 실습 저장소** (Ch04~Ch21)

## 시작하기

```bash
cd practice
npm install --legacy-peer-deps
npm run compile
npm test        # 전체 테스트 (466개+)
```

## 챕터별 실습 · 테스트

| 챕터 | 주제 | 컨트랙트 (`contracts/`) | 테스트 |
|---|---|---|---:|
| **Ch04** | Remix → Hardhat 전환 | `4-1/SolidityBasics.sol`, `4-1/SelectorPlayground.sol`, `4-2/SimpleStorage.sol`, `4-2/OwnedStorage.sol`, `4-3/Lock.sol`, `4-4/Greeter.sol` | 46 |
| **Ch05** | Solidity 문법 (타입·제어·상속) | `5-1/NumericTypes`, `5-1/AddressAndBytes`, `5-1/CollectionsAndMapping`, `5-1/DataLocationEnumPacking`, `5-2/VisibilityReturns`, `5-2/Modifiers`, `5-2/PayableReceiveFallback`, `5-2/FlowAndErrors`, `5-3/Inheritance`, `5-3/Interfaces`, `5-3/LibraryUsingFor`, `5-3/StrategyPattern` | 148 |
| **Ch06** | OpenZeppelin 권한 관리 | `MyOwnableToken.sol`, `RoleBasedVault.sol` | 18 |
| **Ch07** | SimpleBank 전체 실습 | `SimpleBank.sol` | 23 |
| **Ch08** | ERC-20 직접 구현 | `MyERC20.sol` | 11 |
| **Ch09** | KRWCoin (OZ ERC-20) | `KRWCoin.sol` | 32 |
| **Ch10** | ERC-721 직접 구현 | `MyNFT.sol` | 21 |
| **Ch11** | ERC-1155 EnterpriseNFT | `11-1/TokenStandardComparison`, `11-2/BatchOperations`, `11-3/TokenIdEncoding`, `11-3/EnterpriseNFT`, `11-4/BadgeSystemComparison` | 49 |
| **Ch12** | msg.sender / call / delegatecall | `Logic.sol`, `Proxy.sol` | 6 |
| **Ch13** | UUPS Proxy 기본 배포 | `EnterpriseNFTV1.sol` | 7 |
| **Ch14** | Sepolia 배포 (스크립트만) | (배포 대상: Ch13 컨트랙트) | — |
| **Ch15** | UUPS Upgrade (호환/비호환) | `EnterpriseNFTV2.sol`, `EnterpriseNFTV2_BAD.sol` | 5 |
| **Ch16** | 취약점 · 방어 패턴 | `VulnerableBank.sol`, `SafeBank.sol`, `Attacker.sol`, `TxOriginVictim.sol` | 8 |
| **Ch17** | Slither 정적 분석 | `SlitherTarget.sol` | (외부 도구) |
| **Ch18** | 감사 리포트 실습 | `AuditTarget.sol` + `REPORT.md` | 4 |
| **Ch19** | 멀티시그 (EIP-712) | `MultiSigWallet.sol` | 8 |
| **Ch20** | MultisigService + Travel Rule | `MultisigService.sol` | 10 |
| **Ch21** | 캡스톤 스타터 | `SoulBoundBadge.sol`, `MerkleAirdrop.sol` | 10 |
| **합계** | | 44 컨트랙트 · 40 테스트 파일 | **466** |

## 챕터별 테스트 실행

```bash
npm run test:ch04       # 챕터 전체
npm run test:ch04-1     # 챕터 세부 (Ch04·Ch05·Ch11 은 -1/-2/-3/-4 서브 존재)
npm run test:ch05
npm run test:ch05-1
npm run test:ch05-2
npm run test:ch05-3
npm run test:ch06
npm run test:ch07
npm run test:ch08
npm run test:ch09
npm run test:ch10
npm run test:ch11
npm run test:ch11-1
npm run test:ch11-2
npm run test:ch11-3
npm run test:ch11-4
npm run test:ch12
npm run test:ch13
npm run test:ch15
npm run test:ch16
npm run test:ch18
npm run test:ch19
npm run test:ch20
npm run test:ch21
npm run test:gas        # REPORT_GAS=true 로 실행 (gas 리포트 출력)
```

## 배포

### 로컬 (`hardhat node` 별도 터미널)

```bash
npm run node                        # 별도 터미널
npm run deploy:ch04-2:local         # SimpleStorage
npm run deploy:ch04-3:local         # Lock (Hardhat Ignition)
npm run deploy:ch07:local           # SimpleBank
npm run deploy:ch08:local           # MyERC20
npm run deploy:ch09:local           # KRWCoin
npm run deploy:ch10:local           # MyNFT
npm run deploy:ch13:local           # EnterpriseNFTV1 (UUPS Proxy)
```

### Sepolia 배포 · 검증

```bash
cp .env.example .env
# .env 에 아래 값 입력:
#   DEPLOYER_PRIVATE_KEY=0x...
#   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/...
#   ETHERSCAN_API_KEY=...
npm run deploy:ch04-4:sepolia       # Greeter
npm run deploy:ch14:sepolia         # EnterpriseNFTV1 UUPS Proxy
```

### UUPS 업그레이드 (Ch15)

```bash
PROXY_ADDRESS=0x... npm run upgrade:ch15
```

## Slither (Ch17)

```bash
pip install slither-analyzer
slither .
# 상세 절차: scripts/ch17/run_slither.md
```

## 인터랙션 스크립트

```bash
# SimpleBank 배포 후 상호작용
npm run deploy:ch07:local
hardhat run scripts/ch07/interactSimpleBank.ts --network localhost

# KRWCoin 배포 후 상호작용
npm run deploy:ch09:local
hardhat run scripts/ch09/interactKRWCoin.ts --network localhost
```

## 구조

```
practice/
├── contracts/
│   ├── ch04/{4-1,4-2,4-3,4-4}/    Remix → Hardhat 전환 (6 컨트랙트)
│   ├── ch05/{5-1,5-2,5-3}/        Solidity 문법 (12 컨트랙트)
│   ├── ch06/                      OpenZeppelin 권한 (2 컨트랙트)
│   ├── ch07/  SimpleBank.sol
│   ├── ch08/  MyERC20.sol
│   ├── ch09/  KRWCoin.sol
│   ├── ch10/  MyNFT.sol
│   ├── ch11/{11-1,11-2,11-3,11-4}/ERC-1155 (5 컨트랙트)
│   ├── ch12/  Logic.sol, Proxy.sol
│   ├── ch13/  EnterpriseNFTV1.sol
│   ├── ch15/  EnterpriseNFTV2.sol, EnterpriseNFTV2_BAD.sol
│   ├── ch16/  VulnerableBank.sol, SafeBank.sol, Attacker.sol, TxOriginVictim.sol
│   ├── ch17/  SlitherTarget.sol
│   ├── ch18/  AuditTarget.sol + REPORT.md
│   ├── ch19/  MultiSigWallet.sol
│   ├── ch20/  MultisigService.sol
│   └── ch21/  SoulBoundBadge.sol, MerkleAirdrop.sol
├── test/          (챕터별 · 서브챕터별 매핑)
├── scripts/       (챕터별 배포·상호작용)
├── ignition/      Hardhat Ignition 모듈 (Ch04-3 Lock)
├── slither.config.json
├── hardhat.config.ts
├── tsconfig.json
└── package.json
```

## 문의 · 이슈

- 실습 도중 문제 발생 시 [Issues](https://github.com/coincraft12/smart-contract-dev-course-practice/issues) 등록
- 강좌 사이트: [coincraft.io](https://coincraft.io)
