const {
  expect
} = require("chai");
const {
  ethers
} = require("hardhat");
const {
  VAULT_STATE
} = require('./utils');

describe("Create", () => {
  let vault;
  let owner;
  let notOwner;
  let vaultOwner;

  beforeEach(async () => {
    [owner, notOwner, vaultOwner] = await ethers.getSigners();
    const Vault = await ethers.getContractFactory("Vault");
    vault = await Vault.deploy();
    await vault.deployed();
  });

  it("can create vault", async () => {
    await vault.create(vaultOwner.address, "0.json");

    const vaultId = 0;
    expect(await vault.ownerOf(vaultId)).to.equal(vaultOwner.address);
  });

  it("vault is in OPEN state after creation", async () => {
    await vault.create(vaultOwner.address, "0.json");

    const vaultId = 0;
    const state = await vault.state(vaultId);
    expect(state).to.equal(VAULT_STATE["OPEN"]);
  });

  it.skip("can't CLOSE vault in the same block is it created", async () => {
    await vault.create(vaultOwner.address, "0.json");

    const vaultId = 0;
    const state = await vault.state(vaultId);
    expect(state).to.equal(VAULT_STATE["OPEN"]);
  });

  it.skip("vaults update correctly", async () => {
    await vault.create(vaultOwner.address, "0.json");

    const vaultId = 0;
    const vaults = (await vault.vaults(vaultOwner.address)).map((v) => v.toNumber());
    const expectedVaults = [vaultId];
    expect(vaults).to.equal(expectedVaults);
  });

  it("tokenIdCounter updated correctly", async () => {
    await vault.create(vaultOwner.address, "0.json");
    expect(await vault.tokenIdCounter()).to.equal(1);
  });
});