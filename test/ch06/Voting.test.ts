import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Ch06 — Voting", function () {

  async function deploy() {
    const [owner, alice, bob, charlie] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Voting");
    const voting = await Factory.deploy();
    return { voting, owner, alice, bob, charlie };
  }

  // 후보가 추가된 상태 fixture
  async function withProposals() {
    const base = await deploy();
    await base.voting.addProposal("후보 A");
    await base.voting.addProposal("후보 B");
    await base.voting.addProposal("후보 C");
    return base;
  }

  // 투표 진행 중 fixture
  async function votingOpen() {
    const base = await withProposals();
    await base.voting.startVoting();
    return base;
  }

  // ── 배포 ─────────────────────────────────────────
  describe("배포", function () {
    it("owner가 배포자여야 한다", async function () {
      const { voting, owner } = await loadFixture(deploy);
      expect(await voting.owner()).to.equal(owner.address);
    });

    it("초기 votingOpen은 false여야 한다", async function () {
      const { voting } = await loadFixture(deploy);
      expect(await voting.votingOpen()).to.be.false;
    });
  });

  // ── addProposal() ────────────────────────────────
  describe("addProposal()", function () {
    it("owner가 후보를 추가할 수 있어야 한다", async function () {
      const { voting } = await loadFixture(deploy);
      await voting.addProposal("후보 A");
      expect(await voting.proposalCount()).to.equal(1);
    });

    it("후보 정보가 올바르게 저장되어야 한다", async function () {
      const { voting } = await loadFixture(deploy);
      await voting.addProposal("후보 A");
      const [name, voteCount] = await voting.getProposal(0);
      expect(name).to.equal("후보 A");
      expect(voteCount).to.equal(0);
    });

    it("non-owner가 후보를 추가하려 하면 NotOwner 에러가 발생해야 한다", async function () {
      const { voting, alice } = await loadFixture(deploy);
      await expect(voting.connect(alice).addProposal("불법 후보"))
        .to.be.revertedWithCustomError(voting, "NotOwner");
    });

    it("투표 시작 후에는 후보를 추가할 수 없어야 한다", async function () {
      const { voting } = await loadFixture(withProposals);
      await voting.startVoting();
      await expect(voting.addProposal("늦은 후보"))
        .to.be.revertedWith("Cannot add proposal after voting starts");
    });

    it("ProposalAdded 이벤트가 발생해야 한다", async function () {
      const { voting } = await loadFixture(deploy);
      await expect(voting.addProposal("후보 A"))
        .to.emit(voting, "ProposalAdded")
        .withArgs(0, "후보 A");
    });
  });

  // ── startVoting() / endVoting() ──────────────────
  describe("startVoting() / endVoting()", function () {
    it("owner가 투표를 시작할 수 있어야 한다", async function () {
      const { voting } = await loadFixture(withProposals);
      await voting.startVoting();
      expect(await voting.votingOpen()).to.be.true;
    });

    it("후보 없이 투표를 시작하면 revert되어야 한다", async function () {
      const { voting } = await loadFixture(deploy);
      await expect(voting.startVoting())
        .to.be.revertedWith("No proposals added");
    });

    it("owner가 투표를 종료할 수 있어야 한다", async function () {
      const { voting } = await loadFixture(votingOpen);
      await voting.endVoting();
      expect(await voting.votingOpen()).to.be.false;
    });
  });

  // ── vote() ───────────────────────────────────────
  describe("vote()", function () {
    it("투표에 참여할 수 있어야 한다", async function () {
      const { voting, alice } = await loadFixture(votingOpen);
      await voting.connect(alice).vote(0);
      const [, voteCount] = await voting.getProposal(0);
      expect(voteCount).to.equal(1);
    });

    it("같은 주소가 두 번 투표하면 AlreadyVoted 에러가 발생해야 한다", async function () {
      const { voting, alice } = await loadFixture(votingOpen);
      await voting.connect(alice).vote(0);
      await expect(voting.connect(alice).vote(1))
        .to.be.revertedWithCustomError(voting, "AlreadyVoted")
        .withArgs(alice.address);
    });

    it("존재하지 않는 후보 ID로 투표하면 InvalidProposalId 에러가 발생해야 한다", async function () {
      const { voting, alice } = await loadFixture(votingOpen);
      await expect(voting.connect(alice).vote(99))
        .to.be.revertedWithCustomError(voting, "InvalidProposalId");
    });

    it("투표가 닫혀 있을 때 투표하면 VotingClosed 에러가 발생해야 한다", async function () {
      const { voting, alice } = await loadFixture(withProposals);
      await expect(voting.connect(alice).vote(0))
        .to.be.revertedWithCustomError(voting, "VotingClosed");
    });

    it("Voted 이벤트가 발생해야 한다", async function () {
      const { voting, alice } = await loadFixture(votingOpen);
      await expect(voting.connect(alice).vote(1))
        .to.emit(voting, "Voted")
        .withArgs(alice.address, 1);
    });

    it("여러 명이 투표하면 득표수가 올바르게 집계되어야 한다", async function () {
      const { voting, alice, bob, charlie } = await loadFixture(votingOpen);
      await voting.connect(alice).vote(0);
      await voting.connect(bob).vote(1);
      await voting.connect(charlie).vote(1);

      const [, countA] = await voting.getProposal(0);
      const [, countB] = await voting.getProposal(1);
      expect(countA).to.equal(1);
      expect(countB).to.equal(2);
    });
  });

  // ── getWinner() ──────────────────────────────────
  describe("getWinner()", function () {
    it("최다 득표 후보를 반환해야 한다", async function () {
      const { voting, alice, bob, charlie } = await loadFixture(votingOpen);
      await voting.connect(alice).vote(1);
      await voting.connect(bob).vote(1);
      await voting.connect(charlie).vote(0);
      await voting.endVoting();

      const [idx, name, votes] = await voting.getWinner();
      expect(idx).to.equal(1);
      expect(name).to.equal("후보 B");
      expect(votes).to.equal(2);
    });

    it("투표 진행 중에 getWinner를 호출하면 VotingStillOpen 에러가 발생해야 한다", async function () {
      const { voting, alice } = await loadFixture(votingOpen);
      await voting.connect(alice).vote(0);
      await expect(voting.getWinner())
        .to.be.revertedWithCustomError(voting, "VotingStillOpen");
    });
  });
});
