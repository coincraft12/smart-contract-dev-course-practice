# Smart Contract Security Audit Report
## AuditTarget — CoinCraft Ch13 실습 컨트랙트

---

**Prepared for**: CoinCraft Academy — Smart Contract Development Course (Ch13)
**Prepared by**: CoinCraft Audit Lab (교육 목적 가상 감사팀)
**Report Version**: v1.2 (Final · post-remediation)
**Delivery Date**: YYYY-MM-DD
**Confidentiality**: Public (교육 자료)

---

> ⚠️ **본 리포트는 CoinCraft WEB3 Architect 강좌 Ch13-3의 강사 시연용 완성 예시입니다.** 실제 프로덕션 감사가 아니며, 여기 사용된 감사팀·감사 회사 명칭은 교육 목적의 가상 명칭입니다. 실무 감사 리포트가 어떤 구성·깊이·형식으로 작성되는지를 학습자에게 온전히 보여주기 위해 OpenZeppelin·Trail of Bits·ConsenSys Diligence·Cyfrin 등 실 감사 회사의 public 리포트 구조를 참조·통합했습니다.
>
> 실습 완성 최소본은 같은 폴더의 `REPORT.md` 를 참조하십시오.

---

## 목차 (Table of Contents)

1. [Executive Summary](#1-executive-summary)
2. [About the Firm](#2-about-the-firm)
3. [Disclaimer & Legal Notice](#3-disclaimer--legal-notice)
4. [Revision History](#4-revision-history)
5. [Project Overview](#5-project-overview)
6. [System Overview & Trust Model](#6-system-overview--trust-model)
7. [Threat Model](#7-threat-model)
8. [Scope](#8-scope)
9. [Audit Approach & Methodology](#9-audit-approach--methodology)
10. [Severity Rating Methodology](#10-severity-rating-methodology)
11. [Findings Summary](#11-findings-summary)
12. [Detailed Findings](#12-detailed-findings)
13. [Remediation Verification](#13-remediation-verification)
14. [Test Suite Coverage](#14-test-suite-coverage)
15. [Additional Recommendations](#15-additional-recommendations)
16. [Appendix A — Tool Raw Output](#appendix-a--tool-raw-output)
17. [Appendix B — CWE·SWC 매핑 근거](#appendix-b--cweswc-매핑-근거)
18. [Appendix C — Audit Team Credits](#appendix-c--audit-team-credits)
19. [Signature Page](#19-signature-page)

---

## 1. Executive Summary

CoinCraft Audit Lab (이하 "감사팀")은 CoinCraft Academy로부터 `AuditTarget.sol` 컨트랙트의 보안 감사를 의뢰받아 **2주간 (2인 × 10 인일)** 수행했다. 본 컨트랙트는 사용자가 ETH를 지불하고 토큰 크레딧을 매입하는 소규모 판매 컨트랙트다.

### 1.1 Overall Risk Assessment

| 항목 | 평가 |
|---|---|
| **감사 대상 크기** | 79 LoC (Solidity 0.8.24) |
| **감사 기간** | YYYY-MM-DD ~ YYYY-MM-DD |
| **투입 인시** | 20 인일 (감사자 2명 × 2주) |
| **총 발견 항목** | 6건 |
| **Critical / High / Medium / Low / Info** | 0 / 2 / 2 / 1 / 1 |
| **Overall Risk Rating** | 🔴 **HIGH** (배포 불가 · High 이슈 remediation 필수) |
| **Recommendation** | High 2건 remediation 후 재감사(v1.2)에서 Resolved 확인. 현 상태 v1.2에서 High·Medium·Low 항목 모두 Fixed 또는 Acknowledged 처리 완료. **Mainnet 배포 승인 가능.** |

### 1.2 Findings Distribution

```
Critical  │
High      │ ██ (2)
Medium    │ ██ (2)
Low       │ █  (1)
Info      │ █  (1)
──────────┴──────────
합계       │ 6
```

### 1.3 Key Findings (요약)

- **H-01** `updatePrice(0)` 로 판매 함수가 영구 revert → **DoS**. Remediation 완료.
- **H-02** `receive()` 가 `saleClosed` 게이트 우회 → **회계 오염**. Remediation 완료.
- **M-01** 정수 나눗셈 dust 손실. Client Acknowledged, 다음 릴리스 반영 예정.
- **M-02** `raised >= goal` 자동 종료 부재. Remediation 완료.
- **L-01** `onlyOwner` modifier 부재. Remediation 완료.
- **I-01** 환불·취소 기능 부재. 백서 조건상 Client **Won't Fix** — 감사팀 인지.

### 1.4 Deployment Decision

**✅ Mainnet 배포 승인** (v1.2 기준).

전 High·Medium·Low 이슈가 remediation 또는 명시적 acknowledge 처리되었으며, Info 1건은 백서 정합성을 근거로 Won't Fix 판정. 감사팀은 § 13 Remediation Verification 에서 각 fix 커밋의 진위를 재검증했다.

---

## 2. About the Firm

**CoinCraft Audit Lab**은 CoinCraft Academy의 부속 교육 감사팀으로, 본 리포트는 강좌 수강생에게 실무 감사 리포트의 구조와 깊이를 보여주기 위한 교육 목적 시연물이다. 실제 상용 감사 서비스는 제공하지 않는다.

교육 목적상 본 감사팀은 OpenZeppelin Security · Trail of Bits · ConsenSys Diligence · Cyfrin · Halborn 등 실제 감사 회사의 리포트 구조·심각도 산정 방식·finding 형식을 참조했다. 실제 감사 계약을 검토·의뢰하려는 학습자는 위 회사들의 public 리포트 아카이브를 반드시 직접 확인하기 바란다.

---

## 3. Disclaimer & Legal Notice

1. **본 감사는 상기 명시된 커밋 해시 시점의 소스 코드에만 유효하다.** 감사 완료 이후 어떤 이유로든 코드가 변경된 경우 (라이브러리 업그레이드·컴파일러 버전 변경·리팩터링 포함) 본 감사의 결론은 자동으로 무효화되며 재감사가 필요하다.

2. **본 감사는 완전한 보안 보장을 의미하지 않는다.** 스마트컨트랙트 보안은 소스 코드뿐 아니라 배포 환경, 오라클, 관리자 키 관리, 오프체인 인프라, 사용자 프론트엔드 등 다층적 요소에 의해 결정된다. 본 감사는 소스 코드 계층에 한정된다.

3. **감사팀은 최선의 노력을 다했으나, 모든 취약점의 발견을 보장할 수 없다.** 향후 알려지지 않은 새로운 공격 벡터가 발견될 수 있으며, 그러한 경우에도 감사팀은 소급 책임을 지지 않는다.

4. **본 리포트는 투자 조언이 아니다.** 프로젝트의 경제적 성공, 토큰 가치, 사업 모델 타당성은 본 감사의 범위 밖이다.

5. **컴파일러 및 런타임 리스크.** Solidity 컴파일러(v0.8.24) 및 EVM 자체의 알려지지 않은 결함, 그리고 특정 EVM 구현체의 비결정성에 대해서는 감사팀이 책임지지 않는다.

6. **본 감사의 결과 공개.** 클라이언트는 본 리포트를 자유롭게 공개할 수 있으나, 부분 인용 또는 왜곡된 발췌를 통해 감사 결론을 오도하는 행위는 계약 위반으로 간주된다.

---

## 4. Revision History

| 판 | 날짜 | 상태 | 주요 변경 |
|---|---|---|---|
| v0.1 | YYYY-MM-DD | Internal Draft | 초기 발견 항목 6건 초안 |
| v1.0 | YYYY-MM-DD | Delivered to Client | Executive Summary·6 findings 상세·심각도 산정 완료. Client Response 미기입 상태 |
| v1.1 | YYYY-MM-DD | Client Response Received | 클라이언트 응답 수령 (Fixed 4건 · Acknowledged 1건 · Won't Fix 1건) |
| **v1.2** | **YYYY-MM-DD** | **Final (Remediation Verified)** | **Fixed 항목 4건 재검증 완료 · 배포 승인 판정 부여** |

---

## 5. Project Overview

### 5.1 Project Description

`AuditTarget.sol` 은 다음 기능을 제공하는 소규모 판매 (initial sale) 컨트랙트다:
- 사용자가 ETH 를 지불하고 정수 단위 토큰 크레딧을 매입 (`buy()`)
- `owner` 가 판매 가격 조정 (`updatePrice()`) · 판매 종료 (`closeSale()`) · 자금 인출 (`withdraw()`)
- `receive()` 를 통한 대체 매입 경로

### 5.2 Contract Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Users (EOA)                        │
│  ┌─────────┐   ┌──────────────┐   ┌─────────────┐   │
│  │  buy()  │   │  receive()   │   │  view calls │   │
│  └────┬────┘   └──────┬───────┘   └──────┬──────┘   │
└───────┼──────────────┼──────────────────┼───────────┘
        │              │                  │
        ▼              ▼                  ▼
┌─────────────────────────────────────────────────────┐
│              AuditTarget.sol                          │
│  ┌──────────────────────────────────────────────┐   │
│  │ State: owner, tokenPrice, goal,              │   │
│  │        raised, saleClosed, tokens[]          │   │
│  └──────────────────────────────────────────────┘   │
│  ┌─────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ Public  │  │  onlyOwner   │  │   receive()  │   │
│  │  buy    │  │  updatePrice │  │  (payable    │   │
│  │         │  │  closeSale   │  │   fallback)  │   │
│  │         │  │  withdraw    │  │              │   │
│  └─────────┘  └──────┬───────┘  └──────────────┘   │
└─────────────────────┼───────────────────────────────┘
                      │
                      ▼
              ┌───────────────┐
              │   Owner EOA   │
              │  (withdraw)   │
              └───────────────┘
```

### 5.3 Actors and Roles

| Actor | 권한 | 신뢰 가정 |
|---|---|---|
| **Owner** | `updatePrice`·`closeSale`·`withdraw` 실행 | 컨트랙트 배포자. 자금 관리 및 판매 라이프사이클 통제 권한 보유. 악의적이지 않다고 가정하나 조작 실수 가능성 고려 필요 |
| **User (EOA)** | `buy` · `receive` 트리거 | 임의의 외부 계정. 익명·적대적 가능성 상시 존재 |
| **Contract (Attacker)** | 재진입·프록시 호출 시도 가능 | 본 컨트랙트에 외부 콜이 `withdraw` 하나뿐이며 owner-only이므로 재진입 벡터는 제한적 |

---

## 6. System Overview & Trust Model

### 6.1 Trust Assumptions

1. **Owner 키 관리**: `owner` 는 단일 EOA 로, 키 도난·유실 시 판매 라이프사이클 통제가 불가능해진다. 프로덕션에서는 multisig 또는 timelock 권장 (§ 15).
2. **컴파일러 신뢰**: Solidity 0.8.24 컴파일러 및 EVM cancun의 correctness 를 신뢰한다.
3. **오라클 부재**: 본 컨트랙트는 외부 오라클을 참조하지 않으므로 오라클 조작 벡터는 없다.
4. **경제 모델 신뢰**: `tokenPrice`, `goal` 파라미터의 경제적 적정성 판단은 감사 범위 밖이다.

### 6.2 Invariants (감사팀이 확인한 불변식)

| # | 불변식 | 상태 (v1.2 기준) |
|---|---|:-:|
| I-1 | `tokenPrice > 0` (division 방지) | ✅ H-01 fix 후 성립 |
| I-2 | `saleClosed == true` 이후 `raised`·`tokens` 는 증가하지 않는다 | ✅ H-02 fix 후 성립 |
| I-3 | `raised == Σ(msg.value paid in buy/receive)` | ✅ 성립 |
| I-4 | 관리자 함수는 `owner` 만 호출 가능 | ✅ 성립 (L-01 modifier 도입으로 안전성 강화) |
| I-5 | `raised >= goal` 도달 시 `saleClosed == true` | ✅ M-02 fix 후 성립 |

---

## 7. Threat Model

STRIDE 모델로 위협을 분류하여 각 위협에 대응하는 컨트롤 (Control) 을 매핑했다.

| STRIDE | 위협 시나리오 | 컨트롤 (v1.2 기준) | 잔여 리스크 |
|---|---|---|---|
| **S**poofing | 공격자가 owner 로 위장하여 관리자 함수 호출 | `onlyOwner` modifier (L-01 fix) | 없음 |
| **T**ampering | `receive()` 우회로 종료 후 상태 변경 | H-02 fix (`buy()` 위임) | 없음 |
| **R**epudiation | 관리자가 판매 이력 조작·부정 | 전 트랜잭션이 온체인 로그로 남음 (`Bought`·`SaleClosed` 이벤트) | 없음 |
| **I**nformation Disclosure | 프라이버시 유출 | 판매 자체가 공개 정보이므로 해당 사항 없음 | N/A |
| **D**oS | `updatePrice(0)` 로 `buy()` 영구 revert | H-01 fix (`require(newPrice > 0)`) | 없음 |
| **E**scalation of Privilege | 사용자가 관리자 권한 획득 | 권한 획득 함수 없음 | 없음 |

---

## 8. Scope

### 8.1 In-Scope

| 파일 | LoC | 커밋 해시 |
|---|---:|---|
| `contracts/ch13/AuditTarget.sol` | 79 | `<40자 hash>` |

### 8.2 Out-of-Scope

- 배포 스크립트 (`scripts/deploy-*.ts`)
- 프론트엔드 (`web/`)
- 외부 오라클 (해당 없음)
- 소셜 로그인·KYC 흐름 (해당 없음)
- 다른 컨트랙트 (`VulnerableBank.sol`·`SafeBank.sol`·`Attacker.sol`·`TxOriginVictim.sol`·`SlitherTarget.sol`) — 별도 실습 대상

### 8.3 Compiler & Environment

- **Solidity**: 0.8.24
- **EVM Target**: cancun
- **Framework**: Hardhat 2.x
- **Test Framework**: Chai · Mocha
- **Static Analysis**: Slither v0.11.6

---

## 9. Audit Approach & Methodology

### 9.1 Effort Distribution

| 활동 | 비중 |
|---|---:|
| 수동 코드 리뷰 (line-by-line) | 50% |
| 정적 분석 (Slither) 실행·판독 | 15% |
| 동적 테스트 작성 (Hardhat PoC) | 25% |
| 리포트 작성·재검증 | 10% |

### 9.2 Detailed Approach

| # | 방법 | 세부 |
|---|---|---|
| 1 | **수동 코드 리뷰** | (1) CEI 패턴 준수 확인 (2) integer 연산 안전성 (3) access control 매트릭스 작성 (4) 상태 전이 그래프 도출 후 불변식 대조 |
| 2 | **정적 분석** | Slither v0.11.6 `--exclude-dependencies` 실행 → 참고 결과 Appendix A. 자동 탐지가 잡지 못한 business logic 결함은 수동 리뷰에서 발견 |
| 3 | **동적 테스트** | 발견 항목별 PoC 테스트 (`test/ch13/AuditFindings.test.ts`) 4건 · 회귀 방지용 재진입 (`Reentrancy.test.ts` 6건) · tx.origin (`TxOrigin.test.ts` 2건) · 접근 제어 (`AccessControl.test.ts` 5건, AuditTarget 배포) 병행. **Hardhat 총 17건, 전부 pass 확인** (~1s) |
| 3b | **퍼즈 테스트** | Foundry fuzz (`test/ch13/Fuzz.t.sol`) — 함수 3개(buy 불변식 · updatePrice postcondition · non-owner negative invariant), `vm.assume`/`vm.prank`/`vm.deal` 기반, 각 256 runs (`--fuzz-runs 10000` 로 정밀 실행 가능). **3함수 × 256 runs = 768 실행 전부 pass** |
| 4 | **Threat Modeling** | STRIDE 프레임워크 적용, 각 위협별 컨트롤 매핑 (§ 7) |
| 5 | **재감사 (Remediation Verification)** | 클라이언트 fix 커밋 대상으로 (a) 원본 finding 재현 시나리오 실행 (b) 신규 회귀 검사 (c) 커버리지 재측정 |

### 9.3 Tools Used

| 도구 | 버전 | 용도 |
|---|---|---|
| Slither | v0.11.6 | 정적 취약점 탐지 |
| Hardhat | 2.22.x | 배포·테스트 프레임워크 (단위·통합) |
| Foundry (forge) | v1.7.x | Fuzz 테스트 (`vm.assume` · runs 256+) |
| forge-std | latest | Foundry 표준 라이브러리 (Test·cheatcodes) |
| solc | 0.8.24 | 컴파일러 |
| Chai + Mocha | 4.x · 10.x | Hardhat 테스트 어서션·러너 |

### 9.4 Not Used (사유 명시)

| 도구 | 미사용 사유 |
|---|---|
| Certora Prover | 형식 검증 도구, 본 컨트랙트 규모 대비 오버엔지니어링 |
| Manticore·Mythril | 심볼릭 실행, Slither가 잡은 항목과 중복도 높음 |
| Foundry invariant testing (`invariant_*`) | 다중 액터 상태 머신 fuzz. 본 감사 범위에서는 단일 함수 fuzz(`testFuzz_*`) 로 충분. 프로덕션 확장 시 도입 권장 (§ 15) |

---

## 10. Severity Rating Methodology

본 감사는 감사팀 자체 정의 심각도를 사용하며, 참고로 CVSS 3.1 base score · CWE 번호를 병기한다.

### 10.1 Impact × Likelihood Matrix

| Impact ↓ / Likelihood → | 낮음 | 중간 | 높음 |
|---|---|---|---|
| **높음** (자금 전액 손실·서비스 완전 중단) | Medium | High | **Critical** |
| **중간** (일부 손실·기능 부분 마비) | Low | Medium | High |
| **낮음** (경미한 불편·UX 흠) | Informational | Low | Medium |

### 10.2 Severity Definitions

| Severity | 정의 | 대응 요구 |
|---|---|---|
| **Critical** | 즉시 자금 전액 손실·서비스 완전 중단, 익명 공격자가 쉽게 트리거 | 배포 전 반드시 fix |
| **High** | 상당한 손실·기능 마비, 트리거 조건 존재하나 실현 가능 | 배포 전 반드시 fix |
| **Medium** | 부분적 손실·기능 저하, 조건부 트리거 | 다음 릴리스에서 fix 권장 |
| **Low** | 경미한 UX·코드 품질 이슈 | 다음 스프린트 백로그 |
| **Informational** | 개선 제안, 즉시 위험 없음 | 프로젝트 재량 |

### 10.3 CVSS 3.1 매핑 (참고)

각 finding 상세 § 12 에 CVSS Base Score 및 벡터를 병기한다.

---

## 11. Findings Summary

| ID | 제목 | Severity | SWC | CWE | CVSS 3.1 | Status (v1.2) |
|---|---|:-:|---|---|:-:|:-:|
| H-01 | `updatePrice(0)` division-by-zero DoS | 🔴 High | SWC-101 | CWE-369 | 6.5 | ✅ Fixed |
| H-02 | `receive()` bypasses `saleClosed` | 🔴 High | SWC-N/A | CWE-284 | 7.5 | ✅ Fixed |
| M-01 | Integer division dust loss | 🟠 Medium | SWC-101 | CWE-682 | 4.3 | 🟡 Acknowledged |
| M-02 | Missing auto-close on `raised >= goal` | 🟠 Medium | SWC-N/A | CWE-841 | 5.3 | ✅ Fixed |
| L-01 | Missing `onlyOwner` modifier (duplication) | 🔵 Low | SWC-N/A | CWE-1122 | 3.1 | ✅ Fixed |
| I-01 | No refund/cancel mechanism | ⚪ Info | SWC-N/A | N/A | N/A | ⚠️ Won't Fix (백서 근거) |

---

## 12. Detailed Findings

---

### H-01. `updatePrice(0)` 허용 → division-by-zero DoS

| 항목 | 내용 |
|---|---|
| **Finding ID** | CC-AUDIT-2026-001 (H-01) |
| **Severity** | 🔴 **High** |
| **Impact** | High — 판매 함수 `buy()` 영구 revert, 서비스 완전 중단 |
| **Likelihood** | Medium — 권한 필요(`owner`)이나 실수·오조작·키 탈취로 트리거 가능 |
| **SWC** | SWC-101 (Integer Arithmetic — division-by-zero) |
| **CWE** | CWE-369 (Divide By Zero) |
| **CVSS 3.1 Base Score** | **6.5 (Medium)** · Vector: `AV:N/AC:L/PR:H/UI:N/S:C/C:N/I:N/A:H` |
| **위치** | `AuditTarget.sol:64-69` (`updatePrice`) |
| **Status** | ✅ Fixed (v1.1 클라이언트 fix → v1.2 재검증 완료) |

**Description**

`updatePrice(uint256 newPrice)` 함수는 owner가 새로운 가격을 설정할 수 있게 하지만, `newPrice > 0` 조건 검증이 없다. `newPrice=0` 설정 후 사용자가 `buy()` 를 호출하면 `amount = msg.value / tokenPrice` 라인에서 EVM Panic 0x12 (division-by-zero)가 발생하며, 이는 revert 로 전파되어 모든 매입이 실패한다.

컨트랙트에는 `unpause()` 나 emergency reset 함수가 없으므로, 이 상태는 owner가 다시 `updatePrice(valid)` 를 호출하기 전까지 무한 지속된다. Owner가 키를 잃었거나 부재 중이면 회복 불가능.

**Attack Scenario (Proof of Concept)**

```typescript
// test/ch13/AuditFindings.test.ts::H-01
it("owner가 price=0 설정 후 buy()는 panic revert", async function () {
    const { target, owner, alice } = await loadFixture(deploy);
    await target.connect(owner).updatePrice(0);
    await expect(
        target.connect(alice).buy({ value: ethers.parseEther("1") })
    ).to.be.revertedWithPanic(0x12); // division or modulo by zero
});
```

실행 결과: v1.0 커밋 대상 실행 시 test **PASS** (즉 취약점 재현 성공).

**Recommendation**

```solidity
function updatePrice(uint256 newPrice) external onlyOwner {  // L-01 fix 병행
    require(newPrice > 0, "price=0");                        // ← 신규 추가
    emit PriceUpdated(tokenPrice, newPrice);
    tokenPrice = newPrice;
}
```

또는 `unchecked` 없이 `if (newPrice == 0) revert InvalidPrice()` 스타일의 custom error 사용 (가스 절약 부수 효과).

**Remediation Verification (v1.2)**

- 클라이언트 fix 커밋: `<hash>`
- 재검증 방법: 동일 PoC 테스트 재실행
- 결과: `updatePrice(0)` 자체가 revert 되며, 취약점 재현 불가 확인
- **Status → Fixed**

**Client Response**

**Fixed** — 커밋 `<hash>`에서 `require(newPrice > 0, "price=0")` 추가. 감사팀 검증 완료.

---

### H-02. `receive()` 가 `saleClosed` 게이트 우회

| 항목 | 내용 |
|---|---|
| **Finding ID** | CC-AUDIT-2026-002 (H-02) |
| **Severity** | 🔴 **High** |
| **Impact** | High — 종료된 세일에 자금 계속 유입, `tokens`·`raised` 회계 오염, 초과 매각 지속 |
| **Likelihood** | High — 익명 EOA 누구나 `.send`·`.transfer`·`.call{value}("")` 로 트리거 가능. 권한 불필요 |
| **SWC** | SWC-N/A (Business Logic — Access Control Bypass, SWC 공식 카탈로그 미분류) |
| **CWE** | CWE-284 (Improper Access Control) |
| **CVSS 3.1 Base Score** | **7.5 (High)** · Vector: `AV:N/AC:L/PR:N/UI:N/S:C/C:N/I:H/A:N` |
| **위치** | `AuditTarget.sol:54-62` (`receive`) |
| **Status** | ✅ Fixed (v1.1 클라이언트 fix → v1.2 재검증 완료) |

**Description**

`buy()` 함수는 `require(!saleClosed, "sale closed")` 로 판매 종료 후 매입을 차단한다. 그러나 `receive()` 함수는 `buy()` 를 호출하는 대신 상태를 직접 변경하도록 구현되어 있어, `saleClosed` 게이트를 완전히 우회한다.

공격자는 종료된 세일에 대해 단순히 컨트랙트 주소로 ETH를 전송하는 것만으로 `tokens` 잔액과 `raised` 총액을 증가시킬 수 있다. 이는 다음 결과를 초래한다:
- 백서상 발행 한도를 초과한 토큰 배분
- 종료 후 진입한 매수자에게 부당한 이익 (또는 손실) 발생
- 프로젝트 재무 보고의 신뢰성 훼손
- 규제 관점에서 판매 라이프사이클 통제 실패로 간주될 수 있음

**Attack Scenario (Proof of Concept)**

```typescript
// test/ch13/AuditFindings.test.ts::H-02
it("sale 종료 후에도 receive()로 ETH가 들어와 tokens·raised가 증가 (회계 오염)", async function () {
    const { target, owner, alice, price } = await loadFixture(deploy);
    await target.connect(owner).closeSale();

    // buy()는 saleClosed 게이트로 방어됨
    await expect(target.connect(alice).buy({ value: ethers.parseEther("1") }))
        .to.be.revertedWith("sale closed");

    // 그러나 receive()는 buy()를 우회하고 상태를 직접 변경
    const paid = price * 3n;
    await alice.sendTransaction({
        to: await target.getAddress(),
        value: paid,
    });

    expect(await target.tokens(alice.address)).to.equal(3);
    expect(await target.raised()).to.equal(paid);
    expect(await target.saleClosed()).to.be.true;
});
```

실행 결과: v1.0 커밋 대상 실행 시 test **PASS** (취약점 재현 성공).

**Recommendation**

두 가지 방안 중 택일:

**Option (A) — 종료 후 수신 차단** (최소 변경):
```solidity
receive() external payable {
    require(!saleClosed, "sale closed");  // ← 신규 추가
    require(msg.value > 0, "no eth");
    // ... 이하 동일
}
```

**Option (B) — 단일 진입점 원칙 (권장)**:
```solidity
receive() external payable { buy(); }
```

Option (B) 를 권장하는 이유는 `saleClosed` 외에 향후 추가될 모든 게이트 (예: rate limit · KYC 체크 · pause) 를 `buy()` 한 곳에서만 관리하면 되기 때문이다. 다중 진입점은 유지보수 관점에서 지속적 리스크 원천이다.

**Remediation Verification (v1.2)**

- 클라이언트 fix 커밋: `<hash>` — Option (B) 채택
- 재검증: PoC 테스트를 fix 커밋 대상 재실행 → 예상 결과대로 두 매입 경로 모두 `saleClosed` 후 revert 확인
- 회귀 테스트: `buy()` 정상 흐름 (sale open 상태) 도 함께 통과 확인
- **Status → Fixed**

**Client Response**

**Fixed** — Option (B) 채택 (`receive() external payable { buy(); }`). 커밋 `<hash>`.

---

### M-01. 정수 나눗셈으로 사용자 dust 손실

| 항목 | 내용 |
|---|---|
| **Finding ID** | CC-AUDIT-2026-003 (M-01) |
| **Severity** | 🟠 **Medium** |
| **Impact** | Medium — `msg.value % tokenPrice` wei가 사용자에게 반환되지 않고 컨트랙트에 잔류 |
| **Likelihood** | Medium — `tokenPrice` 가 wei 단위 정수인 한 다수 구매에서 발생 |
| **SWC** | SWC-101 (Integer Arithmetic — precision loss) |
| **CWE** | CWE-682 (Incorrect Calculation) |
| **CVSS 3.1 Base Score** | **4.3 (Medium)** · Vector: `AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:N` |
| **위치** | `AuditTarget.sol:47` (`buy` 내부 `amount = msg.value / tokenPrice`) |
| **Status** | 🟡 Acknowledged (Client가 다음 릴리스 반영 예정) |

**Description**

`buy()` 함수는 정수 나눗셈으로 매입 수량을 계산한다: `amount = msg.value / tokenPrice`. 사용자가 `tokenPrice` 의 정확한 배수가 아닌 금액을 보낸 경우, 나머지 wei (`msg.value % tokenPrice`) 는 사용자에게 크레딧으로도 반환으로도 처리되지 않고 컨트랙트에 잔류한다.

이는 소액 손실이지만 다음 관점에서 문제다:
- 매입마다 반복 발생 시 누적 손실 유의미
- Owner가 `withdraw` 로 이 잔여분을 가져갈 수 있어 사실상 은닉된 수수료
- 사용자 관점에서 예상치 못한 손실은 신뢰 훼손

**Attack Scenario (Proof of Concept)**

```typescript
// test/ch13/AuditFindings.test.ts::M-01
it("나머지 wei는 컨트랙트에 잔류하고 사용자에게 tokens 증분 없음", async function () {
    const { target, price, alice } = await loadFixture(deploy);
    const paid = price + price / 2n; // 1.5 * price
    await target.connect(alice).buy({ value: paid });

    expect(await target.tokens(alice.address)).to.equal(1);  // 1개만 크레딧
    expect(await ethers.provider.getBalance(await target.getAddress()))
        .to.equal(paid);  // 나머지 0.5 * price는 컨트랙트에 잔류
});
```

**Recommendation**

두 가지 방안:

**Option (A) — 정확한 배수만 허용** (엄격):
```solidity
require(msg.value % tokenPrice == 0, "not whole tokens");
```

**Option (B) — 나머지 자동 환불** (사용자 친화):
```solidity
uint256 amount = msg.value / tokenPrice;
uint256 refund = msg.value - (amount * tokenPrice);
if (refund > 0) {
    (bool ok, ) = msg.sender.call{value: refund}("");
    require(ok, "refund failed");
}
```

Option (B) 사용 시 `refund` 시 재진입 리스크 대비 필요 (CEI 순서 준수). Option (A) 는 UX 저하 가능성 있음.

**Client Response**

**Acknowledged** — 감사 결과 인지. 다음 릴리스(v2.0)에서 Option (B) 도입 예정. 임시 조치로 UI 프론트엔드에서 정확한 배수 계산 후 전송하도록 안내 문구 추가 (2026-QX 완료 목표).

---

### M-02. `raised >= goal` 도달 후 자동 종료 없음

| 항목 | 내용 |
|---|---|
| **Finding ID** | CC-AUDIT-2026-004 (M-02) |
| **Severity** | 🟠 **Medium** |
| **Impact** | Medium — 목표 자금 초과 매각 → 백서상 발행 한도 위반 가능 |
| **Likelihood** | High — 인기 프로젝트에서 goal 근접 시 다수 매입 트랜잭션이 몰림. Owner 수동 `closeSale()` 이 지연되면 그 사이 매입 지속 |
| **SWC** | SWC-N/A (Business Logic — Missing State Transition) |
| **CWE** | CWE-841 (Improper Enforcement of Behavioral Workflow) |
| **CVSS 3.1 Base Score** | **5.3 (Medium)** · Vector: `AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:L` |
| **위치** | `AuditTarget.sol:43-52` (`buy` 종료 판정 부재) |
| **Status** | ✅ Fixed |

**Description**

`buy()` 는 매입 성공 후 `raised` 를 증가시키지만, `raised >= goal` 도달 여부를 체크하고 자동으로 `saleClosed` 를 전환하지 않는다. 결과적으로:
- Goal 도달 이후 owner가 `closeSale()` 을 호출하기 전까지 매입 계속 성공
- 같은 블록 내 여러 매입 트랜잭션이 있으면 전부 성공 → `raised > goal`
- 백서 명시한 발행 한도 초과 시 규제·신뢰 리스크

**Attack Scenario (PoC)**

```typescript
// test/ch13/AuditFindings.test.ts::M-02
it("raised가 goal을 넘어도 saleClosed=false 유지", async function () {
    const { target, goal, alice } = await loadFixture(deploy);

    await target.connect(alice).buy({ value: goal });
    expect(await target.raised()).to.equal(goal);
    expect(await target.saleClosed()).to.be.false;  // 자동 종료 없음

    // 초과 매각 가능
    await target.connect(alice).buy({ value: ethers.parseEther("1") });
});
```

**Recommendation**

```solidity
function buy() public payable {
    require(!saleClosed, "sale closed");
    require(msg.value > 0, "no eth");

    uint256 amount = msg.value / tokenPrice;
    tokens[msg.sender] += amount;
    raised += msg.value;

    emit Bought(msg.sender, amount, msg.value);

    if (raised >= goal) {
        saleClosed = true;
        emit SaleClosed();
    }
}
```

**Client Response**

**Fixed** — 커밋 `<hash>` 반영. 재검증 통과.

---

### L-01. `onlyOwner` modifier 부재로 권한 검사 중복

| 항목 | 내용 |
|---|---|
| **Finding ID** | CC-AUDIT-2026-005 (L-01) |
| **Severity** | 🔵 **Low** |
| **Impact** | Low — 코드 품질·유지보수성 이슈. 직접 자금 손실 없음 |
| **Likelihood** | Medium — 향후 함수 추가 시 실수로 권한 체크 누락 가능 |
| **SWC** | SWC-N/A (Code Quality) |
| **CWE** | CWE-1122 (Insufficient Adherence to Expected Conventions) |
| **CVSS 3.1 Base Score** | **3.1 (Low)** · Vector: `AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:L/A:N` |
| **위치** | `AuditTarget.sol:65, 72, 78` — `updatePrice`·`closeSale`·`withdraw` 세 곳 중복 |
| **Status** | ✅ Fixed |

**Description**

세 관리자 함수가 동일한 `require(msg.sender == owner, "not owner")` 를 반복하고 있다. DRY 원칙 위반 및 향후 함수 추가 시 실수로 권한 체크를 누락할 여지가 있다. Solidity 모범 사례는 `modifier` 로 추출하는 것.

**Recommendation**

```solidity
modifier onlyOwner() {
    require(msg.sender == owner, "not owner");
    _;
}

function updatePrice(uint256 newPrice) external onlyOwner { ... }
function closeSale() external onlyOwner { ... }
function withdraw(uint256 amount) external onlyOwner { ... }
```

OpenZeppelin `Ownable` 상속을 통해 표준화된 owner 관리를 도입하는 것이 더 안전 (§ 15 참조).

**Client Response**

**Fixed** — 커밋 `<hash>`에서 `onlyOwner` modifier 도입.

---

### I-01. 환불·취소 기능 부재

| 항목 | 내용 |
|---|---|
| **Finding ID** | CC-AUDIT-2026-006 (I-01) |
| **Severity** | ⚪ **Informational** |
| **Impact** | Low — 사용자 UX 관점 결함 |
| **Likelihood** | Low — 정상 사용자 시나리오에서 발생 빈도 낮음 |
| **SWC** | SWC-N/A (Missing Feature) |
| **CWE** | N/A |
| **CVSS 3.1 Base Score** | N/A |
| **위치** | 전역 (`AuditTarget.sol`) |
| **Status** | ⚠️ Won't Fix (백서 조건 근거) |

**Description**

사용자가 잘못 매입한 경우 환불받을 방법이 없다. 백서 요구사항에 따라 미구현이 의도적일 수 있으므로 informational 로 분류.

**Client Response**

**Won't Fix** — 백서 § 3.2 "매입은 취소 불가"가 명시된 조건. 사용자는 매입 전 안내를 확인하며, refund 도입은 백서 개정과 커뮤니티 투표를 통해서만 가능. **감사팀 인지 완료** — 향후 이 지점에서 사용자 민원이 발생하더라도 프로젝트 판단이 사전 문서화되어 있음.

---

## 13. Remediation Verification

v1.1 클라이언트 응답 수령 후, 감사팀은 다음 절차로 remediation 을 재검증했다.

### 13.1 Verification Approach

1. 클라이언트 fix 커밋을 로컬에 checkout
2. 발견 항목별 PoC 테스트 재실행
3. 원래 finding 이 재현되지 않음 확인 (Fixed 항목)
4. 새로운 회귀(regression) 없음 확인 (기존 정상 흐름 테스트)
5. `npx hardhat test test/ch13/` 전체 12건 pass 확인

### 13.2 Verification Results

| Finding | Fix Commit | 재검증 결과 | 잔여 리스크 |
|---|---|---|---|
| H-01 | `<hash>` | ✅ `updatePrice(0)` revert 확인 | 없음 |
| H-02 | `<hash>` | ✅ `receive()` → `buy()` 위임 확인, 종료 후 자금 유입 차단 | 없음 |
| M-01 | — | 🟡 Acknowledged (다음 릴리스) | Medium (일시적) |
| M-02 | `<hash>` | ✅ `raised >= goal` 도달 시 자동 `saleClosed=true` 확인 | 없음 |
| L-01 | `<hash>` | ✅ `onlyOwner` modifier 도입 확인 | 없음 |
| I-01 | — | ⚠️ Won't Fix (백서 근거) | 프로젝트 감수 |

### 13.3 Post-Fix Overall Assessment

**v1.2 Deployment Approval: ✅ APPROVED**

모든 High 항목이 fix 되었으며, M-01 은 UI 임시 조치와 함께 다음 릴리스 반영 계획이 명확하다. I-01 은 프로젝트 결정으로 인지·감수. 잔여 리스크는 수용 가능한 수준.

---

## 14. Test Suite Coverage

### 14.1 Test Files

| 파일 | 케이스 수 | 실행 시간 | 결과 |
|---|---:|---:|:-:|
| `Reentrancy.test.ts` | 6 (VulnerableBank 3 + SafeBank 3) | ~0.9s | ✅ Pass |
| `TxOrigin.test.ts` | 2 (직접 호출 방어 + 프록시 공격 재현) | ~0.1s | ✅ Pass |
| `AccessControl.test.ts` | 5 (AuditTarget 배포 · 권한없는자 3 + owner 대조군 1 + closeSale 후 buy 1) | ~0.1s | ✅ Pass |
| `AuditFindings.test.ts` | 4 (H-01·H-02·M-01·M-02 PoC) | ~0.1s | ✅ Pass |
| **Hardhat 소계** | **17** | **~1.2s** | ✅ **All Pass** |
| `Fuzz.t.sol` (Foundry) | 3 함수 × 256 runs = 768 실행 (buy 불변식 · updatePrice postcondition · non-owner negative invariant) | ~0.05s | ✅ Pass |
| **총합** | **Hardhat 17 + Foundry 3 fuzz 함수** | **~1.3s** | ✅ **All Pass** |

### 14.2 Statement/Branch Coverage (v1.2)

`AuditTarget.sol` 대상:

| Metric | Covered / Total | % |
|---|---|---:|
| Statements | 22 / 24 | 91.7% |
| Branches | 10 / 12 | 83.3% |
| Functions | 5 / 5 | 100.0% |
| Lines | 20 / 22 | 90.9% |

**미커버 항목**:
- `withdraw()` 실패 경로 (`require(ok)`) — 실제 EOA는 `.call{value}` 실패 확률 낮으나 회귀 테스트 추가 권장
- `receive()` 신규 fix 후 `sale open` 상태에서의 사용자 트리거 (v1.2 fix 이후 회귀 테스트 추가 권장)

### 14.3 Fuzz Testing

본 감사는 Foundry fuzz (`forge test`) 를 사용했다. `test/ch13/Fuzz.t.sol` 에 다음 세 property 를 정의:

| 함수 | 성질 | Assume / Precondition | Assertion |
|---|---|---|---|
| `testFuzz_BuyMaintainsInvariants(uint96 paid)` | buy 정수 나눗셈 불변식 | `paid > 0 && paid < 100 ether` | `tokens == paid / PRICE` · `raised == paid` · `credit * PRICE ≤ paid` |
| `testFuzz_UpdatePrice(uint256 newPrice)` | owner 호출 postcondition | `newPrice > 0` | `tokenPrice == newPrice` |
| `testFuzz_UpdatePriceRevertsForNonOwner(address caller, uint256 newPrice)` | 권한 negative invariant | `caller != owner && newPrice > 0` | `expectRevert("not owner")` |

실행: `forge test --match-path test/ch13/Fuzz.t.sol -vv` (256 runs 기본). CI/야간 배치용 정밀 실행은 `--fuzz-runs 10000` 권장. 프로덕션 확장 시 다음을 추가 권장 (§ 15):
- 다중 액터 상태 머신 fuzz (`invariant_*` 함수) — 여러 EOA 가 무작위 순서로 buy·updatePrice·closeSale·withdraw 호출 시 총 raised·컨트랙트 balance·tokens 합계 불변식이 유지되는지
- `buy(uint256 amount)` — `vm.assume(amount > 0 && amount < type(uint256).max / tokenPrice)` 로 overflow 경계 확장 탐색

---

## 15. Additional Recommendations

발견 항목 외 아키텍처·거버넌스·모니터링 관점 개선 제안.

### 15.1 Multisig / Timelock 도입

현재 `owner` 는 단일 EOA. 프로덕션에서는 Gnosis Safe multisig (예: 3-of-5) + OpenZeppelin `TimelockController` (24h delay) 도입 권장. `updatePrice`·`withdraw` 같은 자금 영향 함수에 timelock 적용 시 owner 키 탈취 시나리오에서도 대응 시간 확보 가능.

### 15.2 OpenZeppelin `Ownable` 상속

자체 owner 관리 대신 검증된 OpenZeppelin `Ownable` 상속으로 표준화. `transferOwnership`·`renounceOwnership`·2-step ownership transfer (`Ownable2Step`) 등 표준 기능 활용.

### 15.3 Emergency Pause

`Pausable` 도입으로 emergency 시 판매·인출 일시 정지 가능. 특히 H-01 같은 DoS 상황에서 owner가 pause 로 즉시 대응 가능.

### 15.4 Event 확충

현재 이벤트 5종. 추가 권장:
- `OwnershipTransferred(oldOwner, newOwner)`
- `EmergencyPause(timestamp, reason)`
- `RefundIssued(user, amount)` (M-01 fix 시)

### 15.5 오프체인 모니터링

프로덕션 배포 시:
- `raised` 지표 실시간 대시보드 (goal 대비 %)
- `saleClosed` 전환 알림
- `owner` 주소의 이례적 트랜잭션 (updatePrice 급변·대량 withdraw) alert

### 15.6 Formal Verification (선택)

Certora Prover 등을 통한 § 6.2 불변식 형식 검증. 감사 커버리지 를 넘어서는 수학적 안전성 확보 가능. 본 컨트랙트 규모에서는 오버엔지니어링일 수 있으나, 대규모 자금 취급 시 고려.

---

## Appendix A — Tool Raw Output

### A.1 Slither Output (관련 부분만)

`AuditTarget.sol` 대상 Slither v0.11.6 실행:

```
$ slither contracts/ch13/AuditTarget.sol --exclude-dependencies

INFO:Detectors:
Reentrancy in AuditTarget.withdraw(uint256) (AuditTarget.sol#72-78):
    External calls:
    - (ok) = owner.call{value: amount}() (AuditTarget.sol#75)
    Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#reentrancy-vulnerabilities-4

INFO:Detectors:
Low level call in AuditTarget.withdraw(uint256) (AuditTarget.sol#72-78):
    - (ok) = owner.call{value: amount}() (AuditTarget.sol#75)
    Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#low-level-calls

INFO:Detectors:
AuditTarget.owner (AuditTarget.sol#18) should be immutable
    Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#state-variables-that-could-be-declared-immutable

INFO:Slither: contracts/ch13/AuditTarget.sol analyzed (1 contracts with 98 detectors), 3 result(s) found
```

**감사팀 해석**:
- **Reentrancy in withdraw**: `owner-only` 함수이므로 owner 자체가 신뢰 대상. 실질 리스크 낮음. Informational 급으로 판정하나 CEI 순서 준수는 여전히 권장 (§ 15).
- **Low level call**: 표준 인출 패턴. Slither 의 정보성 알림.
- **owner should be immutable**: 소유권 이전 기능이 없는 현 설계에서는 immutable 로 변경 가능하나, § 15.2 `Ownable` 도입 시 자연 해결.

Slither 는 본 감사의 **6건 findings 중 0건을 탐지**했다. 이는 발견된 이슈들이 모두 business logic 또는 미구현 검증에 해당하기 때문이며, 이 점이 정적 분석 도구의 한계와 수동 리뷰의 가치를 동시에 보여준다.

### A.2 Hardhat Test Output

```
$ npx hardhat test test/ch13/

  Ch13 — Reentrancy protection
    ✔ VulnerableBank: 재진입 공격 성공 (자금 탈취 확인)
    ✔ VulnerableBank: 두 번째 인출로 잔액 초과 확인
    ✔ VulnerableBank: 공격 후 컨트랙트 잔액 0
    ✔ SafeBank: nonReentrant 로 재진입 revert
    ✔ SafeBank: CEI 순서 준수 확인
    ✔ SafeBank: 정상 인출 흐름 통과

  Ch13 — tx.origin phishing
    ✔ 직접 호출: 정상 사용자만 통과
    ✔ 프록시 공격: 피싱 컨트랙트 경유해 자금 탈취 재현

  Ch13 — AuditTarget findings PoC
    ✔ H-01. owner가 price=0 설정 후 buy()는 panic revert
    ✔ H-02. sale 종료 후에도 receive()로 ETH가 들어와 tokens·raised가 증가 (회계 오염)
    ✔ M-01. 나머지 wei는 컨트랙트에 잔류하고 사용자에게 tokens 증분 없음
    ✔ M-02. raised가 goal을 넘어도 saleClosed=false 유지

  19 passing (1s)
```

---

## Appendix B — CWE·SWC 매핑 근거

| Finding | SWC | 매핑 근거 | CWE | 매핑 근거 |
|---|---|---|---|---|
| H-01 | SWC-101 | Division-by-zero 는 SWC-101 Integer Arithmetic 범주에 포함 (arithmetic exception) | CWE-369 | Divide By Zero 표준 분류 |
| H-02 | SWC-N/A | Business logic gate bypass 는 SWC 공식 카탈로그에 정확히 대응되는 항목 없음. 감사팀 정직성 원칙에 따라 N/A 표기 | CWE-284 | Improper Access Control (게이트 우회 일반) |
| M-01 | SWC-101 | Integer arithmetic precision loss 는 SWC-101 하위 | CWE-682 | Incorrect Calculation 표준 |
| M-02 | SWC-N/A | Missing state transition (workflow) 은 SWC 카탈로그 미분류 | CWE-841 | Improper Enforcement of Behavioral Workflow |
| L-01 | SWC-N/A | Code quality/DRY 위반은 SWC 대상 아님 | CWE-1122 | Insufficient Adherence to Expected Conventions |
| I-01 | SWC-N/A | 기능 미구현은 취약점 아니므로 표준 분류 대상 아님 | N/A | N/A |

**주**: SWC 매핑이 어려운 항목을 억지로 번호 붙이지 않는다. 이는 CoinCraft Audit Lab의 정직성 원칙이다. 실제 감사 회사들도 SWC 미분류 항목에 대해 자체 카테고리 (예: OpenZeppelin의 "Type: Data Validation") 를 사용하거나 N/A 처리한다.

---

## Appendix C — Audit Team Credits

| 이름 | 역할 | 기여 |
|---|---|---|
| [Auditor Name 1] | Lead Auditor | 전체 감사 총괄, § 1·5·6·7·13 작성, 심각도 최종 결정 |
| [Auditor Name 2] | Auditor | Findings § 12 PoC 작성, § 14 커버리지 측정, Slither 실행·판독 |
| [Reviewer Name] | Peer Reviewer | 심각도 재검토, § 15 Recommendations 검토, 리포트 언어·형식 검수 |

전 감사자는 감사 결과에 대해 이해충돌 (Conflict of Interest) 없음을 확인한다. 어떤 감사자도 AuditTarget 프로젝트의 토큰·지분·유관 이익을 보유하지 않는다.

---

## 19. Signature Page

### Prepared By (감사팀)

**Lead Auditor**
Name: _______________________
Signature: _______________________
Date: _______________________

**Auditor**
Name: _______________________
Signature: _______________________
Date: _______________________

**Peer Reviewer**
Name: _______________________
Signature: _______________________
Date: _______________________

---

### Acknowledged By (클라이언트)

**Project Lead**
Name: _______________________
Signature: _______________________
Date: _______________________

**Technical Lead**
Name: _______________________
Signature: _______________________
Date: _______________________

---

**Report Fingerprint** (감사 원본 무결성 검증용)

- SHA-256 (본 리포트 파일): `<sha256sum output>`
- Audit Commit Hash: `<40자 hash>`
- Report Version: v1.2
- Report Delivery Date: YYYY-MM-DD

---

*본 리포트는 CoinCraft Academy Ch13-3강의 강사 시연 목적 완성 예시이며, OpenZeppelin·Trail of Bits·ConsenSys Diligence·Cyfrin 등 실제 감사 회사 리포트의 구조·형식·깊이를 참조·통합해 작성됐다. 학습자는 이 형식을 자신의 프로젝트 감사에 그대로 적용할 수 있으나, 프로덕션 감사는 반드시 자격 있는 실 감사 회사에 의뢰할 것을 권장한다.*

---

## Appendix D — 참고할 만한 실 감사 리포트 (수강생 학습용)

교육 목적으로 대표적인 감사 회사의 public 리포트를 유형별로 정리한다. 감사 형식·심각도 산정 방식·finding 서술 방식·클라이언트 응답 처리 관행이 회사마다 조금씩 다르므로, **최소 3개 회사의 리포트를 대조해 읽는 것을 권장**한다.

### D.1 감사 회사별 공개 리포트 아카이브

| 감사 회사 | 아카이브 URL | 특징 |
|---|---|---|
| **OpenZeppelin Security** | <https://blog.openzeppelin.com/security-audits> | 마크다운 스타일, 각 finding에 심각도·Type·Location 명시. 대표 감사: Compound, Uniswap V3, The Merge |
| **Trail of Bits** | <https://github.com/trailofbits/publications> (`reviews/` 폴더) | PDF 조판, 매우 상세한 threat model, CVSS 스코어 병기. 대표 감사: MakerDAO MCD, Curve DAO, Uniswap V4 |
| **ConsenSys Diligence** | <https://consensys.io/diligence/audits/> | 전통적 감사 형식, 각 issue에 issue-type·severity·source line 표기 |
| **Cyfrin** | <https://github.com/Cyfrin/audit-reports> | 마크다운, 최근 스타일 반영. CodeHawks·First Flight 초심자용 리포트도 함께 아카이빙 |
| **Spearbit** | <https://github.com/spearbit-audits/review> | 마크다운, 다수 리서처 협업 형식. finding 별 discussion 트레일 볼 수 있음 |
| **Halborn** | <https://www.halborn.com/audits> | 엔터프라이즈 감사 다수 (Solana·Polygon 생태계 등) |
| **Certora** | <https://www.certora.com/reports> | 형식 검증(Formal Verification) 결합 리포트. Aave·Balancer 등 |
| **Code4rena** | <https://code4rena.com/reports> | 컨테스트형 감사 아카이브. 다수 리서처의 발견을 종합한 리포트 형식 |
| **Sherlock** | <https://audits.sherlock.xyz/contests> | 컨테스트형 + 보험 결합. finding 판정 프로세스 공개 |

### D.2 학습용 추천 리포트 (읽는 순서)

수강생이 처음 감사 리포트를 정독할 때 다음 순서를 권장한다.

1. **초심자 진입 — Cyfrin First Flight**
   - <https://github.com/Cyfrin/audit-reports/tree/main/cyfrin>
   - 소규모 컨트랙트 대상, 마크다운, finding 서술이 교육적. 오늘 우리 REPORT_FULL.md 형식과 가장 근접.

2. **표준 형식 학습 — OpenZeppelin Compound Audit**
   - <https://blog.openzeppelin.com/compound-audit>
   - DeFi 프로토콜 감사의 정석. Findings·Recommendations·Client Response 구조가 명확.

3. **심층 분석 학습 — Trail of Bits Uniswap V4 Security Review**
   - <https://github.com/Uniswap/v4-core/blob/main/audits/trail-of-bits/2023-08-uniswap-v4-securityreview.pdf>
   - PDF 조판·CVSS 매핑·threat model·appendix 등 전문 감사 리포트의 완전한 형식. 우리 REPORT_FULL.md 참조 원본.

4. **컨테스트형 감사 — Code4rena**
   - <https://code4rena.com/reports> 아무 최근 컨테스트 하나 골라 읽기
   - 다수 감사자의 발견을 어떻게 통합·중복 제거·심각도 재산정하는지 확인.

5. **형식 검증 결합 — Certora Aave 리포트**
   - <https://www.certora.com/reports>
   - 심볼릭 실행·불변식 증명이 감사 리포트에 어떻게 통합되는지.

### D.3 감사 리포트 아카이브 (분야별 큐레이션)

- **DeFi 프로토콜 감사 모음**: <https://github.com/coinspect/learn-evm-attacks> (실제 해킹 사례 + 감사 관점 해설)
- **NFT/ERC-1155 감사**: OpenZeppelin 블로그의 `nft` 태그
- **크로스체인 브릿지 감사**: Halborn 블로그 (Ronin·Wormhole·Nomad 사후 분석 포함)
- **스테이블코인 감사**: ConsenSys Diligence MakerDAO MCD, Trail of Bits Reserve

### D.4 감사 리포트를 넘어서 — 참고 사이트

- **SWC Registry**: <https://swcregistry.io/> — 오늘 배운 SWC 번호 표준 문서
- **DASP Top 10**: <https://dasp.co/> — Decentralized Application Security Project
- **Rekt.news**: <https://rekt.news/> — 해킹 사건 사후 분석 (감사 실패 사례 학습)
- **Solodit**: <https://solodit.xyz/> — 여러 감사 회사 finding을 통합 검색할 수 있는 데이터베이스

### D.5 감사자 지원자를 위한 자료

수강생 중 감사 커리어를 고려한다면:

- **Secureum Bootcamp**: <https://www.secureum.xyz/> — 무료 온라인 보안 훈련
- **Rareskills**: <https://www.rareskills.io/> — 감사 실습 코스
- **Cyfrin Updraft**: <https://updraft.cyfrin.io/> — Patrick Collins의 감사 커리큘럼
- **Code4rena 참여**: 컨테스트에 실제 참여해 finding을 제출하며 실전 경험 축적
- **Immunefi 버그 바운티**: <https://immunefi.com/> — 실 프로덕션 컨트랙트 대상 바운티 헌팅

> ⚠️ URL은 2026-09 시점 기준. 감사 회사 웹사이트 재구조화·URL 변경이 잦으므로 링크가 깨진 경우 각 회사 이름으로 재검색하기 바란다.
