const {
  expect
} = require("chai");
const {
  ethers
} = require("hardhat");
const {
  VAULT_STATE,
  ERC165_INTERFACE_ID,
  ERC721_INTERFACE_ID,
  cleanToken
} = require('./utils');


describe("Add", () => {
  let vault;
  let mock721;

  let vaultId;
  let tokenId;

  let owner;
  let notOwner;
  let vaultOwner;
  let notVaultOwner;

  beforeEach(async () => {
    [owner, notOwner, vaultOwner, notVaultOwner] = await ethers.getSigners();
    const Vault = await ethers.getContractFactory("Vault");
    const Mock721 = await ethers.getContractFactory("Mock721");

    vault = await (await Vault.deploy()).deployed();
    mock721 = await (await Mock721.deploy()).deployed();

    await vault.create(vaultOwner.address, "0.json");
    tokenId = 0;
    await mock721.safeMint(vaultOwner.address, tokenId);
  });

  it("can't add if you're not the owner of the vault", async () => {
    vaultId = 0;
    expect(await vault.ownerOf(vaultId)).to.not.equal(notVaultOwner.address);
    await expect(
      vault.connect(notVaultOwner).add(vaultId, mock721.address, tokenId)
    ).to.be.revertedWith("Vault: Only vault owner");
  });

  it("can't add to non-existant vault", async () => {
    vaultId = 1;
    await expect(
      vault.connect(vaultOwner).add(vaultId, mock721.address, tokenId)
    ).to.be.revertedWith("Vault: Vault doesn't exists");
  });

  it("can't add if vault is not open", async () => {
    vaultId = 0;
    await vault.connect(vaultOwner).close(vaultId);
    let state = await vault.state(vaultId);
    expect(state).to.equal(VAULT_STATE.CLOSED);
    await expect(
      vault.connect(vaultOwner).add(vaultId, mock721.address, tokenId)
    ).to.be.revertedWith("Vault: Vault is not open");

  });
  it("can't add contract that doesn't support ERC165", async () => {
    let Mock721Without165 = await ethers.getContractFactory("Mock721Without165");
    let mock721without165 = await (await Mock721Without165.deploy()).deployed();

    let supports165 = await mock721without165.supportsInterface(ERC165_INTERFACE_ID);
    expect(supports165).to.be.false;

    vaultId = 0;
    await expect(
      vault.connect(vaultOwner).add(vaultId, mock721without165.address, tokenId)
    ).to.be.revertedWith("Vault: _tokenAddress not IERC165");

  });

  it("can't add contract that doesn't support ERC721 via ERC165", async () => {
    let Mock721Without721 = await ethers.getContractFactory("Mock721Without721");
    let mock721without721 = await (await Mock721Without721.deploy()).deployed();

    let supports165 = await mock721without721.supportsInterface(ERC165_INTERFACE_ID);
    expect(supports165).to.be.true;

    let supports721 = await mock721without721.supportsInterface(ERC721_INTERFACE_ID);
    expect(supports721).to.be.false;

    vaultId = 0;
    await expect(
      vault.connect(vaultOwner).add(vaultId, mock721without721.address, tokenId)
    ).to.be.revertedWith("Vault: _tokenAddress not IERC721");

  });

  it("can't add 721 with zero address", async () => {
    vaultId = 0;
    await expect(
      vault.connect(vaultOwner).add(vaultId, ethers.constants.AddressZero, tokenId)
    ).to.be.revertedWith("Vault: _tokenAddress can't be 0");
  });
  it("can't add 721 with vault's address", async () => {
    vaultId = 0;
    await expect(
      vault.connect(vaultOwner).add(vaultId, vault.address, tokenId)
    ).to.be.revertedWith("Vault: _tokenAddress can't be vault");
  });
  it("can't add 721 if not isApprovedForAll() and not getApproved", async () => {
    vaultId = 0;
    tokenId = 0;
    expect(await mock721.isApprovedForAll(vaultOwner.address, vault.address)).to.be.false;
    expect(await mock721.getApproved(tokenId)).to.not.equal(vault.address);

    await expect(vault.connect(vaultOwner).add(vaultId, mock721.address, tokenId)).to.be.revertedWith("Vault: not approved");
  });


  it("can add 721 if only approved, not setApprovedForAll", async () => {
    vaultId = 0;
    tokenId = 0;
    let ownerOf = await mock721.ownerOf(tokenId);
    expect(ownerOf).to.equal(vaultOwner.address);
    await mock721.connect(vaultOwner).approve(vault.address, tokenId);

    expect(await mock721.connect(vaultOwner).getApproved(tokenId)).to.be.equal(vault.address);
    await vault.connect(vaultOwner).add(vaultId, mock721.address, tokenId);

    ownerOf = await mock721.ownerOf(tokenId);
    expect(ownerOf).to.be.equal(vault.address);

    let tokens = (await vault.tokens(vaultId)).map(cleanToken);
    expect(tokens).to.deep.equal([{
      address: mock721.address,
      tokenId: tokenId.toString(),
      listPtr: "0"
    }]);
    

  });

  it("can add 1 token to vault", async () => {
    vaultId = 0;
    tokenId = 0;
    await mock721.connect(vaultOwner).setApprovalForAll(vault.address, true);
    let isApproved = await mock721.isApprovedForAll(vaultOwner.address, vault.address);
    expect(isApproved).to.be.true;
    await vault.connect(vaultOwner).add(vaultId, mock721.address, tokenId);

    let tokens = (await vault.tokens(vaultId)).map(x => cleanToken(x));

    let expectedTokens = [{
      "address": mock721.address,
      "tokenId": tokenId.toString(),
      "listPtr": "0"
    }]
    expect(tokens).to.deep.equal(expectedTokens);
  });
  it("tokens updated correctly when 3 different erc721's are added to 1 vault", async () => {
    vaultId = 0;
    tokenId = 0
    let Mock721 = await ethers.getContractFactory("Mock721");
    let mock721_1 = await (await Mock721.deploy()).deployed();
    let mock721_2 = await (await Mock721.deploy()).deployed();
    let mock721_3 = await (await Mock721.deploy()).deployed();

    await mock721_1.safeMint(vaultOwner.address, tokenId);
    await mock721_2.safeMint(vaultOwner.address, tokenId);
    await mock721_3.safeMint(vaultOwner.address, tokenId);

    await mock721_1.connect(vaultOwner).setApprovalForAll(vault.address, true);
    await mock721_2.connect(vaultOwner).setApprovalForAll(vault.address, true);
    await mock721_3.connect(vaultOwner).setApprovalForAll(vault.address, true);

    await vault.connect(vaultOwner).add(vaultId, mock721_1.address, tokenId);
    await vault.connect(vaultOwner).add(vaultId, mock721_2.address, tokenId);
    await vault.connect(vaultOwner).add(vaultId, mock721_3.address, tokenId);

    let tokens = (await vault.tokens(vaultId)).map(x => cleanToken(x));
    let expectedTokens = [{
      "address": mock721_1.address,
      "tokenId": tokenId.toString(),
      "listPtr": "0"
    }, {
      "address": mock721_2.address,
      "tokenId": tokenId.toString(),
      "listPtr": "1"
    }, {
      "address": mock721_3.address,
      "tokenId": tokenId.toString(),
      "listPtr": "2"
    }]

    expect(tokens).to.deep.equal(expectedTokens);

  });
  it("vault is the owner of NFT after adding", async () => {
    vaultId = 0;
    tokenId = 0;
    await mock721.connect(vaultOwner).setApprovalForAll(vault.address, true);
    await vault.connect(vaultOwner).add(vaultId, mock721.address, tokenId);
    let ownerOf = await mock721.ownerOf(tokenId);
    expect(ownerOf).to.equal(vault.address);

  });
  it("isTokenInVault works when added", async () => {
    vaultId = 0;
    tokenId = 0;
    await mock721.connect(vaultOwner).setApprovalForAll(vault.address, true);
    await vault.connect(vaultOwner).add(vaultId, mock721.address, tokenId);
    let isTokenInVault = await vault.isTokenInVault(vaultId, mock721.address, tokenId);
    expect(isTokenInVault).to.be.true;
  });

});