// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title MultiSigWallet
 * @dev Ch18 실습 — m-of-n 멀티시그 지갑 (EIP-712 오프체인 서명)
 *
 * 학습 포인트:
 * - EIP-712 구조화된 서명 (도메인 분리 + 타입 해시)
 * - m-of-n 임계값
 * - nonce로 replay 방지
 * - owners 정렬로 signatures 순서 강제
 */
contract MultiSigWallet is EIP712 {
    using ECDSA for bytes32;

    // ── EIP-712 typed data ───────────────────────────
    //   Tx(address to, uint256 value, bytes data, uint256 nonce)
    bytes32 private constant TX_TYPEHASH =
        keccak256("Tx(address to,uint256 value,bytes data,uint256 nonce)");

    address[] public owners;
    uint256   public threshold;
    uint256   public nonce;

    mapping(address => bool) public isOwner;

    error NotOwner(address caller);
    error InvalidThreshold(uint256 threshold, uint256 owners);
    error InvalidSignatureCount(uint256 provided, uint256 required);
    error InvalidSigner(address recovered);
    error SignersOutOfOrder();
    error DuplicateOwner(address owner);
    error ExecutionFailed();

    event Executed(uint256 indexed nonce, address indexed to, uint256 value, bytes data);

    receive() external payable {}

    constructor(address[] memory _owners, uint256 _threshold)
        EIP712("MultiSigWallet", "1")
    {
        if (_threshold == 0 || _threshold > _owners.length)
            revert InvalidThreshold(_threshold, _owners.length);

        for (uint256 i = 0; i < _owners.length; i++) {
            address o = _owners[i];
            if (isOwner[o]) revert DuplicateOwner(o);
            isOwner[o] = true;
            owners.push(o);
        }
        threshold = _threshold;
    }

    /**
     * @dev signatures는 owner 주소 오름차순으로 정렬되어야 함
     *      (중복 서명 방지 + gas 절약을 위한 O(1) 검증)
     */
    function execute(
        address to,
        uint256 value,
        bytes calldata data,
        bytes[] calldata signatures
    ) external returns (bytes memory ret) {
        if (signatures.length < threshold)
            revert InvalidSignatureCount(signatures.length, threshold);

        bytes32 structHash = keccak256(abi.encode(
            TX_TYPEHASH,
            to,
            value,
            keccak256(data),
            nonce
        ));
        bytes32 digest = _hashTypedDataV4(structHash);

        address lastSigner = address(0);
        for (uint256 i = 0; i < signatures.length; i++) {
            address signer = digest.recover(signatures[i]);
            if (!isOwner[signer]) revert InvalidSigner(signer);
            if (signer <= lastSigner) revert SignersOutOfOrder();
            lastSigner = signer;
        }

        nonce++;

        bool ok;
        (ok, ret) = to.call{value: value}(data);
        if (!ok) revert ExecutionFailed();

        emit Executed(nonce - 1, to, value, data);
    }

    // ── 편의 함수: 오프체인 서명용 digest 조회 ────────
    function getDigest(address to, uint256 value, bytes calldata data)
        external view returns (bytes32)
    {
        bytes32 structHash = keccak256(abi.encode(
            TX_TYPEHASH, to, value, keccak256(data), nonce
        ));
        return _hashTypedDataV4(structHash);
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
