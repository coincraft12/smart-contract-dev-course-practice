// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MyERC1155
 * @dev Ch10 실습 — ERC-1155 표준 최소 직접 구현 (OpenZeppelin 사용 안 함)
 *
 * 학습 포인트 (Ch08 MyERC20 · Ch09 MyNFT 와 병렬 구조):
 * - **이중 매핑** _balances[tokenId][owner] = amount (Ch09 단일 매핑과 대비)
 * - balanceOf(addr, id) — 인자 두 개 (Ch09 단일 인자와 대비)
 * - balanceOfBatch(addrs[], ids[]) — 배치 조회, 순서 대응 규칙
 * - safeTransferFrom · safeBatchTransferFrom — safe 만 존재, 표준이 수신자 검사 강제
 * - amount 하나로 FT/NFT 성격 갈림 (세미펀저블)
 * - setApprovalForAll 만 존재 — 개별 승인 없음
 * - onERC1155Received · onERC1155BatchReceived 콜백 두 개
 * - supportsInterface (ERC-165)
 *
 * ⚠️ 이 파일은 학습용 최소 구현. 실전 프로덕션은 Ch10/EnterpriseNFT (OZ + AccessControl + Pausable)
 *    또는 Ch12/EnterpriseNFTV1 (UUPS Upgradeable) 참조.
 */

interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

interface IERC1155Receiver {
    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external returns (bytes4);

    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external returns (bytes4);
}

