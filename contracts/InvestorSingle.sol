pragma solidity 0.8.0;

// SPDX-License-Identifier: MIT

import "./Ownable.sol";
import "./ReentrancyGuard.sol";
//import "./VectorInterface.sol";
import "./StakingManagerInterface.sol";
import "./JoeInterface.sol";
import "./IERC20.sol";
import "./PtpInterface.sol";

/**
 * @author King Salvo
 * @dev Purpose of InvestorSingle is to act like a 'Smart EOA' that replicates
 *      all intended functions of an EOA when interactng with Vector Contracts
 *      focused on single-sided staking.
 * @notice This is the second stage of Salvo Investor Contracts. There are plans
 *         to provide upgrade capabilities to all contracts.
 */
contract InvestorSingle is Ownable, ReentrancyGuard {
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
    address public targetToken;
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
     * Rewards Snapshot
     * @dev Contains the rewards received from pool
     */
    mapping(address => uint256) public rewardSnapshot;
    /*
     * 8.
     * APR Tracker
     * @dev Contains the rewards received from pool
     */
    uint256 public aprTracker;
    /*
     * 9.
     * Last 24 APR
     * @dev Snapshot of APR total in the past 24 hours
     */
    uint256 public last7Apr;
    /*
     * 10.
     * Last Claim
     * @dev Saves the timestamp for last time owner made a rewards claim
     * NOTE: Prevents abusive accounts from timing their account deposits with
     * rewards claims
     */
    uint256 public lastClaim;
    /*
     * 11.
     * Investor Helper
     * @dev Tools like accounting and calc commission
     */
    address public investorHelper;
    /*
     * 12.
     * @dev poolId that communicates where amount and rewards are stored
     *      in StakingManager contract
     */
    uint256 public poolId;
    /*
     * 13.
     * paused
     * @dev Pauses contract for maintenance
     */
    bool public paused;

    uint256 public cyp;

    event LpEarned(uint256 indexed poolId, uint256 amount);

    event tokensGained(uint256 indexed poolId, uint256 token0Amount);

    constructor(
        address payable _treasury,
        address _targetToken,
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
    }

    /**
     * @dev Deposit Single
     * @param _amount {uint256} - amount in respective decimal representation of targetToken
     * @notice - Check for Approve --> Add Liquidity to Vector --> Credit on
     *           Staking Manager
     */
    function depositSingle(uint256 _amount) public nonReentrant {
        require(_amount > 0, "Amount to Deposit is Zero or Less.");
        require(paused == false, "Contract is Paused.");
        IERC20(targetToken).transferFrom(tx.origin, address(this), _amount);
        /*
         *
         * 1. Deposit into Vector
         *
         */
        uint256 initBal = VectorSingle(liquidityPool).balance(address(this));
        checkAllowance(targetToken, investmentAddress, address(this));
        VectorSingle(liquidityPool).deposit(_amount);
        /*
         *
         * 2. Credit on Staking Manager
         *
         */
        IStakingManager(stakingManager).deposit(
            poolId,
            VectorSingle(liquidityPool).balance(address(this)) - initBal,
            0
        );
    }

    /**
     * @dev Withdraw Single
     * @param _amount {uint256} - amount in respective decimal representation of targetToken
     * @notice - Check if suff. funds --> Withdraw from Vec --> Debit on Staking Manager
     */
    function withdrawSingle(uint256 _amount) public nonReentrant {
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
        /*
         *
         * 1. Withdraw Specified Amount of Tokens
         *
         */
        uint256 initBal = IERC20(targetToken).balanceOf(address(this));
        VectorSingle(liquidityPool).withdraw(_amount, getSlippage(_amount, 97));
        /*
         *
         * 2. Debit Withdrawal on Staking Manager
         *
         */
        IStakingManager(stakingManager).withdraw(poolId, _amount, 0);
        /*
         *
         * 3. Transfer Funds to EOA
         *
         */
        IERC20(targetToken).transfer(
            tx.origin,
            IERC20(targetToken).balanceOf(address(this)) - initBal
        );
    }

    /**
     * @dev Swap Rewards for Single-Staking Token
     * @param _spenderAddress {address} - Jeo router address and spender are same
     * @param _avaxAddress {address} - AVAX Token Address
     * @param _slippage {uint256} - Slippage to swap rewards for target token
     */

    function reinvest(
        address _spenderAddress,
        address _avaxAddress,
        uint256 _slippage
    ) external onlyOwner nonReentrant {
        address[] memory _rewardToken = tokensToBeRewardedAddress;
        uint256 initBal = VectorSingle(liquidityPool).balance(address(this));

        /*
         *
         * 1. Store New Reward Balances into rewardSnapshot
         * 1a. rewardSnapshot - array tracking rewards harvested from round
         * 1b. Transfer to Treasury
         *
         */
        for (uint8 i = 0; i < tokensToBeRewardedAddress.length; i++) {
            // 3a.
            rewardSnapshot[tokensToBeRewardedAddress[i]] = IERC20(
                tokensToBeRewardedAddress[i]
            ).balanceOf(address(this));
            // 3b.
            if (rewardSnapshot[tokensToBeRewardedAddress[i]] != 0) {
                IERC20(tokensToBeRewardedAddress[i]).transfer(
                    treasury,
                    rewardSnapshot[tokensToBeRewardedAddress[i]] /
                        IStakingManager(stakingManager).bankCut()
                );
            }
        }

        /*
         *
         * 2. Swap Rewards for Target Token
         *
         */
        for (uint256 i = 0; i < _rewardToken.length; i++) {
            uint256 rewardTokenBalance = IERC20(_rewardToken[i]).balanceOf(
                address(this)
            );
            if (rewardTokenBalance != 0) {
                checkAllowance(_rewardToken[i], _spenderAddress, address(this));
                // NOT AVAX
                if (_rewardToken[i] != _avaxAddress) {
                    address[] memory pathToken = new address[](
                        _rewardToken[i] == _avaxAddress ? 2 : 3
                    );
                    pathToken[0] = _rewardToken[i];
                    pathToken[1] = _avaxAddress;
                    pathToken[2] = targetToken;
                    // To prevent rewardSellAmount being so small, I can't exchange it for any BTC as ex.
                    uint256 rewardSellAmount = getSlippage(
                        getExchangeRate(
                            rewardTokenBalance,
                            _spenderAddress,
                            pathToken
                        )[2],
                        _slippage
                    );
                    if (rewardSellAmount > 10) {
                        swapExactTokenForToken(
                            rewardTokenBalance,
                            getSlippage(
                                getExchangeRate(
                                    rewardTokenBalance,
                                    _spenderAddress,
                                    pathToken
                                )[2],
                                _slippage
                            ),
                            targetToken, //Pair 1
                            pathToken[0], //Reward Token,
                            _avaxAddress,
                            _spenderAddress
                        );
                    }
                    //AVAX
                } else {
                    address[] memory pathToken = new address[](
                        _rewardToken[i] == _avaxAddress ? 2 : 3
                    );
                    pathToken[0] = _rewardToken[i];
                    pathToken[1] = targetToken;
                    uint256 rewardSellAmount = getSlippage(
                        getExchangeRate(
                            rewardTokenBalance,
                            _spenderAddress,
                            pathToken
                        )[1],
                        _slippage
                    );
                    if (rewardSellAmount > 10) {
                        swapExactTokenForToken(
                            rewardTokenBalance,
                            rewardSellAmount,
                            targetToken,
                            pathToken[0],
                            _avaxAddress,
                            _spenderAddress
                        );
                    }
                }
            }
        }
        /*
         *
         * 3. Reinvest Target Token into Vector
         *
         */
        checkAllowance(targetToken, investmentAddress, address(this));
        VectorSingle(liquidityPool).deposit(
            IERC20(targetToken).balanceOf(address(this))
        );
        uint256 diffBal = VectorSingle(liquidityPool).balance(address(this)) -
            initBal;
        emit tokensGained(poolId, diffBal);
        /*
         *
         * 4. Reinvest Target Token into Vector
         *
         */
        if (lastClaim + 7 days < block.timestamp) {
            last7Apr = aprTracker; // Record the grand total over the past 24 hours
            aprTracker = diffBal; // Restart apr tracker with new lpearned
            lastClaim = block.timestamp; //Set last claim to now to begin new 24 hour window
        } else {
            aprTracker = aprTracker + diffBal; //Add on to current tracker
        }
        IStakingManager(stakingManager).ownerUpdatePoolRewards(poolId, diffBal);
    }

    /**
     * @dev swapExactTokenForToken
     * Swaps tokens for avax
     * @param _amountIn {uint256} - Token amount to sell
     * @param _amountOutMin {uint256} - Min buy token willing to accept
     * @param _buyCurrency {address} - Buy token address
     * @param _sellCurrency {address} - Sell token address
     * @param _avaxAddress {address} - ERC20 WAVAX Address
     * @param _routerAddress {address} - Trader Joe Router Address
     */
    function swapExactTokenForToken(
        uint256 _amountIn,
        uint256 _amountOutMin,
        address _buyCurrency,
        address _sellCurrency,
        address _avaxAddress,
        address _routerAddress
    ) internal {
        //Swap Reward Token
        if (_sellCurrency != _avaxAddress) {
            address[] memory path = new address[](3);
            path[0] = _sellCurrency;
            path[1] = _avaxAddress;
            path[2] = _buyCurrency;
            IJoeRouter(_routerAddress).swapExactTokensForTokens(
                _amountIn,
                _amountOutMin,
                path,
                address(this),
                block.timestamp + 3600
            );
            // Swap Avax Token
        } else {
            address[] memory path = new address[](2);
            path[0] = _sellCurrency;
            path[1] = _buyCurrency;
            IJoeRouter(_routerAddress).swapExactTokensForTokens(
                _amountIn,
                _amountOutMin,
                path,
                address(this),
                block.timestamp + 3600
            );
        }
    }

    /**
     * @dev Check Allowance
     * Checks to make sure contract has extended permissions to other contracts
     * @param _tokenAddress {address} - Token address to seek approval for
     * @param _spender {address} - Designated spender per ERC20 requirements
     * @param _assenter {address} - Address giving permission to spender
     */
    function checkAllowance(
        address _tokenAddress,
        address _spender,
        address _assenter
    ) public {
        uint256 permittedFunds = IERC20(_tokenAddress).allowance(
            _assenter,
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
     * Universal Transfer
     * @dev Owner has the ability to move sitting tokens to the treasury
     *      to put funds to work.
     * @param _tokenAddress {address} - Token Address sitting in wallet
     * @param _amount {uint256} - Amount of desired token to transfer
     * @notice Funds can only be transferred to owner-specified treasury
     *         which is defined as the state storage variable - 'treasury'
     */
    function universalTransfer(address _tokenAddress, uint256 _amount)
        external
        onlyOwner
    {
        require(_amount > 0, "Universal Transfer amount cannot be zero.");
        IERC20(_tokenAddress).transfer(treasury, _amount);
    }

    /**
     * @dev Owner has the ability to transfer LP tokens to Treasury in case of emergency
     *      or if investor contracts are being switched to another pool
     */
    function evacuateFunds() external onlyOwner {
        require(
            paused == true,
            "Contract must be paused before performing this operation."
        );
        // Withdraw Entire Amount
        uint256 totalAmount = VectorSingle(liquidityPool).balance(
            address(this)
        );
        VectorSingle(liquidityPool).withdraw(
            totalAmount,
            getSlippage(totalAmount, 98)
        );
        IERC20(targetToken).transfer(
            treasury,
            IERC20(targetToken).balanceOf(address(this))
        );
    }

    function evacuateAvax() external onlyOwner {
        uint256 avaxAmount = payable(address(this)).balance;
        treasury.transfer(avaxAmount);
    }

    /**
     * @dev Get Exchange Rate
     * @param _amountIn {uint256} - amount of token to swap for desired token
     * @param _routerAddr {address} - Trader Joe Router Address
     * @param _tokenPath {address} - path to sell and buy token
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

    fallback() external payable {}

    receive() external payable {}
}
