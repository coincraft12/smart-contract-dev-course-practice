# Smart Contract Dev Course — Practice Code

**coincraft.io 솔리디티 스마트컨트랙트 개발자 과정 · 수강생 실습 저장소** (Ch04~Ch21)

강의에서 사용하는 모든 컨트랙트·테스트·배포 스크립트가 챕터별로 정리돼 있습니다.

> 📖 **자세한 사용법은 [GUIDE_WORKFLOW.md](./GUIDE_WORKFLOW.md) 를 반드시 읽어주세요.**
> 폴더 구조·챕터별 학습 순서·배포·업그레이드·트러블슈팅 상세 가이드가 있습니다.

---

## Quick Start (5분 세팅)

```bash
# 1. 저장소 clone
git clone https://github.com/coincraft12/smart-contract-dev-course-practice.git
cd smart-contract-dev-course-practice

# 2. 의존성 설치 (반드시 --legacy-peer-deps)
npm install --legacy-peer-deps

# 3. 컴파일
npx hardhat compile

# 4. 전체 테스트 (466개 · ~1분 소요)
npm test
```

전체 테스트가 통과하면 정상 세팅 완료.

---

## 개발환경 요구사항

| 도구 | 버전 |
|---|---|
| Node.js | 20.x 이상 (22.x LTS 권장) |
| npm | 10.x 이상 |
| Git | 최신 |
| Python | 3.10 이상 (Ch17 Slither 만) |

---

## 챕터별 학습 워크플로우

각 챕터마다 4단계로 진행:

1. **강의노트 + 코드 대조** — 강의노트 상단의 실습 저장소 딥링크로 이동해서 `contracts/chXX/*.sol` 열기
2. **테스트로 검증** — `npm run test:chXX` 실행 (강의에서 배운 개념 확인)
3. **로컬 배포** (Ch07+) — `npm run deploy:chXX:local` (별도 터미널에서 `npm run node` 먼저)
4. **Sepolia 배포** (Ch14~) — `.env` 세팅 후 `npm run deploy:ch14:sepolia`

