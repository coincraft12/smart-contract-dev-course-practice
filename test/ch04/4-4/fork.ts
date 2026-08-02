// 슬라이드 3 실습 — 메인넷 포크
//
// ▶ 실행 전 준비
//   1. .env 파일에 추가:
//        MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
//
//   2. hardhat.config.ts의 networks.hardhat 블록에 forking 추가:
//        networks: {
//          hardhat: {
//            forking: {              // ← 이 블록 추가
//              url: process.env.MAINNET_RPC_URL!,
//              blockNumber: 19_000_000,  // 재현 가능한 고정 블록
//            },
//          },
//          localhost: { ... },       // 기존 설정 유지
//          sepolia:   { ... },       // 기존 설정 유지
//        },
//
// ▶ 실행 방법
//   이 파일만 실행:   npx hardhat test test/fork.ts
//
// ※ 포크 첫 실행 시 블록 데이터를 다운로드하므로 수십 초 걸릴 수 있음
// ※ Alchemy 무료 티어는 Archive node 접근 포함 — 별도 업그레이드 불필요

import { impersonateAccount, setBalance } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers } from "hardhat";
import { expect } from "chai";

const UNISWAP_V2_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const DAI  = "0x6B175474E89094C44Da98b954EedeAC495271d0F";

// 메인넷 대형 보유자 (예시 주소 — 포크 상태에서 실제 잔액 보유)
const WHALE = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"; // vitalik.eth

const ROUTER_ABI = [
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
];

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

describe("메인넷 포크 — Uniswap V2 + Impersonation", function () {

  // ─────────────────────────────────────────────
  //  Uniswap 가격 조회 (읽기 전용)
  // ─────────────────────────────────────────────
  describe("Uniswap V2 라우터", function () {
    it("getAmountsOut — 1 ETH → DAI 예상 수량 조회", async function () {
      const router = new ethers.Contract(UNISWAP_V2_ROUTER, ROUTER_ABI, ethers.provider);
      const amountsOut = await router.getAmountsOut(
        ethers.parseEther("1"),
        [WETH, DAI]
      );
      const daiOut = amountsOut[1];
      expect(daiOut).to.be.gt(0n);
      console.log("💱 1 ETH →", ethers.formatUnits(daiOut, 18), "DAI");
    });
  });

  // ─────────────────────────────────────────────
  //  고래 계정 Impersonation
  // ─────────────────────────────────────────────
  describe("고래 계정 Impersonation", function () {
    it("WHALE 주소 DAI 잔액 확인 후 transfer", async function () {
      const [receiver] = await ethers.getSigners();

      // 가스비용 ETH 지급
      await setBalance(WHALE, ethers.parseEther("10"));

      // 고래 주소를 signer로 획득
      await impersonateAccount(WHALE);
      const whaleSigner = await ethers.getSigner(WHALE);

      const dai = new ethers.Contract(DAI, ERC20_ABI, whaleSigner);
      const balance = await dai.balanceOf(WHALE);
      console.log("🐋 WHALE DAI 잔액:", ethers.formatUnits(balance, 18), "DAI");
      expect(balance).to.be.gt(0n);

      // 1 DAI 전송 테스트
      const amount = ethers.parseUnits("1", 18);
      await dai.transfer(receiver.address, amount);
      const received = await dai.balanceOf(receiver.address);
      expect(received).to.equal(amount);
      console.log("✅ 수신 확인:", ethers.formatUnits(received, 18), "DAI");
    });
  });
});
