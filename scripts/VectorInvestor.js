let provider = "";
let url = "";
let JContract = "";
let VContract = "";
let LPContract = "";
let signer; let Bob; let Sally; let Dick; let Andy;
let Sebastian; let David; let Julian;
//ATTENTION - CHANGE VARIABLES BELOW TO TEST DIFFERENT LP PAIRS
let purchaseToken = "USDC";
let token1 = "BTCB";
let token2 = "AVAX";
let liquidityPool = "0x2fD81391E30805Cc7F2Ec827013ce86dc591B806"; //BTCBAVAX
//Codes From AddressDirectory
let spenderCode = "BTCBAVAXVector";
let investmentContract = "0x473bD859797F781d1626B9c6f9B3065FF741E14C";
let receiptLPAddress = "0xD5817AC3027B1958961903238b374EcD8a5537A8"; //Where rewards manager looks for your lp receipt
let rewardsManagerAddress = "0x423d0fe33031aa4456a17b150804aa57fc157d97";

const { ethers } = require("hardhat");
const hre = require("hardhat");

const ERC20 = [
    {
        "constant": true,
        "inputs": [],
        "name": "name",
        "outputs": [
            {
                "name": "",
                "type": "string"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_spender",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "approve",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "totalSupply",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_from",
                "type": "address"
            },
            {
                "name": "_to",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "transferFrom",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "decimals",
        "outputs": [
            {
                "name": "",
                "type": "uint8"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "_owner",
                "type": "address"
            }
        ],
        "name": "balanceOf",
        "outputs": [
            {
                "name": "balance",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "symbol",
        "outputs": [
            {
                "name": "",
                "type": "string"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_to",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "transfer",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "_owner",
                "type": "address"
            },
            {
                "name": "_spender",
                "type": "address"
            }
        ],
        "name": "allowance",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "payable": true,
        "stateMutability": "payable",
        "type": "fallback"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "owner",
                "type": "address"
            },
            {
                "indexed": true,
                "name": "spender",
                "type": "address"
            },
            {
                "indexed": false,
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "Approval",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "from",
                "type": "address"
            },
            {
                "indexed": true,
                "name": "to",
                "type": "address"
            },
            {
                "indexed": false,
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "Transfer",
        "type": "event"
    }
]

const avaxPrice = 16.64;
const btcPrice = 20000;
const ethPrice = 1201;
const bnbPrice = 220.2;
const usdPrice = 1.001;

const seekError = (errObj) => {
    //1. INSERT AN OPCODE
    const raiseSlippage = "RAISE_SLIPPAGE";
    const raiseGasLimit = "RAISE_GAS_LIMIT";
    //2. INSERT NEW ERROR MESSAGE
    //TJ
    const TJError1 = "Error: VM Exception while processing transaction: reverted with reason string 'JoeRouter: INSUFFICIENT_OUTPUT_AMOUNT'";
    //GENERAL
    const GAS_LIMIT = "UNPREDICTABLE_GAS_LIMIT";
    //3. ADD OPCODE + ERROR MESSAGE
    const errorLib = {
        TJError1: raiseSlippage,
        GAS_LIMIT: raiseGasLimit,

    }

    //ADD LIB FUNCTIONALITY TO DIRECTORY
    if (errObj.hasOwnProperty("data")) {
        if (errObj["data"].hasOwnProperty("message")) {
            if (errObj["data"]["message"] == TJError1) {
                return raiseSlippage;
            }
            //Perform An Action
            console.log("ErrorLib Msg: message does exist");
        }
    }
    if (errObj.hasOwnProperty("code")) {
        console.log(GAS_LIMIT);
        if (errObj["code"] == GAS_LIMIT) {
            //Perform An Action
            return raiseGasLimit;
        }
    }
}
const decimalCount = num => {
    // Convert to String
    const numStr = String(num);
    // String Contains Decimal
    if (numStr.includes('.')) {
        return numStr.split('.')[1].length;
    };
    // String Does Not Contain Decimal
    return 0;
}
const wholeConverter = num => {
    // Convert to String
    const numStr = String(num);
    if (numStr.includes('.')) {
        let joined = numStr.split('.')[0] + numStr.split('.')[1];
        return joined;
    } else {
        return numStr;
    }
}
//Convert human integer to crypto format
const packageInt = (num, decimals) => {
    if (typeof num !== 'string' && !isNaN(decimals) && num !== 0) {
        const numDecimals = decimalCount(num);
        let leftOverDecimals = 0; //For Small Quantities like 0.005 BTC
        let excessDecimals = 0; //Decimals exceeding standard
        if (numDecimals <= decimals) {
            leftOverDecimals = decimals - numDecimals;
        } else {
            excessDecimals = numDecimals - decimals;
        }
        const paddedZeroes = "0".repeat(leftOverDecimals);
        if (excessDecimals) {
            let numStr = Number(wholeConverter(num)).toString();
            return numStr.slice(0, numStr.length - excessDecimals);
        } else {
            const joinedIntegers = Number(wholeConverter(num)).toString();
            return joinedIntegers + paddedZeroes;
        }
    } else {
        throw new Error('Fields not completed.');
    }
}
//Convert crypto format to human integer
const unpackageInt = (num, decimals) => {
    //Returns human-readable integer rounded to two decimal places
    let numStr = num.toString();
    if (numStr.length > decimals) {
        let beforeDecimal = numStr.slice(0, numStr.length - decimals);
        let afterDecimal = numStr.slice(numStr.length - decimals, numStr.length);
        let adjustedNum = beforeDecimal + "." + afterDecimal;
        return Number(adjustedNum).toFixed(2);
    } else {
        let numZeroes = decimals - numStr.length;
        const zeroes = "0".repeat(numZeroes);
        let adjustedNum = "." + zeroes + numStr;
        return Number(adjustedNum).toFixed(2);
    }
}
const cryptoPairConversion = (cryptoPrice1, cryptoAmount1, cryptoPrice2) => (cryptoPrice1 * cryptoAmount1) / cryptoPrice2;
const applyAutoSlippage = (percentAsDecimal, num) => (num / (1 + percentAsDecimal)).toFixed(0);


/**
 * 
 * 
 * Wallets + Contract Factories
 * 
 * 
 * */
async function main() {
    url = "http://127.0.0.1:8545/";
    provider = new ethers.providers.JsonRpcProvider(url);
    //Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
    signer = new ethers.Wallet(
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
        provider
    );
    //Address: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
    Bob = new ethers.Wallet(
        "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
        provider
    );
    //Address: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
    Sally = new ethers.Wallet(
        "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
        provider
    );
    //Address: 0x90F79bf6EB2c4f870365E785982E1f101E93b906
    Dick = new ethers.Wallet(
        "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
        provider
    );
    //Address: 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc
    Andy = new ethers.Wallet(
        "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
        provider
    )
    //Impersonating Affiliates
    /*
    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: ["0x320F23780c98f1cbA153dA685e67c4F02aC78bd1"],
    });
    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: ["0x279f8940ca2a44C35ca3eDf7d28945254d0F0aE6"],
    });
    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: ["0xf1018f794E5A281889e74A873Af0d5C3373e55AD"],
    });
    */

    this.admin = await ethers.getSigner("0x320F23780c98f1cbA153dA685e67c4F02aC78bd1");

    this.treasury = await ethers.getSigner("0xf1018f794E5A281889e74A873Af0d5C3373e55AD");



    //Plug in addresses
    const LPContract = await hre.ethers.getContractAt("InvestorLp", "0x720472c8ce72c2A2D711333e064ABD3E6BbEAdd3");
    const addressRouterContract = await hre.ethers.getContractAt("AddressRouter", "0x49fd2BE640DB2910c2fAb69bB8531Ab6E76127ff");
    const JContract = await hre.ethers.getContractAt("JoeHelper", "0xAA292E8611aDF267e563f334Ee42320aC96D0463");
    const VContract = await hre.ethers.getContractAt("VectorHelper", "0x5c74c94173F05dA1720953407cbb920F3DF9f887");

    console.log("Vector Investor:", LPContract.address);
    console.log("Address Router: ", addressRouterContract.address);
    console.log("Joe Router: ", JContract.address);
    console.log("Vector Router: ", VContract.address);

    //Load ERC20 Contracts
    const usdcAddress = await addressRouterContract.viewAddressDirectory(purchaseToken); //Note, mass load these on a hook
    const token1Address = await addressRouterContract.viewAddressDirectory(token1);
    const token2Address = await addressRouterContract.viewAddressDirectory(token2);
    const usdcContract = await hre.ethers.getContractAt("ERC20", usdcAddress);
    const token1Contract = await hre.ethers.getContractAt("ERC20", token1Address);
    const token2Contract = await hre.ethers.getContractAt("ERC20", token2Address);
    const poolContract = await hre.ethers.getContractAt("ERC20", liquidityPool);

    const vectorBalBefore = await VContract.viewInvestmentBalance(investmentContract, LPContract.address);
    //Master Deposit
    await LPContract.connect(Bob).routerDepositAvaxLp(token1, spenderCode, { gasLimit: 29000000, value: "5000000000000000000" });

    //Check to make sure Bob is entitled to LP tokens & that balance was recorded correctly
    const vectorBalAfter = await VContract.viewInvestmentBalance(investmentContract, LPContract.address);
    console.log("Contract's Balance in Vector: ", vectorBalAfter);
    const vectorDifference = vectorBalAfter - vectorBalBefore;
    const bobLedger = await LPContract.accountingLedger(Bob.address);

    //Accelerate TIme
    const blockBefore = await provider.getBlockNumber();
    console.log(blockBefore);

    for (let i = 0; i < 10; i++) {
        await ethers.provider.send("evm_increaseTime", [604800]);
        await ethers.provider.send("evm_mine", []);
    }



    const blockAfter = await provider.getBlockNumber();
    console.log(blockAfter);
    //Claim Rewards
    await LPContract.routerClaimRewards();
    const VTXRewards = await LPContract.rewardSnapshot("0x5817D4F0b62A59b17f75207DA1848C2cE75e7AF4");
    const JOERewards = await LPContract.rewardSnapshot("0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd");
    const WAVAXRewards = await LPContract.rewardSnapshot("0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7");
    console.log("VTX: ", VTXRewards);
    console.log("JOE: ", JOERewards);
    console.log("WAVAX: ", WAVAXRewards);
    const cyp = await LPContract.cyp(); console.log("Deposit results: ", cyp);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });