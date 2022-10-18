// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "./Ownable.sol";
import "./ReentrancyGuard.sol";
import "./VectorInterface.sol";
import "./StakingManagerInterface.sol";
import "./JoeInterface.sol";
import "./IERC20.sol";

/**
 * @author King Salvo
 * @dev Purpose of InvestorLp is to act like a 'Smart EOA' that replicates
 *      all intended functions of an EOA when interactng with Trader Joe
 *      and Vector contracts.
 * @notice This is the first stage of Salvo Investor Contracts. There are plans
 *         to provide upgrade capabilities to all contracts.
 */
contract InvestorLp is Ownable, ReentrancyGuard {
    /*
     * 1.
     * Treasury - Wallet to Manage Profits
     */
    address payable public treasury;
    /*
     * 2.
     * StakingManager - Contract address to handle accounting
     */
    address public stakingManager;
    /*
     * 3.
     * Target Token Settings [0] pair, [1] avax
     */
    address[] public targetToken;
    /*
     * 4.
     * Investment Address - staking contract
     */
    address payable public investmentAddress;
    /*
     * 5.
     * Liquidity Pool - Address where pair is held
     */
    address payable public liquidityPool;
    /*
     * 6.
     * @dev Tokens to Be Rewarded by their Contract Address
     */
    address[] public tokensToBeRewardedAddress;
    /*
     * 7.
     * APR Tracker
     * @dev Contains the rewards received from pool
     */
    uint256 public aprTracker;
    /*
     * 8.
     * Last 24 APR
     * @dev Snapshot of APR total in the past 24 hours
     */
    uint256 public lastApr;
    /*
     * 9.
     * Last Claim
     * @dev Saves the timestamp for last time owner made a rewards claim
     * NOTE: Prevents abusive accounts from timing their account deposits with
     * rewards claims
     */
    uint256 public lastClaim;
    /*
     * 10.
     * Investor Helper
     * @dev Tools like accounting and calc commission
     */
    address public investorHelper;
    /*
     * 11.
     * @dev poolId that communicates where amount and rewards are stored
     *      in StakingManager contract
     */
    uint256 public poolId;
    /*
     * 12.
     * paused
     * @dev Pauses contract for maintenance
     */
    bool public paused;
    /*
     * 13.
     * slippage
     * @dev Sets slippage for transactions
     */
    uint256 public slippage;
    /*
     * 14.
     * investorWhitelist
     * @dev Allows wallets added by owner to interact with SC
     */
    // Mapping investors => if eligible
    mapping(address => bool) public investorWhitelist;

    // Modifiers
    modifier verifyPool() {
        (address lp, , ) = IStakingManager(stakingManager).pools(poolId);
        require(
            lp == liquidityPool,
            "Pool on Staking Manager has not be created."
        );
        _;
    }

    modifier ifWhitelisted() {
        require(investorWhitelist[msg.sender], "User is not on the whitelist.");
        _;
    }

    event DataBeforeLiquidityAdd(
        address indexed user,
        uint256 indexed poolId,
        uint256 token0Amount,
        uint256 token1Amount
    );

    event Deposit(address indexed user, uint256 indexed poolId, uint256 amount);

    event LpEarned(uint256 indexed poolId, uint256 amount);

    event tokensGained(
        uint256 indexed poolId,
        uint256 token0Amount,
        uint256 token1Amount,
        uint256 avaxAmount
    );

    constructor(
        address payable _treasury,
        address[] memory _targetToken,
        address _stakingManager,
        address _investmentAddress,
        address _liquidityPool,
        address[] memory _tokensToBeRewardedAddress,
        address _investorHelper,
        uint256 _poolId
    ) {
        treasury = payable(_treasury);
        targetToken = _targetToken;
        stakingManager = _stakingManager;
        investmentAddress = payable(_investmentAddress);
        liquidityPool = payable(_liquidityPool);
        tokensToBeRewardedAddress = _tokensToBeRewardedAddress;
        lastClaim = block.timestamp;
        investorHelper = _investorHelper;
        poolId = _poolId;
        paused = false;
        slippage = 90;
    }

    /**
     * @dev Router Deposit Avax LP
     * @param _tokenAddress {address} - token address for first token, not Avax
     * @param _stakingContract {address} - Vector contract where LP tokens are deposited
     * @param _routerAddr {address} - Trader Joe Router Address
     * @param _avaxAddress {address} - WAVAX ERC20 address
     * @notice - Swaps tokens --> Add Liquidity --> Deposit to Vector --> Credit on
     *           Staking Manager
     */

    function depositAvaxLp(
        address _tokenAddress,
        address _stakingContract,
        address _routerAddr,
        address _avaxAddress
    ) public payable nonReentrant ifWhitelisted {
        require(msg.value > 0, "Amount to Deposit is Zero or Less.");
        require(paused == false, "Contract is Paused.");
        uint256[] memory _rewardSnapshot = new uint256[](
            tokensToBeRewardedAddress.length
        );
        /*
         *
         * 0. Store Establish Reward Balances so None are Given to Treasury
         * 0a. rewardSnapshot - array tracking rewards already sitting in SC
         * Perform this loop so we do not send extra rewards to treasury
         *
         */

        for (uint8 i = 0; i < tokensToBeRewardedAddress.length; i++) {
            //0a
            _rewardSnapshot[i] = IERC20(tokensToBeRewardedAddress[i]).balanceOf(
                address(this)
            );
        }

        /*
         *
         * 1. Swap AVAX for respective token
         *
         */
        address[] memory _targetToken = targetToken;
        uint256[] memory exchangeRate;
        // 1a. Grab exchange rate for AVAX and token0
        exchangeRate = getExchangeRate(
            msg.value / 2,
            _routerAddr,
            reverseArray(_targetToken)
        );

        // 1b. Conduct Swap
        uint256 initAmount = IERC20(targetToken[0]).balanceOf(address(this));
        address[] memory avaxSwapPath = new address[](2);
        avaxSwapPath[0] = _avaxAddress;
        avaxSwapPath[1] = _tokenAddress;
        IJoeRouter(_routerAddr).swapExactAVAXForTokens{value: msg.value / 2}(
            getSlippage(exchangeRate[1], slippage),
            avaxSwapPath,
            address(this),
            block.timestamp + 3600
        );

        /*
         *
         * 2. Add Liquidity to TJ & Receive LP Tokens
         *
         *NOTE: Make sure pair1Amount takes from an initAmount in case reward token and targetToken[0] are same
         *      See: 0xff52094bf2e4a5c5dd980c33cc5117d18bf8ccb1f8e3395ba822eabedd2e72dc
         */
        uint256 pair1Amount = IERC20(targetToken[0]).balanceOf(address(this)) -
            initAmount;
        emit DataBeforeLiquidityAdd(
            tx.origin,
            poolId,
            getSlippage(pair1Amount, slippage),
            msg.value / 2
        );
        (bool successLiquidity, ) = investorHelper.delegatecall(
            abi.encodeWithSignature(
                "addAvaxPairLiquidityAmount(address,address,address,address,uint256,uint256,uint256)",
                _tokenAddress,
                _avaxAddress,
                _routerAddr,
                _avaxAddress,
                msg.value / 2,
                slippage,
                pair1Amount
            )
        );
        require(
            successLiquidity,
            "Delegatecall to addAvaxPairLiquidityAmount Failed."
        );

        /*
         *
         * 3. Deposit LP Tokens into Vector
         *
         */
        // a. Grab initial LP token balance before deposit
        uint256 initBal = IERC20(investmentAddress).balanceOf(address(this));
        // b. Deposit AVAX LP Tokens
        if (IERC20(liquidityPool).balanceOf(address(this)) > 0) {
            (bool successDeposit, ) = investorHelper.delegatecall(
                abi.encodeWithSignature(
                    "depositLPNative(uint256,address,address,address)",
                    IERC20(liquidityPool).balanceOf(address(this)),
                    liquidityPool,
                    _stakingContract,
                    investmentAddress
                )
            );
            require(successDeposit, "depositLPNative helper call failed.");
            /*
             *
             * 4. Credit Depositor on his LP Tokens
             * 4a. Middle param grabs balance difference of LP tokens
             *
             */

            IStakingManager(stakingManager).deposit(
                poolId,
                IERC20(investmentAddress).balanceOf(address(this)) - initBal,
                0
            );
        }
        /*
         *
         * 3. Store New Reward Balances into rewardSnapshot
         * 3a. rewardAmount - Difference between earned + SC wallet balance & SC wallet balance
         * 3b. Transfer to Treasury
         *
         */
        for (uint8 i = 0; i < tokensToBeRewardedAddress.length; i++) {
            // 3a.
            uint256 rewardAmount = IERC20(tokensToBeRewardedAddress[i])
                .balanceOf(address(this)) - _rewardSnapshot[i];
            // 3b.
            if (rewardAmount != 0) {
                IERC20(tokensToBeRewardedAddress[i]).transfer(
                    treasury,
                    rewardAmount / IStakingManager(stakingManager).bankCut()
                );
            }
        }
    }

    /**
     * @dev WithdrawAvaxLp - EOA Withdraws Desired Balance
     * @param _amount {uint256} - amount in LP tokens
     * @param _routerAddress {address} - Trader Joe Router Address
     * @param _avaxAddress {address} - WAVAX ERC20 Address
     * @notice - User will have reward tokens converted back into LP for reinvestment
     *           Salvo will receive 25% of rewards and hold for community price stab.
     *           and ability to earn passive revenue from governance tokens.
     */

    function withdrawAvaxLp(
        uint256 _amount,
        address _routerAddress,
        address _avaxAddress
    ) public nonReentrant ifWhitelisted {
        require(paused == false, "Contract is Paused.");
        require(_amount > 0, "Withdraw Amount Equal to Zero.");
        (uint256 stakerAmount, uint256 stakerReward, ) = IStakingManager(
            stakingManager
        ).poolStakers(poolId, tx.origin);

        require(
            stakerAmount +
                stakerReward +
                IStakingManager(stakingManager).pendingRewards(
                    poolId,
                    tx.origin
                ) >=
                _amount,
            "Insufficient Funds from Staking Manager."
        );
        uint256[] memory _rewardSnapshot = new uint256[](
            tokensToBeRewardedAddress.length
        );
        /*
         *
         * 0. Store Establish Reward Balances so None are Given to Treasury
         * 0a. rewardSnapshot - array tracking rewards already sitting in SC
         * Perform this loop so we do not send extra rewards to treasury
         *
         */
        for (uint8 i = 0; i < tokensToBeRewardedAddress.length; i++) {
            //0a
            _rewardSnapshot[i] = IERC20(tokensToBeRewardedAddress[i]).balanceOf(
                address(this)
            );
        }

        /*
         *
         * 1. Withdraw Specified Amount of LP Tokens
         *
         */
        uint256 initLpBal = IERC20(investmentAddress).balanceOf(address(this));
        IVector(investmentAddress).withdraw(_amount);
        uint256 differenceBal = initLpBal -
            IERC20(investmentAddress).balanceOf(address(this));
        /*
         *
         * 2. Remove Liquidity from Pool
         *
         */
        // a. Calculate number of pair 1 and pair 2 tokens to request at swap
        uint256 lpTotalSupply = IERC20(liquidityPool).totalSupply();
        uint256 token0Entitlement = getSlippage(
            (((differenceBal * 1e12) / lpTotalSupply) *
                IERC20(targetToken[0]).balanceOf(liquidityPool)) / 1e12,
            slippage
        );
        uint256 token1Entitlement = getSlippage(
            (((differenceBal * 1e12) / lpTotalSupply) *
                IERC20(targetToken[1]).balanceOf(liquidityPool)) / 1e12,
            slippage
        );
        // b. Using calculated values, request withdrawal of both tokens
        checkAllowance(liquidityPool, _routerAddress);
        IJoeRouter(_routerAddress).removeLiquidityAVAX(
            targetToken[0],
            differenceBal,
            token0Entitlement,
            token1Entitlement,
            tx.origin,
            block.timestamp + 3600
        );
        /*
         *
         * 3. Store New Reward Balances into rewardSnapshot
         * 3a. rewardSnapshot - array tracking rewards harvested from round
         * 3b. Transfer to Treasury
         *
         */
        for (uint8 i = 0; i < tokensToBeRewardedAddress.length; i++) {
            // 3a.
            uint256 rewardAmount = IERC20(tokensToBeRewardedAddress[i])
                .balanceOf(address(this)) - _rewardSnapshot[i];
            // 3b.
            if (rewardAmount != 0) {
                IERC20(tokensToBeRewardedAddress[i]).transfer(
                    treasury,
                    rewardAmount / IStakingManager(stakingManager).bankCut()
                );
            }
        }
        /*
         *
         * 4. Debit Withdrawal from Depositor via StakingManager
         *
         */
        IStakingManager(stakingManager).withdraw(poolId, differenceBal, 0);
    }

    /**
     * @dev forceDeposit injects LP tokens into Vector under new contract name
     * @param _stakingContract - where LP tokens are deposited to in Vector
     * @notice - No changes to the Staking Manager will be made, strictly a deposit of tokens into
     *           new contract. Also useful for preserving liquidity coverage ratio
     */
    function forceDeposit(address _stakingContract) external onlyOwner {
        (bool successForceDeposit, ) = investorHelper.delegatecall(
            abi.encodeWithSignature(
                "depositLPNative(uint256,address,address,address)",
                IERC20(liquidityPool).balanceOf(address(this)),
                liquidityPool,
                _stakingContract,
                investmentAddress
            )
        );
        require(
            successForceDeposit,
            "depositLPNative helper call failed when force depositing."
        );
    }

    /**
     * @dev reinvest to convert rewards tokens back into lp, distribute in staking manager
     * @param _routerAddress {address} - router address for DEX swapping tokens
     * @param _avaxAddress {address} - AVAX address
     * @param _slippage {uint256} - Slippage ranging 0-100
     */
    function reinvest(
        address _routerAddress,
        address _avaxAddress,
        uint256 _slippage
    ) external onlyOwner {
        /*
         *
         * 1. Reinvest Rewards Back Into LP
         *
         */
        uint256 initBalance = IVector(investmentAddress).balanceOf(
            address(this)
        );
        (bool successSwapRewards, ) = investorHelper.delegatecall(
            abi.encodeWithSignature(
                "swapRewardsForLp(address,address,uint256)",
                _routerAddress,
                _avaxAddress,
                _slippage
            )
        );
        require(successSwapRewards == true, "Swap Rewards for LP Failed.");
        uint256 token0Amount = IERC20(targetToken[0]).balanceOf(address(this));
        uint256 token1Amount = IERC20(targetToken[1]).balanceOf(address(this));
        uint256 avaxAmount = payable(address(this)).balance;
        uint256 joeAmount = IERC20(0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd)
            .balanceOf(address(this));

        emit tokensGained(poolId, token0Amount, token1Amount, avaxAmount);
        (bool successReinvest, bytes memory dataReinvest) = investorHelper
            .delegatecall(
                abi.encodeWithSignature(
                    "reinvestLp(address,address,uint256)",
                    _routerAddress,
                    _avaxAddress,
                    _slippage
                )
            );
        require(successReinvest == true, "Reinvesting LP Failed.");
        uint256 lpEarned = IERC20(liquidityPool).balanceOf(address(this));
        emit LpEarned(poolId, lpEarned);
        //EMIT LP EARNED
        IVector(investmentAddress).deposit(
            IERC20(liquidityPool).balanceOf(address(this))
        );
        /*
         *
         * 2. Calculate ROI using last payout method & Update Pool Rewards
         * a. window - Number of seconds between last reinvest and current one
         *    runningRate - Raw ROI on LP tokens
         * b. lastApr is last payout APR
         * c. Update pool Rewards
         *
         */
        //a.
        uint256 window = block.timestamp - lastClaim;
        uint256 runningRate = (lpEarned * 10**18) / initBalance;
        //b.
        lastApr = runningRate * (31536000 / window); //Must be divided by power of 18 on frontend
        IStakingManager(stakingManager).ownerUpdatePoolRewards(
            poolId,
            lpEarned
        );
    }

    /**
     * @dev Get Exchange Rate
     * @param _amountIn {uin256} - amount of token to swap for desired token
     * @param _routerAddr {address} - Trader Joe Router Address
     * @param _tokenPath {address[]} - path to sell and buy token
     * @return - exchangeRate uint256[] - 0 first token, 1 second token etc
     */
    function getExchangeRate(
        uint256 _amountIn,
        address _routerAddr,
        address[] memory _tokenPath
    ) public payable returns (uint256[] memory) {
        uint256[] memory exchangeRate;
        exchangeRate = IJoeRouter(_routerAddr).getAmountsOut(
            _amountIn,
            _tokenPath
        );
        return exchangeRate;
    }

    /**
     * @dev getSlippage
     * @param _amount {uint256} - amount of token
     * @param _slippage {uint256} - uint serving as percentage representation
     * @return uint256 discounted amount
     */
    function getSlippage(uint256 _amount, uint256 _slippage)
        internal
        pure
        returns (uint256)
    {
        return ((((_amount * 100) / 100) * _slippage) / 100);
    }

    /**
     * @dev Pause Contract
     */
    function togglePause() external onlyOwner {
        paused = !paused;
    }

    /**
     * @dev Change the stakingManager
     */
    function changeStakingManager(address _newStakingManager)
        external
        onlyOwner
    {
        stakingManager = _newStakingManager;
    }

    /**
     * @dev Changes the order for the target token array
     * @param _array {address[]} - array intended to be reversed in order
     * @notice Only works for address arrays. Used to reverse my state
     *         storage targetToken when I am swapping pair1 for pair0
     */
    function reverseArray(address[] memory _array)
        public
        pure
        returns (address[] memory)
    {
        uint256 length = _array.length;
        address[] memory reversedArray = new address[](length);
        uint256 j = 0;
        for (uint256 i = length; i >= 1; i--) {
            reversedArray[j] = _array[i - 1];
            j++;
        }
        return reversedArray;
    }

    /**
     * Universal Transfer
     * @dev Owner has the ability to move sitting tokens to the treasury
     *      to put funds to work.
     * @param _tokenAddress {address} - Token Address sitting in wallet
     * @param _amount {uint256} - Amount of desired token to transfer
     * @notice Funds can only be transferred to owner-specified treasury
     *         which is defined as the state storage variable - 'treasury'
     */
    function universalTransfer(address _tokenAddress, uint256 _amount)
        public
        onlyOwner
    {
        require(_amount > 0, "Universal Transfer amount cannot be zero.");
        IERC20(_tokenAddress).transfer(treasury, _amount);
    }

    /**
     * @dev Owner has the ability to transfer LP tokens to Treasury in case of emergency
     *      or if investor contracts are being switched to another pool
     * @notice This is not a rug function. I care about my life... -King Salvo
     */
    function evacuateFunds() external onlyOwner {
        require(
            paused == true,
            "Contract must be paused before performing this operation."
        );
        // Withdraw Entire Amount
        uint256 totalAmount = IERC20(investmentAddress).balanceOf(
            address(this)
        );
        IVector(investmentAddress).withdraw(totalAmount);
        IERC20(liquidityPool).transfer(
            treasury,
            IERC20(liquidityPool).balanceOf(address(this))
        );
    }

    function evacuateAvax() external onlyOwner {
        uint256 avaxAmount = payable(address(this)).balance;
        treasury.transfer(avaxAmount);
    }

    /**
     * @dev Check Allowance
     * Checks to make sure contract has extended permissions to other contracts
     * @param _tokenAddress {address} - Token address to seek approval for
     * @param _spender {address} - Designated spender per ERC20 requirements
     */
    function checkAllowance(address _tokenAddress, address _spender) public {
        uint256 permittedFunds = IERC20(_tokenAddress).allowance(
            address(this),
            _spender
        );
        if (
            permittedFunds !=
            115792089237316195423570985008687907853269984665640564039457584007913129639935
        ) {
            IERC20(_tokenAddress).approve(
                _spender,
                115792089237316195423570985008687907853269984665640564039457584007913129639935
            );
        }
    }

    /**
     * @dev Change Helper Address
     * In place to switch address in case I have to replace helper
     * due to faulty code
     * @param _newAddr {address} - new address for helper
     */
    function changeHelperAddress(address _newAddr) external onlyOwner {
        investorHelper = _newAddr;
    }

    /**
     * @dev Change Slippage
     * if lp depth prevents fixed slippage, adjust here
     * @param _newSlippage {uint256} - new address for helper
     */
    function changeSlippage(uint256 _newSlippage) external onlyOwner {
        slippage = _newSlippage;
    }

    /**
     * @dev Toggle Investor Whitelist
     * Enables/Disables Investor Access to SC
     * @param _investor {address} - Investor Wallet Address
     */
    function toggleInvestorWhitelist(address _investor) external onlyOwner {
        investorWhitelist[_investor] = !investorWhitelist[_investor];
    }

    fallback() external payable {}

    receive() external payable {}
}
