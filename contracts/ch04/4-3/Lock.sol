// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

// Hardhat의 대화형 디버깅 도구 — console.log는 로컬 노드에서만 동작
import "hardhat/console.sol";

/**
 * @title Lock
 * @dev Ch04-3 실습 — Hardhat 프로젝트 스타터 예제 (npx hardhat init 결과물)
 *
 * 시나리오:
 *   ETH를 예치하고 unlockTime까지 락. 시간 지나면 owner만 인출.
 *
 * 학습 포인트:
 * - hardhat init 시 자동 생성되는 예제 컨트랙트
 * - console.log — 로컬 노드에서 디버깅 (prod에서는 no-op)
 * - block.timestamp
 * - address payable + call{value:}
 * - constructor payable — 배포 시 ETH 수신
 */
contract Lock {
    uint256 public unlockTime;
    address payable public owner;

    event Withdrawal(uint256 amount, uint256 when);

    constructor(uint256 _unlockTime) payable {
        require(
            block.timestamp < _unlockTime,
            "Unlock time should be in the future"
        );

        unlockTime = _unlockTime;
        owner = payable(msg.sender);

        // 배포 로그 (로컬 노드에서만 출력됨)
        console.log("Lock deployed. unlockTime=%s, owner=%s", _unlockTime, msg.sender);
    }

    function withdraw() public {
        // 대화형 디버깅용 로그 — 프로덕션 배포 시에도 no-op이라 안전
        console.log("withdraw() called at %s by %s", block.timestamp, msg.sender);
        console.log("stored unlockTime = %s", unlockTime);

        require(block.timestamp >= unlockTime, "You can't withdraw yet");
        require(msg.sender == owner, "You aren't the owner");

        emit Withdrawal(address(this).balance, block.timestamp);

        owner.transfer(address(this).balance);
    }
}
