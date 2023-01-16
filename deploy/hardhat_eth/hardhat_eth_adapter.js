const { ethers, network } = require("hardhat");

const ERC20_ABI = require("@openzeppelin/contracts-upgradeable/build/contracts/ERC20Upgradeable").abi;

const { ethMainnet: network_ } = require("../../parameters");

module.exports = async () => {
  const [deployer] = await ethers.getSigners();

  const wethHolder = await ethers.getSigner('0x2fEb1512183545f48f6b9C5b4EbfCaF49CfCa6F3');
  await network.provider.request({method: "hardhat_impersonateAccount", params: [wethHolder.address]});
  const weth = new ethers.Contract(network_.Token.WETH, ERC20_ABI, wethHolder);
  await weth.transfer(deployer.address, await weth.balanceOf(wethHolder.address));

  const usdtHolder = await ethers.getSigner('0x5a52E96BAcdaBb82fd05763E25335261B270Efcb');
  await network.provider.request({method: "hardhat_impersonateAccount", params: [usdtHolder.address]});
  const usdt = new ethers.Contract('0xdAC17F958D2ee523a2206206994597C13D831ec7', ERC20_ABI, usdtHolder);
  await usdt.transfer(deployer.address, await usdt.balanceOf(usdtHolder.address));

  const usdcHolder = await ethers.getSigner('0x28C6c06298d514Db089934071355E5743bf21d60');
  await network.provider.request({method: "hardhat_impersonateAccount", params: [usdcHolder.address]});
  const usdc = new ethers.Contract('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', ERC20_ABI, usdcHolder);
  await usdc.transfer(deployer.address, await usdc.balanceOf(usdcHolder.address));
};

module.exports.tags = ["hardhat_eth_adapter"];
module.exports.dependencies = [
  "hardhat_eth_reset",
  "ethMainnet_AaveAdapter",
];
