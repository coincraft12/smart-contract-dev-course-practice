# Smart Contract Dev Course — Practice Code

**coincraft.io 솔리디티 스마트컨트랙트 개발자 과정 · 수강생 실습 저장소** (Ch04~Ch21)

이 저장소는 Hardhat 기반 Solidity 실습 프로젝트입니다. 강의에서 사용하는 모든 컨트랙트, 테스트, 배포 스크립트가 챕터별로 정리되어 있습니다.

---

## 목차

1. [개발환경 요구사항](#개발환경-요구사항)
2. [처음 시작하기](#처음-시작하기)
3. [프로젝트 구조](#프로젝트-구조)
4. [Hardhat 표준 명령어](#hardhat-표준-명령어)
5. [package.json 편의 스크립트](#packagejson-편의-스크립트)
6. [챕터별 실습 · 테스트](#챕터별-실습--테스트)
7. [배포 (Sepolia)](#배포-sepolia)
8. [UUPS 업그레이드 (Ch15)](#uups-업그레이드-ch15)
9. [Slither 정적 분석 (Ch17)](#slither-정적-분석-ch17)
10. [자주 겪는 문제](#자주-겪는-문제)

---

## 개발환경 요구사항

| 도구 | 버전 | 확인 |
|---|---|---|
| **Node.js** | 20.x 이상 (22.x LTS 권장) | `node --version` |
| **npm** | 10.x 이상 (Node 와 함께 설치) | `npm --version` |
| **Git** | 최신 | `git --version` |
| **Python** (Ch17 만) | 3.10 이상 (Slither 정적 분석용) | `python --version` |

**Windows**: PowerShell 또는 Git Bash 권장.
**Mac / Linux**: 기본 터미널.

---

## 처음 시작하기

### 1. 저장소 clone

```bash
git clone https://github.com/coincraft12/smart-contract-dev-course-practice.git
cd smart-contract-dev-course-practice
```

### 2. 의존성 설치

```bash
npm install --legacy-peer-deps
```

> **`--legacy-peer-deps` 이유**: Hardhat 관련 패키지들이 서로 다른 버전의 ethers 를 peer dependency 로 요구할 때 npm 이 에러 대신 관대하게 처리하도록 하는 옵션입니다. Hardhat 프로젝트에서는 표준적으로 사용합니다.

### 3. 전체 컴파일

```bash
npx hardhat compile
```

성공하면 `artifacts/` (컴파일 결과) 와 `typechain-types/` (TypeScript 타입) 가 생성됩니다.

### 4. 전체 테스트 실행

```bash
npx hardhat test
```

466개 이상의 테스트가 모두 통과해야 정상입니다.

---

## 프로젝트 구조

```
smart-contract-dev-course-practice/
│
├── contracts/           ← Solidity 소스 코드 (챕터별 폴더)
│   ├── ch04/            (Remix → Hardhat 전환)
│   │   ├── 4-1/ 4-2/ 4-3/ 4-4/
│   ├── ch05/            (Solidity 문법)
│   │   ├── 5-1/ 5-2/ 5-3/
│   ├── ch06/ ... ch21/  (나머지 챕터)
│
├── test/                ← 테스트 코드 (chXX/*.test.ts)
│
├── scripts/             ← 배포·상호작용 스크립트
│   ├── ch04/ ch07/ ... ch15/
│
├── ignition/            ← Hardhat Ignition 배포 모듈
│   └── modules/Lock.ts
│
├── artifacts/           ← 컴파일 결과 (gitignore · 자동 생성)
├── cache/               ← Hardhat 캐시 (gitignore · 자동 생성)
├── typechain-types/     ← TypeScript 타입 (gitignore · 자동 생성)
├── node_modules/        ← npm 패키지 (gitignore · 자동 생성)
│
├── hardhat.config.ts    ← Hardhat 설정 (solc 버전, 네트워크, 경로 등)
├── package.json         ← npm 패키지 정의 및 스크립트
├── tsconfig.json        ← TypeScript 설정
├── slither.config.json  ← Slither 정적 분석 설정 (Ch17)
├── .env.example         ← 환경변수 템플릿 (배포 시 사용)
└── .gitignore
```

### hardhat.config.ts 안의 주요 설정

```typescript
{
  solidity: {
    version: "0.8.24",           // Solidity 컴파일러 버전
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun",       // EVM 버전 (2024년 3월 이후 표준)
    },
  },
  networks: {
    localhost: { url: "http://127.0.0.1:8545" },  // 로컬 Hardhat 노드
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,           // .env 로 지정
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
      chainId: 11155111,
    },
  },
  etherscan: { apiKey: { sepolia: process.env.ETHERSCAN_API_KEY } },
  paths: {
    sources: "./contracts",       // 컴파일 대상 폴더
    tests: "./test",              // 테스트 폴더
    cache: "./cache",
    artifacts: "./artifacts",
  },
}
```

---

## Hardhat 표준 명령어

수강생은 아래 명령을 그대로 익히면 됩니다. 이 저장소만의 특수 세팅은 없습니다.

| 목적 | 명령어 |
|---|---|
| **전체 컴파일** | `npx hardhat compile` |
| **강제 재컴파일** | `npx hardhat compile --force` |
| **전체 테스트** | `npx hardhat test` |
| **특정 테스트 파일만** | `npx hardhat test test/ch07/SimpleBank.test.ts` |
| **여러 테스트 파일** | `npx hardhat test test/ch07/*.test.ts test/ch08/*.test.ts` |
| **가스 리포트 포함** | `REPORT_GAS=true npx hardhat test` (Windows PS: `$env:REPORT_GAS='true'; npx hardhat test`) |
| **로컬 노드 실행** | `npx hardhat node` |
| **배포 (로컬)** | `npx hardhat run scripts/ch07/deploySimpleBank.ts --network localhost` |
| **배포 (Sepolia)** | `npx hardhat run scripts/ch14/deploySepolia.ts --network sepolia` |
| **Etherscan 검증** | `npx hardhat verify --network sepolia <address> <constructor-args>` |
| **캐시·artifacts 삭제** | `npx hardhat clean` |
| **콘솔 (interactive)** | `npx hardhat console --network localhost` |

**참고**: `npx hardhat compile` 자체는 파일이나 폴더 지정 옵션이 없습니다. `contracts/` 폴더 전체를 컴파일하는 것이 Hardhat 의 표준 동작이며, 캐시 덕분에 변경된 파일만 자동으로 재컴파일됩니다.

---

## package.json 편의 스크립트

`npm run <script>` 로 실행하는 편의 명령입니다. 위 표준 명령어의 shortcut 이며, 학습 후에는 표준 CLI 를 그대로 쓰셔도 됩니다.

```bash
npm run compile         # = npx hardhat compile
npm run test            # = npx hardhat test  (전체)
npm run test:gas        # 가스 리포트 (REPORT_GAS=true)
npm run node            # = npx hardhat node  (로컬 노드)
npm run clean           # = npx hardhat clean
```

### 챕터별 테스트 shortcut

각 챕터 테스트만 실행하는 shortcut 입니다. 내부적으로는 `npx hardhat test test/chXX/*.test.ts` 를 실행합니다.

```bash
npm run test:ch04       # 챕터 전체 (4-1, 4-2, 4-3, 4-4)
npm run test:ch04-1     # 서브챕터만
npm run test:ch05
npm run test:ch05-1
npm run test:ch05-2
npm run test:ch05-3
npm run test:ch06
npm run test:ch07 ... npm run test:ch21
npm run test:ch11-1 ... npm run test:ch11-4
```

전체 목록은 `package.json` 의 `"scripts"` 섹션을 참조하거나:

```bash
npm run           # 정의된 모든 스크립트 나열
```

### 챕터별 배포 shortcut

```bash
npm run deploy:ch04-2:local     # SimpleStorage 로컬 배포
npm run deploy:ch04-3:local     # Lock (Hardhat Ignition)
npm run deploy:ch04-4:sepolia   # Greeter Sepolia 배포
npm run deploy:ch07:local       # SimpleBank
npm run deploy:ch08:local       # MyERC20
npm run deploy:ch09:local       # KRWCoin
npm run deploy:ch10:local       # MyNFT
npm run deploy:ch13:local       # EnterpriseNFTV1 (UUPS Proxy)
npm run deploy:ch14:sepolia     # EnterpriseNFT UUPS Sepolia
npm run upgrade:ch15            # UUPS 업그레이드
```

---

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

---

## 배포 (Sepolia)

### 1. 사전 준비

**필요한 것**:
- Sepolia 테스트넷 ETH (faucet 에서 무료 획득)
- Infura / Alchemy RPC URL (Ethereum Sepolia)
- Etherscan API Key (컨트랙트 검증용)
- 배포용 지갑의 Private Key (테스트용 지갑만 사용 · 실 자금 있는 지갑 절대 금지)

### 2. `.env` 파일 세팅

```bash
cp .env.example .env
```

`.env` 에 아래 값 입력:

```env
# Sepolia RPC URL (Infura, Alchemy, PublicNode 등)
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID

# 배포용 지갑 private key (0x 접두어 포함, 64자리 hex)
DEPLOYER_PRIVATE_KEY=0xabcdef...

# Etherscan API Key (https://etherscan.io/apis)
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY
```

> ⚠️ **보안 주의**: `.env` 파일은 `.gitignore` 에 포함되어 git 에 올라가지 않지만, 로컬에서도 실 자금이 든 지갑의 private key 는 절대 사용하지 마세요. 테스트넷 전용 지갑을 새로 만드는 것을 권장합니다.

### 3. 배포 실행

```bash
# Greeter (Ch04)
npx hardhat run scripts/ch04/4-4/deployGreeter.ts --network sepolia

# EnterpriseNFT UUPS (Ch14)
npx hardhat run scripts/ch14/deploySepolia.ts --network sepolia
```

### 4. Etherscan 검증

배포 스크립트에서 자동 검증이 포함되어 있지만, 실패했다면 수동으로:

```bash
npx hardhat verify --network sepolia <deployed_address> "constructor_arg1" "arg2"
```

---

## UUPS 업그레이드 (Ch15)

```bash
# 1. Ch13 로 EnterpriseNFTV1 로컬 배포
npx hardhat node                                       # 별도 터미널
npm run deploy:ch13:local                              # PROXY_ADDRESS 출력

# 2. V2 로 업그레이드 (PROXY_ADDRESS 를 위 출력값으로 대체)
PROXY_ADDRESS=0x... npm run upgrade:ch15
```

Windows PowerShell:
```powershell
$env:PROXY_ADDRESS='0x...'
npm run upgrade:ch15
```

---

## Slither 정적 분석 (Ch17)

**설치**:
```bash
pip install slither-analyzer
slither --version    # 설치 확인
```

**실행**:
```bash
slither .
```

`slither.config.json` 이 설정을 관리합니다.

상세 절차와 결과 해석은 [`scripts/ch17/run_slither.md`](./scripts/ch17/run_slither.md) 참조.

---

## 자주 겪는 문제

### `Error HH12: Trying to use a non-local installation of Hardhat`
→ `node_modules` 가 없거나 설치가 잘못됨. `npm install --legacy-peer-deps` 재실행.

### `Error HH308: Unrecognized positional argument`
→ `npx hardhat compile <파일경로>` 처럼 파일을 인자로 넘김. Hardhat 은 파일 지정 옵션이 없습니다. `npx hardhat compile` 만 실행하면 변경된 파일만 자동으로 재컴파일됩니다.

### `Error: Cannot find module 'hardhat'`
→ 프로젝트 폴더가 아닌 곳에서 실행 중. `cd smart-contract-dev-course-practice` 후 재시도.

### Sepolia 배포 시 `insufficient funds`
→ 지갑에 Sepolia ETH 가 없음. [Sepolia Faucet](https://sepoliafaucet.com/) 에서 무료 획득.

### Etherscan 검증 실패 (constructor arguments)
→ 배포 시 사용한 constructor 인자를 정확히 같은 순서·타입으로 넘겨야 합니다:
```bash
npx hardhat verify --network sepolia 0xABC... "TokenName" "SYM" 1000000
```

### `Nothing to compile`
→ 아무 파일도 변경되지 않았을 때 정상 출력. 강제 재컴파일이 필요하면:
```bash
npx hardhat compile --force
```

---

## 문의 · 이슈

- 실습 도중 문제 발생 시 [Issues](https://github.com/coincraft12/smart-contract-dev-course-practice/issues) 등록
- 강좌 사이트: [coincraft.io](https://coincraft.io)
