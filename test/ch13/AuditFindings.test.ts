import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

/**
 * Ch13 — 감사 리포트의 발견 항목을 테스트로 재현
 * (감사 발견 → PoC 테스트 → 수정 → 검증 워크플로우)
 */
describe("Ch13 — AuditTarget findings PoC", function () {

  async function deploy() {
    const [owner, alice, bob] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AuditTarget");
    const price = ethers.parseEther("0.001");
    const goal = ethers.parseEther("10");
    const target = await Factory.connect(owner).deploy(price, goal);
    return { target, owner, alice, bob, price, goal };
  }

  describe("H-01. tokenPrice=0 division-by-zero", function () {
    it("owner가 price=0 설정 후 buy()는 panic revert", async function () {
      const { target, owner, alice } = await loadFixture(deploy);
      await target.connect(owner).updatePrice(0);
      await expect(
        target.connect(alice).buy({ value: ethers.parseEther("1") })
      ).to.be.revertedWithPanic(0x12); // division or modulo by zero
    });
  });

  describe("H-02. receive() bypasses saleClosed", function () {
    it("sale 종료 후에도 receive()로 ETH가 들어와 tokens·raised가 증가 (회계 오염)", async function () {
      const { target, owner, alice, price } = await loadFixture(deploy);
      await target.connect(owner).closeSale();

      // buy()는 saleClosed 게이트로 방어됨
      await expect(target.connect(alice).buy({ value: ethers.parseEther("1") }))
        .to.be.revertedWith("sale closed");

      // 그러나 receive()는 buy()를 우회하고 상태를 직접 변경 → 판매 종료 후에도 매입 성립
      const paid = price * 3n;
      await alice.sendTransaction({
        to: await target.getAddress(),
        value: paid,
      });

      expect(await target.tokens(alice.address)).to.equal(3);
      expect(await target.raised()).to.equal(paid);
      expect(await target.saleClosed()).to.be.true; // 종료 상태 유지되지만 자금 유입은 계속됨
    });
  });

  describe("M-01. Integer division dust", function () {
    it("나머지 wei는 컨트랙트에 잔류하고 사용자에게 tokens 증분 없음", async function () {
      const { target, price, alice } = await loadFixture(deploy);
      // price = 1e15. 정확히 1.5개 만큼 보내면 나머지 발생
      const paid = price + price / 2n; // 1.5 * price
      await target.connect(alice).buy({ value: paid });

      // 정수 나눗셈 → tokens 증분은 1개만
      expect(await target.tokens(alice.address)).to.equal(1);
      // 나머지 0.5 * price는 컨트랙트에 잔류
      expect(await ethers.provider.getBalance(await target.getAddress()))
        .to.equal(paid);
    });
  });

  describe("M-02. goal 도달 후 자동 종료 없음", function () {
    it("raised가 goal을 넘어도 saleClosed=false 유지", async function () {
      const { target, goal, alice } = await loadFixture(deploy);

      await target.connect(alice).buy({ value: goal });
      expect(await target.raised()).to.equal(goal);
      expect(await target.saleClosed()).to.be.false;

      // 초과 매각 가능
      await target.connect(alice).buy({ value: ethers.parseEther("1") });
    });
  });
});
