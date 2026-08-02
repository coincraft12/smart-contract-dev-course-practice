// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title TokenStandardComparison
 * @dev Ch11-1 실습 — 왜 ERC-1155가 필요한가
 *
 * 학습 포인트:
 * - 세 표준을 나란히 배포해 근본 차이 관찰:
 *     ERC-20   → 대체 가능(fungible), 계정별 잔액 (mapping[addr])
 *     ERC-721  → 대체 불가능(non-fungible), tokenId별 소유자 (mapping[id])
 *     ERC-1155 → 하이브리드, 계정별·tokenId별 잔액 (mapping[addr][id])
 * - 같은 시나리오(3종류 티켓 발급)를 세 표준으로 구현할 때 저장소 구조 비교
 * - 왜 하나의 컨트랙트가 여러 tokenId를 관리해야 할 상황(게임 아이템·이벤트 배지)에
 *   ERC-1155가 자연스러운지 실측
 */

// ── MINI ERC-20 (대체 가능) ─────────────────────
/// 티켓 1종 = 컨트랙트 1개. 종류가 늘어나면 컨트랙트 배포 개수도 늘어남
contract MiniERC20 {
    string public name;
    mapping(address => uint256) public balanceOf;
    uint256 public totalSupply;

    event Transfer(address indexed from, address indexed to, uint256 value);

    constructor(string memory _name) {
        name = _name;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "insufficient");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
}

// ── MINI ERC-721 (대체 불가능) ──────────────────
/// tokenId마다 소유자 딱 1명. 수량 개념 없음. 각 tokenId가 유일.
contract MiniERC721 {
    mapping(uint256 => address) public ownerOf;
    mapping(address => uint256) public balanceOf;
    uint256 private _nextId = 1;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    function mint(address to) external returns (uint256 tokenId) {
        tokenId = _nextId++;
        ownerOf[tokenId] = to;
        balanceOf[to] += 1;
        emit Transfer(address(0), to, tokenId);
    }

    function transfer(address to, uint256 tokenId) external {
        require(ownerOf[tokenId] == msg.sender, "not owner");
        ownerOf[tokenId] = to;
        balanceOf[msg.sender] -= 1;
        balanceOf[to] += 1;
        emit Transfer(msg.sender, to, tokenId);
    }
}

// ── MINI ERC-1155 (하이브리드) ──────────────────
/// 하나의 컨트랙트가 여러 tokenId 관리. tokenId마다 여러 계정이 여러 수량 보유 가능.
/// → 게임 아이템, 이벤트 배지, 쿠폰 등 자연스러운 표현.
contract MiniERC1155 {
    // account → tokenId → amount
    mapping(address => mapping(uint256 => uint256)) public balanceOf;

    event TransferSingle(
        address indexed operator,
        address indexed from,
        address indexed to,
        uint256 id,
        uint256 value
    );

    function mint(address to, uint256 id, uint256 amount) external {
        balanceOf[to][id] += amount;
        emit TransferSingle(msg.sender, address(0), to, id, amount);
    }

    function transfer(address to, uint256 id, uint256 amount) external {
        require(balanceOf[msg.sender][id] >= amount, "insufficient");
        balanceOf[msg.sender][id] -= amount;
        balanceOf[to][id] += amount;
        emit TransferSingle(msg.sender, msg.sender, to, id, amount);
    }
}

// ── 시나리오 러너 (편의 컨트랙트) ───────────────

/**
 * @dev "3종류 티켓 시스템"을 세 표준으로 구현 시 배포 개수 비교
 *      - ERC-20  → 티켓 종류 수만큼 배포 (VIP.deploy(), Standard.deploy(), Early.deploy())
 *      - ERC-721 → 티켓 종류 수만큼 배포 (각각 자기 tokenId 시퀀스)
 *      - ERC-1155 → 1개 배포로 3 종류 모두 커버
 */
contract TicketSystemFactory {

    MiniERC20[3]  public erc20Tickets;
    MiniERC721[3] public erc721Tickets;
    MiniERC1155   public erc1155Tickets;

    string[3] public labels = ["VIP", "Standard", "Early"];

    constructor() {
        for (uint256 i = 0; i < 3; i++) {
            erc20Tickets[i]  = new MiniERC20(labels[i]);
            erc721Tickets[i] = new MiniERC721();
        }
        erc1155Tickets = new MiniERC1155();
    }

    /// 3 티켓 종류 모두 100개씩 to에게 발급 (표준별 호출 횟수 비교)
    function issueAllToUser(address to) external {
        for (uint256 i = 0; i < 3; i++) {
            erc20Tickets[i].mint(to, 100);
        }
        for (uint256 i = 0; i < 3; i++) {
            for (uint256 j = 0; j < 100; j++) {
                erc721Tickets[i].mint(to);
            }
        }
        for (uint256 i = 0; i < 3; i++) {
            // tokenId 1, 2, 3에 각각 100개
            erc1155Tickets.mint(to, i + 1, 100);
        }
    }
}
