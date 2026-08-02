// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title SelectorPlayground
 * @dev Ch04-1 실습 — ABI와 Function Selector 심화
 *
 * 학습 포인트:
 * - 함수 selector = keccak256(signature)의 앞 4바이트
 * - Calldata layout: [4-byte selector][32-byte args...]
 * - abi.encodeCall / encodeWithSelector / encodeWithSignature 비교
 * - low-level call로 함수 호출 재구성
 * - selector 충돌 가능성 (매우 낮지만 이론상 존재)
 */
contract SelectorPlayground {

    uint256 public value;
    string  public label;

    event Called(bytes4 selector, address caller);

    // ── 대상 함수들 (selector 계산 대상) ──────────────

    function setValue(uint256 v) external {
        value = v;
        emit Called(this.setValue.selector, msg.sender);
    }

    function setLabel(string calldata s) external {
        label = s;
        emit Called(this.setLabel.selector, msg.sender);
    }

    function setBoth(uint256 v, string calldata s) external {
        value = v;
        label = s;
        emit Called(this.setBoth.selector, msg.sender);
    }

    // ── Selector 조회 도구 ──────────────────────────

    /// 문자열 signature → selector
    function computeSelector(string calldata signature) external pure returns (bytes4) {
        return bytes4(keccak256(bytes(signature)));
    }

    /// 컴파일 타임에 결정되는 selector들 (this.foo.selector 접근)
    function knownSelectors() external pure returns (
        bytes4 setValueSel,
        bytes4 setLabelSel,
        bytes4 setBothSel
    ) {
        setValueSel = this.setValue.selector;
        setLabelSel = this.setLabel.selector;
        setBothSel  = this.setBoth.selector;
    }

    // ── ABI encoding 3방식 비교 ─────────────────────

    function encodeVia_Signature(uint256 v) external pure returns (bytes memory) {
        // 시그니처 문자열 → keccak256 매 호출마다 계산 (비쌈)
        return abi.encodeWithSignature("setValue(uint256)", v);
    }

    function encodeVia_Selector(uint256 v) external pure returns (bytes memory) {
        // 이미 아는 selector를 재사용 — 저렴
        bytes4 sel = bytes4(keccak256("setValue(uint256)"));
        return abi.encodeWithSelector(sel, v);
    }

    function encodeVia_Call(uint256 v) external view returns (bytes memory) {
        // 타입 안전: 컴파일러가 시그니처 매치 검증 (권장, OZ v5+ 기본)
        return abi.encodeCall(this.setValue, (v));
    }

    // ── low-level self-call 데모 ────────────────────

    /**
     * @dev 자기 자신을 low-level call로 호출해 setValue 실행
     *      실전: 프록시, 멀티콜, 배치 실행 등에서 활용
     */
    function selfCallSetValue(uint256 v) external returns (bool ok, bytes memory ret) {
        bytes memory payload = abi.encodeCall(this.setValue, (v));
        (ok, ret) = address(this).call(payload);
    }

    // ── Calldata layout 관찰 도구 ───────────────────

    /**
     * @dev msg.data 전체를 반환 — 앞 4바이트가 selector, 나머지가 인자
     */
    function inspectCalldata() external pure returns (bytes calldata) {
        return msg.data;
    }

    /**
     * @dev calldata 앞 4바이트만 추출
     */
    function extractSelector(bytes calldata data) external pure returns (bytes4) {
        require(data.length >= 4, "too short");
        return bytes4(data[0:4]);
    }
}
