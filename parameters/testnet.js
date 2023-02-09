const { ethers } = require("hardhat");
const AddressZero = ethers.constants.AddressZero;

module.exports = {
  arbitrumTestnet: {
    chainId: 421613,
    biconomy: AddressZero,
    V2: {
      DataProvider: AddressZero,
      BaseCurrencyPriceSource: AddressZero,
    },
    V3: {
      AddressesProvider: "0x4EEE0BB72C2717310318f27628B3c8a708E4951C",
    },
    Token: {
      WETH: "0xb83C277172198E8Ec6b841Ff9bEF2d7fa524f797",
    },
  },

  avaxTestnet: {
    chainId: 43113,
    biconomy: "0x6271Ca63D30507f2Dcbf99B52787032506D75BBF",
    V2: {
      DataProvider: AddressZero,
      BaseCurrencyPriceSource: AddressZero,
    },
    V3: {
      AddressesProvider: "0x220c6A7D868FC38ECB47d5E69b99e9906300286A",
    },
    Token: {
      WAVAX: "0x8d3d33232bfcb7B901846AE7B8E84aE282ee2882",
    },
  },

  ethGoerli: {
    chainId: 5,
    biconomy: "0xE041608922d06a4F26C0d4c27d8bCD01daf1f792",
    V2: {
      DataProvider: "0x927F584d4321C1dCcBf5e2902368124b02419a1E",
      BaseCurrencyPriceSource: "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e",
    },
    V3: {
      AddressesProvider: AddressZero,
    },
    Token: {
      WETH: "0xCCa7d1416518D095E729904aAeA087dBA749A4dC",
    },
  },

  maticMumbai: {
    chainId: 80001,
    biconomy: "0x9399BB24DBB5C4b782C70c2969F58716Ebbd6a3b",
    V2: {
      DataProvider: AddressZero,
      BaseCurrencyPriceSource: AddressZero,
    },
    V3: {
      AddressesProvider: "0xeb7A892BB04A8f836bDEeBbf60897A7Af1Bf5d7F",
    },
    Token: {
      WMATIC: "0xf237dE5664D3c2D2545684E76fef02A3A58A364c",
    },
  },

  optimismTestnet: {
    chainId: 420,
    biconomy: "0x9C73373C70F23920EA54F7883dCB1F85b162Df40",
    V2: {
      DataProvider: AddressZero,
      BaseCurrencyPriceSource: AddressZero,
    },
    V3: {
      AddressesProvider: "0x0b8FAe5f9Bf5a1a5867FB5b39fF4C028b1C2ebA9",
    },
    Token: {
      WETH: "0xc5Bf9eb35c7d3a90816436E2a124bdd136e09fFD",
    },
  },
};
