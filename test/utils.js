const VAULT_STATE = {
  OPEN: 0,
  CLOSED: 1,
  DESTROYED: 2,
};

const cleanToken = (token) => {
  return {
    "address": token[0],
    "tokenId": token[1].toString(),
    "listPtr": token[2].toString(),
  }
}


const getInterfaceID = (contractInterface) => {
  let interfaceID = ethers.constants.Zero;
  const functions = Object.keys(contractInterface.functions);
  for (let i = 0; i < functions.length; i++) {
    let f = functions[i];
    let hash = contractInterface.getSighash(f);
    interfaceID = interfaceID.xor(hash);
  }

  return interfaceID.toHexString();
}

const ERC721_INTERFACE_ID = "0x80ac58cd";
const ERC165_INTERFACE_ID = "0x01ffc9a7";

module.exports = {
  VAULT_STATE,
  getInterfaceID,
  ERC721_INTERFACE_ID,
  ERC165_INTERFACE_ID,
  cleanToken
};