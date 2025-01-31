// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ERC20Sanctions
 * @dev A basic ERC20 token that allows the owner to blacklist addresses,
 *      preventing them from sending or receiving tokens.
 */
contract ERC20Sanctions is ERC20, Ownable {
    // Mapping of blacklisted addresses => true if sanctioned
    mapping(address => bool) private blacklisted;

    constructor() ERC20("SanctionedToken", "SNT") Ownable(msg.sender) {}

    /**
     * @dev Add `account` to the blacklist. Only the owner can call this.
     */
    function addToBlacklist(address account) external onlyOwner {
        blacklisted[account] = true;
    }

    /**
     * @dev Remove `account` from the blacklist. Only the owner can call this.
     */
    function removeFromBlacklist(address account) external onlyOwner {
        blacklisted[account] = false;
    }

    /**
     * @dev Check if an address is blacklisted.
     */
    function isBlacklisted(address account) external view returns (bool) {
        return blacklisted[account];
    }

    function _update(address from, address to, uint256 value)
        internal
        override
    {
        // If minting, `from` = zero address => skip check
        if (from != address(0)) {
            require(!blacklisted[from], "Sender is blacklisted");
        }
        // If burning, `to` = zero address => skip check
        if (to != address(0)) {
            require(!blacklisted[to], "Recipient is blacklisted");
        }

        // Proceed with normal transfer/mint/burn logic
        super._update(from, to, value);
    }
}
