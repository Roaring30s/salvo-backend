async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);

    console.log("Account balance:", (await deployer.getBalance()).toString());

    const StakingManager = await ethers.getContractFactory("contracts/StakingManager.sol:StakingManager");
    const StakingManagerContract = await StakingManager.deploy();

    console.log("Staking Manager Address:", StakingManagerContract.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });