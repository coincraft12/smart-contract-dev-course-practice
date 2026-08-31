// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MerkleAirdrop
 * @dev Ch16 캡스톤 예제 — Merkle proof 기반 에어드롭
 *
 * 학습 포인트:
 * - Merkle root로 대량 화이트리스트를 온체인 하나의 슬롯에 저장
 * - claimed[address]로 중복 청구 방지
 * - proof 생성은 오프체인 (참고: merkletreejs)
 *
 * 이 스타터를 참고해 캡스톤 프로젝트를 확장할 것 (예: 시즌별 리셋, NFT 에어드롭).
 */
contract MerkleAirdrop is Ownable {

    IERC20  public immutable token;
    bytes32 public merkleRoot;

    mapping(address => bool) public claimed;

    error AlreadyClaimed();
    error InvalidProof();

    event Claimed(address indexed account, uint256 amount);
    event MerkleRootUpdated(bytes32 oldRoot, bytes32 newRoot);

    constructor(IERC20 _token, bytes32 _root) Ownable(msg.sender) {
        token = _token;
        merkleRoot = _root;
    }

    /**
     * @param amount 이 계정이 청구할 수 있는 정확한 수량
     * @param proof  오프체인에서 생성한 sibling hash 배열
     */
    function claim(uint256 amount, bytes32[] calldata proof) external {
        if (claimed[msg.sender]) revert AlreadyClaimed();

        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(msg.sender, amount))));
        if (!MerkleProof.verify(proof, merkleRoot, leaf)) revert InvalidProof();

        claimed[msg.sender] = true;
        require(token.transfer(msg.sender, amount), "transfer failed");

        emit Claimed(msg.sender, amount);
    }

    function updateMerkleRoot(bytes32 newRoot) external onlyOwner {
        emit MerkleRootUpdated(merkleRoot, newRoot);
        merkleRoot = newRoot;
    }
}
