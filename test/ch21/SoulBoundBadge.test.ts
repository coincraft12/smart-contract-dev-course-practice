import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Ch21 — SoulBoundBadge (SBT)", function () {

  async function deploy() {
    const [admin, issuer, alice, bob] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SoulBoundBadge");
    const sbt = await Factory.deploy("MyBadge", "BADGE", "https://api.example.com/badge/");
    const ISSUER = await sbt.ISSUER_ROLE();
    await sbt.grantRole(ISSUER, issuer.address);
    return { sbt, admin, issuer, alice, bob, ISSUER };
  }

  describe("issue / revoke", function () {
    it("ISSUER가 발급 시 BadgeIssued 이벤트 + mint", async function () {
      const { sbt, issuer, alice } = await loadFixture(deploy);
      await expect(sbt.connect(issuer).issue(alice.address, "완주 배지"))
        .to.emit(sbt, "BadgeIssued")
        .withArgs(alice.address, 1, "완주 배지");
      expect(await sbt.ownerOf(1)).to.equal(alice.address);
    });

    it("non-ISSUER는 issue 불가", async function () {
      const { sbt, alice } = await loadFixture(deploy);
      await expect(sbt.connect(alice).issue(alice.address, "x"))
        .to.be.revertedWithCustomError(sbt, "AccessControlUnauthorizedAccount");
    });

    it("ISSUER가 revoke 시 burn", async function () {
      const { sbt, issuer, alice } = await loadFixture(deploy);
      await sbt.connect(issuer).issue(alice.address, "x");
      await expect(sbt.connect(issuer).revoke(1)).to.emit(sbt, "BadgeRevoked").withArgs(1);
      await expect(sbt.ownerOf(1)).to.be.reverted;
    });
  });

  describe("Soulbound: 전송 차단", function () {
    it("transferFrom 시 SoulboundNoTransfer revert", async function () {
      const { sbt, issuer, alice, bob } = await loadFixture(deploy);
      await sbt.connect(issuer).issue(alice.address, "x");
      await expect(sbt.connect(alice).transferFrom(alice.address, bob.address, 1))
        .to.be.revertedWithCustomError(sbt, "SoulboundNoTransfer");
    });

    it("safeTransferFrom도 차단", async function () {
      const { sbt, issuer, alice, bob } = await loadFixture(deploy);
      await sbt.connect(issuer).issue(alice.address, "x");
      await expect(
        sbt.connect(alice)["safeTransferFrom(address,address,uint256)"](
          alice.address, bob.address, 1
        )
      ).to.be.revertedWithCustomError(sbt, "SoulboundNoTransfer");
    });

    it("mint/burn은 허용", async function () {
      const { sbt, issuer, alice } = await loadFixture(deploy);
      // mint OK (already tested)
      await sbt.connect(issuer).issue(alice.address, "x");
      // burn OK
      await sbt.connect(issuer).revoke(1);
    });
  });
});
