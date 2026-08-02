// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title MyOwnableToken
 * @dev Ch06 실습 — OpenZeppelin Ownable / Ownable2Step / Pausable
 *
 * 학습 포인트:
 * - Ownable: 즉시 이전
 * - Ownable2Step: 2단계 이전 (실수 방지)
 * - Pausable: whenNotPaused / whenPaused
 */
contract MyOwnableToken is Ownable2Step, Pausable {

    mapping(address => uint256) public balances;
    uint256 public totalMinted;

    event Minted(address indexed to, uint256 amount);

    constructor() Ownable(msg.sender) {}

    function mint(address to, uint256 amount) external onlyOwner whenNotPaused {
        balances[to] += amount;
        totalMinted += amount;
        emit Minted(to, amount);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
