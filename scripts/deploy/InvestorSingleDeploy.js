async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);

    console.log("Account balance:", (await deployer.getBalance()).toString());

    const InvestorSingleFlattened = await ethers.getContractFactory("contracts/InvestorSingle.sol:InvestorSingle");
    const InvestorSingleFlattenContract = await InvestorSingleFlattened.deploy(
        _treasury = "0x258b4251BB0eDdC1c2860f7346afDac5260607A1",
        _targetToken = "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
        _stakingManager = "0x3228db59b2d945C68BBDB223e4b4AFBA6B61b6d5",
        _investmentAddress = "0x8B3d9F0017FA369cD8C164D0Cc078bf4cA588aE5",
        _liquidityPool = "0x5c6c7bc771f9a4231af8d5a463e6d495833011f0",
        _tokensToBeRewardedAddress = [
            "0x5817D4F0b62A59b17f75207DA1848C2cE75e7AF4",
            "0x22d4002028f537599bE9f666d1c4Fa138522f9c8",
            "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7"
        ],
        _investorHelper = "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
        _poolId = 4
    );

    console.log("Investor Single Flatten Address:", InvestorSingleFlattenContract.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });