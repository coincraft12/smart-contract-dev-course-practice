// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

/**
 * @title BatchOperations
 * @dev Ch10 실습 — 배치 전송 구조
 *
 * 학습 포인트:
 * - mint vs mintBatch — 여러 tokenId 발급 시 한 번의 tx로
 * - safeTransferFrom vs safeBatchTransferFrom — 다중 이동
 * - IERC1155Receiver 훅 (onERC1155Received / onERC1155BatchReceived)
 * - 개별 반복 vs 배치의 가스 소비 차이
 *
 * 실측 목표:
 * - N개의 서로 다른 tokenId를 mint할 때 mintBatch가 loop 대비 얼마나 저렴한가?
 * - safeBatchTransferFrom도 마찬가지
 */
contract BatchOperations is ERC1155 {

    constructor() ERC1155("ipfs://QmBatch/{id}.json") {}

    // ── 개별 vs 배치 ────────────────────────────────

    /// 개별 반복 mint — 각 mint가 별도 SSTORE + event 발행
    function mintLoop(
        address to,
        uint256[] calldata ids,
        uint256[] calldata amounts
    ) external {
        require(ids.length == amounts.length, "length mismatch");
        for (uint256 i = 0; i < ids.length; ) {
            _mint(to, ids[i], amounts[i], "");
            unchecked { ++i; }
        }
    }

    /// 배치 mint — OZ의 _mintBatch 활용, 이벤트도 단일 TransferBatch
    function mintBatchOp(
        address to,
        uint256[] calldata ids,
        uint256[] calldata amounts
    ) external {
        _mintBatch(to, ids, amounts, "");
    }

    /// 개별 반복 transfer
    function transferLoop(
        address from,
        address to,
        uint256[] calldata ids,
        uint256[] calldata amounts
    ) external {
        require(ids.length == amounts.length, "length mismatch");
        for (uint256 i = 0; i < ids.length; ) {
            safeTransferFrom(from, to, ids[i], amounts[i], "");
            unchecked { ++i; }
        }
    }

    // safeBatchTransferFrom은 ERC1155 표준으로 이미 노출됨.
    // 테스트에서 직접 사용.
}

// ── IERC1155Receiver 구현체 (스마트월렛 케이스) ──

/**
 * @dev 컨트랙트가 ERC-1155를 받으려면 onERC1155Received / onERC1155BatchReceived를
 *      정확한 selector와 함께 반환해야 함. 안 그러면 safeTransferFrom이 revert.
 */
contract BatchReceiver {

    bytes4 constant private _SINGLE = 0xf23a6e61; // onERC1155Received
    bytes4 constant private _BATCH  = 0xbc197c81; // onERC1155BatchReceived

    uint256 public lastReceivedId;
    uint256 public lastReceivedAmount;
    uint256[] public lastBatchIds;
    uint256[] public lastBatchAmounts;

    bool public rejectMode;

    function setReject(bool r) external { rejectMode = r; }

    function onERC1155Received(
        address, address, uint256 id, uint256 value, bytes calldata
    ) external returns (bytes4) {
        if (rejectMode) return 0x00000000;
        lastReceivedId = id;
        lastReceivedAmount = value;
        return _SINGLE;
    }

    function onERC1155BatchReceived(
        address, address,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata
    ) external returns (bytes4) {
        if (rejectMode) return 0x00000000;
        delete lastBatchIds;
        delete lastBatchAmounts;
        for (uint256 i = 0; i < ids.length; i++) {
            lastBatchIds.push(ids[i]);
            lastBatchAmounts.push(values[i]);
        }
        return _BATCH;
    }
}
