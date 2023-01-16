const { expect } = require("chai");
const { assert, ethers, deployments } = require("hardhat");
const { expectRevert } = require('@openzeppelin/test-helpers');
const { BigNumber } = ethers;
const parseEther = ethers.utils.parseEther;
const MaxUint256 = ethers.constants.MaxUint256;

const ERC20_ABI = require("@openzeppelin/contracts-upgradeable/build/contracts/ERC20Upgradeable.json").abi;

const { avaxMainnet: network_ } = require("../parameters");
const { etherBalance, increaseTime } = require("../scripts/utils/ethereum");
const { signATokenPermit } = require("../scripts/AToken");
const { signDelegationPermit } = require("../scripts/DebtToken");

function getUsdtAmount(amount) {
  return ethers.utils.parseUnits(amount, 6);
}

describe("Adapter on Avalanche", async () => {
  const version = 3;
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
    await deployments.fixture(["hardhat_avax_adapter"])

    const adapterProxy = await ethers.getContract("AaveAdapter_Proxy");
    adapter = new ethers.Contract(adapterProxy.address, adapterArtifact.abi, a1);

    weth = new ethers.Contract('0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB', ERC20_ABI, a1);
    usdt = new ethers.Contract('0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', ERC20_ABI, a1);
  });

  describe('Basic', () => {
    it("Should be set with correct initial vaule", async () => {
      expect(await adapter.V3_ADDRESSES_PROVIDER()).equal(network_.V3.AddressesProvider);
      expect(await adapter.V3_DATA_PROVIDER()).equal("0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654");
      expect(await adapter.V3_POOL()).equal("0x794a61358D6845594F94dc1DB02A252b5b4814aD");
      expect(await adapter.WNATIVE()).equal(network_.Token.WAVAX);
      expect(await adapter.aWNATIVE()).not.eq(ethers.constants.AddressZero);

      const reservesTokens = await adapter.getAllReservesTokens();
      expect(reservesTokens.length).to.gt(0);
    });
  });

  describe('AAVE v3', () => {
    let aWETH, aWAVAX, stableDebtUSDT;

    beforeEach(async () => {
      const dataProviderArtifact = await deployments.getArtifact("IPoolDataProvider");
      const dataProvider = new ethers.Contract(await adapter.V3_DATA_PROVIDER(), dataProviderArtifact.abi, a1);
      const aTokenArtifact = await deployments.getArtifact("V3_IAToken");
      var ret = await dataProvider.getReserveTokensAddresses(weth.address);
      aWETH = new ethers.Contract(ret[0], aTokenArtifact.abi, a1);
      ret = await dataProvider.getReserveTokensAddresses(network_.Token.WAVAX);
      aWAVAX = new ethers.Contract(ret[0], aTokenArtifact.abi, a1);
      const creditDelegationTokenArtifact = await deployments.getArtifact("V3_ICreditDelegationToken");
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
      const debtTokenName = await stableDebtUSDT.name();
      var nonce = await stableDebtUSDT.nonces(a1.address);
      var deadline = Date.now() + 3600000;
      var signature = await signDelegationPermit(debtTokenName, network_.chainId, stableDebtUSDT.address, adapter.address, MaxUint256.toString(), nonce.toNumber(), deadline, a1);

      await adapter.borrowWithPermit(usdt.address, getUsdtAmount('1000'), STABLE,
        MaxUint256, deadline, signature.v, signature.r, signature.s
      );
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
      nonce = await aWETH.nonces(a1.address);
      deadline = Date.now() + 3600000;
      signature = await signATokenPermit(aTokenName, network_.chainId, aWETH.address, adapter.address, MaxUint256.toString(), nonce.toNumber(), deadline, a1);

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

      // deposit & borrow
      const debtTokenName = await stableDebtUSDT.name();
      var nonce = await stableDebtUSDT.nonces(a1.address);
      var deadline = Date.now() + 3600000;
      var signature = await signDelegationPermit(debtTokenName, network_.chainId, stableDebtUSDT.address, adapter.address, MaxUint256.toString(), nonce.toNumber(), deadline, a1);

      await adapter.supplyAndBorrowWithPermit(
        weth.address, parseEther('10'),
        usdt.address, getUsdtAmount('1000'), STABLE,
        MaxUint256, deadline, signature.v, signature.r, signature.s
      );
      expect(await aWETH.balanceOf(a1.address)).equal(parseEther('10'));
      expect(await usdt.balanceOf(a1.address)).equal(getUsdtAmount('1000'));
      expect(await stableDebtUSDT.balanceOf(a1.address)).equal(getUsdtAmount('1000'));

      await increaseTime(10 * DAY);

      // repay & withdraw
      await usdt.connect(deployer).transfer(a1.address, getUsdtAmount('100'));

      const aTokenName = await aWETH.name();
      nonce = await aWETH.nonces(a1.address);
      deadline = Date.now() + 3600000;
      signature = await signATokenPermit(aTokenName, network_.chainId, aWETH.address, adapter.address, MaxUint256.toString(), nonce.toNumber(), deadline, a1);

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

    it("Should be correctly deposited AVAX", async () => {
      const balance = await etherBalance(a1.address);
      await usdt.approve(adapter.address, MaxUint256);

      // deposit AVAX
      await adapter.supplyETH(version, { value: parseEther('200') });
      expect(await aWAVAX.balanceOf(a1.address)).equal(parseEther('200'));
      expect(await etherBalance(a1.address)).lt(balance.sub(parseEther('200')));

      // borrow
      const debtTokenName = await stableDebtUSDT.name();
      var nonce = await stableDebtUSDT.nonces(a1.address);
      var deadline = Date.now() + 3600000;
      var signature = await signDelegationPermit(debtTokenName, network_.chainId, stableDebtUSDT.address, adapter.address, MaxUint256.toString(), nonce.toNumber(), deadline, a1);

      await adapter.borrowWithPermit(usdt.address, getUsdtAmount('1000'), STABLE,
        MaxUint256, deadline, signature.v, signature.r, signature.s
      );
      expect(await usdt.balanceOf(a1.address)).equal(getUsdtAmount('1000'));
      expect(await stableDebtUSDT.balanceOf(a1.address)).equal(getUsdtAmount('1000'));

      await increaseTime(10 * DAY);

      // repay
      await usdt.connect(deployer).transfer(a1.address, getUsdtAmount('100'));
      await adapter.repay(version, usdt.address, MaxUint256, STABLE);
      expect(await stableDebtUSDT.balanceOf(a1.address)).equal(0);
      expect(await usdt.balanceOf(a1.address)).lt(getUsdtAmount('100'));

      // withdraw AVAX
      const aTokenName = await aWAVAX.name();
      nonce = await aWAVAX.nonces(a1.address);
      deadline = Date.now() + 3600000;
      signature = await signATokenPermit(aTokenName, network_.chainId, aWAVAX.address, adapter.address, MaxUint256.toString(), nonce.toNumber(), deadline, a1);

      const balanceBefore = await etherBalance(a1.address);
      await adapter.withdrawETHWithPermit(version, MaxUint256,
        MaxUint256, deadline, signature.v, signature.r, signature.s
      );
      expect(await etherBalance(a1.address)).gte(balanceBefore.add(parseEther('199.9')));
      expect(await aWAVAX.balanceOf(a1.address)).equal(0);
    });

    it("Should be correctly borrowed AVAX", async () => {
      const dataProviderArtifact = await deployments.getArtifact("IPoolDataProvider");
      const dataProvider = new ethers.Contract(await adapter.V3_DATA_PROVIDER(), dataProviderArtifact.abi, a1);
      const creditDelegationTokenArtifact = await deployments.getArtifact("V3_ICreditDelegationToken");
      const ret = await dataProvider.getReserveTokensAddresses(network_.Token.WAVAX);
      const variableDebtWAVAX = new ethers.Contract(ret[2], creditDelegationTokenArtifact.abi, a1);

      await weth.connect(deployer).transfer(a1.address, parseEther('10'));
      await weth.approve(adapter.address, MaxUint256);

      // deposit
      await adapter.supply(version, weth.address, parseEther('10'));
      expect(await aWETH.balanceOf(a1.address)).equal(parseEther('10'));

      // borrow AVAX. The stable borrowing is not enabled on the WAVAX
      const balanceBefore = await etherBalance(a1.address);
      const debtTokenName = await variableDebtWAVAX.name();
      var nonce = await variableDebtWAVAX.nonces(a1.address);
      var deadline = Date.now() + 3600000;
      var signature = await signDelegationPermit(debtTokenName, network_.chainId, variableDebtWAVAX.address, adapter.address, MaxUint256.toString(), nonce.toNumber(), deadline, a1);

      await adapter.borrowETHWithPermit(parseEther('100'), VARIABLE,
        MaxUint256, deadline, signature.v, signature.r, signature.s
      );
      expect(await etherBalance(a1.address)).closeTo(balanceBefore.add(parseEther('100')), parseEther('0.1'));
      expect(await variableDebtWAVAX.balanceOf(a1.address)).equal(parseEther('100'));

      await increaseTime(10 * DAY);

      // repay AVAX
      await adapter.repayETH(version, MaxUint256, VARIABLE, {value: parseEther('110')});
      expect(await variableDebtWAVAX.balanceOf(a1.address)).equal(0);
      expect(await etherBalance(a1.address)).closeTo(balanceBefore, parseEther('1'));

      // withdraw
      const aTokenName = await aWETH.name();
      nonce = await aWETH.nonces(a1.address);
      deadline = Date.now() + 3600000;
      signature = await signATokenPermit(aTokenName, network_.chainId, aWETH.address, adapter.address, MaxUint256.toString(), nonce.toNumber(), deadline, a1);

      await adapter.withdrawWithPermit(version, weth.address, MaxUint256,
        MaxUint256, deadline, signature.v, signature.r, signature.s
      );
      expect(await weth.balanceOf(a1.address)).gte(parseEther('10'));
      expect(await aWETH.balanceOf(a1.address)).equal(0);
    });

    it("Should be correctly worked with the merged methods and AVAX", async () => {
      const dataProviderArtifact = await deployments.getArtifact("IPoolDataProvider");
      const dataProvider = new ethers.Contract(await adapter.V3_DATA_PROVIDER(), dataProviderArtifact.abi, a1);
      const creditDelegationTokenArtifact = await deployments.getArtifact("V3_ICreditDelegationToken");
      const ret = await dataProvider.getReserveTokensAddresses(network_.Token.WAVAX);
      const variableDebtWAVAX = new ethers.Contract(ret[2], creditDelegationTokenArtifact.abi, a1);

      await weth.connect(deployer).transfer(a1.address, parseEther('10'));
      await weth.approve(adapter.address, MaxUint256);

      // deposit & borrow
      const balanceBefore = await etherBalance(a1.address);
      const debtTokenName = await variableDebtWAVAX.name();
      var nonce = await variableDebtWAVAX.nonces(a1.address);
      var deadline = Date.now() + 3600000;
      var signature = await signDelegationPermit(debtTokenName, network_.chainId, variableDebtWAVAX.address, adapter.address, MaxUint256.toString(), nonce.toNumber(), deadline, a1);

      await adapter.supplyAndBorrowETHWithPermit(
        weth.address, parseEther('10'),
        parseEther('100'), VARIABLE,
        MaxUint256, deadline, signature.v, signature.r, signature.s
      );
      expect(await aWETH.balanceOf(a1.address)).equal(parseEther('10'));
      expect(await etherBalance(a1.address)).closeTo(balanceBefore.add(parseEther('100')), parseEther('0.1'));
      expect(await variableDebtWAVAX.balanceOf(a1.address)).equal(parseEther('100'));

      await increaseTime(10 * DAY);

      // repay & withdraw
      const aTokenName = await aWETH.name();
      nonce = await aWETH.nonces(a1.address);
      deadline = Date.now() + 3600000;
      signature = await signATokenPermit(aTokenName, network_.chainId, aWETH.address, adapter.address, MaxUint256.toString(), nonce.toNumber(), deadline, a1);

      await adapter.repayETHAndWithdrawWithPermit(version,
        MaxUint256, VARIABLE,
        weth.address, MaxUint256,
        MaxUint256, deadline, signature.v, signature.r, signature.s,
        {value: parseEther('110')}
      );
      expect(await variableDebtWAVAX.balanceOf(a1.address)).equal(0);
      expect(await etherBalance(a1.address)).closeTo(balanceBefore, parseEther('1'));
      expect(await weth.balanceOf(a1.address)).gte(parseEther('10'));
      expect(await aWETH.balanceOf(a1.address)).equal(0);
    });

  });

});