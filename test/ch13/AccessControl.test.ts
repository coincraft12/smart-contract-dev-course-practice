import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

/**
 * Ch13 — 접근 제어 우회 테스트 (대본 13-3 실습 2 골격 · line 262~266)
 *
 * 대본 원문 골격:
 *   1. AuditTarget 을 배포해서 owner=배포자, alice/bob=일반 사용자 상태를 만든다
 *   2. alice 가 target.connect(alice).updatePrice(0) 을 부른다
 *   3. revertedWith("not owner") 검증
 *   4. 상태 검증: expect(await target.tokenPrice()).to.equal(price) — 원래 가격 유지 확인
 *   5. 대조군: owner 가 부르면 성공, tokenPrice 갱신 확인
 *   6. 확장: closeSale() 실행 후 buy() 가 revert 되는지 검증 (pause 유사 시나리오)
 *
 * 참고 컨트랙트: `contracts/ch13/AccessControlDemo.sol` 은 슬라이드 14 개념 시연용
 * (VulnerableAccess vs SafeAccess). 실습 2의 실제 테스트 대상은 AuditTarget.
 */
describe("Ch13 — Access Control (대본 13-3 실습 2)", function () {

  async function deployTarget() {
    const [owner, alice, bob] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AuditTarget");
    const price = ethers.parseEther("0.001");
    const goal = ethers.parseEther("10");
    const target = await Factory.connect(owner).deploy(price, goal);
    await target.waitForDeployment();
    return { target, owner, alice, bob, price, goal };
  }

  // ── 접근 제어 우회 시도 (권한 없는 자는 못 부른다) ────────
  describe("권한 없는 자의 관리자 함수 호출", function () {

    it("alice.updatePrice(0) → revertedWith('not owner') 이고 tokenPrice 는 원래 값 유지", async function () {
      const { target, alice, price } = await loadFixture(deployTarget);
      await expect(target.connect(alice).updatePrice(0))
        .to.be.revertedWith("not owner");
      expect(await target.tokenPrice()).to.equal(price);
    });

    it("bob.closeSale() → revertedWith('not owner') 이고 saleClosed 는 false 유지", async function () {
      const { target, bob } = await loadFixture(deployTarget);
      await expect(target.connect(bob).closeSale())
        .to.be.revertedWith("not owner");
      expect(await target.saleClosed()).to.equal(false);
    });

    it("alice.withdraw(1 wei) → revertedWith('not owner') 이고 컨트랙트 잔액 유지", async function () {
      const { target, alice, bob } = await loadFixture(deployTarget);
      // bob 이 예치해 컨트랙트에 자금 마련
      await target.connect(bob).buy({ value: ethers.parseEther("0.01") });
      const before = await ethers.provider.getBalance(await target.getAddress());
      await expect(target.connect(alice).withdraw(1n))
        .to.be.revertedWith("not owner");
      expect(await ethers.provider.getBalance(await target.getAddress())).to.equal(before);
    });
  });

  // ── 대조군: 권한 있는 자는 부를 수 있다 ────────────────
  describe("owner 의 관리자 함수 호출 (대조군)", function () {

    it("owner.updatePrice(newPrice) → 성공, tokenPrice 갱신", async function () {
      const { target, owner } = await loadFixture(deployTarget);
      const newPrice = ethers.parseEther("0.002");
      await target.connect(owner).updatePrice(newPrice);
      expect(await target.tokenPrice()).to.equal(newPrice);
    });
  });

  // ── 확장 (대본 line 266): closeSale 후 buy revert (pause 유사) ─
  describe("상태 플래그로 잠기는 함수 (pause 유사 시나리오)", function () {

    it("closeSale() 실행 후 alice.buy() → revertedWith('sale closed')", async function () {
      const { target, owner, alice } = await loadFixture(deployTarget);
      await target.connect(owner).closeSale();
      await expect(target.connect(alice).buy({ value: ethers.parseEther("0.001") }))
        .to.be.revertedWith("sale closed");
    });
  });
});
