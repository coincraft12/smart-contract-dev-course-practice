// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title OwnedStorage
 * @dev Ch04-2 실습 (확장) — SimpleStorage에 오너 권한 + 이력 추적 추가
 *
 * 학습 포인트:
 * - SimpleStorage 확장으로 실전 컨트랙트 감각 잡기
 * - constructor로 owner 저장
 * - modifier 기본 사용 (Ch05에서 심화)
 * - 저장 이력 (배열)
 * - 이벤트에 여러 인자 넣기
 *
 * Remix 실습 흐름:
 *   1) Remix에서 이 파일 열기
 *   2) compile → deploy (constructor 인자 없음 — 배포자가 owner)
 *   3) store(v) 호출 → history 배열에 쌓임
 *   4) 다른 계정으로 전환 후 store 시도 → revert 확인 (권한 제어)
 */
contract OwnedStorage {

    address public owner;
    uint256 public stored;
    uint256[] public history;

    event Stored(address indexed by, uint256 value, uint256 index);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function store(uint256 v) external onlyOwner {
        stored = v;
        history.push(v);
        emit Stored(msg.sender, v, history.length - 1);
    }

    function historyLength() external view returns (uint256) {
        return history.length;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero addr");
        owner = newOwner;
    }
}
