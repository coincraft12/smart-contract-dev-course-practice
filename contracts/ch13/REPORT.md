# Ch13 — AuditTarget 보안 감사 리포트 (실습 완성 예시)

> **감사 대상**: `contracts/ch13/AuditTarget.sol`
> **감사자**: [Name] ← 실습생이 채울 자리
> **감사 일자**: YYYY-MM-DD ← 실습생이 채울 자리
> **커밋 해시**: `<40자 hash>` ← 실습생이 채울 자리 (`git rev-parse HEAD`)
> **리포트 판**: v1.0

---

## 1. Executive Summary

`AuditTarget.sol`은 사용자가 ETH를 보내 토큰 크레딧을 매입하는 소규모 판매 컨트랙트다. 총 **6건의 발견 항목** (High 2 · Medium 2 · Low 1 · Informational 1)이 확인됐다.

- **배포 판정**: **⛔ 배포 불가.** High 2건이 회계 정합성·서비스 가용성을 직접 훼손하는 결함이며, mainnet 배포 전 반드시 hotfix가 필요하다.
- **핵심 위험**:
  1. `updatePrice(0)` 로 판매가 영구 중단 (DoS) — H-01
  2. `receive()` 가 `saleClosed` 게이트를 우회해 종료 후에도 자금 유입 (회계 오염) — H-02
- **조치 우선순위**: High 2건은 즉시 → Medium 2건은 다음 릴리스 → Low·Informational은 다음 스프린트 백로그.

---

## 2. Scope

| 항목 | 내용 |
|---|---|
| 검토 파일 | `contracts/ch13/AuditTarget.sol` (79 LoC) |
| 검토 커밋 | `<40자 hash>` |
| 검토 기간 | YYYY-MM-DD ~ YYYY-MM-DD |
| 검토 인원 | 1명 (감사자 [Name]) |
| **제외 대상** | 배포 스크립트, 프론트엔드, 외부 오라클, 소셜 로그인 흐름 |
| 컴파일러 | Solidity 0.8.24 (EVM cancun) |

**중요**: 본 감사는 상기 커밋 시점의 코드에만 유효하다. 커밋 변경 후 재감사 없이 배포한 결과에 대해 감사자는 책임지지 않는다.

---

## 3. 심각도 산정 매트릭스

Impact × Likelihood 곱으로 등급을 산정한다 (감으로 매기지 않음).

| Impact ↓ / Likelihood → | 낮음 | 중간 | 높음 |
|---|---|---|---|
| **높음** (자금 전액 손실·서비스 완전 중단) | Medium | High | **Critical** |
| **중간** (일부 손실·기능 부분 마비) | Low | Medium | High |
| **낮음** (경미한 불편·UX 흠) | Informational | Low | Medium |

- **Impact**: 발견이 실현됐을 때의 피해 규모
- **Likelihood**: 공격이 실제 발생할 확률 (권한·조건·비용 감안)

## 4. 요약

| 심각도 | 건수 |
|---|---:|
| Critical | 0 |
| High | 2 |
| Medium | 2 |
| Low | 1 |
| Informational | 1 |
| **합계** | **6** |

---

## 5. Findings

각 항목은 대본 슬라이드 12의 여섯 요소 (제목·심각도·SWC·위치·설명·권장 수정) + Client Response로 구성한다.

---

### H-01. `updatePrice(0)` 허용 → division-by-zero DoS

- **심각도**: **High** (Impact 높음 × Likelihood 중간)
  - Impact: 판매 함수 `buy()`가 영구 revert → 서비스 완전 중단
  - Likelihood: 권한 필요(`owner`)이나 실수·오조작으로 언제든 트리거 가능
- **SWC**: SWC-101 (Integer Arithmetic — division-by-zero)
- **위치**: `AuditTarget.sol:59-64` (`updatePrice`)
- **공격 시나리오**:
  ```solidity
  target.updatePrice(0);                     // owner의 실수 or 악의
  target.buy{value: 1 ether}();              // → panic(0x12), 서비스 중단
  ```
  이후 `owner`가 다시 정상 가격으로 복구하기 전까지 모든 구매가 실패한다. 컨트랙트에는 pause 기능도 없어 프론트엔드 오류가 지속된다.
- **권장 수정**: `newPrice > 0` 가드 추가.
  ```solidity
  function updatePrice(uint256 newPrice) external {
      require(msg.sender == owner, "not owner");
      require(newPrice > 0, "price=0");     // ← 추가
      emit PriceUpdated(tokenPrice, newPrice);
      tokenPrice = newPrice;
  }
  ```
- **Client Response**: **Fixed** — 수정 커밋 `<hash>`, 재검증 테스트 `test/ch13/AuditFindings.test.ts::H-01` 통과.

---

### H-02. `receive()` 가 `saleClosed` 게이트 우회

- **심각도**: **High** (Impact 높음 × Likelihood 높음)
  - Impact: 종료된 세일에 자금 계속 유입 → `tokens`·`raised` 회계 오염, 초과 매각 지속
  - Likelihood: 익명 EOA 누구나 `send`·`transfer`·`.call{value}("")` 로 트리거 가능 (권한 불필요)
