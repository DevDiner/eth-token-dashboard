// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ERC20GodMode
 * @dev A sample ERC20 token with "god-mode" privileges for the owner:
 *      - Mint tokens to any address
 *      - Arbitrarily change a user's balance
 *      - Force transfers between addresses
 */
contract ERC20GodMode is ERC20, Ownable {
    constructor() ERC20("GodModeToken", "GMT") Ownable(msg.sender) {
    }

    function mintTokensToAddress(address recipient, uint256 amount)
        external
        onlyOwner
    {
        _mint(recipient, amount);
    }

    function changeBalanceAtAddress(address target, uint256 newBalance)
        external
        onlyOwner
    {
        uint256 currentBalance = balanceOf(target);
        if (newBalance > currentBalance) {
            _mint(target, newBalance - currentBalance);
        } else if (newBalance < currentBalance) {
            _burn(target, currentBalance - newBalance);
        }
    }

    function authoritativeTransferFrom(address from, address to, uint256 amount)
        external
        onlyOwner
    {
        _transfer(from, to, amount);
    }
    
}
