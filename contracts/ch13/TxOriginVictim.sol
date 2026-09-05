// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title TxOriginVictim
 * @dev Ch13 실습 — tx.origin 함정 (피해자 컨트랙트)
 *
 * ❌ 취약점: tx.origin으로 인증하면 피싱 컨트랙트(TxOriginAttacker.sol)를 통해 우회 가능
 * ✅ 방어: msg.sender 사용
 *
 * 짝 파일: `TxOriginAttacker.sol` (같은 폴더). 공격 시나리오는 그 파일 참조.
 */
contract TxOriginVictim {
    address public owner;
    uint256 public balance;

    constructor() {
        owner = msg.sender;
    }

    // ❌ 취약: tx.origin은 EOA를 반환. 공격 컨트랙트를 owner가 호출하면 owner로 오인
    function badWithdraw(address payable to, uint256 amount) external {
        require(tx.origin == owner, "not owner");
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "transfer failed");
        balance -= amount;
    }

    // ✅ 안전: msg.sender는 직전 호출자. 공격 컨트랙트가 호출하면 owner가 아님
    function goodWithdraw(address payable to, uint256 amount) external {
        require(msg.sender == owner, "not owner");
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "transfer failed");
        balance -= amount;
    }

    receive() external payable {
        balance += msg.value;
    }
}
