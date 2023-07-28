const { ethers } = require("hardhat");
const { BigNumber } = require("ethers");

async function main() {
  let treasury = "0x7A904C2488cF0D21aa32971ADf294636C408fDF4";
  let rootHash =
    "0x885f3b9b70794bc8d28b3d8c941d5d36f1daa2ff4021f72bf1cd3804ddde6487";
  const royaltyFee = 400;
  const startTime = 1688636349;
  let baseURI = "https://api.projectlovi.xyz/api/v1/metadata/";
  let contractURI = "https://api.projectlovi.xyz/api/v1/contract-uri";
  const MAX_SUPPLY = 100; // 8888 for mainnet = 5000 updated
  const Threshold = 20; // 1999 for mainnet

  const LOVIContract = await ethers.getContractFactory("LOVI");
  console.log(
    treasury,
    startTime,
    royaltyFee,
    rootHash,
    contractURI,
    baseURI,
    MAX_SUPPLY,
    Threshold
  );
  LOVI = await LOVIContract.deploy(
    treasury,
    startTime,
    royaltyFee,
    rootHash,
    contractURI,
    baseURI,
    MAX_SUPPLY,
    Threshold
  );
  await LOVI.deployed();
  console.log("LOVILOVI contract deployed at : ", LOVI.address);
  await LOVI.safeMint('0xFB062c9dEe43D4eC6E91aE5Afec80dE96f5eD998',1,[],{value: ethers.utils.parseEther('0.025')});
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

//npx hardhat run --network localhost scripts/deploy.js