> 상세 절차: [GUIDE_WORKFLOW.md — 챕터 학습 워크플로우](./GUIDE_WORKFLOW.md#챕터-학습-워크플로우-4단계)

---

## 챕터 매트릭스

| 챕터 | 주제 | 테스트 | 실행 |
|---|---|---:|---|
| Ch04 | Remix → Hardhat 전환 | 46 | `npm run test:ch04` |
| Ch05 | Solidity 문법 (5-1/5-2/5-3) | 148 | `npm run test:ch05` |
| Ch06 | OpenZeppelin 권한 | 18 | `npm run test:ch06` |
| Ch07 | SimpleBank | 23 | `npm run test:ch07` |
| Ch08 | ERC-20 직접 구현 | 11 | `npm run test:ch08` |
| Ch09 | KRWCoin (OZ) | 32 | `npm run test:ch09` |
| Ch10 | MyNFT (ERC-721) | 21 | `npm run test:ch10` |
| Ch11 | ERC-1155 (11-1~11-4) | 49 | `npm run test:ch11` |
| Ch12 | msg.sender/call/delegatecall | 6 | `npm run test:ch12` |
| Ch13 | UUPS Proxy | 7 | `npm run test:ch13` |
| Ch14 | Sepolia 배포 | — | `npm run deploy:ch14:sepolia` |
| Ch15 | UUPS Upgrade | 5 | `npm run test:ch15` |
| Ch16 | 취약점·방어 | 8 | `npm run test:ch16` |
| Ch17 | Slither 정적 분석 | (외부) | `slither .` |
| Ch18 | 감사 리포트 | 4 | `npm run test:ch18` |
| Ch19 | 멀티시그 (EIP-712) | 8 | `npm run test:ch19` |
| Ch20 | MultisigService + Travel Rule | 10 | `npm run test:ch20` |
| Ch21 | 캡스톤 스타터 | 10 | `npm run test:ch21` |
| **합계** | **44 컨트랙트 · 40 파일** | **466** | |

> 각 챕터별 컨트랙트 파일·배포 스크립트 상세: [GUIDE_WORKFLOW.md — 챕터별 코드 매핑](./GUIDE_WORKFLOW.md#챕터별-코드-매핑)

---

## 핵심 명령 요약

```bash
# 컴파일 · 테스트
npm run compile              # 전체 컴파일
npm test                     # 전체 테스트 (466개)
npm run test:chXX            # 특정 챕터만
npm run test:gas             # 가스 리포트 포함

# 로컬 배포
npm run node                 # 별도 터미널: 로컬 노드
npm run deploy:chXX:local    # 배포

# Sepolia 배포
cp .env.example .env         # .env 편집: RPC · Private Key · Etherscan Key
npm run deploy:ch14:sepolia

# UUPS 업그레이드
npm run deploy:ch13:local            # V1 배포 (Proxy 주소 출력)
PROXY_ADDRESS=0x... npm run upgrade:ch15   # V2 로 업그레이드

# 정리
npm run clean                # artifacts/cache 삭제
```

> 전체 스크립트 목록: `npm run` (인자 없이)
> 상세 설명: [GUIDE_WORKFLOW.md — package.json 스크립트 총정리](./GUIDE_WORKFLOW.md#packagejson-스크립트-총정리)

---

## 프로젝트 구조 요약

```
smart-contract-dev-course-practice/
├── contracts/       Solidity 소스 (chXX/[sub/])
├── test/            테스트 (chXX/[sub/])
├── scripts/         배포·상호작용 (chXX/)
├── ignition/        Hardhat Ignition 모듈
├── hardhat.config.ts
├── package.json
├── README.md        (이 파일 · Quick Start)
└── GUIDE_WORKFLOW.md  (상세 워크플로우 · 이슈 해결)
```

> 상세 구조: [GUIDE_WORKFLOW.md — 폴더 구조 상세](./GUIDE_WORKFLOW.md#폴더-구조-상세)

---

## 이 저장소의 특징 (일반 Hardhat 프로젝트와 다른 점)

| 항목 | 일반 프로젝트 | 이 저장소 |
|---|---|---|
| 컨트랙트 폴더 | `contracts/` 평평 | **`contracts/chXX/[sub/]`** 챕터별 |
| 테스트 폴더 | `test/` 평평 | **`test/chXX/[sub/]`** 챕터별 |
| 테스트 실행 | `npx hardhat test` | 챕터 편의: **`npm run test:chXX`** |
| 배포 실행 | `npx hardhat run scripts/foo.ts` | 챕터 편의: **`npm run deploy:chXX:local`** |

**표준 Hardhat CLI 도 그대로 사용 가능** — [GUIDE_WORKFLOW.md — 부록](./GUIDE_WORKFLOW.md#부록-hardhat-표준-cli) 참조 (자신의 프로젝트에서 hardhat 을 쓸 때 활용).

---

## 자주 겪는 문제

| 증상 | 해결 |
|---|---|
| `Error HH12: Trying to use a non-local installation` | `npm install --legacy-peer-deps` |
| `Error HH308: Unrecognized positional argument` | `npx hardhat compile` (파일 인자 불가) |
| Sepolia `insufficient funds` | Sepolia Faucet 에서 무료 ETH 획득 |
| 로컬 배포 후 재시작 시 사라짐 | 로컬 노드(`npm run node`) 는 RAM · 재시작 시 다시 배포 필요 |

> 더 많은 문제 · 상세 해결: [GUIDE_WORKFLOW.md — 자주 겪는 문제](./GUIDE_WORKFLOW.md#자주-겪는-문제)

---

## 문의·이슈

- 실습 문제: [Issues](https://github.com/coincraft12/smart-contract-dev-course-practice/issues)
- 강좌 사이트: [coincraft.io](https://coincraft.io)
