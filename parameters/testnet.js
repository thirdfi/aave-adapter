const { ethers } = require("hardhat");
const AddressZero = ethers.constants.AddressZero;

module.exports = {
  arbitrumTestnet: {
    chainId: 421613,
    biconomy: "0x67454E169d613a8e9BA6b06af2D267696EAaAf41",
    V2: {
      DataProvider: AddressZero,
      BaseCurrencyPriceSource: AddressZero,
    },
    V3: {
      AddressesProvider: "0xF8aa90E66B8BAe13f2e4aDe6104abAb8eeDaBfdc",
    },
    Token: {
      WETH: "0xCDa739D69067333974cD73A722aB92E5e0ad8a4F",
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
      AddressesProvider: "0x1775ECC8362dB6CaB0c7A9C0957cF656A5276c29",
    },
    Token: {
      WAVAX: "0x407287b03D1167593AF113d32093942be13A535f",
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
      AddressesProvider: "0x5343b5bA672Ae99d627A1C87866b8E53F47Db2E6",
    },
    Token: {
      WMATIC: "0xb685400156cF3CBE8725958DeAA61436727A30c3",
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
      AddressesProvider: "0x74a328ED938160D702378Daeb7aB2504714B4E4b",
    },
    Token: {
      WETH: "0x09bADef78f92F20fd5f7a402dbb1d25d4901aAb2",
    },
  },
};
