const { network } = require("hardhat");
require("dotenv").config();

const mainnetUrl = `https://opt-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_OPTIMISM_MAINNET_API_KEY}`;
const mainnetBlockNumber = 68120000;

module.exports = async () => {
  await network.provider.request({
    method: "hardhat_reset",
    params: [
      {
        forking: {
          jsonRpcUrl: mainnetUrl,
          blockNumber: mainnetBlockNumber,
        },
      },
    ],
  });
};
module.exports.tags = ["hardhat_optimism_reset"];
