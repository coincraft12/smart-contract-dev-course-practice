// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ITravelRuleOracle
 * @dev VASP 간 이체 시 Travel Rule 정보(수신자 KYC/제재)를
 *      검증하는 오프체인 oracle의 온체인 인터페이스
 */
interface ITravelRuleOracle {
    /// @return ok 정책 통과 여부
    /// @return reasonCode 실패 시 코드 (0 = OK, 1 = 미인증 VASP, 2 = 제재, 3 = 임계값 초과 미신고)
    function verify(
        address originator,
        address beneficiary,
        uint256 amount
    ) external view returns (bool ok, uint8 reasonCode);
}

/**
 * @title MultisigService
 * @dev Ch19 실습 — 서명 수집·실행·Travel Rule 컴플라이언스 통합
 *
 * 학습 포인트:
 * - 온체인 서명 수집 (propose → confirm → execute)
 * - Travel Rule oracle 연동 (실행 조건 검증)
 * - 트랜잭션 생명주기 상태 머신
 */
contract MultisigService {

    enum TxStatus { None, Pending, Executed, Cancelled }

    struct TxRequest {
        address originator;
        address beneficiary;
        uint256 amount;
        bytes   data;
        uint256 confirmations;
        TxStatus status;
        mapping(address => bool) confirmed;
    }

    address[] public signers;
    uint256   public threshold;
    ITravelRuleOracle public oracle;

    mapping(address => bool) public isSigner;
    mapping(uint256 => TxRequest) private _txs;
    uint256 public nextTxId;

    // ── 에러 ─────────────────────────────────────────
    error NotSigner();
    error AlreadyConfirmed();
    error TxNotPending(uint256 txId);
    error BelowThreshold(uint256 confirmations, uint256 threshold);
    error TravelRuleFailed(uint8 reasonCode);
    error ExecutionFailed();
    error InvalidThreshold();
    error ZeroAddress();

    // ── 이벤트 ───────────────────────────────────────
    event Proposed(uint256 indexed txId, address indexed proposer, address beneficiary, uint256 amount);
    event Confirmed(uint256 indexed txId, address indexed signer, uint256 confirmations);
    event Executed(uint256 indexed txId);
    event Cancelled(uint256 indexed txId);
    event OracleUpdated(address oldOracle, address newOracle);

    modifier onlySigner() {
        if (!isSigner[msg.sender]) revert NotSigner();
        _;
    }

    constructor(address[] memory _signers, uint256 _threshold, address _oracle) {
        if (_threshold == 0 || _threshold > _signers.length) revert InvalidThreshold();
        for (uint256 i = 0; i < _signers.length; i++) {
            address s = _signers[i];
            if (s == address(0)) revert ZeroAddress();
            isSigner[s] = true;
            signers.push(s);
        }
        threshold = _threshold;
        oracle = ITravelRuleOracle(_oracle);
    }

    receive() external payable {}

    // ── 제안 ─────────────────────────────────────────
    function propose(address beneficiary, uint256 amount, bytes calldata data)
        external onlySigner returns (uint256 txId)
    {
        if (beneficiary == address(0)) revert ZeroAddress();

        txId = nextTxId++;
        TxRequest storage r = _txs[txId];
        r.originator  = msg.sender;
        r.beneficiary = beneficiary;
        r.amount      = amount;
        r.data        = data;
        r.status      = TxStatus.Pending;

        emit Proposed(txId, msg.sender, beneficiary, amount);

        // 제안자는 자동 confirm
        _confirm(txId);
    }

    // ── 확인 ─────────────────────────────────────────
    function confirm(uint256 txId) external onlySigner {
        _confirm(txId);
    }

    function _confirm(uint256 txId) internal {
        TxRequest storage r = _txs[txId];
        if (r.status != TxStatus.Pending) revert TxNotPending(txId);
        if (r.confirmed[msg.sender]) revert AlreadyConfirmed();

        r.confirmed[msg.sender] = true;
        r.confirmations++;
        emit Confirmed(txId, msg.sender, r.confirmations);
    }

    // ── 실행 ─────────────────────────────────────────
    function execute(uint256 txId) external onlySigner {
        TxRequest storage r = _txs[txId];
        if (r.status != TxStatus.Pending) revert TxNotPending(txId);
        if (r.confirmations < threshold)
            revert BelowThreshold(r.confirmations, threshold);

        // Travel Rule 검증
        (bool ok, uint8 code) = oracle.verify(r.originator, r.beneficiary, r.amount);
        if (!ok) revert TravelRuleFailed(code);

        r.status = TxStatus.Executed;

        (bool sent, ) = r.beneficiary.call{value: r.amount}(r.data);
        if (!sent) revert ExecutionFailed();

        emit Executed(txId);
    }

    // ── 취소 (제안자만) ──────────────────────────────
    function cancel(uint256 txId) external {
        TxRequest storage r = _txs[txId];
        if (r.status != TxStatus.Pending) revert TxNotPending(txId);
        if (r.originator != msg.sender) revert NotSigner();
        r.status = TxStatus.Cancelled;
        emit Cancelled(txId);
    }

    // ── 조회 ─────────────────────────────────────────
    function getTx(uint256 txId) external view returns (
        address originator,
        address beneficiary,
        uint256 amount,
        uint256 confirmations,
        TxStatus status
    ) {
        TxRequest storage r = _txs[txId];
        return (r.originator, r.beneficiary, r.amount, r.confirmations, r.status);
    }

    function hasConfirmed(uint256 txId, address signer) external view returns (bool) {
        return _txs[txId].confirmed[signer];
    }

    // ── Oracle 교체 (첫 서명자가 admin 역할) ─────────
    function setOracle(address newOracle) external {
        if (msg.sender != signers[0]) revert NotSigner();
        emit OracleUpdated(address(oracle), newOracle);
        oracle = ITravelRuleOracle(newOracle);
    }
}

// ── 테스트용 Mock Oracle ─────────────────────────
contract MockTravelRuleOracle is ITravelRuleOracle {
    bool public allow = true;
    uint8 public rejectCode = 0;

    function setPolicy(bool _allow, uint8 _code) external {
        allow = _allow;
        rejectCode = _code;
    }

    function verify(address, address, uint256)
        external view returns (bool ok, uint8 reasonCode)
    {
        return (allow, rejectCode);
    }
}