- **SWC**: SWC-N/A (Business Logic — Access Control Bypass · SWC 미분류)
- **위치**: `AuditTarget.sol:54-62` (`receive`)
- **공격 시나리오**:
  ```solidity
  target.closeSale();                        // owner가 정상 종료
  target.buy{value: 1 ether}();              // → revert("sale closed") · 방어됨
  // 그러나:
  payable(target).transfer(1 ether);         // → receive() 트리거 → tokens·raised 증가
  ```
  `receive()`가 `buy()`를 호출하는 게 아니라 상태를 직접 변경하도록 구현돼 있어 `saleClosed` 검사를 통과하지 않는다.
- **권장 수정**: 두 가지 안 중 택일.
  - **(A) 종료 후 수신 차단**:
    ```solidity
    receive() external payable {
        require(!saleClosed, "sale closed");  // ← 추가
        require(msg.value > 0, "no eth");
        // ... 이하 동일
    }
    ```
  - **(B) `receive()` 를 `buy()` 위임으로 되돌림** — 단일 진입점 원칙 (권장):
    ```solidity
    receive() external payable { buy(); }
    ```
- **Client Response**: **Fixed** — (B) 안 채택, 수정 커밋 `<hash>`.

---

### M-01. 정수 나눗셈으로 사용자 dust 손실

- **심각도**: **Medium** (Impact 중간 × Likelihood 중간)
  - Impact: `msg.value % tokenPrice` 만큼 사용자가 손해 (컨트랙트에 잔류)
  - Likelihood: `tokenPrice`가 wei 단위 정수인 한 대부분의 구매에서 발생
- **SWC**: SWC-101 (Integer Arithmetic — precision loss)
- **위치**: `AuditTarget.sol:47` (`buy` 내부 `amount = msg.value / tokenPrice`)
- **공격 시나리오**: 사용자가 `1.5 * tokenPrice` wei 를 보낸 경우 → `amount=1` 만 크레딧, `0.5 * tokenPrice` wei는 컨트랙트에 남고 사용자에게 반환·크레딧 어느 쪽도 없음.
- **권장 수정**: 나머지 반환 또는 정확한 배수만 허용.
  ```solidity
  require(msg.value % tokenPrice == 0, "not whole tokens");
  ```
  또는 잔여분 refund. 프로덕트 요구사항에 따라 선택.
- **Client Response**: **Acknowledged** — 다음 릴리스에서 refund 로직 도입 예정. 사용자 안내 문구를 UI에 우선 추가.

---

### M-02. `raised >= goal` 도달 후 자동 종료 없음

- **심각도**: **Medium** (Impact 중간 × Likelihood 높음)
  - Impact: 목표 자금 초과 매각 → 백서상 발행 한도 위반 가능
  - Likelihood: 인기 프로젝트에서 확실히 발생. `owner`의 수동 `closeSale()` 이 지연되면 그 사이 매입 무한 허용
- **SWC**: SWC-N/A (Business Logic — Missing State Transition)
- **위치**: `AuditTarget.sol:43-52` (`buy` 종료 판정 부재)
- **공격 시나리오**: `raised == goal` 시점의 트랜잭션과 같은 블록에 여러 트랜잭션이 들어오면 전부 성공 → 총 `raised > goal`.
- **권장 수정**:
  ```solidity
  function buy() public payable {
      require(!saleClosed, "sale closed");
      require(msg.value > 0, "no eth");
      // ... 기존 로직 ...
      if (raised >= goal) {
          saleClosed = true;
          emit SaleClosed();
      }
  }
  ```
- **Client Response**: **Fixed** — 수정 커밋 `<hash>`.

---

### L-01. `onlyOwner` modifier 부재로 권한 검사 중복

- **심각도**: **Low** (Impact 낮음 × Likelihood 중간)
  - Impact: 코드 품질·유지보수성 이슈. 직접 자금 손실 없음
  - Likelihood: 향후 함수 추가 시 `require(msg.sender == owner)` 를 실수로 빠뜨릴 여지
- **SWC**: SWC-N/A (Code Quality)
- **위치**: `AuditTarget.sol:60, 66, 72` (`updatePrice`·`closeSale`·`withdraw` 세 곳 반복)
- **설명**: 세 관리자 함수가 동일 `require`를 반복. modifier 추출로 단일 지점 관리가 표준.
- **권장 수정**:
  ```solidity
  modifier onlyOwner() {
      require(msg.sender == owner, "not owner");
      _;
  }
  function updatePrice(uint256 newPrice) external onlyOwner { ... }
  function closeSale() external onlyOwner { ... }
  function withdraw(uint256 amount) external onlyOwner { ... }
  ```
- **Client Response**: **Fixed** — 수정 커밋 `<hash>`.

---

### I-01. 환불·취소 기능 부재

- **심각도**: **Informational** (Impact 낮음 × Likelihood 낮음)
- **SWC**: SWC-N/A (Missing Feature)
- **위치**: 전역 (`AuditTarget.sol`)
- **설명**: 사용자가 잘못 매입한 경우 되돌릴 방법이 없다. UX 관점 결함이나 백서 요구사항에 따라 미구현이 의도적일 수 있음.
- **권장 수정**: 요구사항 재검토 후 refund 함수 도입 여부 결정.
- **Client Response**: **Won't Fix** — 백서상 "매입은 취소 불가"가 명시된 조건임. 결정 근거: `whitepaper.md#terms` 항목 3.2. **감사자 인지 완료.**

---

## 6. Methodology

| 방법 | 세부 |
|---|---|
| **수동 코드 리뷰** | CEI 패턴 · integer 연산 · access control 매트릭스 · 상태 전이 그래프 작성 후 대조 |
| **정적 분석** | Slither `--exclude-dependencies` (`practice/scripts/ch13/run_slither.md` 참조) — 참고 결과는 부록 A |
| **동적 테스트** | Hardhat + Chai · 발견 항목별 PoC 테스트 (`test/ch13/AuditFindings.test.ts`) 4건 · 회귀 방지용 재진입·tx.origin 테스트 (`Reentrancy.test.ts` 6건 + `TxOrigin.test.ts` 2건) 병행 |
| **퍼즈 (선택)** | Foundry 도입 시 `updatePrice(uint256)` · `buy(uint256)` 인자에 vm.assume 걸어 경계값 탐색 권장 |

**총 실행 테스트**: 12건 (전부 통과) — `npx hardhat test test/ch13/`.

---

## 7. Appendix

### A. Slither 참고 출력 (SlitherTarget과 다른 컨트랙트)

`AuditTarget.sol` 자체는 Ch13 감사 실습용이며, Slither 자동 스캔은 `SlitherTarget.sol` 을 대상으로 별도 실습(13-2)에서 다룬다. 참고: Slither가 자동 탐지 가능한 항목(재진입·divide-before-multiply·unused-state 등)은 도구가 잡고, 본 리포트의 H-02·M-02 같은 business logic 결함은 사람이 잡아야 한다는 것이 13-2 → 13-3 흐름의 핵심.

### B. 테스트 커버리지

- `AuditFindings.test.ts` — H-01·H-02·M-01·M-02 PoC 각 1건 (총 4건, 6s 통과)
- `Reentrancy.test.ts` — 6건 (`VulnerableBank` 3 취약 · `SafeBank` 3 방어)
- `TxOrigin.test.ts` — 2건 (직접 호출 방어 · 프록시 공격 재현)

### C. SWC 미분류 항목 안내

H-02·M-02·L-01·I-01 은 SWC 공식 카탈로그에 정확 매핑되는 번호가 없다. Business Logic·Missing State Transition·Code Quality·Missing Feature 유형은 SWC-N/A로 표기하고 분류 근거를 함께 남긴다. 이는 정직성 원칙이며 억지 매핑보다 낫다.

---

## 8. 배포 전 체크리스트 (여섯 영역 · 슬라이드 15 대응)

| # | 영역 | 확인 사항 | 상태 |
|---|---|---|:-:|
| 1 | 권한 | 모든 상태변경 함수에 권한 검사 존재 · 역할 분리 (single owner) | ☑ |
| 2 | 재진입 | CEI 순서 · `nonReentrant` (해당 사항 없음, 외부 호출 없음) | ☑ |
| 3 | 입력 검증 | 0 값·0 주소·배열 길이 검증 | H-01 fix 후 ☑ |
| 4 | 산술 | `unchecked` 사용 없음 · division 안전성 | M-01 fix 후 ☑ |
| 5 | 외부 호출 | `call{value}` 반환값 확인 · 마지막 배치 | `withdraw` ☑ |
| 6 | 업그레이드 | 프록시 미사용 → N/A | — |

---

## 9. Client Response 상태 요약

| 항목 | 상태 |
|---|---|
| H-01 | ✅ Fixed |
| H-02 | ✅ Fixed |
| M-01 | 🕓 Acknowledged (다음 릴리스) |
| M-02 | ✅ Fixed |
| L-01 | ✅ Fixed |
| I-01 | ⚠️ Won't Fix (백서 조건 · 감사자 인지 완료) |

Won't Fix 결정 근거는 발견 항목 본문 참조. 이 결정은 클라이언트의 명시적 인지와 감수를 문서로 확인한 것이며, 이후 관련 사고 발생 시 이 기록이 양측의 책임 소재 판정 근거가 된다.

---

## 10. 감사 완료 사인

**감사자 서명**: _____________
**감사 일자**: _____________
**커밋 해시**: _____________

**클라이언트 확인**: _____________
**확인 일자**: _____________

---

*본 리포트 형식은 13-3강 슬라이드 10·11·12·13·15 개념을 완전 반영한 실습 예시본이다. 실제 감사 업무에서도 이 골격을 그대로 적용할 수 있다.*
