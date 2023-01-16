const { ethers } = require("hardhat");
const AddressZero = ethers.constants.AddressZero;

module.exports = {
  avaxMainnet: {
    chainId: 43114,
    biconomy: "0x64CD353384109423a966dCd3Aa30D884C9b2E057",
    V2: {
      DataProvider: AddressZero,
    },
    V3: {
      AddressesProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    },
    Token: {
      WAVAX: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
    },
  },

  ethMainnet: {
    chainId: 1,
    biconomy: "0x84a0856b038eaAd1cC7E297cF34A7e72685A8693",
    V2: {
      DataProvider: "0x057835Ad21a177dbdd3090bB1CAE03EaCF78Fc6d",
    },
    V3: {
      AddressesProvider: AddressZero,
    },
    Token: {
      WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    },
  },
};
