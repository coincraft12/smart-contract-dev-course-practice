# 프로젝트 워크플로우 가이드

**coincraft.io 솔리디티 스마트컨트랙트 개발자 과정 · 수강생 실습 저장소** 사용법 상세 가이드입니다.

## 목차

1. [이 저장소는 무엇인가](#이-저장소는-무엇인가)
2. [폴더 구조 상세](#폴더-구조-상세)
3. [챕터 학습 워크플로우 (4단계)](#챕터-학습-워크플로우-4단계)
4. [챕터별 코드 매핑](#챕터별-코드-매핑)
5. [package.json 스크립트 총정리](#packagejson-스크립트-총정리)
6. [배포 프로세스 상세](#배포-프로세스-상세)
7. [Sepolia 배포 · Etherscan 검증](#sepolia-배포--etherscan-검증)
8. [UUPS 업그레이드 (Ch12-15)](#uups-업그레이드-ch12-15)
9. [Slither 정적 분석 (Ch16)](#slither-정적-분석-ch16)
10. [자주 겪는 문제](#자주-겪는-문제)
11. [부록: Hardhat 표준 CLI](#부록-hardhat-표준-cli)

---

## 이 저장소는 무엇인가

coincraft.io **솔리디티 스마트컨트랙트 개발자 과정** (Ch04~Ch20) 의 모든 실습 코드를 **하나의 Hardhat 프로젝트**에 통합해 놓은 저장소입니다.

### 이 저장소의 특징 (일반 Hardhat 프로젝트와 다른 점)

| 항목 | 일반 프로젝트 | 이 저장소 |
|---|---|---|
| 컨트랙트 폴더 | `contracts/` 평평 | `contracts/chXX/[sub/]` **챕터별 서브폴더** |
| 테스트 폴더 | `test/` 평평 | `test/chXX/[sub/]` **챕터별 서브폴더** |
| 배포 스크립트 | `scripts/` 몇 개 | `scripts/chXX/` **챕터별 다수** |
| 테스트 실행 | `npx hardhat test` | 챕터별 편의: `npm run test:chXX` |
| 배포 실행 | `npx hardhat run scripts/foo.ts` | 챕터별 편의: `npm run deploy:chXX:local` |

**즉 학생 관점**:
- 강의 진행에 따라 챕터별로 학습 · 테스트 · 배포
- 각 챕터에서 배운 것을 즉시 검증 가능
- 이전 챕터 코드도 그대로 보존 → 다시 참조 가능

---

## 폴더 구조 상세

```
smart-contract-dev-course-practice/
│
├── contracts/                     ← Solidity 소스 (44개)
│   ├── ch04/                      Ch04 실습 (Remix → Hardhat)
│   │   ├── 4-1/                     Ch04-1 세션: Solidity 기초·selector
│   │   │   ├── SolidityBasics.sol
│   │   │   └── SelectorPlayground.sol
│   │   ├── 4-2/                     Ch04-2: SimpleStorage·소유권
│   │   ├── 4-3/                     Ch04-3: Lock (Ignition)
│   │   └── 4-4/                     Ch04-4: Greeter
│   ├── ch05/                      Ch05 실습 (Solidity 문법)
│   │   ├── 5-1/                     타입 (숫자·주소·컬렉션·데이터 위치)
│   │   ├── 5-2/                     함수 (가시성·modifier·payable·에러)
│   │   └── 5-3/                     상속 (inheritance·interface·library·strategy)
│   ├── ch06/                      OpenZeppelin 권한
│   ├── ch07/                      SimpleBank
│   ├── ch08/                      MyERC20 + KRWCoin (ERC-20)
│   ├── ch09/                      MyNFT (ERC-721)
│   ├── ch10/                      ERC-1155
│   ├── ch11/                      msg.sender / call / delegatecall
│   ├── ch12/                      EnterpriseNFTV1 (UUPS)
│   ├── ch14/                      UUPS V2 업그레이드
│   ├── ch15/                      취약점·방어 (Reentrancy·tx.origin)
│   ├── ch16/                      SlitherTarget
│   ├── ch17/                      AuditTarget + REPORT.md
│   ├── ch18/                      MultiSigWallet (EIP-712)
│   ├── ch19/                      MultisigService (Travel Rule)
│   └── ch20/                      캡스톤 스타터 (SBT·MerkleAirdrop)
│
├── test/                          ← 테스트 (40 파일, 466 tests)
│   └── chXX/[sub/]                컨트랙트와 동일 구조로 미러링
│
├── scripts/                       ← 배포·상호작용 스크립트
│   ├── ch04/{4-2,4-4}/            SimpleStorage, Greeter
│   ├── ch07/                      deploySimpleBank, interactSimpleBank
│   ├── ch08/                      deployMyERC20, deployKRWCoin, interactKRWCoin
│   ├── ch09/                      deployMyNFT
│   ├── ch12/                      deployProxy (UUPS)
│   ├── ch13/                      deploySepolia (Sepolia 실배포)
│   ├── ch14/                      upgradeToV2
│   └── ch16/                      run_slither.md
│
├── ignition/                      ← Hardhat Ignition 배포 모듈
│   └── modules/Lock.ts            Ch04-3 실습 (Ignition 사용)
│
├── artifacts/                     (자동 생성 · gitignore) 컴파일 결과
├── cache/                         (자동 생성) Hardhat 캐시
├── typechain-types/               (자동 생성) TypeScript 타입
├── node_modules/                  (자동 생성)
│
├── hardhat.config.ts              Hardhat 설정 (solc 0.8.24 · cancun · localhost/sepolia)
├── package.json                   npm 편의 스크립트 다수
├── tsconfig.json                  TypeScript 설정
├── slither.config.json            Slither 설정 (Ch16)
├── .env.example                   환경변수 템플릿
└── .gitignore
```

**챕터 없는 번호** (Ch13): `contracts/ch13/` 폴더 없음. Ch12 에서 만든 컨트랙트를 Sepolia 에 배포하는 챕터라 스크립트 (`scripts/ch13/`) 만 있음.

---

## 챕터 학습 워크플로우 (4단계)

각 챕터를 학습할 때 아래 4단계로 진행합니다.

### Step 1. 강의노트 + 코드 대조

강의노트 상단에 실습 저장소 딥링크가 있습니다:
```markdown
> **📦 실습 코드**  
> - 저장소: smart-contract-dev-course-practice
> - 이 챕터 컨트랙트: contracts/ch07/
> - 이 챕터 테스트: test/ch07/ · 실행 npm run test:ch07
```

강의노트를 읽으면서 해당 `contracts/chXX/*.sol` 파일을 열어놓고 대조합니다.

### Step 2. 테스트로 검증

강의에서 배운 개념이 실제로 어떻게 동작하는지 테스트로 확인:

```bash
npm run test:ch07
```

내부적으로 실행되는 명령:
```bash
npx hardhat test test/ch07/SimpleBank.test.ts
```

**서브챕터가 있는 챕터** (Ch04, Ch05):
```bash
npm run test:ch05        # ch05 전체 (5-1, 5-2, 5-3 모두)
npm run test:ch05-1      # ch05-1 만 (타입)
npm run test:ch05-2      # ch05-2 만 (함수)
npm run test:ch05-3      # ch05-3 만 (상속)
```

테스트가 실패하면 **어떤 것이 왜 실패했는지** 강의 내용과 대조해 이해합니다.

### Step 3. 로컬 배포 (선택 · Ch07+)

컨트랙트를 로컬 Hardhat 노드에 배포해 실제 인터랙션 실습:

```bash
# 별도 터미널: 로컬 노드 시작 (Ganache 같은 것)
npm run node
# → http://127.0.0.1:8545 로 20개 계정 (각 10000 ETH) 준비됨
```

배포:
```bash
npm run deploy:ch07:local     # SimpleBank
```

인터랙션 (컨트랙트 함수 호출):
```bash
npx hardhat run scripts/ch07/interactSimpleBank.ts --network localhost
```

**로컬 배포 지원 챕터**: Ch04-2, Ch04-3 (Ignition), Ch07, Ch08, Ch09, Ch12

### Step 4. Sepolia 배포 (Ch13~ · 실전)

Ch13 부터는 실제 테스트넷 (Sepolia) 에 배포. `.env` 세팅 필요 → 아래 [Sepolia 섹션](#sepolia-배포--etherscan-검증) 참조.

**Sepolia 배포 지원 챕터**: Ch04-4 (Greeter), Ch13 (EnterpriseNFT UUPS)

---

## 챕터별 코드 매핑

| 챕터 | 강의 주제 | 컨트랙트 위치 | 테스트 실행 | 배포 |
|---|---|---|---|---|
| **Ch04** | Remix → Hardhat 전환 | `contracts/ch04/{4-1,4-2,4-3,4-4}/` (6개) | `npm run test:ch04` (46) | `npm run deploy:ch04-2:local`, `ch04-3:local`, `ch04-4:sepolia` |
| **Ch05** | Solidity 문법 | `contracts/ch05/{5-1,5-2,5-3}/` (12개) | `npm run test:ch05` (148) | — (문법 학습 · 배포 없음) |
| **Ch06** | OpenZeppelin 권한 | `contracts/ch06/` (2개) | `npm run test:ch06` (18) | — |
| **Ch07** | SimpleBank | `contracts/ch07/SimpleBank.sol` | `npm run test:ch07` (23) | `npm run deploy:ch07:local` |
| **Ch08** | ERC-20 (MyERC20 + KRWCoin) | `contracts/ch08/{MyERC20,KRWCoin}.sol` | `npm run test:ch08` (43) | `npm run deploy:ch08:erc20:local` · `deploy:ch08:krwcoin:local` |
| **Ch09** | ERC-721 (MyNFT) | `contracts/ch09/MyNFT.sol` | `npm run test:ch09` (21) | `npm run deploy:ch09:local` |
| **Ch10** | ERC-1155 | `contracts/ch10/` (5개) | `npm run test:ch10` (49) | — |
| **Ch11** | msg.sender/call/delegatecall | `contracts/ch11/{Logic,Proxy}.sol` | `npm run test:ch11` (6) | — |
| **Ch12** | UUPS Proxy | `contracts/ch12/EnterpriseNFTV1.sol` | `npm run test:ch12` (7) | `npm run deploy:ch12:local` |
| **Ch13** | Sepolia 배포 | (Ch12 컨트랙트) | — | `npm run deploy:ch13:sepolia` |
| **Ch14** | UUPS Upgrade | `contracts/ch14/EnterpriseNFTV2{,_BAD}.sol` | `npm run test:ch14` (5) | `npm run upgrade:ch14` |
| **Ch15** | 취약점·방어 | `contracts/ch15/{VulnerableBank,SafeBank,Attacker,TxOriginVictim}.sol` | `npm run test:ch15` (8) | — |
| **Ch16** | Slither 정적 분석 | `contracts/ch16/SlitherTarget.sol` | `slither .` (외부 도구) | — |
| **Ch17** | 감사 리포트 | `contracts/ch17/AuditTarget.sol` + `REPORT.md` | `npm run test:ch17` (4) | — |
| **Ch18** | 멀티시그 (EIP-712) | `contracts/ch18/MultiSigWallet.sol` | `npm run test:ch18` (8) | — |
| **Ch19** | MultisigService | `contracts/ch19/MultisigService.sol` | `npm run test:ch19` (10) | — |
| **Ch20** | 캡스톤 스타터 | `contracts/ch20/{SoulBoundBadge,MerkleAirdrop}.sol` | `npm run test:ch20` (10) | — (캡스톤 · 학생 구현) |
| **합계** | | **44 컨트랙트** | **466 tests** | |

---

## package.json 스크립트 총정리

### 기본 명령 (일반 hardhat 그대로)

| 스크립트 | 실행되는 것 | 목적 |
|---|---|---|
| `npm run compile` | `hardhat compile` | 전체 컴파일 (변경 파일 자동 감지) |
| `npm test` | `hardhat test` | 전체 466 테스트 실행 |
| `npm run test:gas` | `REPORT_GAS=true hardhat test` | 가스 소비량 리포트 포함 |
| `npm run node` | `hardhat node` | 로컬 Hardhat 노드 시작 (별도 터미널) |
| `npm run clean` | `hardhat clean` | artifacts/ cache/ 삭제 |

### 챕터별 테스트 편의 스크립트

```bash
npm run test:ch04
npm run test:ch05
npm run test:ch06 ~ npm run test:ch09
npm run test:ch10
npm run test:ch11, ch12, ch14, ch15, ch17, ch18, ch19, ch20
```

**주의: Ch13, Ch16 은 test 스크립트 없음** (Ch13 는 배포만, Ch16 은 Slither 외부 도구).

### 챕터별 배포 편의 스크립트

```bash
npm run deploy:ch04-2:local   # SimpleStorage
npm run deploy:ch04-3:local   # Lock (Ignition)
npm run deploy:ch04-4:sepolia # Greeter (Sepolia)
npm run deploy:ch07:local     # SimpleBank
npm run deploy:ch08:local     # MyERC20
npm run deploy:ch09:local     # MyNFT
npm run deploy:ch12:local     # EnterpriseNFTV1 (UUPS)
npm run deploy:ch13:sepolia   # EnterpriseNFT (Sepolia · Ch12 컨트랙트)
npm run upgrade:ch14          # V2 업그레이드
```

**전체 스크립트 나열**:
```bash
npm run
```

---

## 배포 프로세스 상세

### 로컬 배포 (Hardhat Network)

**개념**: `hardhat node` 를 실행하면 로컬 PC 안에 이더리움 노드가 실행됩니다 (RAM 상). 20개 계정 (각 10000 ETH) 제공.

**진행 순서**:
```bash
# 1. 로컬 노드 시작 (별도 터미널 유지)
npm run node

# 2. 다른 터미널에서 배포
npm run deploy:ch07:local

# 3. 배포 로그 예시:
#    Deploying SimpleBank...
#    SimpleBank deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3

# 4. 인터랙션
npx hardhat run scripts/ch07/interactSimpleBank.ts --network localhost
```

**로컬 노드 종료**: 노드 터미널에서 `Ctrl+C` → RAM 상 데이터 즉시 소실 (재시작 시 처음부터).

**로컬 노드 없이 배포하면 어떻게 되나?**: `hardhat` 네트워크가 default 라 in-memory 임시 노드가 잠깐 실행됐다 즉시 종료됨. 상태 유지 안 됨. **인터랙션 실습 하려면 반드시 `npm run node`.**

### Ignition 배포 (Ch04-3)

Hardhat Ignition 은 Hardhat 팀이 만든 새 배포 도구. `ignition/modules/*.ts` 로 배포 로직 선언 후:

```bash
npm run deploy:ch04-3:local
# 내부 실행: hardhat ignition deploy ignition/modules/Lock.ts --network localhost
```

**차이점**: 일반 스크립트 (`hardhat run`) 는 매번 새 배포. Ignition 은 배포 결과를 저장해 재실행 시 중복 배포 방지 · 의존성 순서 자동 관리. 실무 대규모 배포에 유리.

---

## Sepolia 배포 · Etherscan 검증

### 1. 사전 준비

**필요한 것**:
| 항목 | 획득 방법 |
|---|---|
| Sepolia ETH | [Alchemy Faucet](https://sepoliafaucet.com/), [PoW Faucet](https://sepolia-faucet.pk910.de/) — 무료 (0.5 ETH/day) |
| Sepolia RPC URL | [Infura](https://infura.io) or [Alchemy](https://alchemy.com) 계정 생성 후 프로젝트 생성 · Sepolia URL 복사 |
| Etherscan API Key | [Etherscan API](https://etherscan.io/apis) 계정 생성 후 API Key 발급 |
| 배포용 지갑 private key | **테스트넷 전용 지갑 새로 생성 권장** (실 자금 있는 지갑 절대 금지) |

**⚠️ 지갑 private key 안전**:
- MetaMask 에서 새 계정 생성 → private key export → 이 지갑만 배포용으로 사용
- 실 자금 있는 계정 private key 는 절대 코드/파일에 넣지 말 것
- `.env` 는 `.gitignore` 로 커밋 안 됨 · 하지만 백업·공유 시에도 노출 조심

### 2. `.env` 파일 세팅

```bash
cp .env.example .env
```

`.env` 편집:
```env
# Sepolia RPC (Infura 예시)
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID

# 배포용 지갑 private key (0x 접두어 · 64자리 hex)
DEPLOYER_PRIVATE_KEY=0xabcdef0123456789...

# Etherscan API Key
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY
```

### 3. 배포 실행

```bash
# Greeter (Ch04-4)
npm run deploy:ch04-4:sepolia

# EnterpriseNFT UUPS (Ch13)
npm run deploy:ch13:sepolia
```

배포 로그에서 **배포된 컨트랙트 주소** 확인 (예: `0x123...`).

### 4. Etherscan 자동 검증

배포 스크립트에 검증 코드가 포함돼 있어 자동 실행. 실패했다면 수동:

```bash
npx hardhat verify --network sepolia <address> <constructor-arg1> <arg2>
```

예:
```bash
npx hardhat verify --network sepolia 0xABC123... "MyToken" "MTK" 1000000
```

검증 성공 시 Etherscan 페이지에 "Contract" 탭에 소스코드·ABI 노출됨.

### 5. Etherscan 에서 컨트랙트 확인

`https://sepolia.etherscan.io/address/0xABC123...` 접속 → 배포된 컨트랙트의 트랜잭션·이벤트·상태 확인 가능.

---

## UUPS 업그레이드 (Ch12-15)

**개념**: UUPS (Universal Upgradeable Proxy Standard, EIP-1822) 는 컨트랙트 코드를 배포 후에도 교체 가능하게 하는 표준. 프록시 컨트랙트는 그대로 두고 구현 컨트랙트만 새 주소로 교체.

### 순서

```bash
# 1. V1 배포 (Ch12)
npm run node              # 로컬 노드 별도 터미널
npm run deploy:ch12:local
# → Proxy 주소 출력. 복사 필요.

# 2. V2 로 업그레이드 (Ch14)
# Windows PowerShell:
$env:PROXY_ADDRESS='0x...'
npm run upgrade:ch14

# Mac/Linux:
PROXY_ADDRESS=0x... npm run upgrade:ch14
```

**핵심 학습 포인트**:
- V2 를 배포하면 새 구현 컨트랙트 배포 · Proxy 는 여전히 같은 주소
- Proxy 의 storage 는 유지됨 (state 안 잃음)
- V2 의 storage layout 이 V1 과 호환돼야 함 (필드 순서 유지 · 추가만 가능)
- `EnterpriseNFTV2_BAD.sol` 은 일부러 storage 순서 어겨 fail 하는 예시 (Ch14 테스트에서 검증)

---

## Slither 정적 분석 (Ch16)

**개념**: Solidity 코드를 실행하지 않고 정적으로 분석해 취약점·안티패턴 감지하는 도구 (Trail of Bits 개발).

### 설치

```bash
pip install slither-analyzer
slither --version    # 설치 확인
```

Python 3.10 이상 필요.

### 실행

```bash
slither .
```

`slither.config.json` 파일이 프로젝트 루트에 있어 자동 로드됨.

### 리포트 해석

- **HIGH**: 즉시 수정 필요
- **MEDIUM**: 심각 · 수정 권장
- **LOW/INFORMATIONAL**: 코드 스타일 · 최적화

Ch16 목표: `contracts/ch16/SlitherTarget.sol` 을 리팩토링해 **HIGH/MEDIUM 0건** 달성.

상세 절차: [`scripts/ch16/run_slither.md`](./scripts/ch16/run_slither.md)

---

## 자주 겪는 문제

### `Error HH12: Trying to use a non-local installation of Hardhat`
→ `node_modules` 미설치. `npm install --legacy-peer-deps` 재실행.

### `Error HH308: Unrecognized positional argument`
→ `npx hardhat compile <파일경로>` 처럼 파일을 인자로 넘김. Hardhat 은 파일 지정 옵션 없음. `npx hardhat compile` 만 실행하면 캐시 덕분에 변경된 파일만 자동 재컴파일.

### `Error: Cannot find module 'hardhat'`
→ 프로젝트 폴더가 아닌 곳에서 실행. `cd smart-contract-dev-course-practice` 후 재시도.

### Sepolia 배포 시 `insufficient funds`
→ 지갑에 Sepolia ETH 없음. [Sepolia Faucet](https://sepoliafaucet.com/) 에서 무료 획득.

### Etherscan 검증 실패 (`constructor arguments`)
→ constructor 인자를 정확히 같은 순서·타입으로 넘겨야:
```bash
npx hardhat verify --network sepolia 0xABC... "TokenName" "SYM" 1000000
```

### `Nothing to compile`
→ 아무 파일도 변경되지 않았을 때 정상. 강제 재컴파일:
```bash
npx hardhat compile --force
```

### 테스트 실행 시 `PROVIDER_ERROR` (localhost)
→ `hardhat node` 가 실행되지 않았음. 별도 터미널에서 `npm run node` 먼저 실행.

### `npm install` 시 peer dep 충돌
→ **반드시** `npm install --legacy-peer-deps` 사용 (Hardhat 관련 ethers 버전 충돌 회피).

### Windows PowerShell 에서 `PROXY_ADDRESS=0x... npm run ...` 안 됨
→ Bash 문법. PowerShell 은:
```powershell
$env:PROXY_ADDRESS='0x...'
npm run upgrade:ch14
```

### 로컬 배포 후 재접속 시 컨트랙트 사라짐
→ `hardhat node` 는 RAM 노드. 종료 시 상태 소실. 다시 배포 필요. 실제 blockchain 시뮬레이션 원하면 Sepolia 이용.

---

## 부록: Hardhat 표준 CLI

이 저장소의 편의 스크립트 (`npm run ...`) 는 아래 표준 hardhat 명령의 shortcut 입니다. **자신의 프로젝트에서 hardhat 을 쓸 때는 아래 표준 명령을 그대로 활용**하시면 됩니다.

| 목적 | 표준 명령 |
|---|---|
| 컴파일 | `npx hardhat compile` |
| 강제 재컴파일 | `npx hardhat compile --force` |
| 전체 테스트 | `npx hardhat test` |
| 특정 테스트 파일 | `npx hardhat test test/path/to/file.test.ts` |
| 가스 리포트 | `REPORT_GAS=true npx hardhat test` |
| 로컬 노드 | `npx hardhat node` |
| 배포 (스크립트) | `npx hardhat run scripts/path/to/deploy.ts --network localhost` |
| 배포 (Sepolia) | `npx hardhat run scripts/path/to/deploy.ts --network sepolia` |
| Ignition 배포 | `npx hardhat ignition deploy ignition/modules/Foo.ts --network localhost` |
| Etherscan 검증 | `npx hardhat verify --network sepolia 0xADDR "arg1" "arg2"` |
| 캐시·artifacts 삭제 | `npx hardhat clean` |
| 인터랙티브 콘솔 | `npx hardhat console --network localhost` |
| Task 목록 | `npx hardhat help` |

**Hardhat 학습 리소스**:
- [공식 문서](https://hardhat.org/docs)
- [Hardhat 튜토리얼](https://hardhat.org/tutorial)
- [Hardhat Toolbox](https://hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-toolbox) (본 프로젝트도 사용 중)

---

## 문의·이슈

- 실습 문제: [Issues](https://github.com/coincraft12/smart-contract-dev-course-practice/issues)
- 강좌: [coincraft.io](https://coincraft.io)
