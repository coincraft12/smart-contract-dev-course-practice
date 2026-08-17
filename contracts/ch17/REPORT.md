# Ch17 — AuditTarget 감사 리포트 (예시)

> 감사 대상: `AuditTarget.sol` (Ch17)
> 감사자: [Name]
> 감사 일자: YYYY-MM-DD
> 커밋: `<commit hash>`

## 요약

| 심각도 | 건수 |
|---|---:|
| Critical | 0 |
| High | 2 |
| Medium | 2 |
| Low | 1 |
| Informational | 1 |

## 발견 항목

### H-01. `updatePrice`가 0을 허용해 division-by-zero 발생

- **심각도**: High
- **위치**: `AuditTarget.sol#updatePrice`
- **현상**: `owner`가 `tokenPrice`를 0으로 설정할 수 있고, 이후 `buy()`가 `msg.value / 0`으로 revert
- **영향**: 서비스 중단 (DoS). 이미 확정된 buy 흐름이 깨짐
- **재현**:
  ```solidity
  target.updatePrice(0);
  target.buy{value: 1 ether}(); // → panic (0x12)
  ```
- **권고**: `require(newPrice > 0, "price=0")` 추가

### H-02. `receive()`가 sale 종료 후에도 ETH 수신

- **심각도**: High
- **위치**: `AuditTarget.sol#receive`
- **현상**: `buy()`는 `saleClosed` 체크가 있지만, `receive()`는 그대로 `buy()`를 호출하는 우회 경로가 존재
- **영향**: 종료된 세일에 계속 자금 유입 → 회계 오염
- **권고**: `receive()` 앞에도 `require(!saleClosed)` 추가하거나 `revert`

### M-01. 정수 나눗셈으로 인한 소액 손실 (dust)

- **심각도**: Medium
- **위치**: `buy()` — `amount = msg.value / tokenPrice`
- **현상**: `msg.value % tokenPrice > 0`일 때 나머지 wei는 컨트랙트에 남지만 사용자에게 tokens 증분 없음
- **권고**: 나머지 wei를 환불하거나, tokenPrice 배수만 허용
  ```solidity
  require(msg.value % tokenPrice == 0, "not whole");
  ```

### M-02. `raised >= goal` 시 자동 종료 없음

- **심각도**: Medium
- **위치**: `buy()`
- **현상**: 목표 자금 도달 후에도 판매 계속 → owner가 수동 `closeSale()` 하기 전까지 초과 매각
- **권고**:
  ```solidity
  if (raised >= goal) { saleClosed = true; emit SaleClosed(); }
  ```

### L-01. `onlyOwner` modifier 부재로 반복 로직

- **심각도**: Low
- **위치**: `updatePrice`, `closeSale`, `withdraw`
- **현상**: 동일 `require(msg.sender == owner)` 반복. 실수로 빠뜨릴 여지
- **권고**: `modifier onlyOwner()` 추출

### I-01. `raised`, `tokens` 감소 로직 부재

- **심각도**: Informational
- **위치**: 전역
- **현상**: 환불/취소 기능 미제공. UX 관점 개선 여지
- **권고**: 요구사항 확인 후 refund 도입 검토

## 감사 방법론

- **정적 분석**: Slither (`practice/scripts/ch17/run_slither.md` 참조)
- **테스트**: Hardhat + Chai (`test/ch18/`)
- **수동 검토**: CEI 패턴, integer 연산, access control 매트릭스

## 다음 단계

1. High 이슈 2건을 hotfix (배포 전 필수)
2. Medium 2건은 다음 릴리즈에 반영
3. Low/Informational은 다음 스프린트 백로그로 이관

---

**감사 완료 사인**: _____________  일자: _____________
