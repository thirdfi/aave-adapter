const { network } = require("hardhat");
require("dotenv").config();

const mainnetUrl = `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_ARBITRUM_MAINNET_API_KEY}`;
const mainnetBlockNumber = 53540390;

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
module.exports.tags = ["hardhat_arbitrum_reset"];
