async function main() {
    const url = "http://127.0.0.1:8545/"
    const provider = new ethers.providers.JsonRpcProvider(url);
    const signer = new ethers.Wallet(
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
        provider
    );
    console.log("Deploying contracts with the account:", signer.address);
    console.log("Account balance:", (await signer.getBalance()).toString());
    //********************************************** */
    let token1 = "BTCB";
    let token2 = "AVAX";
    let liquidityPool = "0x2fD81391E30805Cc7F2Ec827013ce86dc591B806"; //BTCBAVAX
    //Codes From AddressDirectory
    let spenderCode = "BTCBAVAXVector";
    let investmentContract = "0x473bD859797F781d1626B9c6f9B3065FF741E14C";
    let receiptLPAddress = "0xD5817AC3027B1958961903238b374EcD8a5537A8"; //Where rewards manager looks for your lp receipt
    let rewardsManagerAddress = "0x423d0fe33031aa4456a17b150804aa57fc157d97";
    //********************************************** */
    Sebastian = "0x320F23780c98f1cbA153dA685e67c4F02aC78bd1";
    David = "0xf1018f794E5A281889e74A873Af0d5C3373e55AD";
    Julian = "0x47078678017ED661e7f6157d559a53a66DED7250";
    //Initialize Address Router
    const addressRouter = await ethers.getContractFactory("AddressRouter");
    addressRouterContract = await addressRouter.deploy();
    await addressRouterContract.addFraternitas(Sebastian);
    await addressRouterContract.addFraternitas(Julian);
    await addressRouterContract.addFraternitas(David);
    await addressRouterContract.addFraternitasReferral(David, Julian);

    //Initialize Vector/Joe/Investor Helper Contracts
    const J = await ethers.getContractFactory("JoeHelper");
    JContract = await J.deploy(_addressRouter = addressRouterContract.address);
    const V = await ethers.getContractFactory("VectorHelper");
    VContract = await V.deploy(_addressRouter = addressRouterContract.address);
    const LP = await ethers.getContractFactory("InvestorLp");

    const VectorInvestor = await ethers.getContractFactory("InvestorLp");
    const VectorInvestorContract = await VectorInvestor.deploy(
        _helper = VContract.address, //Gtg
        _swap = JContract.address, //Gtg
        _targetToken = ["0x152b9d0FdC40C096757F570A51E494bd4b943E50", "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7"], //Gtg  ["0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664", "0xf2f13f0b7008ab2fa4a2418f4ccc3684e49d20eb"]
        _targetTokenReversed = ["0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", "0x152b9d0FdC40C096757F570A51E494bd4b943E50"],
        _addressRouter = addressRouterContract.address, //Gtg
        _investmentAddress = investmentContract, //Gtg
        _liquidityPool = liquidityPool, //gtg BTCBAVAX "0xc0294fafdee273f4d8d01db52cc0c65102bc081f"
        _rewardsManagerAddress = rewardsManagerAddress,
        _receiptLpAddress = [receiptLPAddress],
        _tokensToBeRewardedAddress = [
            "0x5817D4F0b62A59b17f75207DA1848C2cE75e7AF4",
            "0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd",
            "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7"
        ],
        _tokensToBeRewardedName = ["VTX", "JOE", "WAVAX"]
    );

    console.log("Vector Investor:", VectorInvestorContract.address);
    console.log("Address Router: ", addressRouterContract.address);
    console.log("Joe Router: ", JContract.address);
    console.log("Vector Router: ", VContract.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });