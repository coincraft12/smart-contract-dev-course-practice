// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title PayableReceiveFallback
 * @dev Ch05-2 실습 (3/4) — payable · receive · fallback
 *
 * 학습 포인트:
 * - payable 함수 = ETH 수신 허용
 * - msg.value — 이번 호출에 들어온 wei
 * - receive() — 순수 ETH 전송 (data 없음) 시 실행
 * - fallback() — 존재하지 않는 함수 호출 or ETH 전송(data 있음) 시 실행
 * - 함수 오버로딩 (deposit / deposit(uint256))
 * - address.call{value:}(...) 로 ETH 송금 + 응답 확인
 *
 * 규칙 표:
 *   msg.data 없음 + ETH 있음      → receive()
 *   msg.data 있음 + 매칭 함수 X   → fallback()
 *   receive() 미정의 + ETH 전송   → fallback() 호출 (payable이면)
 */
contract PayableReceiveFallback {

    mapping(address => uint256) public balances;
    uint256 public totalReceived;

    // 로그: 어느 경로로 ETH가 들어왔는지 추적
    event ReceivedViaReceive(address from, uint256 amount);
    event ReceivedViaFallback(address from, uint256 amount, bytes data);
    event ReceivedViaDeposit(address from, uint256 amount, string label);
    event WithdrawnTo(address to, uint256 amount);

    // ── payable 함수 (기본 형태) ──────────────────────

    /**
     * @dev ETH를 받아 balances에 반영
     */
    function deposit() external payable {
        require(msg.value > 0, "no ETH");
        balances[msg.sender] += msg.value;
        totalReceived += msg.value;
        emit ReceivedViaDeposit(msg.sender, msg.value, "deposit()");
    }

    // ── 함수 오버로딩 (payable + non-payable) ─────────

    /**
     * @dev 동일 이름, 다른 파라미터 — 오버로딩
     *      label을 남겨 예치 목적을 기록
     */
    function deposit(string calldata label) external payable {
        require(msg.value > 0, "no ETH");
        balances[msg.sender] += msg.value;
        totalReceived += msg.value;
        emit ReceivedViaDeposit(msg.sender, msg.value, label);
    }

    // ── receive() — 순수 ETH 전송 처리 ────────────────

    /**
     * @dev 지갑에서 이 컨트랙트로 그냥 ETH만 보내면 실행 (data 없음)
     */
    receive() external payable {
        balances[msg.sender] += msg.value;
        totalReceived += msg.value;
        emit ReceivedViaReceive(msg.sender, msg.value);
    }

    // ── fallback() — 미매칭 호출 처리 ─────────────────

    /**
     * @dev 매칭 함수가 없는 데이터 호출을 모두 여기로 라우팅
     *      msg.data를 그대로 이벤트로 기록
     */
    fallback() external payable {
        if (msg.value > 0) {
            balances[msg.sender] += msg.value;
            totalReceived += msg.value;
        }
        emit ReceivedViaFallback(msg.sender, msg.value, msg.data);
    }

    // ── 인출 — address.call{value:}() 패턴 ────────────

    /**
     * @dev call로 ETH 전송 + 반환값 확인
     *      transfer/send는 2300 gas 제한이 있어 스마트월렛에 부적합.
     *      최신 권장은 call{value:...}("")
     */
    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "insufficient");

        // Effects
        balances[msg.sender] -= amount;

        // Interactions
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "transfer failed");

        emit WithdrawnTo(msg.sender, amount);
    }

    // ── 조회 도구 ─────────────────────────────────────

    function contractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
