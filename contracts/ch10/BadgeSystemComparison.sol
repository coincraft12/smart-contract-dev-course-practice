// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title BadgeSystemComparison
 * @dev Ch10 실습 — 같은 도메인을 세 표준으로 각각 구현
 *
 * 도메인: 사내 프로그램 완료 배지 시스템
 *   - N종류의 프로그램 완료 배지 (예: "온보딩 완료", "리더십 과정 완료")
 *   - 각 배지는 여러 사람에게 반복 발급 가능
 *   - 배지는 개인 자산 (양도 정책은 감사 후 결정 — 여기선 자유 양도 허용)
 *
 * 트레이드오프 실측:
 *   - ERC-20 방식:   각 배지마다 컨트랙트 별도 배포. 관리 오버헤드.
 *   - ERC-721 방식:  각 발급마다 tokenId 새로. 소지 이력 세부 조회 강점.
 *   - ERC-1155 방식: 한 컨트랙트로 모두 관리. 가장 효율적. 개별 이력은 이벤트로.
 */

// ── 방식 1: 배지 종류별 ERC-20 (표준 준수 미니) ─────
contract BadgeAsERC20 {
    string public badgeName;
    mapping(address => uint256) public balanceOf;

    event BadgeIssued(address indexed to, uint256 amount);

    constructor(string memory _name) {
        badgeName = _name;
    }

    function issue(address to, uint256 amount) external {
        balanceOf[to] += amount;
        emit BadgeIssued(to, amount);
    }
}

// ── 방식 2: 배지 종류별 ERC-721 (소지 이력 = tokenId 시퀀스) ──
contract BadgeAsERC721 {
    string public badgeName;
    mapping(uint256 => address) public ownerOf;
    mapping(address => uint256) public balanceOf;
    uint256 private _nextId = 1;

    event BadgeIssued(address indexed to, uint256 indexed tokenId);

    constructor(string memory _name) {
        badgeName = _name;
    }

    function issue(address to) external returns (uint256 tokenId) {
        tokenId = _nextId++;
        ownerOf[tokenId] = to;
        balanceOf[to] += 1;
        emit BadgeIssued(to, tokenId);
    }
}

// ── 방식 3: 통합 ERC-1155 (badgeId = 배지 종류) ─────
contract BadgeAsERC1155 {
    // account → badgeId → count
    mapping(address => mapping(uint256 => uint256)) public balanceOf;
    mapping(uint256 => string) public nameOf;

    event BadgeIssued(address indexed to, uint256 indexed badgeId, uint256 amount);

    function registerBadge(uint256 badgeId, string calldata name_) external {
        nameOf[badgeId] = name_;
    }

    function issue(address to, uint256 badgeId, uint256 amount) external {
        balanceOf[to][badgeId] += amount;
        emit BadgeIssued(to, badgeId, amount);
    }
}

// ── 팩토리 — 3가지 방식 동시 세팅 (비교용) ─────────

/**
 * @dev 같은 배지 세트(3종류)를 세 방식으로 준비.
 *      테스트에서 각각의 발급 비용을 측정한다.
 */
contract BadgeSystemFactory {

    BadgeAsERC20[3]  public asERC20;
    BadgeAsERC721[3] public asERC721;
    BadgeAsERC1155   public asERC1155;

    string[3] public labels = ["Onboarding", "Leadership", "Security"];

    constructor() {
        for (uint256 i = 0; i < 3; i++) {
            asERC20[i]  = new BadgeAsERC20(labels[i]);
            asERC721[i] = new BadgeAsERC721(labels[i]);
        }
        asERC1155 = new BadgeAsERC1155();
        for (uint256 i = 0; i < 3; i++) {
            asERC1155.registerBadge(i + 1, labels[i]);
        }
    }

    /// user에게 배지 3종을 각 1개씩 발급하는 3가지 방식의 총 비용을 각각 측정
    function issueAll_20(address user) external {
        for (uint256 i = 0; i < 3; i++) {
            asERC20[i].issue(user, 1);
        }
    }

    function issueAll_721(address user) external {
        for (uint256 i = 0; i < 3; i++) {
            asERC721[i].issue(user);
        }
    }

    function issueAll_1155(address user) external {
        for (uint256 i = 0; i < 3; i++) {
            asERC1155.issue(user, i + 1, 1);
        }
    }
}
