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

async function main() {
    const [deployer, account1] = await ethers.getSigners();
    let spenderCode = "BTCBAVAXVector";
    let token1 = "JOE";
    const I = await ethers.getContractFactory("InvestorHelper");
    IContract = await I.deploy();
    const SM = await ethers.getContractFactory("StakingManager");
    SMContract = await SM.deploy();


    const InvestorLp = await ethers.getContractFactory("InvestorLp");

    let LPContract = await InvestorLp.deploy(
        _treasury = "0x258b4251BB0eDdC1c2860f7346afDac5260607A1",
        _targetToken = ["0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd", "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7"], //Gtg  ["0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664", "0xf2f13f0b7008ab2fa4a2418f4ccc3684e49d20eb"]
        _stakingManager = SMContract.address,
        _investmentAddress = "0x6eb168ab79bce500442dc035c0ccf88210eca9f5",
        _liquidityPool = "0x454e67025631c065d3cfad6d71e6892f74487a15",
        _tokensToBeRewardedAddress = [
            "0x5817D4F0b62A59b17f75207DA1848C2cE75e7AF4",
            "0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd",
            "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7"
        ],
        _investorHelper = IContract.address,
        _poolId = 0
    );

    await LPContract.toggleInvestorWhitelist(deployer.address);
    await SMContract.toggleWhitelistedContract(LPContract.address);
    await SMContract.createPool("0xbb4646a764358ee93c2a9c4a147d5aDEd527ab73");
    await LPContract.depositAvaxLp(
        "0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd",
        "0x6EB168AB79bCE500442dC035C0CCf88210ECA9f5",
        "0x60aE616a2155Ee3d9A68541Ba4544862310933d4",
        "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
        { gasLimit: "2400000", value: "100000000000000000" }
    );
    await ethers.provider.send("evm_increaseTime", [100600]);
    await ethers.provider.send("evm_mine", []); await ethers.provider.send("evm_mine", []);
    await LPContract.depositAvaxLp(
        "0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd",
        "0x6EB168AB79bCE500442dC035C0CCf88210ECA9f5",
        "0x60aE616a2155Ee3d9A68541Ba4544862310933d4",
        "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
        { gasLimit: "2400000", value: "100000000000000" }
    );

    //Withdraw
    const testWithdrawalAmount = 15362718209;
    await LPContract.withdrawAvaxLp(testWithdrawalAmount, "0x60aE616a2155Ee3d9A68541Ba4544862310933d4", "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", { gasLimit: 3800000 });
    await LPContract.reinvest("0x60aE616a2155Ee3d9A68541Ba4544862310933d4", "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", 96, { gasLimit: "2000000" });

    const aprEstimate = await LPContract.lastApr();
    console.log("APR Estimate: ", aprEstimate);

}


/*
nonce: deployer.getTransactionCount(),
type: 2,
maxPriorityFeePerGas: ethers.utils.parseUnits("2", "gwei"),
maxFeePerGas: String(Math.floor((27000000000 * 1.5) + 1600000000))
 
Just set the gas fee. Once you plug in metamask, have THAT provider find your price plus some change. 
*/

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
