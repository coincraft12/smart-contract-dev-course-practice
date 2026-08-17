// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MyNFT
 * @dev Ch10 실습 — ERC-721 표준 직접 구현 (OpenZeppelin 사용 안 함)
 *
 * 학습 포인트:
 * - 각 tokenId가 고유 (대체 불가능)
 * - ownerOf / balanceOf / transferFrom / approve / setApprovalForAll
 * - safeTransferFrom + IERC721Receiver
 * - tokenURI 메타데이터 규격
 * - supportsInterface (ERC-165)
 */

interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

interface IERC721Receiver {
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4);
}

contract MyNFT is IERC165 {

    string public name;
    string public symbol;
    string public baseURI;

    address public owner;
    uint256 private _nextTokenId = 1;

    // tokenId → owner
    mapping(uint256 => address) private _owners;
    // owner → count
    mapping(address => uint256) private _balances;
    // tokenId → approved single spender
    mapping(uint256 => address) private _tokenApprovals;
    // owner → operator → approved
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    // ── 이벤트 (ERC-721 표준) ────────────────────────
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner_, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner_, address indexed operator, bool approved);

    // ── 에러 ─────────────────────────────────────────
    error NotOwner();
    error ZeroAddress();
    error NonexistentToken(uint256 tokenId);
    error NotAuthorized(address caller, uint256 tokenId);
    error NotERC721Receiver(address to);

    constructor(string memory _name, string memory _symbol, string memory _baseURI) {
        name = _name;
        symbol = _symbol;
        baseURI = _baseURI;
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
            interfaceId == 0x80ac58cd || // IERC721
            interfaceId == 0x5b5e139f;   // IERC721Metadata
    }

    // ── 조회 ─────────────────────────────────────────
    function balanceOf(address account) external view returns (uint256) {
        if (account == address(0)) revert ZeroAddress();
        return _balances[account];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address o = _owners[tokenId];
        if (o == address(0)) revert NonexistentToken(tokenId);
        return o;
    }

    function getApproved(uint256 tokenId) public view returns (address) {
        if (_owners[tokenId] == address(0)) revert NonexistentToken(tokenId);
        return _tokenApprovals[tokenId];
    }

    function isApprovedForAll(address owner_, address operator) public view returns (bool) {
        return _operatorApprovals[owner_][operator];
    }

    // ── 메타데이터 ───────────────────────────────────
    function tokenURI(uint256 tokenId) external view returns (string memory) {
        if (_owners[tokenId] == address(0)) revert NonexistentToken(tokenId);
        return string(abi.encodePacked(baseURI, _toString(tokenId), ".json"));
    }

    // ── 승인 ─────────────────────────────────────────
    function approve(address to, uint256 tokenId) external {
        address o = ownerOf(tokenId);
        if (msg.sender != o && !isApprovedForAll(o, msg.sender))
            revert NotAuthorized(msg.sender, tokenId);
        _tokenApprovals[tokenId] = to;
        emit Approval(o, to, tokenId);
    }

    function setApprovalForAll(address operator, bool approved) external {
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    // ── 전송 ─────────────────────────────────────────
    function transferFrom(address from, address to, uint256 tokenId) public {
        _transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        _safeTransfer(from, to, tokenId, "");
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes calldata data
    ) external {
        _safeTransfer(from, to, tokenId, data);
    }

    // ── Mint (owner 전용) ────────────────────────────
    function mint(address to) external onlyOwner returns (uint256 tokenId) {
        if (to == address(0)) revert ZeroAddress();
        tokenId = _nextTokenId++;
        _owners[tokenId] = to;
        unchecked { _balances[to] += 1; }
        emit Transfer(address(0), to, tokenId);
    }

    // ── 내부 함수 ────────────────────────────────────
    function _isAuthorized(address spender, uint256 tokenId) internal view returns (bool) {
        address o = _owners[tokenId];
        return spender == o
            || _tokenApprovals[tokenId] == spender
            || _operatorApprovals[o][spender];
    }

    function _transfer(address from, address to, uint256 tokenId) internal {
        if (to == address(0)) revert ZeroAddress();
        address o = ownerOf(tokenId);
        if (o != from) revert NotAuthorized(from, tokenId);
        if (!_isAuthorized(msg.sender, tokenId))
            revert NotAuthorized(msg.sender, tokenId);

        // 승인 해제
        delete _tokenApprovals[tokenId];

        unchecked {
            _balances[from] -= 1;
            _balances[to] += 1;
        }
        _owners[tokenId] = to;

        emit Transfer(from, to, tokenId);
    }

    function _safeTransfer(address from, address to, uint256 tokenId, bytes memory data) internal {
        _transfer(from, to, tokenId);
        _checkReceiver(from, to, tokenId, data);
    }

    function _checkReceiver(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) internal {
        // EOA 계정이면 통과
        if (to.code.length == 0) return;

        try IERC721Receiver(to).onERC721Received(msg.sender, from, tokenId, data)
            returns (bytes4 selector)
        {
            if (selector != IERC721Receiver.onERC721Received.selector)
                revert NotERC721Receiver(to);
        } catch {
            revert NotERC721Receiver(to);
        }
    }

    // ── 유틸: uint → string ─────────────────────────
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) { digits++; temp /= 10; }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}

// ── 테스트용 receiver contracts ──────────────────
contract MockERC721Receiver is IERC721Receiver {
    bytes4 private constant _RETURN = IERC721Receiver.onERC721Received.selector;
    bool public shouldReject;

    function setReject(bool r) external { shouldReject = r; }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external view returns (bytes4) {
        if (shouldReject) return 0xdeadbeef;
        return _RETURN;
    }
}

contract NonReceiver {
    // 어떤 리시버 인터페이스도 구현하지 않음 — safeTransfer 시 실패
}
