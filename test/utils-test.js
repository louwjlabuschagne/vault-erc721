const {
    expect
} = require("chai");
const {
    ethers
} = require("hardhat");

const {
    getInterfaceID,
    ERC721_INTERFACE_ID,
    ERC165_INTERFACE_ID
} = require('./utils');

const OZ_DIR = `../artifacts/@openzeppelin`
const INTROSPECTION_DIR = `${OZ_DIR}/contracts/utils/introspection/`
const ERC721_DIR = `${OZ_DIR}/contracts/token/ERC721`
const IERC721_ABI = require(`${ERC721_DIR}/IERC721.sol/IERC721.json`).abi.filter(
    (item) => item.name !== 'supportsInterface'
)
const IERC165_ABI = require(`${INTROSPECTION_DIR}/IERC165.sol/IERC165.json`).abi

describe("Utils", () => {

    it("getInterfaceId works for IERC721", async () => {

        let ierc721 = new ethers.utils.Interface(IERC721_ABI);
        expect(getInterfaceID(ierc721)).to.be.equal(ERC721_INTERFACE_ID)
    });

    it("getInterfaceId works for IERC721", async () => {

        let ierc165 = new ethers.utils.Interface(IERC165_ABI);
        expect(getInterfaceID(ierc165)).to.be.equal(ERC165_INTERFACE_ID)
    });
})