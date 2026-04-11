# Smart Contract Dev Course — Practice Code

Solidity 스마트컨트랙트 개발 강좌 실습 코드

## 시작하기

```bash
cd practice
npm install
npm run compile
npm test
```

## 챕터별 실습

| 챕터 | 컨트랙트 | 테스트 |
|------|---------|--------|
| Ch04 | `contracts/ch04/SimpleStorage.sol` | `test/ch04/` |
| Ch06 | `contracts/ch06/Counter.sol`, `Voting.sol` | `test/ch06/` |
| Ch07 | `contracts/ch07/SimpleBank.sol` | `test/ch07/` |
| Ch08 | `contracts/ch08/VulnerableBank.sol`, `SafeBank.sol` | `test/ch08/` |
| Ch10 | `contracts/ch10/KRWCoin.sol` | `test/ch10/` |

## 챕터별 테스트 실행

```bash
npm run test:ch04   # SimpleStorage
npm run test:ch06   # Counter + Voting
npm run test:ch07   # SimpleBank
npm run test:ch08   # Reentrancy 공격/방어
npm run test:ch10   # KRWCoin
```

## 테스트넷 배포

```bash
# 1. 환경 변수 설정
cp .env.example .env
# .env 파일 편집: DEPLOYER_PRIVATE_KEY 입력

# 2. SimpleBank 배포
npm run deploy:ch07:testnet

# 3. KRWCoin 배포
npm run deploy:ch10:testnet
```

## 구조

```
practice/
├── contracts/
│   ├── ch04/  SimpleStorage.sol
│   ├── ch06/  Counter.sol, Voting.sol
│   ├── ch07/  SimpleBank.sol
│   ├── ch08/  VulnerableBank.sol, Attacker.sol, SafeBank.sol
│   └── ch10/  KRWCoin.sol
├── test/
│   ├── ch04/  SimpleStorage.test.ts
│   ├── ch06/  Counter.test.ts, Voting.test.ts
│   ├── ch07/  SimpleBank.test.ts
│   ├── ch08/  Reentrancy.test.ts
│   └── ch10/  KRWCoin.test.ts
├── scripts/
│   ├── ch07/  deploySimpleBank.ts, interactSimpleBank.ts
│   └── ch10/  deployKRWCoin.ts, interactKRWCoin.ts
├── hardhat.config.ts
└── package.json
```
