
async function sign(types, domain, primaryType, message, signer) {
    try {
        const address = await signer.getAddress();
        const msgParams = JSON.stringify({ domain, primaryType, message, types });

        signature = await ethers.provider.send(
            'eth_signTypedData_v4',
            [ address, msgParams ]
        );

        let r = signature.slice(0, 66);
        let s = "0x".concat(signature.slice(66, 130));
        let v = "0x".concat(signature.slice(130, 132));
        let value = parseInt(v, 16);
        if (![27, 28].includes(value)) {
            v = (value + 27).toString(16);
        }

        return { r, s, v };
    } catch(e) {
        throw new Error(e);
    }
}

module.exports = {
    sign,
};