pragma solidity 0.8.0;

// SPDX-License-Identifier: MIT
interface IVector {
    function deposit(uint256 _amount) external;

    function balanceOf(address _address) external view returns (uint256);

    function withdraw(uint256 amount) external;

    function multiclaim(address[] calldata _lps, address user_address) external;
}
