// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title SlitherTarget
 * @dev Ch13 실습 — Slither 판독·수정 시연용 학습 컨트랙트
 *
 * 이 파일에 심어진 위험 요소 (사람 눈 기준):
 *  1. Reentrancy (HIGH)            — withdraw()의 CEI 위반          → Slither 잡음
 *  2. Divide-before-multiply       — feeCalc                        → Slither 잡음
 *  3. Unused state                 — deprecatedFlag                 → Slither 잡음
 *  4. tx.origin (MED)              — onlyOwnerBad → pay             → Slither 놓침 (도구 한계 실습 소재)
 *  5. Uninitialized state (MED)    — treasury 초기화 없음            → Slither 놓침 (도구 한계 실습 소재)
 *
 * 실습 대본의 핵심 교훈: 슬라이드 4·19의 "도구는 알려진 패턴만, 나머지는 사람이 판단"
 * 을 이 파일 위에서 실제로 체험한다. 놓친 두 개를 코드 리뷰로 잡는 것이 실습 후반부.
 */
contract SlitherTarget {

    address public owner;
    address public treasury;         // ← 초기화되지 않음 (사람 눈: MED · Slither: constable-states 로만 뜸)
    bool    private deprecatedFlag;  // ← 사용되지 않는 상태 (Slither: unused-state)

    mapping(address => uint256) public balances;

    constructor() {
        owner = msg.sender;
    }

    // ❌ tx.origin 검증 (사람 눈: 명백한 사고) · Slither 는 msg.sender 비교 패턴만 잡아 이 케이스 놓침
    modifier onlyOwnerBad() {
        require(tx.origin == owner, "not owner");
        _;
    }

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    // ❌ Reentrancy: Effects 전에 Interactions (Slither: reentrancy-eth · HIGH)
    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "insufficient");
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "transfer failed");
        balances[msg.sender] -= amount;
    }

    // ❌ divide-before-multiply (Slither: divide-before-multiply · MED)
    function feeCalc(uint256 amount, uint256 rateBps) external pure returns (uint256) {
        // 10000으로 먼저 나눔 → 정밀도 손실 후 곱셈
        return (amount / 10000) * rateBps;
    }

    // onlyOwnerBad 를 실제 사용하는 관리 함수 (tx.origin 이 실제 실행 경로에 있음)
    // 부가 발동: arbitrary-send-eth · missing-zero-check · low-level-calls
    function pay(address to) external onlyOwnerBad {
        (bool ok, ) = to.call{value: address(this).balance}("");
        require(ok, "pay failed");
    }
}
