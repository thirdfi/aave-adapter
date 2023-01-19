const { ethers } = require("hardhat");
const AddressZero = ethers.constants.AddressZero;

module.exports = {
  arbitrumMainnet: {
    chainId: 42161,
    biconomy: "0xfe0fa3C06d03bDC7fb49c892BbB39113B534fB57",
    V2: {
      DataProvider: AddressZero,
      BaseCurrencyPriceSource: AddressZero,
    },
    V3: {
      AddressesProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    },
    Token: {
      WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    },
  },

  avaxMainnet: {
    chainId: 43114,
    biconomy: "0x64CD353384109423a966dCd3Aa30D884C9b2E057",
    V2: {
      DataProvider: AddressZero,
      BaseCurrencyPriceSource: AddressZero,
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
      BaseCurrencyPriceSource: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
    },
    V3: {
      AddressesProvider: AddressZero,
    },
    Token: {
      WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    },
  },

  maticMainnet: {
    chainId: 137,
    biconomy: "0x86C80a8aa58e0A4fa09A69624c31Ab2a6CAD56b8",
    V2: {
      DataProvider: AddressZero,
      BaseCurrencyPriceSource: AddressZero,
    },
    V3: {
      AddressesProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    },
    Token: {
      WMATIC: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
    },
  },

  optimismMainnet: {
    chainId: 10,
    biconomy: "0xEFbA8a2A82ec1fB1273806174f5E28FBb917Cf95",
    V2: {
      DataProvider: AddressZero,
      BaseCurrencyPriceSource: AddressZero,
    },
    V3: {
      AddressesProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    },
    Token: {
      WETH: "0x4200000000000000000000000000000000000006",
    },
  },
};
