pragma solidity 0.8.0;
// SPDX-License-Identifier: MIT
import "./Ownable.sol";
import "./ReentrancyGuard.sol";
import "./VectorInterface.sol";
import "./StakingManagerInterface.sol";
import "./JoeInterface.sol";
import "./IERC20.sol";

contract InvestorHelper is Ownable, ReentrancyGuard {
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
    uint256 public last24Apr;
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

    constructor() {}

    /**
     * Reinvest Rewards Back into LP
     * @param _spenderAddress {address} - spender address to move tokens
     * @param _avaxAddress {address} - ERC20 WAVAX Address
     * @param _slippage {uint256} - slippage set btwn 0-100
     * @notice Before swap, will check if reward amount is enough to swap for big
     *         tokens like BTC. Will use getExchangeRate to determine
     *         if I can get anything for my trade.
     */
    function reinvestLp(
        address _spenderAddress,
        address _avaxAddress,
        uint256 _slippage
    ) public {
        uint256 earnedAvax = payable(address(this)).balance;
        addAvaxPairLiquidity(
            targetToken[0],
            targetToken[1],
            _spenderAddress,
            _avaxAddress,
            earnedAvax,
            _slippage
        );
        checkAllowance(liquidityPool, _spenderAddress);
    }

    /**
     * @dev Swap Rewards For LP
     * Swap Reward Tokens for LP Pair Tokens
     * @param _spenderAddress {address} - spender address to move tokens
     * @param _avaxAddress {address} - ERC20 WAVAX Address
     * @param _slippage {uint256} - slippage set btwn 0-100
     * @notice Before swap, will check if reward amount is enough to swap for big
     *         tokens like BTC. Will use getExchangeRate to determine
     *         if I can get anything for my trade.
     */
    function swapRewardsForLp(
        address _spenderAddress,
        address _avaxAddress,
        uint256 _slippage
    ) public {
        address[] memory _targetToken = targetToken;
        address[] memory _rewardToken = tokensToBeRewardedAddress;
        if (payable(address(this)).balance > 0) {
            payable(treasury).transfer(payable(address(this)).balance);
        }

        if (
            IERC20(targetToken[0]).balanceOf(address(this)) > 0 &&
            targetToken[0] != 0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd
        ) {
            //Prevents JOE swaps
            //Prevents swapping JOE
            IERC20(targetToken[0]).transfer(
                treasury,
                IERC20(targetToken[0]).balanceOf(address(this))
            );
        }
        // LOOP & Swap Out Rewards to LP Pair Tokens
        for (uint256 i = 0; i < _rewardToken.length; i++) {
            uint256 rewardTokenBalance = IERC20(_rewardToken[i]).balanceOf(
                address(this)
            );
            if (rewardTokenBalance != 0) {
                checkAllowance(_rewardToken[i], _spenderAddress);
                rewardTokenBalance = rewardTokenBalance / 2;
                // PAIR 1 - TOKEN NOT AVAX
                if (_rewardToken[i] != _avaxAddress) {
                    if (_rewardToken[i] != targetToken[0]) {
                        address[] memory pathToken = new address[](
                            _rewardToken[i] == _avaxAddress ? 2 : 3
                        );
                        pathToken[0] = _rewardToken[i];
                        pathToken[1] = _avaxAddress;
                        pathToken[2] = _targetToken[0];
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
                                _targetToken[0], //Pair 1
                                pathToken[0], //Reward Token,
                                _avaxAddress,
                                _spenderAddress
                            );
                        }
                    }
                    //PAIR 1 - IF AVAX
                } else {
                    address[] memory pathToken = new address[](
                        _rewardToken[i] == _avaxAddress ? 2 : 3
                    );
                    pathToken[0] = _rewardToken[i];
                    pathToken[1] = _targetToken[0];
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
                            _targetToken[0],
                            pathToken[0],
                            _avaxAddress,
                            _spenderAddress
                        );
                    }
                }
                //PAIR 2 (always AVAX) - IF NOT AVAX
                if (_rewardToken[i] != _avaxAddress) {
                    address[] memory pathAvax = new address[](2);
                    pathAvax[0] = _rewardToken[i];
                    pathAvax[1] = _avaxAddress;
                    uint256 rewardSellAmount = getSlippage(
                        getExchangeRate(
                            rewardTokenBalance,
                            _spenderAddress,
                            pathAvax
                        )[1],
                        _slippage
                    );
                    if (rewardSellAmount > 10) {
                        checkAllowance(_rewardToken[i], _spenderAddress);
                        address[] memory path = new address[](2);
                        path[0] = _rewardToken[i];
                        path[1] = _avaxAddress;

                        IJoeRouter(_spenderAddress).swapExactTokensForAVAX(
                            rewardTokenBalance, // Reward Token
                            rewardSellAmount, // WAVAX
                            path,
                            address(this),
                            block.timestamp + 3600
                        );
                    }
                    //PAIR 2 - IF AVAX
                } else {
                    IERC20(_avaxAddress).withdraw(rewardTokenBalance);
                }
            }
        }
    }

    /**
     * @dev add Avax Pair Liquidity
     * Converts token0 and Avax into LP token on TJ
     * @param _pair1Token {address} - Pair 1 Token Address
     * @param _pair2Token {address} - Pari 2 Token Address (Mostly AVAX)
     * @param _routerAddr {address} - Trader Joe Router Address
     * @param _avaxAddr {address} - ERC20 WAVAX Address
     * @param _avaxAmount {uint256} - Amount of Avax to convert to LP token
     * @param _slippage {uint256} - slippage set btwn 0-100
     */
    function addAvaxPairLiquidity(
        address _pair1Token,
        address _pair2Token,
        address _routerAddr,
        address _avaxAddr,
        uint256 _avaxAmount,
        uint256 _slippage
    ) public payable {
        checkAllowance(_pair1Token, _routerAddr);
        checkAllowance(_avaxAddr, _routerAddr);
        uint256 pair1Amount = IERC20(_pair1Token).balanceOf(address(this));
        if (
            getSlippage(pair1Amount, _slippage) > 0 &&
            getSlippage(_avaxAmount, _slippage) > 0
        ) {
            IJoeRouter(_routerAddr).addLiquidityAVAX{value: _avaxAmount}(
                _pair1Token,
                pair1Amount,
                getSlippage(pair1Amount, _slippage),
                getSlippage(_avaxAmount, _slippage),
                address(this),
                block.timestamp + 3600
            );
        }
    }

    /**
     * @dev add Avax Pair Liquidity Amount
     * Converts token0 and Avax into LP token on TJ
     * @param _pair1Token {address} - Pair 1 Token Address
     * @param _pair2Token {address} - Pari 2 Token Address (Mostly AVAX)
     * @param _routerAddr {address} - Trader Joe Router Address
     * @param _avaxAddr {address} - ERC20 WAVAX Address
     * @param _avaxAmount {uint256} - Amount of Avax to convert to LP token
     * @param _slippage {uint256} - slippage set btwn 0-100
     * @param _token0Amount {uint256} - Includes an amount for token0
     * NOTE: Used to fix the JOE/AVAX pool dilemma where reward == targetToken[0]
     */
    function addAvaxPairLiquidityAmount(
        address _pair1Token,
        address _pair2Token,
        address _routerAddr,
        address _avaxAddr,
        uint256 _avaxAmount,
        uint256 _slippage,
        uint256 _token0Amount
    ) public payable {
        checkAllowance(_pair1Token, _routerAddr);
        checkAllowance(_avaxAddr, _routerAddr);
        if (
            getSlippage(_token0Amount, _slippage) > 0 &&
            getSlippage(_avaxAmount, _slippage) > 0
        ) {
            IJoeRouter(_routerAddr).addLiquidityAVAX{value: _avaxAmount}(
                _pair1Token,
                _token0Amount,
                getSlippage(_token0Amount, _slippage),
                getSlippage(_avaxAmount, _slippage),
                address(this),
                block.timestamp + 3600
            );
        }
    }

    /**
     * @dev Get Slippage
     * @param _amount {uint256} - Amount in token respective decimal system
     * @param _slippage {uint256} - Integer to be discounted, 95 == .95
     * @return uint256 a discounted version of intial amount
     */
    function getSlippage(uint256 _amount, uint256 _slippage)
        internal
        pure
        returns (uint256)
    {
        return ((((_amount * 100) / 100) * _slippage) / 100);
    }

    /**
     * @dev getExchangeRate
     * returns an exchang rate from swap helper on specified token
     * @param _amountIn {uint256} - Amount of token planning to sell
     * @param _routerAddr {address} - Trader Joe Router Address
     * @param _tokenPath {address[]} - containing all addresses involved in swap
     * @return uint256[] 0 index contains sell token, 1 index avax or sell token
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
     * @dev Deposit for Avax LP
     * @param _lpAmount {uint256} - lp token qty
     * @param _lpAddress {address} - lp token address
     * @param _spender {address} - spender moving funds to Vector
     * @param _investmentAddress {address} - vector staking contract
     */
    function depositLPNative(
        uint256 _lpAmount,
        address _lpAddress,
        address _spender,
        address _investmentAddress
    ) public payable {
        require(_lpAmount > 0, "LP Amount is Equal to Zero.");
        checkAllowance(_lpAddress, _spender);
        IVector(_investmentAddress).deposit(_lpAmount);
    }

    /**
     * @dev Check Allowance
     * @param _tokenAddress {address} - address needing approval
     * @param _spender {address} - address receiving permission
     * @notice Checks to make sure contract has extended permissions to other contracts
     */
    function checkAllowance(address _tokenAddress, address _spender) internal {
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

    fallback() external payable {}

    receive() external payable {}
}
