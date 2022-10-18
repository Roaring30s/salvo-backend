async function main() {

    const [deployer] = await ethers.getSigners();
    /**
     * DELETE ME 
     
    const I = await ethers.getContractFactory("InvestorHelper");
    let IContract = await I.deploy();
    const SM = await ethers.getContractFactory("StakingManager");
    let SMContract = await SM.deploy();
    */

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
    let targetToken = ["0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd", "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7"];
    let liquidityPool = "0x454E67025631C065d3cFAD6d71E6892f74487a15";
    let investmentContract = "0x6EB168AB79bCE500442dC035C0CCf88210ECA9f5";
    let poolId = 3;

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
    /**
     * 
     * DELETE ME
    await SMContract.createPool("0x454E67025631C065d3cFAD6d71E6892f74487a15");
    await SMContract.addWhitelistedContract(InvestorLpContract.address);
    console.log("Investor JOE Lp Address:", InvestorLpContract.address);

    await InvestorLpContract.connect(deployer).depositAvaxLp(
        "0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd",
        "0x6EB168AB79bCE500442dC035C0CCf88210ECA9f5",
        "0x60aE616a2155Ee3d9A68541Ba4544862310933d4",
        "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
        { gasLimit: "2400000", value: "100000000000000000" }
    );
    const cyp = await InvestorLpContract.connect(deployer).cyp();
    console.log(cyp);
    const res = await SMContract.poolStakers(0, deployer.address);
    console.log("#################################"); console.log(res);
    await InvestorLpContract.withdrawAvaxLp("187597944662068923", "0x60aE616a2155Ee3d9A68541Ba4544862310933d4", "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7");
    const res1 = await SMContract.poolStakers(0, deployer.address);
    console.log(res1);
    */

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });