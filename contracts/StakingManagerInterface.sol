pragma solidity 0.8.0;

// SPDX-License-Identifier: MIT
interface IStakingManager {
    function bankCut() external view returns (uint256);

    function poolStakers(uint256 _poolId, address _wallet)
        external
        view
        returns (
            uint256,
            uint256,
            uint256
        );

    function pendingRewards(uint256 _poolId, address _stakerAddress)
        external
        view
        returns (uint256);

    function pools(uint256 _poolId)
        external
        view
        returns (
            address,
            uint256,
            uint256
        );

    function deposit(
        uint256 _poolId,
        uint256 _amount,
        uint256 _rewards
    ) external;

    function withdraw(
        uint256 _poolId,
        uint256 _withdrawal,
        uint256 _rewards
    ) external;

    function ownerUpdatePoolRewards(uint256 _poolId, uint256 _rewards) external;
}
