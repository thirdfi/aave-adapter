const { ethers, network } = require("hardhat");

const ERC20_ABI = require("@openzeppelin/contracts-upgradeable/build/contracts/ERC20Upgradeable").abi;

module.exports = async () => {
  const [deployer] = await ethers.getSigners();

  const wethHolder = await ethers.getSigner('0xa8FAB1c02978d9D1C10158A4534e0f8509Ec1BC5');
  await network.provider.request({method: "hardhat_impersonateAccount", params: [wethHolder.address]});
  const weth = new ethers.Contract('0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB', ERC20_ABI, wethHolder);
  await weth.transfer(deployer.address, await weth.balanceOf(wethHolder.address));

  const usdtHolder = await ethers.getSigner('0x4aeFa39caEAdD662aE31ab0CE7c8C2c9c0a013E8');
  await network.provider.request({method: "hardhat_impersonateAccount", params: [usdtHolder.address]});
  const usdt = new ethers.Contract('0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', ERC20_ABI, usdtHolder);
  await usdt.transfer(deployer.address, await usdt.balanceOf(usdtHolder.address));
};

module.exports.tags = ["hardhat_avax_adapter"];
module.exports.dependencies = [
  "hardhat_avax_reset",
  "avaxMainnet_AaveAdapter",
];
