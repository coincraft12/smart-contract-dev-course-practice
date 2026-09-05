// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../../contracts/ch13/AuditTarget.sol";

/**
 * Ch13 — Foundry Fuzz 테스트 (대본 13-3 슬라이드 6 · 슬라이드 19 확인 포인트 2)
 *
 * 실행:
 *   forge test --match-path test/ch13/Fuzz.t.sol -vv
 *   forge test --match-path test/ch13/Fuzz.t.sol --fuzz-runs 10000 -vv   # 정밀 실행
 *
 * 검증 대상 불변식:
 *   I-1. tokens[user] * tokenPrice ≤ paid  (정수 나눗셈)
 *   I-2. raised == paid                    (buy 1회 기준)
 *   I-3. paid > 0 이면 크레딧은 정확히 paid / tokenPrice (버림)
 *   I-4. updatePrice(newPrice) — newPrice > 0 이면 tokenPrice 반영
 */
contract AuditTargetFuzzTest is Test {
    AuditTarget internal target;

    uint256 internal constant PRICE = 1e15;      // 0.001 ETH per token
    uint256 internal constant GOAL  = 1000 ether;

    address internal owner = address(this);
    address internal alice = address(0xA11CE);

    function setUp() public {
        target = new AuditTarget(PRICE, GOAL);
    }

    /// @notice buy(paid) — 무작위 wei 값에 대해 tokens · raised 불변식 유지
    function testFuzz_BuyMaintainsInvariants(uint96 paid) public {
        vm.assume(paid > 0);
        vm.assume(paid < 100 ether);           // GOAL 미만으로 제한

        vm.deal(alice, paid);
        vm.prank(alice);
        target.buy{value: paid}();

        uint256 expectedTokens = uint256(paid) / PRICE;
        assertEq(target.tokens(alice), expectedTokens, "I-3: credit == paid / price");
        assertEq(target.raised(), paid,               "I-2: raised == paid");
        assertLe(expectedTokens * PRICE, paid,        "I-1: credit*price <= paid");
    }

    /// @notice updatePrice(newPrice) — newPrice > 0 이면 즉시 반영 (onlyOwner)
    function testFuzz_UpdatePrice(uint256 newPrice) public {
        vm.assume(newPrice > 0);

        vm.prank(owner);
        target.updatePrice(newPrice);

        assertEq(target.tokenPrice(), newPrice, "tokenPrice updated");
    }

    /// @notice updatePrice — non-owner 는 항상 revert
    function testFuzz_UpdatePriceRevertsForNonOwner(address caller, uint256 newPrice) public {
        vm.assume(caller != owner);
        vm.assume(newPrice > 0);

        vm.prank(caller);
        vm.expectRevert(bytes("not owner"));
        target.updatePrice(newPrice);
    }
}
