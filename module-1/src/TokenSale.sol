// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TokenSaleERC20
 * @dev A token sale contract where users can buy tokens:
 *      - 1 ETH => 1000 tokens
 *      - Total supply capped at 1,000,000 tokens
 *      - 18 decimals by default
 *      - Owner can withdraw ETH from the contract
 *      - Uses custom errors instead of string-based revert reasons
 */
contract TokenSale is ERC20, Ownable {
    // 1,000,000 tokens with 18 decimals
    uint256 public constant MAX_SUPPLY = 1000000 ether;

    // 1 ETH => 1000 tokens => 1000 ether
    uint256 public constant TOKENS_PER_ETH = 1000 ether;

    // @dev Thrown when minting would exceed the max supply.
    error ExceedsMaxSupply(uint256 currentSupply, uint256 requested, uint256 maxSupply);

    // @dev Thrown when buying tokens with zero ETH.
    error NoEtherSent();

    // @dev Thrown if the contract fails to send ETH to the owner.
    error WithdrawFailed();

    constructor() ERC20("SaleToken", "SLT") Ownable(msg.sender) {}

    /**
     * @dev Fallback to buy tokens on receiving ETH
     */
    receive() external payable {
        buyTokens();
    }

    /**
     * @dev Buys tokens with the ETH sent in the transaction.
     *      - 1 ETH => 1000 tokens
     *      - If user sends x ETH, they get x * 1000 tokens
     */
    function buyTokens() public payable {
        if (msg.value == 0) {
            revert NoEtherSent();
        }

        // For 1 ETH, minted tokens = (1 ether * 1000 ether) / 1 ether = 1000 ether
        uint256 tokensToMint = (msg.value * TOKENS_PER_ETH) / 1 ether;

        uint256 newTotal = totalSupply() + tokensToMint;
        if (newTotal > MAX_SUPPLY) {
            revert ExceedsMaxSupply(totalSupply(), tokensToMint, MAX_SUPPLY);
        }

        _mint(msg.sender, tokensToMint);
    }

    // @dev Owner can withdraw the contract's ETH balance.
    function withdrawETH() external onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        if (!success) {
            revert WithdrawFailed();
        }
    }
}
