const { ethers } = require("hardhat");
const AddressZero = ethers.constants.AddressZero;

module.exports = {
  avaxTestnet: {
    chainId: 43113,
    biconomy: "0x6271Ca63D30507f2Dcbf99B52787032506D75BBF",
    V2: {
      DataProvider: AddressZero,
    },
    V3: {
      AddressesProvider: "0x1775ECC8362dB6CaB0c7A9C0957cF656A5276c29",
    },
    Token: {
      WAVAX: "0xd00ae08403B9bbb9124bB305C09058E32C39A48c",
    },
  },

  ethGoerli: {
    chainId: 5,
    biconomy: "0xE041608922d06a4F26C0d4c27d8bCD01daf1f792",
    V2: {
      DataProvider: "0x927F584d4321C1dCcBf5e2902368124b02419a1E",
    },
    V3: {
      AddressesProvider: AddressZero,
    },
    Token: {
      WETH: "0xCCa7d1416518D095E729904aAeA087dBA749A4dC",
    },
  },
};
