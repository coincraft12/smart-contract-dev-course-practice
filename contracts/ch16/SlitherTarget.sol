// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title SlitherTarget
 * @dev Ch17 실습 — Slither가 잡아낼 취약점을 의도적으로 남긴 학습용 컨트랙트
 *
 * 이 파일은 slither 실행 시 발견되어야 할 이슈들을 포함:
 *  1. Reentrancy (HIGH)          — withdraw()의 CEI 위반
 *  2. Uninitialized state (MED)  — treasury 초기화 없음
 *  3. tx.origin (MED)            — onlyOwnerBad
 *  4. Unused state (INFO)        — deprecatedFlag
 *  5. Divide-before-multiply     — feeCalc
 */
contract SlitherTarget {

    address public owner;
    address public treasury;   // ← 초기화되지 않음 (uninitialized state)
    bool    private deprecatedFlag; // ← 사용되지 않는 상태 (unused)

    mapping(address => uint256) public balances;

    constructor() {
        owner = msg.sender;
    }

    // ❌ tx.origin 검증 (Slither: solidity-tx-origin)
    modifier onlyOwnerBad() {
        require(tx.origin == owner, "not owner");
        _;
    }

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    // ❌ Reentrancy: Effects 전에 Interactions
    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "insufficient");
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "transfer failed");
        balances[msg.sender] -= amount;
    }

    // ❌ divide-before-multiply
    function feeCalc(uint256 amount, uint256 rateBps) external pure returns (uint256) {
        // 10000으로 먼저 나눔 → 정밀도 손실 후 곱셈
        return (amount / 10000) * rateBps;
    }

    function pay(address to) external onlyOwnerBad {
        (bool ok, ) = to.call{value: address(this).balance}("");
        require(ok, "pay failed");
    }
}
