// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title AddressAndBytes
 * @dev Ch05-1 실습 (2/4) — 주소형·바이트·문자열
 *
 * 학습 포인트:
 * - address 선언 · 변환 · 특수 주소
 * - address 속성 (balance, code)
 * - ETH 전송 3방식 (transfer / send / call) — call 권장
 * - 고정 크기 바이트 (bytes1 ~ bytes32) + 함수 선택자
 * - 가변 바이트 (bytes) + string
 * - bytes ↔ string 변환
 */
contract AddressAndBytes {

    address        public admin;
    address payable public wallet;

    // ── 특수 주소 ────────────────────────────────────
    address public constant ZERO = address(0);
    address public constant THIS_CONTRACT = address(0);

    event Received(uint256 amount);
    event SentVia(string method, address to, uint256 amount, bool ok);

    constructor() {
        admin  = msg.sender;
        wallet = payable(msg.sender);
    }

    receive() external payable {
        emit Received(msg.value);
    }

    // ── address 속성 ─────────────────────────────────

    function selfBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function targetBalance(address a) external view returns (uint256) {
        return a.balance;
    }

    /**
     * @dev address.code.length == 0 → EOA 또는 컨트랙트 생성 중
     *      > 0 → 배포된 컨트랙트
     */
    function isContract(address a) external view returns (bool) {
        return a.code.length > 0;
    }

    // ── address 변환 ─────────────────────────────────

    /// address → address payable
    function toPayable(address a) external pure returns (address payable) {
        return payable(a);
    }

    /// uint160 ↔ address (명시적 캐스팅)
    function toUint(address a) external pure returns (uint160) {
        return uint160(a);
    }

    function fromUint(uint160 x) external pure returns (address) {
        return address(x);
    }

    // ── ETH 전송 3방식 ───────────────────────────────

    /// transfer — 2300 gas 고정, 실패 시 자동 revert (레거시)
    function sendViaTransfer(address payable to, uint256 amount) external {
        to.transfer(amount);
        emit SentVia("transfer", to, amount, true);
    }

    /// send — 2300 gas 고정, 실패 시 false 반환 (수동 처리 필요)
    function sendViaSend(address payable to, uint256 amount) external returns (bool) {
        bool ok = to.send(amount);
        emit SentVia("send", to, amount, ok);
        return ok;
    }

    /// call — 가스 무제한(기본), 실패 시 false 반환 → 현재 권장
    function sendViaCall(address payable to, uint256 amount) external returns (bool) {
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "call transfer failed");
        emit SentVia("call", to, amount, ok);
        return ok;
    }

    // ── 고정 크기 바이트 (bytes1 ~ bytes32) ───────────

    bytes32 public storedHash;

    function computeKeccak(string calldata s) external pure returns (bytes32) {
        return keccak256(bytes(s));
    }

    function storeHash(string calldata s) external {
        storedHash = keccak256(bytes(s));
    }

    /**
     * @dev 함수 선택자 (Selector) — 함수 시그니처의 keccak256 앞 4바이트
     */
    function selectorOf(string calldata signature) external pure returns (bytes4) {
        return bytes4(keccak256(bytes(signature)));
    }

    /// bytes1 ~ bytes32 값 접근
    function bytesIndexing(bytes32 h) external pure returns (bytes1 first, bytes1 last) {
        first = h[0];
        last  = h[31];
    }

    // ── 가변 바이트 (bytes) + string ─────────────────

    function concatBytes(bytes calldata a, bytes calldata b)
        external
        pure
        returns (bytes memory)
    {
        return bytes.concat(a, b);
    }

    function concatStrings(string calldata a, string calldata b)
        external
        pure
        returns (string memory)
    {
        return string.concat(a, b);
    }

    /// string ↔ bytes 변환 (같은 저장 표현, 인터페이스만 다름)
    function stringToBytes(string calldata s) external pure returns (bytes memory) {
        return bytes(s);
    }

    function bytesToString(bytes calldata b) external pure returns (string memory) {
        return string(b);
    }

    /// string.length는 지원하지 않음 — bytes로 캐스팅 후 length
    function stringByteLength(string calldata s) external pure returns (uint256) {
        return bytes(s).length;
    }

    /**
     * @dev abi.encodePacked — 여러 값을 붙여 keccak256 입력으로 자주 사용
     *      주의: dynamic 여러 개 붙일 때 collision 위험 있음. abi.encode 사용 권장
     */
    function packedHash(address a, uint256 amount, uint256 nonce)
        external
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(a, amount, nonce));
    }
}
