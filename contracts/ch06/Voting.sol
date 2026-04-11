// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Voting
 * @dev Ch06 실습 — 투표 컨트랙트
 *
 * 학습 포인트:
 * - 구조체 (struct)
 * - 동적 배열 (array)
 * - 매핑 (mapping)
 * - modifier + 복합 조건
 * - 커스텀 에러
 */
contract Voting {

    // ── 에러 ─────────────────────────────────────────
    error NotOwner(address caller);
    error AlreadyVoted(address voter);
    error InvalidProposalId(uint256 id);
    error VotingClosed();
    error VotingStillOpen();

    // ── 구조체 ───────────────────────────────────────
    struct Proposal {
        string name;
        uint256 voteCount;
    }

    // ── 상태 변수 ────────────────────────────────────
    address public owner;
    bool public votingOpen;

    Proposal[] public proposals;
    mapping(address => bool) public hasVoted;
    mapping(address => uint256) public votedFor; // 어떤 후보에 투표했는지

    // ── 이벤트 ───────────────────────────────────────
    event ProposalAdded(uint256 indexed id, string name);
    event Voted(address indexed voter, uint256 indexed proposalId);
    event VotingStarted();
    event VotingEnded();

    // ── Modifier ─────────────────────────────────────
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner(msg.sender);
        _;
    }

    modifier whenVotingOpen() {
        if (!votingOpen) revert VotingClosed();
        _;
    }

    // ── 생성자 ───────────────────────────────────────
    constructor() {
        owner = msg.sender;
        votingOpen = false;
    }

    // ── 후보 관리 ────────────────────────────────────

    /// @dev 투표 후보 추가 (owner, 투표 시작 전만 가능)
    function addProposal(string memory name) public onlyOwner {
        require(!votingOpen, "Cannot add proposal after voting starts");
        uint256 id = proposals.length;
        proposals.push(Proposal({ name: name, voteCount: 0 }));
        emit ProposalAdded(id, name);
    }

    // ── 투표 관리 ────────────────────────────────────

    /// @dev 투표 시작 (owner 전용)
    function startVoting() public onlyOwner {
        require(proposals.length > 0, "No proposals added");
        require(!votingOpen, "Already open");
        votingOpen = true;
        emit VotingStarted();
    }

    /// @dev 투표 종료 (owner 전용)
    function endVoting() public onlyOwner whenVotingOpen {
        votingOpen = false;
        emit VotingEnded();
    }

    // ── 투표 ────────────────────────────────────────

    /// @dev 특정 후보에 투표 (중복 투표 방지)
    function vote(uint256 proposalId) public whenVotingOpen {
        if (hasVoted[msg.sender]) revert AlreadyVoted(msg.sender);
        if (proposalId >= proposals.length) revert InvalidProposalId(proposalId);

        hasVoted[msg.sender] = true;
        votedFor[msg.sender] = proposalId;
        proposals[proposalId].voteCount += 1;

        emit Voted(msg.sender, proposalId);
    }

    // ── 조회 ────────────────────────────────────────

    /// @dev 전체 후보 수 반환
    function proposalCount() public view returns (uint256) {
        return proposals.length;
    }

    /// @dev 특정 후보 정보 반환
    function getProposal(uint256 id) public view returns (string memory name, uint256 voteCount) {
        if (id >= proposals.length) revert InvalidProposalId(id);
        Proposal storage p = proposals[id];
        return (p.name, p.voteCount);
    }

    /// @dev 최다 득표 후보 인덱스 반환 (투표 종료 후만)
    function getWinner() public view returns (uint256 winnerIndex, string memory winnerName, uint256 winnerVotes) {
        if (votingOpen) revert VotingStillOpen();
        require(proposals.length > 0, "No proposals");

        uint256 maxVotes = 0;
        for (uint256 i = 0; i < proposals.length; i++) {
            if (proposals[i].voteCount > maxVotes) {
                maxVotes = proposals[i].voteCount;
                winnerIndex = i;
            }
        }
        winnerName = proposals[winnerIndex].name;
        winnerVotes = proposals[winnerIndex].voteCount;
    }
}
