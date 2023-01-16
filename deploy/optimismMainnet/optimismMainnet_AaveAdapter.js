const { ethers } = require("hardhat");
const { optimismMainnet: network_ } = require('../../parameters');

module.exports = async ({ deployments }) => {
  const { deploy } = deployments;
  const [deployer] = await ethers.getSigners();

  console.log("Now deploying AaveAdapter...");
  const proxy = await deploy("AaveAdapter", {
    from: deployer.address,
    args: [
      network_.V2.DataProvider,
      network_.V3.AddressesProvider,
      network_.Token.WETH,
    ],
    proxy: {
      proxyContract: "OpenZeppelinTransparentProxy",
      execute: {
        init: {
          methodName: "initialize",
          args: [
            network_.biconomy
          ],
        },
      },
    },
  });
  console.log("  AaveAdapter_Proxy contract address: ", proxy.address);

  // Verify the implementation contract
  try {
    const implSlot = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"; // bytes32(uint256(keccak256('eip1967.proxy.implementation')) - 1)

    let implAddress = await ethers.provider.getStorageAt(proxy.address, implSlot);
    implAddress = implAddress.replace("0x000000000000000000000000", "0x");

    await run("verify:verify", {
      address: implAddress,
      contract: "contracts/AaveAdapter.sol:AaveAdapter",
      constructorArguments: [
        network_.V2.DataProvider,
        network_.V3.AddressesProvider,
        network_.Token.WETH,
      ],
    });
  } catch (e) {
  }
};
module.exports.tags = ["optimismMainnet_AaveAdapter"];
