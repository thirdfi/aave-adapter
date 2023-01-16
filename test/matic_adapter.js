const { expect } = require("chai");
const { ethers, deployments } = require("hardhat");

const { maticMainnet: network_ } = require("../parameters");

describe("Adapter on Avalanche", async () => {
  let adapter;
  let adapterArtifact;

  before(async () => {
    [deployer, a1, a2, ...accounts] = await ethers.getSigners();

    adapterArtifact = await deployments.getArtifact("AaveAdapter");
  });

  beforeEach(async () => {
    await deployments.fixture(["hardhat_matic_adapter"])

    const adapterProxy = await ethers.getContract("AaveAdapter_Proxy");
    adapter = new ethers.Contract(adapterProxy.address, adapterArtifact.abi, a1);
  });

  describe('Basic', () => {
    it("Should be set with correct initial vaule", async () => {
      expect(await adapter.V3_ADDRESSES_PROVIDER()).equal(network_.V3.AddressesProvider);
      expect(await adapter.WNATIVE()).equal(network_.Token.WMATIC);
      expect(await adapter.aWNATIVE()).not.eq(ethers.constants.AddressZero);

      const reservesTokens = await adapter.getAllReservesTokens();
      expect(reservesTokens.length).to.gt(0);
    });
  });

});