contract MyERC1155 is IERC165 {

    address public owner;

    // tokenId → owner → amount (이중 매핑 — Ch10 이론의 심장)
    mapping(uint256 => mapping(address => uint256)) private _balances;
    // owner → operator → approved (Ch09 와 동일한 전체 위임)
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    // ── 이벤트 (ERC-1155 표준) ──
    event TransferSingle(
        address indexed operator, address indexed from, address indexed to,
        uint256 id, uint256 value
    );
    event TransferBatch(
        address indexed operator, address indexed from, address indexed to,
        uint256[] ids, uint256[] values
    );
    event ApprovalForAll(address indexed account, address indexed operator, bool approved);

    // ── 에러 ──
    error NotOwner();
    error ZeroAddress();
    error NotAuthorized(address caller);
    error LengthMismatch();
    error InsufficientBalance(uint256 id, uint256 have, uint256 want);
    error InvalidReceiver(address to);
    error SelfApproval();

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // ── ERC-165 ─────────────────────────────────────
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == 0x01ffc9a7 || // IERC165
            interfaceId == 0xd9b67a26;   // IERC1155
    }

    // ── 조회 ─────────────────────────────────────────
    function balanceOf(address account, uint256 id) external view returns (uint256) {
        if (account == address(0)) revert ZeroAddress();
        return _balances[id][account];
    }

    function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids)
        external view returns (uint256[] memory)
    {
        if (accounts.length != ids.length) revert LengthMismatch();
        uint256[] memory out = new uint256[](accounts.length);
        for (uint256 i = 0; i < accounts.length; ) {
            if (accounts[i] == address(0)) revert ZeroAddress();
            out[i] = _balances[ids[i]][accounts[i]];
            unchecked { ++i; }
        }
        return out;
    }

    function isApprovedForAll(address account, address operator) public view returns (bool) {
        return _operatorApprovals[account][operator];
    }

    // ── 승인 (전체 위임만 존재 — 개별 승인 없음) ──
    function setApprovalForAll(address operator, bool approved) external {
        if (operator == msg.sender) revert SelfApproval();
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    // ── 전송 (safe 만 존재) ─────────────────────────
    function safeTransferFrom(
        address from, address to, uint256 id, uint256 amount, bytes calldata data
    ) external {
        if (from != msg.sender && !isApprovedForAll(from, msg.sender)) {
            revert NotAuthorized(msg.sender);
        }
        _transfer(from, to, id, amount);
        emit TransferSingle(msg.sender, from, to, id, amount);
        _checkOnERC1155Received(msg.sender, from, to, id, amount, data);
    }

    function safeBatchTransferFrom(
        address from, address to, uint256[] calldata ids, uint256[] calldata amounts, bytes calldata data
    ) external {
        if (ids.length != amounts.length) revert LengthMismatch();
        if (from != msg.sender && !isApprovedForAll(from, msg.sender)) {
            revert NotAuthorized(msg.sender);
        }
        for (uint256 i = 0; i < ids.length; ) {
            _transfer(from, to, ids[i], amounts[i]);
            unchecked { ++i; }
        }
        emit TransferBatch(msg.sender, from, to, ids, amounts);
        _checkOnERC1155BatchReceived(msg.sender, from, to, ids, amounts, data);
    }

    // ── Mint (owner 전용 · 학습용) ──────────────────
    function mint(address to, uint256 id, uint256 amount, bytes calldata data) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        _balances[id][to] += amount;   // 누적 — 같은 tokenId 재발행 시 잔액 쌓임
        emit TransferSingle(msg.sender, address(0), to, id, amount);
        _checkOnERC1155Received(msg.sender, address(0), to, id, amount, data);
    }

    function mintBatch(
        address to, uint256[] calldata ids, uint256[] calldata amounts, bytes calldata data
    ) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        if (ids.length != amounts.length) revert LengthMismatch();
        for (uint256 i = 0; i < ids.length; ) {
            _balances[ids[i]][to] += amounts[i];
            unchecked { ++i; }
        }
        emit TransferBatch(msg.sender, address(0), to, ids, amounts);
        _checkOnERC1155BatchReceived(msg.sender, address(0), to, ids, amounts, data);
    }

    // ── 내부 함수 ────────────────────────────────────
    function _transfer(address from, address to, uint256 id, uint256 amount) internal {
        if (to == address(0)) revert ZeroAddress();
        uint256 fromBal = _balances[id][from];
        if (fromBal < amount) revert InsufficientBalance(id, fromBal, amount);
        unchecked { _balances[id][from] = fromBal - amount; }
        _balances[id][to] += amount;
    }

    function _checkOnERC1155Received(
        address operator, address from, address to,
        uint256 id, uint256 amount, bytes calldata data
    ) internal {
        if (to.code.length == 0) return;   // EOA 는 콜백 생략
        try IERC1155Receiver(to).onERC1155Received(operator, from, id, amount, data)
            returns (bytes4 selector)
        {
            if (selector != IERC1155Receiver.onERC1155Received.selector) {
                revert InvalidReceiver(to);
            }
        } catch {
            revert InvalidReceiver(to);
        }
    }

    function _checkOnERC1155BatchReceived(
        address operator, address from, address to,
        uint256[] calldata ids, uint256[] calldata amounts, bytes calldata data
    ) internal {
        if (to.code.length == 0) return;
        try IERC1155Receiver(to).onERC1155BatchReceived(operator, from, ids, amounts, data)
            returns (bytes4 selector)
        {
            if (selector != IERC1155Receiver.onERC1155BatchReceived.selector) {
                revert InvalidReceiver(to);
            }
        } catch {
            revert InvalidReceiver(to);
        }
    }
}

// ── 테스트용 receiver contracts ──────────────────
contract MockERC1155Receiver is IERC1155Receiver {
    bytes4 private constant _SINGLE = IERC1155Receiver.onERC1155Received.selector;
    bytes4 private constant _BATCH  = IERC1155Receiver.onERC1155BatchReceived.selector;
    bool public rejectSingle;
    bool public rejectBatch;
    bool public implementSingleOnly;   // 배치 콜백 미구현 시뮬레이션 (매직값 오답)

    function setRejectSingle(bool r) external { rejectSingle = r; }
    function setRejectBatch(bool r) external { rejectBatch = r; }
    function setImplementSingleOnly(bool s) external { implementSingleOnly = s; }

    function onERC1155Received(address, address, uint256, uint256, bytes calldata)
        external view returns (bytes4)
    {
        if (rejectSingle) return 0xdeadbeef;
        return _SINGLE;
    }

    function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata)
        external view returns (bytes4)
    {
        if (rejectBatch || implementSingleOnly) return 0xdeadbeef;
        return _BATCH;
    }
}

contract NonReceiver1155 {
    // 어떤 리시버 인터페이스도 구현하지 않음 — safe 전송 시 실패
}
