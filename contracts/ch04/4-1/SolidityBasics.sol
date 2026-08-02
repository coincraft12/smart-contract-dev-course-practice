// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title SolidityBasics
 * @dev Ch04-1 실습 — Solidity 언어의 특성을 실제 코드로 확인
 *
 * 학습 포인트:
 * - Solidity는 정적 타입 (컴파일 타임 타입 결정)
 * - 상태 = 온체인 스토리지 (배포 시 소비, 조회는 무료)
 * - 결정론적 실행 (같은 입력 → 같은 결과, 랜덤/시간 조작 주의)
 * - Gas 소비 인지 (모든 SSTORE는 가스)
 * - EVM 옵코드로 컴파일 → 배포 결과물 = bytecode + ABI
 */
contract SolidityBasics {

    // ── 정적 타입 선언 ───────────────────────────────
    uint256 public counter;         // 배포 시 스토리지 슬롯 할당
    string  public message;
    bool    public active;

    // 컴파일 타임 상수 — 배포 시 스토리지 할당 없음, bytecode에 인라인
    uint256 public constant MAX_COUNT = 1000;

    // 배포 시 한 번만 설정, 이후 변경 불가 — 스토리지 대신 bytecode에 저장
    address public immutable deployer;
    uint256 public immutable deployedAt;

    // ── 이벤트 (온체인 로그) ─────────────────────────
    event CounterUpdated(uint256 newValue);

    constructor(string memory _initialMessage) {
        message    = _initialMessage;
        active     = true;
        deployer   = msg.sender;
        deployedAt = block.timestamp;
    }

    // ── 결정론적 실행 시연 ───────────────────────────

    /// 같은 입력에 대해 항상 같은 결과 → EVM의 결정론성
    function deterministic(uint256 a, uint256 b) external pure returns (uint256) {
        return (a * b) + a + b;
    }

    /// 유사난수 — 실전에서는 예측 가능하므로 절대 사용 금지
    /// (VRF 등 온체인 랜덤 솔루션 필요)
    function pseudoRandomInsecure(uint256 seed) external view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, seed)));
    }

    // ── 상태 변경 vs 조회 ────────────────────────────

    function increment() external {
        require(counter < MAX_COUNT, "max reached");
        counter += 1;                       // SSTORE — 가스 소비
        emit CounterUpdated(counter);       // 이벤트 로그 발행
    }

    /// view — 상태를 읽지만 변경하지 않음. 로컬 노드 호출은 무료
    function currentCount() external view returns (uint256) {
        return counter;
    }

    /// pure — 상태에 접근하지 않음. 순수 계산 함수
    function double(uint256 n) external pure returns (uint256) {
        return n * 2;
    }

    // ── EVM 옵코드 확인용 함수들 ─────────────────────

    /**
     * @dev 컴파일 시 bytecode를 확인해보면:
     *   - constant는 PUSH32로 인라인
     *   - immutable은 배포 후 constructor 값이 bytecode에 삽입됨
     *   - state variable은 SLOAD/SSTORE로 접근
     */
    function reveal() external view returns (
        uint256 constantValue,   // MAX_COUNT — bytecode에 하드코딩
        address immutableAddr,   // deployer   — bytecode에 삽입
        uint256 storageCounter   // counter    — SLOAD로 로드
    ) {
        return (MAX_COUNT, deployer, counter);
    }
}
