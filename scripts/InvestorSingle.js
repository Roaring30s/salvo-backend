const { ethers } = require("hardhat");
const hre = require("hardhat");
const { expect } = require("chai");
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

url = "http://127.0.0.1:8545/";
provider = new ethers.providers.JsonRpcProvider(url);
const usdtAddress = "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7";
const btcAddress = "0x152b9d0FdC40C096757F570A51E494bd4b943E50";
const ptpAddress = "0x22d4002028f537599bE9f666d1c4Fa138522f9c8";
const avaxAddress = "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7";
const vtxAddress = "0x5817D4F0b62A59b17f75207DA1848C2cE75e7AF4";
const joeRouterAddress = "0x60aE616a2155Ee3d9A68541Ba4544862310933d4";
const Sebastian = "0x320F23780c98f1cbA153dA685e67c4F02aC78bd1";
const David = "0xf1018f794E5A281889e74A873Af0d5C3373e55AD";
const Julian = "0x47078678017ED661e7f6157d559a53a66DED7250";

let Bob = new ethers.Wallet(
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    provider
);

async function main() {
    const [deployer] = await ethers.getSigners();
    /**
     * MIMIC Accounts
     */
    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: ["0x279f8940ca2a44C35ca3eDf7d28945254d0F0aE6"],
    });
    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: ["0x06945Ce08328964041e8825b441Df28eC37cEa35"],
    });
    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: ["0x1B29378d05d91F038C16b35EefB551185068e5b1"],
    });
    this.USDTWhale = await ethers.getSigner("0x279f8940ca2a44C35ca3eDf7d28945254d0F0aE6");
    this.BTCWhale = await ethers.getSigner("0x06945Ce08328964041e8825b441Df28eC37cEa35");
    this.AVAXWhale = await ethers.getSigner("0x1B29378d05d91F038C16b35EefB551185068e5b1");
    /**
     * Create Contracts
     */
    const usdtContract = await hre.ethers.getContractAt("ERC20", usdtAddress);
    const btcbContract = await hre.ethers.getContractAt("ERC20", btcAddress);
    const ptpContract = await hre.ethers.getContractAt("ERC20", ptpAddress);
    const avaxContract = await hre.ethers.getContractAt("ERC20", avaxAddress);
    const vtxContract = await hre.ethers.getContractAt("ERC20", vtxAddress);


    await btcbContract.connect(this.BTCWhale).transfer(Bob.address, "100000000", { gasLimit: 2000000 });
    //await usdtContract.connect(this.USDTWhale).transfer(Bob.address, "1000000000", { gasLimit: 2000000 });

    //const myUsdtBal = await usdtContract.balanceOf(deployer.address);
    //const myBtcBal = await btcbContract.balanceOf(deployer.address);
    const SM = await ethers.getContractFactory("StakingManager");
    let SMContract = await SM.deploy();
    const Sin = await ethers.getContractFactory("InvestorSingle");
    let SinContract = await Sin.deploy(
        _treasury = "0x258b4251BB0eDdC1c2860f7346afDac5260607A1",
        _targetToken = "0x152b9d0FdC40C096757F570A51E494bd4b943E50",
        _stakingManager = SMContract.address,
        _investmentAddress = "0x8B3d9F0017FA369cD8C164D0Cc078bf4cA588aE5",
        _liquidityPool = "0xca0ee0073ee80ab1a82d266b081fcde01bbe6c6a",
        _tokensToBeRewardedAddress = [
            "0x5817D4F0b62A59b17f75207DA1848C2cE75e7AF4",
            "0x22d4002028f537599bE9f666d1c4Fa138522f9c8",
            "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7"
        ],
        _investorHelper = "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
        _poolId = 0
    );
    await SMContract.addWhitelistedContract(SinContract.address);
    await SMContract.createPool("0xbb4646a764358ee93c2a9c4a147d5aDEd527ab73");
    await SMContract.addPartner("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"); // Signer
    await SMContract.addPartner(David);
    await SMContract.addPartner(David);
    await SMContract.addPartner(Julian);
    await SMContract.addPartnerReferral(David, Julian);
    await SMContract.addPartnerReferral("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", Julian);
    await SMContract.addClient(Bob.address);
    await avaxContract.connect(this.AVAXWhale).transfer(SinContract.address, "1000000000000000000", { gasLimit: 2000000 });
    /**
     * Conduct a Deposit
     */
    //Approve first - user must individually talk to token contract to give consent
    await btcbContract.connect(Bob).approve(
        SinContract.address,
        "115792089237316195423570985008687907853269984665640564039457584007913129639935"
    );

    const avaxT1 = await avaxContract.balanceOf("0x258b4251BB0eDdC1c2860f7346afDac5260607A1");
    const ptpT1 = await ptpContract.balanceOf("0x258b4251BB0eDdC1c2860f7346afDac5260607A1");
    const bobBtcBal = await btcbContract.balanceOf(Bob.address);
    console.log("BOB: ", bobBtcBal);
    await SinContract.connect(Bob).depositSingle("50000000", { gasLimit: 2000000 });
    const BobBalSm = await SMContract.poolStakers(0, Bob.address);
    const BobBalEoa = await btcbContract.balanceOf(Bob.address);
    console.log("Bob SM Initial: ", BobBalSm);
    console.log("Bob EOA Initial: ", BobBalEoa);


    await SinContract.connect(Bob).withdrawSingle("25000000", { gasLimit: 2000000 });
    const BobBalSm1 = await SMContract.poolStakers(0, Bob.address);
    const BobBalEoa1 = await btcbContract.balanceOf(Bob.address);
    console.log("Bob SM End: ", BobBalSm1);
    console.log("Bob EOA End: ", BobBalEoa1);


    //Make sure SM has been receiving rewards
    console.log("====================");

    const SMVTX = await vtxContract.balanceOf(SinContract.address);
    const SMAVAX = await avaxContract.balanceOf(SinContract.address);
    const SMPTP = await ptpContract.balanceOf(SinContract.address);
    const SMUSDT = await btcbContract.balanceOf(SinContract.address);
    console.log(SMVTX, SMAVAX, SMPTP);
    console.log("BTC Balance for Smart Contract BEFORE: ", SMUSDT);
    const DavidBalSm1 = await SMContract.poolStakers(0, David);
    const JulianBalSm1 = await SMContract.poolStakers(0, Julian);
    const BobBalSm11 = await SMContract.poolStakers(0, Bob.address);
    const DepBalSm11 = await SMContract.poolStakers(0, deployer.address);
    console.log("DAVID: Pool Staker Before: ", DavidBalSm1);
    console.log("Julian: Pool Staker Before: ", JulianBalSm1);
    console.log("BOB: Pool Staker After: ", BobBalSm11);
    console.log("Deployer: Pool Staker After: ", DepBalSm11);
    await SinContract.reinvest(joeRouterAddress, avaxAddress, 98, { gasLimit: 2000000 });

    const SMVTX1 = await vtxContract.balanceOf(SinContract.address);
    const SMAVAX1 = await avaxContract.balanceOf(SinContract.address);
    const SMPTP1 = await ptpContract.balanceOf(SinContract.address);
    const SMUSDT1 = await btcbContract.balanceOf(SinContract.address);
    console.log(SMVTX1, SMAVAX1, SMPTP1);
    console.log("BTC Balance for Smart Contract AFTER: ", SMUSDT1);
    console.log("====================");

    //const aprTracker = await SinContract.aprTracker();

    //console.log("APR Tracker: ", aprTracker);
    await SinContract.connect(Bob).withdrawSingle("1000000", { gasLimit: 2000000 });
    const DavidBalSm2 = await SMContract.poolStakers(0, David);
    const JulianBalSm2 = await SMContract.poolStakers(0, Julian);
    const BobBalSm2 = await SMContract.poolStakers(0, Bob.address);
    const DepBalSm2 = await SMContract.poolStakers(0, deployer.address);
    console.log("DAVID: Pool Staker After: ", DavidBalSm2);
    console.log("Julian: Pool Staker After: ", JulianBalSm2);
    console.log("BOB: Pool Staker After: ", BobBalSm2);
    console.log("Deployer: Pool Staker After: ", DepBalSm2);
    console.log("=======================================");
    const avaxT2 = await avaxContract.balanceOf("0x258b4251BB0eDdC1c2860f7346afDac5260607A1");
    const ptpT2 = await ptpContract.balanceOf("0x258b4251BB0eDdC1c2860f7346afDac5260607A1");
    console.log("T AVAX: ", avaxT1, avaxT2);
    console.log("T PTP: ", ptpT1, ptpT2);
    await btcbContract.connect(this.BTCWhale).transfer(SinContract.address, "50000000", { gasLimit: 2000000 });
    //console.log("======================================");
    //Check Treasury
    const usdtSin1 = await btcbContract.balanceOf(SinContract.address);
    const usdtT1 = await btcbContract.balanceOf("0x258b4251BB0eDdC1c2860f7346afDac5260607A1");
    await SinContract.universalTransfer(btcAddress, "5000000");
    //transfer
    const usdtSin2 = await btcbContract.balanceOf(SinContract.address);
    const usdtT2 = await btcbContract.balanceOf("0x258b4251BB0eDdC1c2860f7346afDac5260607A1");
    console.log("Contract After: ", usdtSin1, usdtSin2);
    console.log("Treasury After: ", usdtT1, usdtT2);
}

main().then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });