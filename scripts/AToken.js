const { sign } = require('./utils/eip712');

const types = {
    EIP712Domain: [
        {name: "name", type: "string"},
        {name: "version", type: "string"},
        {name: 'chainId', type: 'uint256'},
        {name: "verifyingContract", type: "address"},
    ],
    Permit: [
        {name: "owner", type: "address"},
        {name: "spender", type: "address"},
        {name: "value", type: "uint256"},
        {name: "nonce", type: "uint256"},
        {name: "deadline", type: "uint256"},
    ],
}

const primaryType = "Permit";

function getDomainData(aTokenName, chainId, aTokenAddress) {
    return {
        name: aTokenName,
        version: "1",
        chainId: chainId,
        verifyingContract: aTokenAddress,
    };
}

function getMessageData(owner, spender, value, nonce, deadline) {
    return {
        owner: owner,
        spender: spender,
        value: value,
        nonce: nonce,
        deadline: deadline,
    }
}

async function signATokenPermit(aTokenName, chainId, aTokenAddress, spender, value, nonce, deadline, signer) {
    const owner = await signer.getAddress();
    return await sign(
        types,
        getDomainData(aTokenName, chainId, aTokenAddress),
        primaryType,
        getMessageData(owner, spender, value, nonce, deadline),
        signer);
}

module.exports = {
    signATokenPermit,
};