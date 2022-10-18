async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);

    console.log("Account balance:", (await deployer.getBalance()).toString());

    const InvestorLp = await ethers.getContractFactory("contracts/InvestorLp.sol:InvestorLp");
    let treasury = "0x258b4251BB0eDdC1c2860f7346afDac5260607A1";
    let SMContract = "0x3228db59b2d945C68BBDB223e4b4AFBA6B61b6d5";
    let IContract = "0x693bd2d044A97b2b9155c61b4E4EcC3EF076EE91";
    let tokensToBeRewarded = [
        "0x5817D4F0b62A59b17f75207DA1848C2cE75e7AF4",
        "0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd",
        "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7"
    ];
    let targetToken = ["0x152b9d0FdC40C096757F570A51E494bd4b943E50", "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7"];
    let liquidityPool = "0x2fD81391E30805Cc7F2Ec827013ce86dc591B806";
    let investmentContract = "0x473bD859797F781d1626B9c6f9B3065FF741E14C";
    let poolId = 0;

    const InvestorLpContract = await InvestorLp.deploy(
        _treasury = treasury,
        _targetToken = targetToken,
        _stakingManager = SMContract,
        _investmentAddress = investmentContract,
        _liquidityPool = liquidityPool,
        _tokensToBeRewardedAddress = tokensToBeRewarded,
        _investorHelper = IContract,
        _poolId = poolId
    );

    console.log("Investor Lp Address:", InvestorLpContract.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });