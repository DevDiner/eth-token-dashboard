// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {TokenSaleRefundERC20} from "../src/TokenSaleRefund.sol";

/**
 * @dev Foundry script to deploy TokenSaleRefund
 *      Run with: forge script script/Deploy.s.sol:Deploy --broadcast --rpc-url <YOUR_RPC>
 */
contract Deploy is Script {
    function run() external {
        // Start broadcasting transactions
        vm.startBroadcast();

        // Deploy the contract
        TokenSaleRefundERC20 tokenSale = new TokenSaleRefundERC20();

        // Optionally, log the address
        console.log("TokenSaleRefund deployed at:", address(tokenSale));

        vm.stopBroadcast();
    }
}
