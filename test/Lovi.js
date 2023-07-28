const { expect } = require("chai");
const { ethers } = require("hardhat");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");
const helpers = require("@nomicfoundation/hardhat-network-helpers");

describe("Testing deployment , Getter and setter", function () {
  let lovi;
  let owner;
  let maliciousUser;
  let treasury;
  let royaltyReceiver;
  let pUser1;
  let pUser2;
  let wlUser1;
  let wlUser2;
  let rootHash;
  let merkleTree;
  const royaltyFee = 400;
  const startTime = Date.now(); // current time stamp in unix
  let baseURI = "ipfs://QmXwcahrS6bAM4iqA3qH9ZyEwKundixfZFTka7t3MoB3se";
  let contractURI = "ipfs://QmYKJFtaGmkfhf1iXVka3ESwKKgVNpqxVCZ9Mo4cCW1PgZ";
  let tokenId = 0;
  const MAX_SUPPLY = 5000;
  const Threshold = 1999;

  let mintingFees = ethers.utils.parseEther("0.025");

  beforeEach(async function () {
    [
      owner,
      maliciousUser,
      treasury,
      royaltyReceiver,
      pUser1,
      pUser2,
      wlUser1,
      wlUser2,
    ] = await ethers.getSigners();
  });

  it("prepare merkle tree", async function () {
    let whitelistAddresses = [wlUser1.address, wlUser2.address];

    const leafNodes = whitelistAddresses.map((addr) => keccak256(addr));
    merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
    rootHash = merkleTree.getHexRoot();
    expect(
      merkleTree.verify(
        merkleTree.getHexProof(keccak256(wlUser1.address)),
        keccak256(wlUser1.address),
        rootHash
      )
    ).to.equal(true);
    expect(
      merkleTree.verify(
        merkleTree.getHexProof(keccak256(pUser1.address)),
        keccak256(pUser1.address),
        rootHash
      )
    ).to.equal(false);
  });

  it("Deploy LOVI", async function () {
    const LOVIContract = await ethers.getContractFactory("LOVI");
    lovi = await LOVIContract.deploy(
      treasury.address,
      startTime,
      royaltyFee,
      rootHash,
      contractURI,
      baseURI,
      MAX_SUPPLY,
      Threshold
    );
    await lovi.deployed();
    // deployed contract address is not equal to 0
    expect(lovi.address).to.not.equal(0x0);
  });

  it("should initialize the contract with correct constructor arguments", async function () {
    const _treasury = await lovi.treasuryAddress();
    const _saleStartTime = await lovi.saleStartTime();
    const _merkleRoot = await lovi.merkleRoot();
    const _contractURI = await lovi.contractURI();
    const _baseURI = await lovi.baseURI();
    const _maxSupply = await lovi.maxSupply();
    const _mintingFees = await lovi.mintingFees();
    const _royaltyInfo = await lovi.royaltyInfo(1, 100);
    const _isReveled = await lovi.isReveled();
    const _owner = await lovi.owner();

    // Check the treasury address
    expect(_treasury).to.equal(treasury.address);

    // Check the sale start time
    expect(_saleStartTime).to.equal(startTime);

    // Check the Merkle root
    expect(_merkleRoot).to.equal(rootHash);

    // Check the contract URI
    expect(_contractURI).to.equal(contractURI);

    // Check the base URI
    expect(_baseURI).to.equal(baseURI);

    // Check the max supply
    expect(_maxSupply).to.equal(MAX_SUPPLY);

    // Check the minting fees
    expect(_mintingFees).to.equal(mintingFees);

    // Check the Royalty Info
    expect(4).to.equal(_royaltyInfo[1]);
    expect(treasury.address).to.equal(_royaltyInfo[0]);

    // check isRevelead
    expect(_isReveled).to.equal(false);

    // check owner
    expect(_owner).to.equal(owner.address);
  });

  it("should have the correct base URI", async function () {
    const _baseURI = await lovi.baseURI();
    expect(_baseURI).to.equal(baseURI);

    const newBaseURI = baseURI + "new";
  });

  it("should not allow the owner to update the base URI", async function () {
    const _baseURI = baseURI + "new";
    await expect(
      lovi.connect(maliciousUser).changeBaseURI(_baseURI, false)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("should not allow the owner to update the contract URI", async function () {
    const _contractURI = contractURI + "new";
    await expect(
      lovi.connect(maliciousUser).setContractURI(_contractURI)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("should allow the owner to update the base URI", async function () {
    baseURI = baseURI + "new";
    await lovi.changeBaseURI(baseURI, false);
    let _baseURI = await lovi.baseURI();
    expect(baseURI).to.equal(_baseURI);
  });

  it("should allow the owner to update the base URI Final time", async function () {
    baseURI = baseURI + "newFinal";
    await lovi.changeBaseURI(baseURI, true);
    let _baseURI = await lovi.baseURI();
    expect(baseURI).to.equal(_baseURI);
  });

  it("should not allow the owner to update the base URI after fully reveled", async function () {
    let _baseURI = baseURI + "new2";
    await expect(lovi.changeBaseURI(_baseURI, false)).to.be.revertedWith(
      "Already revealed"
    );
  });

  it("should allow the owner to update the contract URI", async function () {
    contractURI = contractURI + "new";
    await lovi.setContractURI(contractURI);
    const _contractURI = await lovi.contractURI();
    expect(_contractURI).to.equal(contractURI);
  });

  it("should update the minting fees: Fails", async function () {
    const _newFee = mintingFees + ethers.utils.parseEther("0.05");
    await expect(
      lovi.connect(maliciousUser).updateMintingFees(mintingFees)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("should update the minting fees", async function () {
    mintingFees = mintingFees + ethers.utils.parseEther("0.05");
    await lovi.updateMintingFees(mintingFees);
    const updatedFees = await lovi.mintingFees();
    expect(updatedFees).to.equal(mintingFees);
  });

  it("should update the treasury addr: Fails", async function () {
    await expect(
      lovi.connect(maliciousUser).updateTreasury(pUser1.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("should update the treasury address", async function () {
    await lovi.updateTreasury(pUser1.address);
    const treasuryAddress = await lovi.treasuryAddress();
    expect(treasuryAddress).to.equal(pUser1.address);
    expect(treasuryAddress).to.not.equal(treasury.address);
    const _royaltyInfo = await lovi.royaltyInfo(1, 100);
    expect(_royaltyInfo[0]).to.not.equal(pUser1.address);
  });

  it("should not allow non-owner to transfer ownership", async function () {
    const nonOwner = maliciousUser; // Address that is not the owner

    await expect(
      lovi.connect(nonOwner).transferOwnership(nonOwner.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("should not allow non-owner to update royalty", async function () {
    const nonOwner = maliciousUser; // Address that is not the owner
    const newRoyaltyReceiver = pUser1.address; // The new royalty receiver address
    const newFeeNumerator = 1000; // The new fee numerator

    await expect(
      lovi.connect(nonOwner).updateRoyalty(newRoyaltyReceiver, newFeeNumerator)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("should transfer ownership to a new address", async function () {
    const newOwner = maliciousUser; // The new owner address
    await lovi.transferOwnership(newOwner.address);

    const owner = await lovi.owner();
    expect(owner).to.equal(newOwner.address);
  });

  it("should update the royalty receiver address and fee numerator", async function () {
    const newRoyaltyReceiver = pUser1.address; // The new royalty receiver address
    const newFeeNumerator = 1000; // The new fee numerator

    await lovi
      .connect(maliciousUser)
      .updateRoyalty(newRoyaltyReceiver, newFeeNumerator);

    const _royaltyReceiver = await lovi.royaltyInfo(0, 100);
    expect(_royaltyReceiver[0]).to.equal(newRoyaltyReceiver);
    expect(_royaltyReceiver[1]).to.equal(10);
  });
});

describe("Testing minting", function () {
  let lovi;
  let owner;
  let maliciousUser;
  let treasury;
  let treasuryBalance;
  let royaltyReceiver;
  let pUser1;
  let pUser2;
  let wlUser1;
  let wlUser2;
  let wlUser3;
  let rootHash;
  let merkleTree;
  const royaltyFee = 400;
  const startTime = ethers.BigNumber.from(Math.floor(Date.now() / 1000)); // current time stamp in unix
  let baseURI = "ipfs://QmXwcahrS6bAM4iqA3qH9ZyEwKundixfZFTka7t3MoB3se";
  let contractURI = "ipfs://QmYKJFtaGmkfhf1iXVka3ESwKKgVNpqxVCZ9Mo4cCW1PgZ";
  let tokenId = 0;
  const MAX_SUPPLY = 8;
  const Threshold = 3;

  let mintingFees = ethers.utils.parseEther("0.025");

  beforeEach(async function () {
    [
      owner,
      maliciousUser,
      treasury,
      royaltyReceiver,
      pUser1,
      pUser2,
      wlUser1,
      wlUser2,
      wlUser3,
    ] = await ethers.getSigners();
  });

  it("prepare merkle tree", async function () {
    let whitelistAddresses = [
      wlUser1.address,
      wlUser2.address,
      wlUser3.address,
    ];

    const leafNodes = whitelistAddresses.map((addr) => keccak256(addr));
    merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
    rootHash = merkleTree.getHexRoot();
    expect(
      merkleTree.verify(
        merkleTree.getHexProof(keccak256(wlUser1.address)),
        keccak256(wlUser1.address),
        rootHash
      )
    ).to.equal(true);
    expect(
      merkleTree.verify(
        merkleTree.getHexProof(keccak256(pUser1.address)),
        keccak256(pUser1.address),
        rootHash
      )
    ).to.equal(false);
  });

  it("Deploy LOVI", async function () {
    const LOVIContract = await ethers.getContractFactory("LOVI");
    lovi = await LOVIContract.deploy(
      treasury.address,
      startTime,
      royaltyFee,
      rootHash,
      contractURI,
      baseURI,
      MAX_SUPPLY,
      Threshold
    );
    await lovi.deployed();
    // checking treasury balance
    treasuryBalance = await treasury.getBalance();
    // deployed contract address is not equal to 0
    expect(lovi.address).to.not.equal(0x0);
  });

  it("should initialize the contract with correct constructor arguments", async function () {
    const _treasury = await lovi.treasuryAddress();
    const _saleStartTime = await lovi.saleStartTime();
    const _merkleRoot = await lovi.merkleRoot();
    const _contractURI = await lovi.contractURI();
    const _baseURI = await lovi.baseURI();
    const _maxSupply = await lovi.maxSupply();
    const _mintingFees = await lovi.mintingFees();
    const _royaltyInfo = await lovi.royaltyInfo(1, 100);
    const _isReveled = await lovi.isReveled();
    const _owner = await lovi.owner();

    // Check the treasury address
    expect(_treasury).to.equal(treasury.address);

    // Check the sale start time
    expect(_saleStartTime).to.equal(startTime);

    // Check the Merkle root
    expect(_merkleRoot).to.equal(rootHash);

    // Check the contract URI
    expect(_contractURI).to.equal(contractURI);

    // Check the base URI
    expect(_baseURI).to.equal(baseURI);

    // Check the max supply
    expect(_maxSupply).to.equal(MAX_SUPPLY);

    // Check the minting fees
    expect(_mintingFees).to.equal(mintingFees);

    // Check the Royalty Info
    expect(4).to.equal(_royaltyInfo[1]);
    expect(treasury.address).to.equal(_royaltyInfo[0]);

    // check isRevelead
    expect(_isReveled).to.equal(false);

    // check owner
    expect(_owner).to.equal(owner.address);
  });

  it("should not allow minting more than the maximum allowed tokens", async function () {
    await expect(
      lovi
        .connect(wlUser1)
        .safeMint(
          wlUser1.address,
          3,
          merkleTree.getHexProof(keccak256(wlUser1.address)),
          { value: mintingFees.mul(3) }
        )
    ).to.be.revertedWith("Invalid Amount");
  });

  it("mint lovi before threshold", async function () {
    // public mint
    await lovi
      .connect(pUser1)
      .safeMint(pUser1.address, 2, [], { value: mintingFees.mul(2) });
    let _pUser1LoviBalance = await lovi.balanceOf(pUser1.address);
    let _totalSupply = await lovi.totalSupply();
    expect(_pUser1LoviBalance).to.equal(2);
    expect(_totalSupply).to.equal(2);

    // WL mint
    await lovi
      .connect(wlUser1)
      .safeMint(
        wlUser1.address,
        2,
        merkleTree.getHexProof(keccak256(wlUser1.address)),
        { value: mintingFees.mul(2) }
      );
    let _wlUser1LoviBalance = await lovi.balanceOf(wlUser1.address);
    _totalSupply = await lovi.totalSupply();
    expect(_wlUser1LoviBalance).to.equal(2);
    expect(_totalSupply).to.equal(4);

    await expect(
      lovi
        .connect(pUser1)
        .safeMint(pUser1.address, 1, [], { value: mintingFees })
    ).to.be.revertedWith("Invalid Amount");

    await expect(
      lovi
        .connect(wlUser1)
        .safeMint(
          wlUser1.address,
          1,
          merkleTree.getHexProof(keccak256(wlUser1.address)),
          { value: mintingFees }
        )
    ).to.be.revertedWith("Invalid Amount");
  });

  it("mint lovi after threshold", async function () {
    // public mint
    const _wlSaleStartTime = await lovi.wlSaleStartT();
    const bool = _wlSaleStartTime.gt(ethers.BigNumber.from(0));
    // check if wlSaleStartTime > 0, and WL mint has started
    expect(bool).to.equal(true);
    //Public should not be able to mint
    await expect(
      lovi
        .connect(pUser2)
        .safeMint(pUser2.address, 1, [], { value: mintingFees })
    ).to.be.revertedWith("invalid merkle proof");

    // public should not be able to mint with invalid proof
    await expect(
      lovi
        .connect(pUser2)
        .safeMint(
          pUser2.address,
          1,
          merkleTree.getHexProof(keccak256(pUser2.address)),
          { value: mintingFees }
        )
    ).to.be.revertedWith("invalid merkle proof");

    // Public should be able to mint with valid proof of other
    await expect(
      lovi
        .connect(pUser2)
        .safeMint(
          pUser2.address,
          1,
          merkleTree.getHexProof(keccak256(wlUser2.address)),
          { value: mintingFees }
        )
    ).to.be.revertedWith("invalid merkle proof");

    // WL should not be able to mint with invalid proof
    await expect(
      lovi
        .connect(wlUser2)
        .safeMint(wlUser2.address, 1, [], { value: mintingFees })
    ).to.be.revertedWith("invalid merkle proof");

    // WL should be able to mint with valid proof of their own
    await lovi
      .connect(wlUser2)
      .safeMint(
        wlUser2.address,
        1,
        merkleTree.getHexProof(keccak256(wlUser2.address)),
        { value: mintingFees }
      );

    // WL should not be able to mint with valid proof of other
    await expect(
      lovi
        .connect(wlUser2)
        .safeMint(
          wlUser2.address,
          1,
          merkleTree.getHexProof(keccak256(wlUser3.address)),
          { value: mintingFees }
        )
    ).to.be.revertedWith("invalid merkle proof");

    // WL should be able to mint with valid proof of their own
    await lovi
      .connect(wlUser2)
      .safeMint(
        wlUser2.address,
        1,
        merkleTree.getHexProof(keccak256(wlUser2.address)),
        { value: mintingFees }
      );

    // WL should not be able to mint more than 2
    await expect(
      lovi
        .connect(wlUser2)
        .safeMint(
          wlUser2.address,
          1,
          merkleTree.getHexProof(keccak256(wlUser2.address)),
          { value: mintingFees }
        )
    ).to.be.revertedWith("Invalid Amount");

    const wlUser2_balance = await lovi.balanceOf(wlUser2.address);
    expect(wlUser2_balance).to.equal(2);

    const totalSupply = await lovi.totalSupply();
    expect(totalSupply).to.equal(6);
  });

  it("after 24 hrs of wl sale", async function () {
    await helpers.time.increase(86400);
    await lovi
      .connect(pUser2)
      .safeMint(pUser2.address, 1, [], { value: mintingFees });
    await lovi
      .connect(wlUser3)
      .safeMint(wlUser3.address, 2, [], { value: mintingFees.mul(2) });

    const pUser2_balance = await lovi.balanceOf(pUser2.address);
    expect(pUser2_balance).to.equal(1);

    const wlUser3_balance = await lovi.balanceOf(wlUser3.address);
    expect(wlUser3_balance).to.equal(2);

    const totalSupply = await lovi.totalSupply();
    expect(totalSupply).to.equal(9);
  });

  it("mint after cap", async function () {
    await helpers.time.increase(86400);
    await expect(
      lovi
        .connect(pUser2)
        .safeMint(pUser2.address, 1, [], { value: mintingFees })
    ).to.be.revertedWith("Max Supply Reached");
  });

  it("check treasury balance", async function () {
    const _treasuryBalance = await treasury.getBalance();
    const totalSupply = await lovi.totalSupply();
    expect(_treasuryBalance).to.equal(
      treasuryBalance.add(totalSupply.mul(mintingFees))
    );
  });
});

describe("Testing minting with admin function", function () {
  let lovi;
  let owner;
  let maliciousUser;
  let treasury;
  let treasuryBalance;
  let royaltyReceiver;
  let pUser1;
  let pUser2;
  let wlUser1;
  let wlUser2;
  let wlUser3;
  let rootHash;
  let merkleTree;
  const royaltyFee = 400;
  const startTime = ethers.BigNumber.from(Math.floor(Date.now() / 1000)); // current time stamp in unix
  let baseURI = "ipfs://QmXwcahrS6bAM4iqA3qH9ZyEwKundixfZFTka7t3MoB3se";
  let contractURI = "ipfs://QmYKJFtaGmkfhf1iXVka3ESwKKgVNpqxVCZ9Mo4cCW1PgZ";
  let tokenId = 0;
  const MAX_SUPPLY = 8;
  const Threshold = 3;

  let mintingFees = ethers.utils.parseEther("0.025");

  beforeEach(async function () {
    [
      owner,
      maliciousUser,
      treasury,
      royaltyReceiver,
      pUser1,
      pUser2,
      wlUser1,
      wlUser2,
      wlUser3,
    ] = await ethers.getSigners();
  });

  it("prepare merkle tree", async function () {
    let whitelistAddresses = [
      wlUser1.address,
      wlUser2.address,
      wlUser3.address,
    ];

    const leafNodes = whitelistAddresses.map((addr) => keccak256(addr));
    merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
    rootHash = merkleTree.getHexRoot();
    expect(
      merkleTree.verify(
        merkleTree.getHexProof(keccak256(wlUser1.address)),
        keccak256(wlUser1.address),
        rootHash
      )
    ).to.equal(true);
    expect(
      merkleTree.verify(
        merkleTree.getHexProof(keccak256(pUser1.address)),
        keccak256(pUser1.address),
        rootHash
      )
    ).to.equal(false);
  });

  it("Deploy LOVI", async function () {
    const LOVIContract = await ethers.getContractFactory("LOVI");
    lovi = await LOVIContract.deploy(
      treasury.address,
      startTime,
      royaltyFee,
      rootHash,
      contractURI,
      baseURI,
      MAX_SUPPLY,
      Threshold
    );
    await lovi.deployed();
    // checking treasury balance
    treasuryBalance = await treasury.getBalance();
    // deployed contract address is not equal to 0
    expect(lovi.address).to.not.equal(0x0);
  });

  it("should initialize the contract with correct constructor arguments", async function () {
    const _treasury = await lovi.treasuryAddress();
    const _saleStartTime = await lovi.saleStartTime();
    const _merkleRoot = await lovi.merkleRoot();
    const _contractURI = await lovi.contractURI();
    const _baseURI = await lovi.baseURI();
    const _maxSupply = await lovi.maxSupply();
    const _mintingFees = await lovi.mintingFees();
    const _royaltyInfo = await lovi.royaltyInfo(1, 100);
    const _isReveled = await lovi.isReveled();
    const _owner = await lovi.owner();

    // Check the treasury address
    expect(_treasury).to.equal(treasury.address);

    // Check the sale start time
    expect(_saleStartTime).to.equal(startTime);

    // Check the Merkle root
    expect(_merkleRoot).to.equal(rootHash);

    // Check the contract URI
    expect(_contractURI).to.equal(contractURI);

    // Check the base URI
    expect(_baseURI).to.equal(baseURI);

    // Check the max supply
    expect(_maxSupply).to.equal(MAX_SUPPLY);

    // Check the minting fees
    expect(_mintingFees).to.equal(mintingFees);

    // Check the Royalty Info
    expect(4).to.equal(_royaltyInfo[1]);
    expect(treasury.address).to.equal(_royaltyInfo[0]);

    // check isRevelead
    expect(_isReveled).to.equal(false);

    // check owner
    expect(_owner).to.equal(owner.address);
  });

  it("should not allow minting more than the maximum allowed tokens", async function () {
    await expect(
      lovi
        .connect(wlUser1)
        .safeMint(
          wlUser1.address,
          3,
          merkleTree.getHexProof(keccak256(wlUser1.address)),
          { value: mintingFees.mul(3) }
        )
    ).to.be.revertedWith("Invalid Amount");
  });

  it("mint lovi before threshold", async function () {
    // public mint
    await lovi
      .connect(pUser1)
      .safeMint(pUser1.address, 1, [], { value: mintingFees.mul(1) });
    let _pUser1LoviBalance = await lovi.balanceOf(pUser1.address);
    let _totalSupply = await lovi.totalSupply();
    expect(_pUser1LoviBalance).to.equal(1);
    expect(_totalSupply).to.equal(1);

    // WL mint
    await lovi
      .connect(wlUser1)
      .safeMint(
        wlUser1.address,
        1,
        merkleTree.getHexProof(keccak256(wlUser1.address)),
        { value: mintingFees.mul(1) }
      );
    let _wlUser1LoviBalance = await lovi.balanceOf(wlUser1.address);
    _totalSupply = await lovi.totalSupply();
    expect(_wlUser1LoviBalance).to.equal(1);
    expect(_totalSupply).to.equal(2);

    await expect(
      lovi.connect(wlUser1).mintByAdmin(wlUser1.address, 1)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      lovi.connect(pUser1).mintByAdmin(wlUser1.address, 1)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      lovi.connect(owner).mintByAdmin(wlUser1.address, 0)
    ).to.be.revertedWith("atleast 1 token should be minted");

    await lovi.connect(owner).mintByAdmin(owner.address, 1);

    let _owner1LoviBalance = await lovi.balanceOf(owner.address);
    _totalSupply = await lovi.totalSupply();
    expect(_owner1LoviBalance).to.equal(1);
    expect(_totalSupply).to.equal(3);

    await lovi.connect(owner).mintByAdmin(owner.address, 1);

    _owner1LoviBalance = await lovi.balanceOf(owner.address);
    _totalSupply = await lovi.totalSupply();
    expect(_owner1LoviBalance).to.equal(2);
    expect(_totalSupply).to.equal(4);
  });

  it("mint lovi after threshold", async function () {
    // public mint
    const _wlSaleStartTime = await lovi.wlSaleStartT();
    const bool = _wlSaleStartTime.gt(ethers.BigNumber.from(0));
    // check if wlSaleStartTime > 0, and WL mint has started
    expect(bool).to.equal(true);
    //Public should not be able to mint
    await expect(
      lovi
        .connect(pUser2)
        .safeMint(pUser2.address, 1, [], { value: mintingFees })
    ).to.be.revertedWith("invalid merkle proof");

    // public should not be able to mint with invalid proof
    await expect(
      lovi
        .connect(pUser2)
        .safeMint(
          pUser2.address,
          1,
          merkleTree.getHexProof(keccak256(pUser2.address)),
          { value: mintingFees }
        )
    ).to.be.revertedWith("invalid merkle proof");

    // Public should be able to mint with valid proof of other
    await expect(
        lovi
          .connect(pUser2)
          .safeMint(
            pUser2.address,
            1,
            merkleTree.getHexProof(keccak256(wlUser2.address)),
            { value: mintingFees }
          )
      ).to.be.revertedWith("invalid merkle proof");

    // WL should not be able to mint with invalid proof
    await expect(
        lovi
          .connect(wlUser2)
          .safeMint(wlUser2.address, 1, [], { value: mintingFees })
      ).to.be.revertedWith("invalid merkle proof");

    // WL should be able to mint with valid proof of their own
    await lovi
      .connect(wlUser2)
      .safeMint(
        wlUser2.address,
        1,
        merkleTree.getHexProof(keccak256(wlUser2.address)),
        { value: mintingFees }
      );

    // WL should not be able to mint with valid proof of other
      await expect(
        lovi
          .connect(wlUser2)
          .safeMint(
            wlUser2.address,
            1,
            merkleTree.getHexProof(keccak256(wlUser3.address)),
            { value: mintingFees }
          )
      ).to.be.revertedWith("invalid merkle proof");

    // WL should be able to mint with valid proof of their own
      await lovi
      .connect(wlUser2)
      .safeMint(
        wlUser2.address,
        1,
        merkleTree.getHexProof(keccak256(wlUser2.address)),
        { value: mintingFees }
      );

    // WL should not be able to mint more than 2
      await expect(
        lovi
          .connect(wlUser2)
          .safeMint(
            wlUser2.address,
            1,
            merkleTree.getHexProof(keccak256(wlUser2.address)),
            { value: mintingFees }
          )
      ).to.be.revertedWith("Invalid Amount");

      const wlUser2_balance = await lovi.balanceOf(wlUser2.address);
      expect(wlUser2_balance).to.equal(2);

      const totalSupply = await lovi.totalSupply();
      expect(totalSupply).to.equal(6);

    });

    it("after 24 hrs of wl sale", async function() {
        await helpers.time.increase(86400);
        await lovi.connect(pUser2).safeMint(pUser2.address, 1, [], { value: mintingFees });
        await lovi.connect(wlUser3).safeMint(wlUser3.address, 2, [], { value: mintingFees.mul(2) });

        const pUser2_balance = await lovi.balanceOf(pUser2.address);
        expect(pUser2_balance).to.equal(1);

        const wlUser3_balance = await lovi.balanceOf(wlUser3.address);
        expect(wlUser3_balance).to.equal(2);

        const totalSupply = await lovi.totalSupply();
        expect(totalSupply).to.equal(9);
    })

    it("mint after cap", async function() {
        await helpers.time.increase(86400);
        await expect(lovi.connect(pUser2).safeMint(pUser2.address, 1, [], { value: mintingFees })).to.be.revertedWith("Max Supply Reached");
    })

    // it("check treasury balance", async function() {
    //     const _treasuryBalance = await treasury.getBalance();
    //     const totalSupply = await lovi.totalSupply();
    //     expect(_treasuryBalance).to.equal(treasuryBalance.add(totalSupply.mul(mintingFees)));

    // })
});

// mint before startTime
