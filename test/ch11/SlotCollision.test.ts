import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

/**
 * Ch11 실습 ② — SlotCollision (프록시가 죽는 과정)
 *
 * 슬라이드 14~16 · 20 검증:
 *   - BrokenProxy.slot0(=implementation) 이 LogicWithStorage.slot0(=totalSupply)
 *     와 충돌 → forward() 후 로직 주소가 오염된다
 *   - 오염 이후 forward() 는 코드 없는 주소로 delegatecall 하여
 *     로직이 더 이상 실행되지 않는다 (조용히 실패, storage 정지)
 *   - SafeProxy (ERC-1967 축약) 는 반복 호출해도 로직 주소가 유지되고
 *     mint 결과가 프록시 slot 0/1 에 정상 누적된다
 *
 * 관찰 방식: ABI 대신 provider.getStorage 로 slot 을 직접 읽어
 *   슬롯 레벨의 사건을 눈으로 확인한다.
 */
describe("Ch11 — SlotCollision (프록시가 죽는 과정)", function () {

  async function deployBroken() {
    const Logic = await ethers.getContractFactory("LogicWithStorage");
    const logic = await Logic.deploy();
    const Broken = await ethers.getContractFactory("BrokenProxy");
    const proxy = await Broken.deploy(await logic.getAddress());
    return { logic, proxy, logicAddr: await logic.getAddress() };
  }

  async function deploySafe() {
    const Logic = await ethers.getContractFactory("LogicWithStorage");
    const logic = await Logic.deploy();
    const Safe = await ethers.getContractFactory("SafeProxy");
    const proxy = await Safe.deploy(await logic.getAddress());
    return { logic, proxy, logicAddr: await logic.getAddress() };
  }

  // slot 을 address 로 해석하는 헬퍼 (하위 20B 만 사용)
  function slotToAddress(slotHex: string): string {
    return ethers.getAddress("0x" + slotHex.slice(-40));
  }

  describe("BrokenProxy — 슬롯 0 충돌", function () {
    it("배포 직후에는 slot 0 이 로직 주소를 담고 있다", async function () {
      const { proxy, logicAddr } = await loadFixture(deployBroken);
      const slot0 = await ethers.provider.getStorage(await proxy.getAddress(), 0);
      expect(slotToAddress(slot0)).to.equal(logicAddr);
      expect(await proxy.implementation()).to.equal(logicAddr);
    });

    it("forward(1000) 호출 후 slot 0 이 오염된다 (로직 주소 소실)", async function () {
      const { proxy, logicAddr } = await loadFixture(deployBroken);
      await proxy.forward(1000);
      const impl = await proxy.implementation();
      // 슬롯 0 이 delegatecall 로 실행된 totalSupply += 1000 에 의해
      // 원래 주소값에 1000 이 더해진 값으로 오염된다.
      expect(impl).to.not.equal(logicAddr);
    });

    it("오염 이후 forward() 는 실제 로직을 더 이상 실행하지 않는다", async function () {
      const { proxy } = await loadFixture(deployBroken);
      await proxy.forward(1000);
      // 오염된 impl 주소는 배포된 컨트랙트가 아니다 (코드 없음).
      // EVM 특성상 코드 없는 주소로의 delegatecall 은 성공(true) 을 반환하므로
      // require(ok) 는 통과하지만, mint 로직이 실행되지 않아 slot 0/1 은 정지한다.
      const proxyAddr = await proxy.getAddress();
      const slot0Before = await ethers.provider.getStorage(proxyAddr, 0);
      const slot1Before = await ethers.provider.getStorage(proxyAddr, 1);
      await proxy.forward(500);
      const slot0After = await ethers.provider.getStorage(proxyAddr, 0);
      const slot1After = await ethers.provider.getStorage(proxyAddr, 1);
      // mint 이 실행됐다면 두 슬롯 다 바뀌었어야 한다. 하나도 안 바뀐다.
      expect(slot0After).to.equal(slot0Before);
      expect(slot1After).to.equal(slot1Before);
    });
  });

  describe("SafeProxy — ERC-1967 고정 슬롯", function () {
    it("배포 직후 slot 0 은 비어 있고 로직 주소는 먼 고정 슬롯에 있다", async function () {
      const { proxy, logicAddr } = await loadFixture(deploySafe);
      const proxyAddr = await proxy.getAddress();
      const IMPL_SLOT =
        "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
      const slot0 = await ethers.provider.getStorage(proxyAddr, 0);
      const implSlot = await ethers.provider.getStorage(proxyAddr, IMPL_SLOT);
      expect(slot0).to.equal(
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
      expect(slotToAddress(implSlot)).to.equal(logicAddr);
    });

    it("반복 forward() 후에도 impl 슬롯이 유지되고 slot 0/1 에 정상 누적된다", async function () {
      const { proxy, logicAddr } = await loadFixture(deploySafe);
      const [signer] = await ethers.getSigners();
      const proxyAddr = await proxy.getAddress();

      await proxy.forward(1000);
      await proxy.forward(500);

      // 1) 로직 주소는 안전 슬롯이라 손상 없이 유지
      expect(await proxy.implementation()).to.equal(logicAddr);

      // 2) 프록시 slot 0 = totalSupply = 1500
      const slot0 = await ethers.provider.getStorage(proxyAddr, 0);
      expect(BigInt(slot0)).to.equal(1500n);

      // 3) 프록시 slot 1 (mapping base) 을 이용한 balanceOf[signer] 계산
      const balanceSlot = ethers.keccak256(
        ethers.concat([
          ethers.zeroPadValue(signer.address, 32),
          ethers.zeroPadValue("0x01", 32), // slot 1
        ])
      );
      const balHex = await ethers.provider.getStorage(proxyAddr, balanceSlot);
      expect(BigInt(balHex)).to.equal(1500n);
    });
  });
});
