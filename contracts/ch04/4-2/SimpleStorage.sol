// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title SimpleStorage
 * @dev Ch04 실습 — 숫자를 블록체인에 저장하고 조회하는 컨트랙트
 *
 * 학습 포인트:
 * - 상태 변수 (state variable)
 * - public 가시성과 자동 getter
 * - view 함수 vs 상태 변경 함수
 * - 이벤트(Event) 발생
 * - msg.sender 전역 변수
 */
contract SimpleStorage {

    // ── 상태 변수 ────────────────────────────────────
    // 블록체인 Storage에 영구 저장됨
    uint256 private storedNumber;
    address public lastUpdater;
    uint256 public updateCount;

    // ── 이벤트 ───────────────────────────────────────
    // indexed: 이 파라미터로 필터링 가능
    event NumberStored(address indexed by, uint256 value);

    // ── 함수 ────────────────────────────────────────

    /**
     * @dev 숫자를 저장한다 (상태 변경 → 트랜잭션 필요)
     * @param number 저장할 숫자
     */
    function store(uint256 number) public {
        storedNumber = number;
        lastUpdater = msg.sender;  // msg.sender: 이 함수를 호출한 주소
        updateCount += 1;
        emit NumberStored(msg.sender, number);
    }

    /**
     * @dev 저장된 숫자를 반환한다 (읽기 전용 → 트랜잭션 불필요, 가스 없음)
     */
    function retrieve() public view returns (uint256) {
        return storedNumber;
    }

    /**
     * @dev 저장된 숫자의 두 배를 반환한다 (상태를 읽지도 쓰지도 않음)
     */
    function doubled() public view returns (uint256) {
        return storedNumber * 2;
    }
}
