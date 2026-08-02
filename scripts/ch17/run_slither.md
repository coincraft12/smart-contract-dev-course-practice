# Ch17 — Slither 실행 가이드

## 사전 준비

Slither는 Python 도구다.

```bash
pip install slither-analyzer
# 또는
pipx install slither-analyzer
```

버전 확인:
```bash
slither --version
```

## 실행

### 전체 프로젝트 스캔
```bash
cd practice
slither .
```

### 특정 컨트랙트만 스캔 (Ch17 학습 대상)
```bash
slither contracts/ch17/SlitherTarget.sol
```

### JSON 리포트 저장
```bash
slither . --json slither-report.json
```

### 심각도 필터
```bash
slither . --exclude-informational --exclude-low
```

## 기대 결과 (SlitherTarget.sol)

Slither는 아래 이슈를 리포트해야 함:

| Detector | 심각도 | 위치 |
|---|---|---|
| `reentrancy-eth` | HIGH | withdraw() |
| `tx-origin` | MEDIUM | onlyOwnerBad |
| `uninitialized-state` | HIGH | treasury |
| `divide-before-multiply` | MEDIUM | feeCalc |
| `unused-state` | INFO | deprecatedFlag |

## HIGH/MEDIUM 0건 달성 워크플로우

1. `slither .` 실행
2. HIGH/MEDIUM 각 이슈를 확인
3. False positive이면 `// slither-disable-next-line <detector>` 주석 추가 + 사유 기록
4. 실제 이슈면 코드 수정
5. 재실행 → 0건 확인

## CI 통합 예시 (.github/workflows/slither.yml)

```yaml
name: Slither
on: [pull_request]
jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: crytic/slither-action@v0.4.0
        with:
          target: 'practice/'
          slither-config: 'practice/slither.config.json'
          fail-on: high
```
