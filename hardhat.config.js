/** @type import('hardhat/config').HardhatUserConfig */
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("dotenv").config();
require("hardhat-contract-sizer");
require("solidity-coverage");
require("hardhat-gas-reporter");
require('hardhat-docgen');
// require ("@truffle/dashboard-hardhat-plugin"); // if transaction is not showing up in dashboard, then comment this import

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.10",
        settings:{
          optimizer: {
            enabled: true,
            runs: 200,
          },
        }
      },
      {
        version: "0.7.6",
      }
    ],
  },
  defaultNetwork: "hardhat",
  networks: {
    "local": {
      url: "http://localhost:24012/rpc"
    },
    hardhat: {
    //  forking:{
    //     allowUnlimitedContractSize: true,
    //     url: process.env.GOERLI,
    //     accounts: [`0x${process.env.ACCOUNT1}`, `0x${process.env.ACCOUNT2}`],
    //  }
    },
    polygon: {
      url: process.env.POLYGON || "",
      // accounts: [`0x${process.env.ACCOUNT1}`, `0x${process.env.ACCOUNT2}`],
      chainId: 137,
      allowUnlimitedContractSize: true,
      blockGasLimit: 100000000429720
    },
    mumbai: {
      url: process.env.MUMBAI || "",
      // accounts: [`0x${process.env.ACCOUNT1}`, `0x${process.env.ACCOUNT2}`],
      chainId: 80001,
      allowUnlimitedContractSize: true,
      blockGasLimit: 100000000429720
    },
    goerli: {
      url: process.env.GOERLI || "",
      // accounts: [`0x${process.env.ACCOUNT1}`, `0x${process.env.ACCOUNT2}`],
      chainId: 5,
      allowUnlimitedContractSize: true,
      blockGasLimit: 100000000429720
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN,
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,

  },
  gasReporter: {
    currency: "USD",
    gasPrice: 20,
    enabled: !!process.env.REPORT_GAS,
  },
  docgen: {
    path: './docs',
    clear: true,
    runOnCompile: true,
  }
};