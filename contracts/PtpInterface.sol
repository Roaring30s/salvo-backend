pragma solidity 0.8.0;

// SPDX-License-Identifier: MIT
interface VectorSingle {
    function balance(address _address) external view returns (uint256);

    function deposit(uint256 amount) external;

    function withdraw(uint256 amount, uint256 minAmount) external;
}
