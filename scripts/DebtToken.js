const { sign } = require('./utils/eip712');

const types = {
    EIP712Domain: [
        {name: "name", type: "string"},
        {name: "version", type: "string"},
        {name: 'chainId', type: 'uint256'},
        {name: "verifyingContract", type: "address"},
    ],
    DelegationWithSig: [
        {name: "delegatee", type: "address"},
        {name: "value", type: "uint256"},
        {name: "nonce", type: "uint256"},
        {name: "deadline", type: "uint256"},
    ],
}

const primaryType = "DelegationWithSig";

function getDomainData(tokenName, chainId, tokenAddress) {
    return {
        name: tokenName,
        version: "1",
        chainId: chainId,
        verifyingContract: tokenAddress,
    };
}

function getMessageData(delegatee, value, nonce, deadline) {
    return {
        delegatee: delegatee,
        value: value,
        nonce: nonce,
        deadline: deadline,
    }
}

async function signDelegationPermit(tokenName, chainId, tokenAddress, delegatee, value, nonce, deadline, signer) {
    return await sign(
        types,
        getDomainData(tokenName, chainId, tokenAddress),
        primaryType,
        getMessageData(delegatee, value, nonce, deadline),
        signer);
}

module.exports = {
    signDelegationPermit,
};