const { expect } = require("chai");
const { assert, ethers, deployments } = require("hardhat");
const { expectRevert } = require('@openzeppelin/test-helpers');
const { BigNumber } = ethers;
const parseEther = ethers.utils.parseEther;
const MaxUint256 = ethers.constants.MaxUint256;

const ERC20_ABI = require("@openzeppelin/contracts-upgradeable/build/contracts/ERC20Upgradeable.json").abi;

const { ethMainnet: network_ } = require("../parameters");
const { etherBalance, increaseTime } = require("../scripts/utils/ethereum");
const { signATokenPermit } = require("../scripts/AToken");

function getUsdtAmount(amount) {
  return ethers.utils.parseUnits(amount, 6);
}
function getUsdcAmount(amount) {
  return ethers.utils.parseUnits(amount, 6);
}

describe("Adapter on Ethereum", async () => {
  const version = 2;
  const STABLE = 1;
  const VARIABLE = 2;
  const DAY = 24 * 3600;

  let adapter, weth, usdt;
  let adapterArtifact;

  before(async () => {
    [deployer, a1, a2, ...accounts] = await ethers.getSigners();

    adapterArtifact = await deployments.getArtifact("AaveAdapter");
  });

  beforeEach(async () => {
    await deployments.fixture(["hardhat_eth_adapter"])

    const adapterProxy = await ethers.getContract("AaveAdapter_Proxy");
    adapter = new ethers.Contract(adapterProxy.address, adapterArtifact.abi, a1);

    weth = new ethers.Contract(network_.Token.WETH, ERC20_ABI, a1);
    usdt = new ethers.Contract('0xdAC17F958D2ee523a2206206994597C13D831ec7', ERC20_ABI, a1);
  });

  describe('Basic', () => {
    it("Should be set with correct initial vaule", async () => {
      expect(await adapter.V2_DATA_PROVIDER()).equal(network_.V2.DataProvider);
      expect(await adapter.V2_ADDRESSES_PROVIDER()).equal("0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5");
      expect(await adapter.V2_LENDING_POOL()).equal("0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9");

      const reservesTokens = await adapter.getAllReservesTokens();
      expect(reservesTokens.length).to.gt(0);
    });
  });

  describe('AAVE v2', () => {
    let aWETH, stableDebtUSDT;

    beforeEach(async () => {
      const dataProviderArtifact = await deployments.getArtifact("IAaveProtocolDataProvider");
      const dataProvider = new ethers.Contract(await adapter.V2_DATA_PROVIDER(), dataProviderArtifact.abi, a1);
      const aTokenArtifact = await deployments.getArtifact("V2_IAToken");
      var ret = await dataProvider.getReserveTokensAddresses(weth.address);
      aWETH = new ethers.Contract(ret[0], aTokenArtifact.abi, a1);
      const creditDelegationTokenArtifact = await deployments.getArtifact("V2_ICreditDelegationToken");
      ret = await dataProvider.getReserveTokensAddresses(usdt.address);
      stableDebtUSDT = new ethers.Contract(ret[1], creditDelegationTokenArtifact.abi, a1);
    });

    it("Should be correctly worked", async () => {
      await weth.connect(deployer).transfer(a1.address, parseEther('10'));
      await weth.approve(adapter.address, MaxUint256);
      await usdt.approve(adapter.address, MaxUint256);

      // deposit
      await adapter.supply(version, weth.address, parseEther('10'));
      expect(await aWETH.balanceOf(a1.address)).equal(parseEther('10'));

      // borrow
      await stableDebtUSDT.approveDelegation(adapter.address, MaxUint256);
      await adapter.borrow(version, usdt.address, getUsdtAmount('1000'), STABLE);
      expect(await usdt.balanceOf(a1.address)).equal(getUsdtAmount('1000'));
      expect(await stableDebtUSDT.balanceOf(a1.address)).equal(getUsdtAmount('1000'));

      await increaseTime(10 * DAY);

      // repay
      await usdt.connect(deployer).transfer(a1.address, getUsdtAmount('100'));
      await adapter.repay(version, usdt.address, MaxUint256, STABLE);
      expect(await stableDebtUSDT.balanceOf(a1.address)).equal(0);
      expect(await usdt.balanceOf(a1.address)).lt(getUsdtAmount('100'));

      // withdraw
      const aTokenName = await aWETH.name();
      const nonce = await aWETH._nonces(a1.address);
      const deadline = Math.floor(Date.now()/1000) + 3600;
      const signature = await signATokenPermit(aTokenName, network_.chainId, aWETH.address, adapter.address, MaxUint256.toString(), nonce.toNumber(), deadline, a1);

      await adapter.withdrawWithPermit(version, weth.address, MaxUint256,
        MaxUint256, deadline, signature.v, signature.r, signature.s
      );
      expect(await weth.balanceOf(a1.address)).gte(parseEther('10'));
      expect(await aWETH.balanceOf(a1.address)).equal(0);
    });

    it("Should be correctly worked with the merged methods", async () => {
      await weth.connect(deployer).transfer(a1.address, parseEther('10'));
      await weth.approve(adapter.address, MaxUint256);
      await usdt.approve(adapter.address, MaxUint256);
      await stableDebtUSDT.approveDelegation(adapter.address, MaxUint256);

      // deposit & borrow
      await adapter.supplyAndBorrow(version,
        weth.address, parseEther('10'),
        usdt.address, getUsdtAmount('1000'), STABLE
      );
      expect(await aWETH.balanceOf(a1.address)).equal(parseEther('10'));
      expect(await usdt.balanceOf(a1.address)).equal(getUsdtAmount('1000'));
      expect(await stableDebtUSDT.balanceOf(a1.address)).equal(getUsdtAmount('1000'));

      await increaseTime(10 * DAY);

      // repay & withdraw
      await usdt.connect(deployer).transfer(a1.address, getUsdtAmount('100'));

      const aTokenName = await aWETH.name();
      const nonce = await aWETH._nonces(a1.address);
      const deadline = Math.floor(Date.now()/1000) + 3600;
      const signature = await signATokenPermit(aTokenName, network_.chainId, aWETH.address, adapter.address, MaxUint256.toString(), nonce.toNumber(), deadline, a1);

      await adapter.repayAndWithdrawWithPermit(version,
        usdt.address, MaxUint256, STABLE,
        weth.address, MaxUint256,
        MaxUint256, deadline, signature.v, signature.r, signature.s
      );
      expect(await stableDebtUSDT.balanceOf(a1.address)).equal(0);
      expect(await usdt.balanceOf(a1.address)).lt(getUsdtAmount('100'));
      expect(await weth.balanceOf(a1.address)).gte(parseEther('10'));
      expect(await aWETH.balanceOf(a1.address)).equal(0);
    });

    it("Should be correctly deposited ETH", async () => {
      const balance = await etherBalance(a1.address);
      await usdt.approve(adapter.address, MaxUint256);

      // deposit ETH
      await adapter.supplyETH(version, { value: parseEther('10') });
      expect(await aWETH.balanceOf(a1.address)).equal(parseEther('10'));
      expect(await etherBalance(a1.address)).lt(balance.sub(parseEther('10')));

      // borrow
      await stableDebtUSDT.approveDelegation(adapter.address, MaxUint256);
      await adapter.borrow(version, usdt.address, getUsdtAmount('1000'), STABLE);
      expect(await usdt.balanceOf(a1.address)).equal(getUsdtAmount('1000'));
      expect(await stableDebtUSDT.balanceOf(a1.address)).equal(getUsdtAmount('1000'));

      await increaseTime(10 * DAY);

      // repay
      await usdt.connect(deployer).transfer(a1.address, getUsdtAmount('100'));
      await adapter.repay(version, usdt.address, MaxUint256, STABLE);
      expect(await stableDebtUSDT.balanceOf(a1.address)).equal(0);
      expect(await usdt.balanceOf(a1.address)).lt(getUsdtAmount('100'));

      // withdraw ETH
      const aTokenName = await aWETH.name();
      const nonce = await aWETH._nonces(a1.address);
      const deadline = Math.floor(Date.now()/1000) + 3600;
      const signature = await signATokenPermit(aTokenName, network_.chainId, aWETH.address, adapter.address, MaxUint256.toString(), nonce.toNumber(), deadline, a1);

      const balanceBefore = await etherBalance(a1.address);
      await adapter.withdrawETHWithPermit(version, MaxUint256,
        MaxUint256, deadline, signature.v, signature.r, signature.s
      );
      expect(await etherBalance(a1.address)).gte(balanceBefore.add(parseEther('9.9')));
      expect(await aWETH.balanceOf(a1.address)).equal(0);
    });

    it("Should be correctly borrowed ETH", async () => {
      const usdc = new ethers.Contract('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', ERC20_ABI, a1);
      const dataProviderArtifact = await deployments.getArtifact("IAaveProtocolDataProvider");
      const dataProvider = new ethers.Contract(await adapter.V2_DATA_PROVIDER(), dataProviderArtifact.abi, a1);
      const aTokenArtifact = await deployments.getArtifact("V2_IAToken");
      var ret = await dataProvider.getReserveTokensAddresses(usdc.address);
      const aUSDC = new ethers.Contract(ret[0], aTokenArtifact.abi, a1);
      const creditDelegationTokenArtifact = await deployments.getArtifact("V2_ICreditDelegationToken");
      ret = await dataProvider.getReserveTokensAddresses(weth.address);
      const stableDebtWETH = new ethers.Contract(ret[1], creditDelegationTokenArtifact.abi, a1);

      await usdc.connect(deployer).transfer(a1.address, getUsdcAmount('10000'));
      await usdc.approve(adapter.address, MaxUint256);

      // deposit
      await adapter.supply(version, usdc.address, getUsdcAmount('10000'));
      expect(await aUSDC.balanceOf(a1.address)).equal(getUsdcAmount('10000'));

      // borrow ETH
      const balanceBefore = await etherBalance(a1.address);
      await stableDebtWETH.approveDelegation(adapter.address, MaxUint256);
      await adapter.borrowETH(version, parseEther('1'), STABLE);
      expect(await etherBalance(a1.address)).gte(balanceBefore.add(parseEther('0.9')));
      expect(await stableDebtWETH.balanceOf(a1.address)).equal(parseEther('1'));

      await increaseTime(10 * DAY);

      // repay ETH
      await adapter.repayETH(version, MaxUint256, STABLE, { value: parseEther('1.1') });
      expect(await stableDebtWETH.balanceOf(a1.address)).equal(0);
      expect(await etherBalance(a1.address)).closeTo(balanceBefore, parseEther('0.1'));

      // withdraw
      const aTokenName = await aUSDC.name();
      const nonce = await aUSDC._nonces(a1.address);
      const deadline = Math.floor(Date.now()/1000) + 3600;
      const signature = await signATokenPermit(aTokenName, network_.chainId, aUSDC.address, adapter.address, MaxUint256.toString(), nonce.toNumber(), deadline, a1);

      await adapter.withdrawWithPermit(version, usdc.address, MaxUint256,
        MaxUint256, deadline, signature.v, signature.r, signature.s
      );
      expect(await usdc.balanceOf(a1.address)).gte(getUsdcAmount('10000'));
      expect(await aUSDC.balanceOf(a1.address)).equal(0);
    });

    it("Should be correctly worked with the merged methods and ETH", async () => {
      const balance = await etherBalance(a1.address);
      await usdt.approve(adapter.address, MaxUint256);
      await stableDebtUSDT.approveDelegation(adapter.address, MaxUint256);

      // deposit & borrow
      await adapter.supplyETHAndBorrow(version,
        usdt.address, getUsdtAmount('1000'), STABLE,
        { value: parseEther('10') }
      );
      expect(await aWETH.balanceOf(a1.address)).equal(parseEther('10'));
      expect(await etherBalance(a1.address)).closeTo(balance.sub(parseEther('10')), parseEther('0.01'));
      expect(await usdt.balanceOf(a1.address)).equal(getUsdtAmount('1000'));
      expect(await stableDebtUSDT.balanceOf(a1.address)).equal(getUsdtAmount('1000'));

      await increaseTime(10 * DAY);

      // repay & withdraw
      await usdt.connect(deployer).transfer(a1.address, getUsdtAmount('100'));

      const aTokenName = await aWETH.name();
      const nonce = await aWETH._nonces(a1.address);
      const deadline = Math.floor(Date.now()/1000) + 3600;
      const signature = await signATokenPermit(aTokenName, network_.chainId, aWETH.address, adapter.address, MaxUint256.toString(), nonce.toNumber(), deadline, a1);

      await adapter.repayAndWithdrawETHWithPermit(version,
        usdt.address, MaxUint256, STABLE,
        MaxUint256,
        MaxUint256, deadline, signature.v, signature.r, signature.s
      );
      expect(await stableDebtUSDT.balanceOf(a1.address)).equal(0);
      expect(await usdt.balanceOf(a1.address)).lt(getUsdtAmount('100'));
      expect(await aWETH.balanceOf(a1.address)).equal(0);
      expect(await etherBalance(a1.address)).closeTo(balance, parseEther('0.01'));
    });

  });

});