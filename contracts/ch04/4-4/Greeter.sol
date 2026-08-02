// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Greeter
 * @dev Ch04-4 실습 — Sepolia 테스트넷 배포 + Etherscan 검증용 최소 컨트랙트
 *
 * 학습 포인트:
 * - MetaMask + Sepolia 연동 후 실제 배포 대상
 * - Etherscan verify를 통해 소스코드 공개 → 검증 전/후 UX 차이
 * - 최소한의 상태 + 이벤트만 있어 verify 리허설에 적합
 *
 * 배포:
 *   npx hardhat run scripts/ch04/4-4/deployGreeter.ts --network sepolia
 *
 * Verify:
 *   npx hardhat verify --network sepolia <ADDRESS> "Hello Sepolia"
 */
contract Greeter {
    string public greeting;

    event GreetingUpdated(address indexed by, string oldGreeting, string newGreeting);

    constructor(string memory _greeting) {
        greeting = _greeting;
    }

    function setGreeting(string calldata _greeting) external {
        emit GreetingUpdated(msg.sender, greeting, _greeting);
        greeting = _greeting;
    }
}
