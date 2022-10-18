async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);

    console.log("Account balance:", (await deployer.getBalance()).toString());

    const InvestorHelperFlattened = await ethers.getContractFactory("contracts/InvestorHelper.sol:InvestorHelper");
    const InvestorHelperFlattenContract = await InvestorHelperFlattened.deploy();

    console.log("Investor Helper Flatten Address:", InvestorHelperFlattenContract.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });