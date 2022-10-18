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

//CHECK IF ENOUGH AVAX OR SELECTED TOKEN IN WALLET

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

    const url = "http://127.0.0.1:8545/";
    const provider = new ethers.providers.JsonRpcProvider(url);
    const res = await provider.getBlockNumber();
    console.log("CURRENT BLOCK NUMBER: ", res);

    /**
     * 
     * 
     * Wallets + Contract Factories
     * 
     * 
     * */
    //Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
    const signer = new ethers.Wallet(
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
        provider
    );
    //Address: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
    const Bob = new ethers.Wallet(
        "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
        provider
    );
    //Address: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
    const Sally = new ethers.Wallet(
        "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
        provider
    );
    //Address: 0x90F79bf6EB2c4f870365E785982E1f101E93b906
    const Dick = new ethers.Wallet(
        "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
        provider
    );
    //Address: 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc
    const Andy = new ethers.Wallet(
        "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
        provider
    )
    //Impersonating Affiliate
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

    this.admin = await ethers.getSigner("0x320F23780c98f1cbA153dA685e67c4F02aC78bd1");
    this.whale = await ethers.getSigner("0x279f8940ca2a44C35ca3eDf7d28945254d0F0aE6");
    this.treasury = await ethers.getSigner("0xf1018f794E5A281889e74A873Af0d5C3373e55AD");


    /**
     * 
     * 
     * Deploy Contracts
     * 
     * 
     * */
    //Troubleshoot Investor and Helpers
    const addressRouter = await ethers.getContractFactory("AddressRouter");
    addressRouterContract = await addressRouter.deploy();
    //Add some customizations for Address Router

    const Sebastian = "0x320F23780c98f1cbA153dA685e67c4F02aC78bd1";
    const David = "0xf1018f794E5A281889e74A873Af0d5C3373e55AD";
    const Julian = "0x47078678017ED661e7f6157d559a53a66DED7250";
    //Create an affiliate
    await addressRouterContract.addFraternitas(Sebastian);
    await addressRouterContract.addFraternitas(Julian);
    await addressRouterContract.addFraternitas(David);
    await addressRouterContract.addFraternitasReferral(David, Julian);

    const J = await ethers.getContractFactory("JoeHelper");
    JContract = await J.deploy(_addressRouter = addressRouterContract.address);
    const V = await ethers.getContractFactory("VectorHelper");
    VContract = await V.deploy(_addressRouter = addressRouterContract.address);
    const SP = await ethers.getContractFactory("Investor");

    console.log("Address Router: ", addressRouterContract.address);
    console.log("Joe Router: ", JContract.address);
    console.log("Vector Router: ", VContract.address);
    SPContract = await SP.deploy(
        _helper = VContract.address, //You have to deploy & change
        _swap = JContract.address, //You have to deploy & change
        _targetToken = ["0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E"],
        _addressRouter = addressRouterContract.address, //You have to deploy & change
        _spender = "0x8b3d9f0017fa369cd8c164d0cc078bf4ca588ae5",
        _investmentAddress = "0x994F0e36ceB953105D05897537BF55d201245156",
        _rewardsAddress = "0x423d0fe33031aa4456a17b150804aa57fc157d97",
        _receiptLpAddress = ["0x0ADab2F0455987098059Cfc10875C010800c659F"],
        _tokensToBeRewardedAddress = ["0x5817D4F0b62A59b17f75207DA1848C2cE75e7AF4", "0x22d4002028f537599bE9f666d1c4Fa138522f9c8"],
        _tokensToBeRewardedName = ["VTX", "PTP"],
        _tokensToBeRewardedLP = ["0x9ef0c12b787f90f59cbbe0b611b82d30cab92929", "0xcdfd91eea657cc2701117fe9711c9a4f61feed23"]
    );

    const usdcAddress = await addressRouterContract.viewAddressDirectory("USDC"); //Note, mass load these on a hook
    const avaxAddress = await addressRouterContract.viewAddressDirectory("AVAX");
    const usdcContract = await hre.ethers.getContractAt("ERC20", usdcAddress);
    const avaxContract = await hre.ethers.getContractAt("ERC20", avaxAddress);


    const tokenName = "USDC";
    const sellAmount = 2;

    /**
        * @dev Swap AVAX for Desired Token
        * Houses methods for withdrawals, deposits and rewards
        * @tokenName - name of token to mirror CurrencyConstants standard
        * @sellAmount - amount of AVAX to exchange for desired token
        * @return - bool determining whether requested currency was received
        * NOTE1: Amount to swap for will be computed per oracle data
        * NOTE2: Slippage starts at .005% but will lose a zero if slippage error detected
        * NOTE3: Decimal places will be computed automatically for outgoing and incoming tokens
    */
    const collateSwapAVAXForToken = async (tokenName, sellAmount) => {
        let slippage = 0.005;
        const tokenAddr = await ARContract.viewAddressDirectory(tokenName.toUpperCase());
        const avaxAddr = await ARContract.viewAddressDirectory("AVAX"); //Needed for msg.value
        const tokenContract = await hre.ethers.getContractAt("ERC20", tokenAddr);
        const avaxContract = await hre.ethers.getContractAt("ERC20", avaxAddr);
        const usdcDecimals = await tokenContract.decimals();
        const wavaxDecimals = await avaxContract.decimals();
        let amountToSell = packageInt(sellAmount, wavaxDecimals);
        const conversion = cryptoPairConversion(cryptoPrice1 = avaxPrice, cryptoAmount1 = sellAmount, cryptoPrice2 = usdPrice);
        let amountToBuy = packageInt(conversion, usdcDecimals);
        amountToBuy = applyAutoSlippage(slippage, amountToBuy);
        const usdcBalanceBefore = await tokenContract.balanceOf(signer.address, { gasLimit: 29000000 }); //Before Balance
        try { //Execute Swap
            await SPContract.swapAVAXForToken(tokenName, amountToBuy, { value: amountToSell });
        }
        catch (err) {
            console.log("Toubleshooting for solution...");
            const errorStatus = seekError(err);
            if (errorStatus == "RAISE_GAS_LIMIT" || errorStatus == "RAISE_SLIPPAGE") {
                slippage = 0.05;
                await SPContract.swapAVAXForToken(tokenName, applyAutoSlippage(0.05, amountToBuy), { value: amountToSell, gasLimit: 400000 });
            }
        }
        const usdcBalanceAfter = await tokenContract.balanceOf(signer.address, { gasLimit: 29000000 }); //After Balance
        const requestedAmount = applyAutoSlippage(slippage, amountToBuy);
        if ((usdcBalanceAfter - usdcBalanceBefore) >= requestedAmount) { //Determine Successful Transfer
            return true;
        } else {
            return false;
        }
    }

    /**
        * @dev Deposit Stable into Vector Savings
        * @tokenName - name of token to deposit
        * @depositAmount - amount of stable in human-readable integers to deposit
        * @return - bool determining whether deposit was successful (Needs verification from smart contract)
        * NOTE1: 
    */
    const collateDepositSavings = async (tokenName, depositAmount) => {
        //Goal deposit $5 into vector
        //Check if funds are present
        let selectedStable = await SPContract.viewCurrency(tokenName);
        const stable = new ethers.Contract(selectedStable[1], ERC20, provider);
        stableBalance = await stable.balanceOf(signer.address);
        stableBalance = Number(stableBalance);
        let depositPackaged = packageInt(depositAmount, selectedStable[0]);
        if (stableBalance < depositPackaged) { //Assure user has enough funds
            return false;
        }
        //Deposit money
        //Check to make sure the amount is there
    }


    const makeDeposit = async () => {
        const response = await SPContract.routerDepositSingle("601");
        return response;
    }

    /**
     * 
     * 
     * Playground
     * 
     * 
     * */




    /*
    const reb1 = await SPContract.connect(Bob).accountingLedger(Bob.address);
    const reb2 = await SPContract.connect(Bob).walletDirectory(Bob.address);
    const reb3 = await SPContract.connect(Bob).walletArr("0");
    console.log("Bob Accounting Ledger: ", reb1);
    console.log("Bob Wallet Directory: ", reb2);
    console.log("Bob Wallet Arr: ", reb3);

    const res1 = await SPContract.connect(Sally).accountingLedger(Sally.address);
    const res2 = await SPContract.connect(Sally).walletDirectory(Sally.address);
    const res3 = await SPContract.connect(Sally).walletArr("1");
    console.log("Sally Accounting Ledger: ", res1);
    console.log("Sally Wallet Directory: ", res2);
    console.log("Salley Wallet Arr: ", res3);

    const red1 = await SPContract.connect(Dick).accountingLedger(Dick.address);
    const red2 = await SPContract.connect(Dick).walletDirectory(Dick.address);
    const red3 = await SPContract.connect(Dick).walletArr("2");
    console.log("Dick Accounting Ledger: ", red1);
    console.log("Dick Wallet Directory: ", red2);
    console.log("Dick Wallet Arr: ", red3);

    //await SPContract.connect(Bob).queryInvestmentBalance(SPContract.address);
    const bal = await SPContract.connect(Bob).decodedSnapshotBalance();
    console.log("Checking SM balance on vector: ", bal);
    console.log("==========");
    */




    /*
    const contractBalBefore1 = await SPContract.decodedSnapshotBalance();
    //console.log("Contract Balance BEFORE Deposit: ", contractBalBefore1);
    await collateSwapAVAXForToken(tokenName, sellAmount);
    const usdcBalS = await usdcContract.balanceOf(signer.address);
    const usdcBalSP = await usdcContract.balanceOf(SPContract.address);
    //console.log("Signer Balance: ", usdcBalS);
    //console.log("**Contract Balance: ", usdcBalSP);

    await SPContract.routerDepositSingle(8000000, { gasLimit: 29000000 });


    try {
        const clientBalance = await SPContract.accountingLedger(signer.address);
        const contractBalBefore = await SPContract.decodedSnapshotBalance();
        console.log("Contract Balance After Deposit: ", contractBalBefore);
        console.log("%%%%Client Balance in per Ledger: ", clientBalance);
    } catch (err) {
        console.log(err);
    }

    const usdcBalSPAfter = await usdcContract.balanceOf(SPContract.address);
    console.log("**SP USDC Balance after Deposit: ", usdcBalSPAfter);
    */







    /*
    *
    *WITHDRAW
    *
    */
    if (false) {
        try {
            let slippage = 0.005;
            let amountToWithdraw = packageInt(5, 6); //$4 w 6 decimals
            const amountMinToWithdraw = applyAutoSlippage(slippage, amountToWithdraw);
            await SPContract.routerWithdrawSingle(amountToWithdraw, amountMinToWithdraw, { gasLimit: 29000000 });
            //await SPContract.withdrawSingleTest(amountToWithdraw, amountMinToWithdraw, "0x994F0e36ceB953105D05897537BF55d201245156");
            console.log("----------------");
            const usdcBalSPAfterWithdrawal = await usdcContract.balanceOf(SPContract.address);
            console.log("**SP USDC Balance after Withdrawl: ", usdcBalSPAfterWithdrawal);
            await SPContract.queryInvestmentBalance(SPContract.address);
            const contractBal = await SPContract.decodedSnapshotBalance();
            console.log("Smart Contract Total Balance Left After Withdrawal: ", contractBal);
            const clientBalance1 = await SPContract.accountingLedger(signer.address);
            console.log("%%%%Client Balance in ledger After Withdrawal: ", clientBalance1);
            console.log("===========================================");
            const usdcBalSPAfterWithdrawal1 = await usdcContract.balanceOf(SPContract.address);
            console.log("**SP USDC Balance after Transfer: ", usdcBalSPAfterWithdrawal1);
            const usdcBalSPAfterWithdrawal11 = await usdcContract.balanceOf(signer.address);
            console.log("**Signer USDC Balance after Transfer: ", usdcBalSPAfterWithdrawal11);
        } catch (err) {
            console.log(err);
        }
    }

    /*
    *
    *CLAIM REWARDS
    *
    */
    if (true) {
        const usdcSPBefore1 = await usdcContract.balanceOf(SPContract.address);
        console.log("Balance Before Deposits: ", usdcSPBefore1);
        await usdcContract.connect(this.whale).transfer(Bob.address, 10000000);
        await usdcContract.connect(this.whale).transfer(Sally.address, 8000000);
        await usdcContract.connect(this.whale).transfer(Dick.address, 5000000);

        //Add each customer to their affiliate. 
        //1. Bob will be David's client but Juli gets a beneficiary cut
        await addressRouterContract.addClientis(Bob.address, David);
        //2. Sally will be Sebastian's client
        await addressRouterContract.addClientis(Sally.address, Sebastian);
        //3. Dick will be Julian's client
        //await addressRouterContract.addClientis(Dick.address, Julian);

        await usdcContract.connect(Bob).transfer(SPContract.address, 10000000, { gasLimit: 29000000 });
        await usdcContract.connect(Sally).transfer(SPContract.address, 8000000, { gasLimit: 29000000 });
        await usdcContract.connect(Dick).transfer(SPContract.address, 5000000, { gasLimit: 29000000 });

        await SPContract.connect(Bob).routerDepositSingle(10000000, { gasLimit: 29000000 });
        await SPContract.connect(Sally).routerDepositSingle(8000000, { gasLimit: 29000000 });
        await SPContract.connect(Dick).routerDepositSingle(5000000, { gasLimit: 29000000 });

        const addr0 = await SPContract.walletArr("0"); console.log(addr0);
        const addr1 = await SPContract.walletArr("1"); console.log(addr1);
        const addr2 = await SPContract.walletArr("2"); console.log(addr2);
    }

    if (true) {
        const VTXContract = await hre.ethers.getContractAt("ERC20", "0x5817D4F0b62A59b17f75207DA1848C2cE75e7AF4"); //VTX
        const PTPContract = await hre.ethers.getContractAt("ERC20", "0x22d4002028f537599bE9f666d1c4Fa138522f9c8"); //PTP
        const VTXBefore = await VTXContract.balanceOf(SPContract.address); //console.log("VTX Balance B4: ", VTXBefore);
        const PTPBefore = await PTPContract.balanceOf(SPContract.address); //console.log("PTP Balance B4: ", PTPBefore);

        await ethers.provider.send("evm_increaseTime", [604800]);
        await ethers.provider.send("evm_mine", []);
        const alteredBlock = await provider.getBlockNumber();
        console.log("ALTERED BLOCK NUMBER: ", alteredBlock);
        const usdcSPBefore = await usdcContract.balanceOf(SPContract.address);
        console.log("Balance Before Swap: ", usdcSPBefore);

        const bobAccountLedger = await SPContract.accountingLedger(Bob.address);
        const sallyAccountLedger = await SPContract.accountingLedger(Sally.address);
        const dickAccountLedger = await SPContract.accountingLedger(Dick.address);
        console.log("Bob's Deposit B4 Distribution: ", bobAccountLedger);
        console.log("Sally's Deposit B4 Distribution: ", sallyAccountLedger);
        console.log("Dick's Deposit B4 Distribution: ", dickAccountLedger);

        //REWARDS CLAIM
        await SPContract.routerClaimSingle({ gasLimit: 29000000 });



        const VTXAfter = await VTXContract.balanceOf(SPContract.address); //console.log("VTX Balance After: ", VTXAfter);
        const PTPAfter = await PTPContract.balanceOf(SPContract.address); //console.log("PTP Balance After: ", PTPAfter);
        const VTXBal = await SPContract.rewardSnapshot("0x5817D4F0b62A59b17f75207DA1848C2cE75e7AF4"); //console.log("Diff VTX Snapshot at Work: ", VTXBal);
        const PTPBal = await SPContract.rewardSnapshot("0x22d4002028f537599bE9f666d1c4Fa138522f9c8"); //console.log("Diff PTP Snapshot at Work: ", PTPBal);

        const usdcSPAfter = await usdcContract.balanceOf(SPContract.address);
        console.log("Balance After Swap: ", usdcSPAfter);

        const VTXContractTreasury = await hre.ethers.getContractAt("ERC20", "0x5817D4F0b62A59b17f75207DA1848C2cE75e7AF4"); //VTX
        const PTPContractTreasury = await hre.ethers.getContractAt("ERC20", "0x22d4002028f537599bE9f666d1c4Fa138522f9c8"); //PTP
        const VTXTreasury = await VTXContractTreasury.balanceOf(this.treasury.address); //console.log("VTX Treasury: ", VTXTreasury);
        const PTPTreasury = await PTPContractTreasury.balanceOf(this.treasury.address); //console.log("PTP Treasury: ", PTPTreasury);


        console.log("========ACCOUNTING==========");

        const totalInvestment = await SPContract.totalInvestment({ gasLimit: 29000000 });
        console.log("Total Investment: ", totalInvestment);
        //const scrap2 = await SPContract.scraps2();
        //console.log("Dicks Cut: ", scrap2);


        const bobAccountLedgerAfter = await SPContract.accountingLedger(Bob.address);
        const sallyAccountLedgerAfter = await SPContract.accountingLedger(Sally.address);
        const dickAccountLedgerAfter = await SPContract.accountingLedger(Dick.address);
        console.log("Bob's Deposit After Distribution: ", bobAccountLedgerAfter);
        console.log("Sally's Deposit After Distribution: ", sallyAccountLedgerAfter);
        console.log("Dick's Deposit After Distribution: ", dickAccountLedgerAfter);

        const sebastianAccountLedgerAfter = await SPContract.accountingLedger(Sebastian);
        const davidAccountLedgerAfter = await SPContract.accountingLedger(David);
        const julianAccountLedgerAfter = await SPContract.accountingLedger(Julian);
        console.log("Sebastian's Deposit After Distribution: ", sebastianAccountLedgerAfter);
        console.log("David's Deposit After Distribution: ", davidAccountLedgerAfter);
        console.log("Julian's Deposit After Distribution: ", julianAccountLedgerAfter);

        bobAccumulatedProfit = await SPContract.accumulatedProfit(Bob.address); console.log("Bob Acc. Profit: ", bobAccumulatedProfit);

        const usdcSPAfterDeposit = await usdcContract.balanceOf(SPContract.address);
        console.log("Balance After Deposit: ", usdcSPAfterDeposit);

        await SPContract.queryInvestmentBalance(SPContract.address);
        const bal = await SPContract.decodedSnapshotBalance();
        console.log("Checking SM balance on Vector: ", bal);
        console.log("==================WITHDRAW=======================")
        let slippage = 0.005;
        const dolla1 = await usdcContract.balanceOf(Bob.address); console.log("Bob's USDC Wallet Before Withdraw: ", dolla1);
        await SPContract.connect(Bob).routerWithdrawSingle("1500000", "1000000", { gasLimit: 29000000 });
        //await SPContract.connect(Bob).testWithdrawal("1500000", "1000000", { gasLimit: 29000000 });
        await SPContract.queryInvestmentBalance(SPContract.address);
        const bal1 = await SPContract.decodedSnapshotBalance();
        console.log("Checking Balance on Vector After Withdrawal: ", bal1);
        //Accounting Ledger
        const accLedger = await SPContract.accountingLedger(Bob.address); console.log("Bob's Account Ledger: ", accLedger);
        //Profit Accumulation
        const profAcc = await SPContract.accumulatedProfit(Bob.address); console.log("Bob's Accumulated Proft: ", profAcc);
        //Wallet Check
        const dolla = await usdcContract.balanceOf(Bob.address); console.log("Bob's USDC Wallet After Withdraw: ", dolla);
        const dolla2 = await usdcContract.balanceOf(SPContract.address); console.log("SPContract USDC Wallet After Withdraw: ", dolla2);



        //check their balance after deposit

    }

}















main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

/**
 * Tools that can be used later
 * console.log("Account balance:", (await signer.getBalance()).toString());
 */



//IMPERSONATION ACCOUNT
/*
   //Emulate claiming rewards 
    try {
        await network.provider.request({
            method: "hardhat_impersonateAccount",
            params: ["0x320F23780c98f1cbA153dA685e67c4F02aC78bd1"],
        });
        this.admin = await ethers.getSigner("0x320F23780c98f1cbA153dA685e67c4F02aC78bd1");
        const usdcBalSPAfterWithdrawal111 = await usdcContract.balanceOf(this.admin.address);
        console.log("Impersonate Wallet Address: ", usdcBalSPAfterWithdrawal111);
        const VTXContract = await hre.ethers.getContractAt("ERC20", "0x5817D4F0b62A59b17f75207DA1848C2cE75e7AF4");
        const PTPContract = await hre.ethers.getContractAt("ERC20", "0x22d4002028f537599bE9f666d1c4Fa138522f9c8");
        const VTXBefore = await VTXContract.balanceOf(this.admin.address); console.log("VTX Balance B4: ", VTXBefore);
        const PTPBefore = await PTPContract.balanceOf(this.admin.address); console.log("PTP Balance B4: ", PTPBefore);
        //await fDC.connect(ownerWallet).toggleLock();
        await ethers.provider.send("evm_increaseTime", [604800]);
        await ethers.provider.send("evm_mine", []);
        const res = await provider.getBlockNumber();
        console.log("ALTERED BLOCK NUMBER: ", res);
        await VTXHelper.connect(this.admin).claimSingle(
            ["0x0ADab2F0455987098059Cfc10875C010800c659F"],
            "0x320F23780c98f1cbA153dA685e67c4F02aC78bd1",
            "0x423d0fe33031aa4456a17b150804aa57fc157d97"
        )
        const VTXAfter = await VTXContract.balanceOf(this.admin.address); console.log("VTX Balance After: ", VTXAfter);
        const PTPAfter = await PTPContract.balanceOf(this.admin.address); console.log("PTP Balance After: ", PTPAfter);

        //VTX
        //0x5817D4F0b62A59b17f75207DA1848C2cE75e7AF4
        //PTP
        //0x22d4002028f537599bE9f666d1c4Fa138522f9c8

        //console.log(this.admin.address);
    } catch (e) {
        console.log(e);
    }






*/