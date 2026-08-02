// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title VulnerableBank
 * @dev Ch08 실습 — 재진입 공격에 취약한 은행 (교육용)
 *
 * ⚠️  이 컨트랙트는 취약점 시연 목적으로만 사용.
 *    실제 프로젝트에 절대 사용 금지.
 *
 * 취약점: withdraw()에서 상태 업데이트 전에 ETH를 전송함
 * → 공격자가 receive()에서 withdraw()를 반복 호출 가능 (재진입 공격)
 */
contract VulnerableBank {

    mapping(address => uint256) public balances;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    function deposit() public payable {
        require(msg.value > 0, "Send ETH");
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    /**
     * @dev ❌ 취약한 withdraw
     * 문제: ETH 전송(Interactions) 이후에 상태 업데이트(Effects)
     * 공격자가 receive()에서 이 함수를 반복 호출하면 잔액이 0이 되기 전에 계속 인출 가능
     */
    function withdraw() public {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "No balance");

        // ❌ Interactions 먼저 (잘못된 순서!)
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "Transfer failed");

        // ❌ Effects 나중 — 이미 공격자의 receive()가 실행된 후
        balances[msg.sender] = 0;

        emit Withdrawn(msg.sender, amount);
    }

    function contractBalance() public view returns (uint256) {
        return address(this).balance;
    }
}
