const {
  expect
} = require("chai");
const {
  ethers
} = require("hardhat");

describe("Create", () => {
  let vault;
  

  beforeEach(async () => {
    const Vault = await ethers.getContractFactory("Vault");
    vault = await Vault.deploy();
    await vault.deployed();
    console.log(vault.address);
  });

  it("can create vault", async () => {
    const [owner, notOwner, vaultOwner] = await ethers.getSigners();
    console.log(owner.address);
    await vault.create(vaultOwner.address, "0.json");
  
    const vaultId = 0;
    expect(await vault.ownerOf(vaultId)).to.equal(vaultOwner.address);
  });

});


// contract("Create", async (accounts) => {
//   const addrOwner = accounts[0];
//   const addrNotOwner = accounts[1];
//   const nftOwner = accounts[2];
//   const nftNotOwner = accounts[3];
//   const vaultOwner = accounts[4];
//   const vaultNotOwner = accounts[5];

//   let vault;
//   let ff721;

//   beforeEach(async () => {
//     vault = await getVault();
//   });

//   // can't create without CREATOR_ROLE

//   it("can't create vault without CREATOR_ROLE", async () => {
//     await expectRevert(
//       vault.create(vaultOwner, "0.json", {
//         from: addrNotOwner
//       }),
//       `AccessControl: account ${addrNotOwner.toLowerCase()} is missing role ${CREATOR_ROLE}`
//     );
//   });

//   // can create with CREATOR_ROLE
//   it("can create vault with CREATOR_ROLE", async () => {
//     await vault.grantRole(CREATOR_ROLE, addrNotOwner, {
//       from: addrOwner
//     });
//     await vault.create(vaultOwner, "0.json", {
//       from: addrNotOwner
//     });

//     const vaultId = 0;

//     const vaultOwnerAddress = await vault.ownerOf(vaultId);
//     assert.equal(vaultOwnerAddress, vaultOwner);
//   });

//   // tokenURI set correctly
//   it("tokenURI set correctly", async () => {
//     await vault.grantRole(CREATOR_ROLE, addrNotOwner, {
//       from: addrOwner
//     });
//     await vault.create(vaultOwner, "0.json", {
//       from: addrNotOwner
//     });

//     const vaultId = 0;

//     let baseTokenURI = await vault.baseTokenURI();

//     const tokenURI = await vault.tokenURI(vaultId);
//     const expectedTokenURI = `${baseTokenURI}${vaultId}.json`;
//     assert.equal(expectedTokenURI, `${tokenURI}`);
//   });

//   // token URI updates when updateBaseTokenURI is called
//   it("token URI updates when updateBaseTokenURI is called", async () => {
//     await vault.grantRole(CREATOR_ROLE, addrNotOwner, {
//       from: addrOwner
//     });
//     await vault.grantRole(UPDATER_ROLE, addrNotOwner, {
//       from: addrOwner
//     });
//     await vault.create(vaultOwner, "0.json", {
//       from: addrNotOwner
//     });

//     const vaultId = 0;
//     const newBaseTokenURI = "https://temp/new/";
//     await vault.updateBaseTokenURI(newBaseTokenURI, {
//       from: addrNotOwner
//     });

//     const tokenURI = await vault.tokenURI(vaultId);
//     const expectedTokenURI = `${newBaseTokenURI}${vaultId}.json`;
//     assert.equal(expectedTokenURI, `${tokenURI}`);
//   });

//   // created vault sent to _to
//   it("created vault sent to _to", async () => {
//     await vault.grantRole(CREATOR_ROLE, addrNotOwner, {
//       from: addrOwner
//     });
//     await vault.create(vaultOwner, "0.json", {
//       from: addrNotOwner
//     });

//     const vaultId = 0;

//     const vaultOwnerAddress = await vault.ownerOf(vaultId);
//     assert.equal(vaultOwnerAddress, vaultOwner);
//   });

//   // vault is OPEN state after creation
//   it("vault is OPEN state after creation", async () => {
//     await vault.grantRole(CREATOR_ROLE, addrNotOwner, {
//       from: addrOwner
//     });
//     await vault.create(vaultOwner, "0.json", {
//       from: addrNotOwner
//     });

//     const vaultId = 0;
//     const state = await vault.state(vaultId);
//     assert.equal(state.toNumber(), VAULT_STATE["OPEN"]);
//   });

//   // states update correctly
//   it("states update correctly", async () => {
//     await vault.grantRole(CREATOR_ROLE, addrNotOwner, {
//       from: addrOwner
//     });
//     await vault.create(vaultOwner, "0.json", {
//       from: addrNotOwner
//     });

//     const vaultId = 0;

//     const state = await vault.state(vaultId);
//     assert.equal(state.toNumber(), VAULT_STATE["OPEN"]);
//   });

//   // vaults update correctly
//   it("vaults update correctly", async () => {
//     await vault.grantRole(CREATOR_ROLE, addrNotOwner, {
//       from: addrOwner
//     });
//     await vault.create(vaultOwner, "0.json", {
//       from: addrNotOwner
//     });

//     const vaultId = 0;

//     const vaults = (await vault.vaults(vaultOwner)).map((v) => v.toNumber());
//     const expectedVaults = [vaultId];

//     assert.deepEqual(vaults, expectedVaults);
//   });

//   // curVaultId updated correctly
//   it("curVaultId updated correctly", async () => {
//     await vault.grantRole(CREATOR_ROLE, addrNotOwner, {
//       from: addrOwner
//     });
//     await vault.create(vaultOwner, "0.json", {
//       from: addrNotOwner
//     });

//     const curVaultId = await vault.curVaultId();
//     assert.equal(curVaultId.toNumber(), 1);
//   });

//   it("can't close vault after creation if COOL_DOWN_S hasn't passed", async () => {

//     await vault.grantRole(CREATOR_ROLE, addrNotOwner, {
//       from: addrOwner
//     });
//     await vault.create(vaultOwner, "0.json", {
//       from: addrNotOwner
//     });

//     const vaultId = 0;

//     await expectRevert(
//       vault.close(vaultId, {
//         from: vaultOwner
//       }),
//       "FF721SVault: Vault is still in cool down"
//     );

//     await time.increase(OPEN_COOL_DOWN_S + 1);

//     await vault.close(vaultId, {
//       from: vaultOwner
//     });

//     const state = await vault.state(vaultId);
//     assert.equal(state.toNumber(), VAULT_STATE["CLOSED"]);
//   });
// });