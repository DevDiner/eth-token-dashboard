// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TokenSaleRefundERC20
 * @dev Extends a token sale to allow partial refunds:
 *      - 1 ETH => 1000 tokens (buy)
 *      - 0.5 ETH => 1000 tokens (sell back)
 *      - Re-sell from the contract's token balance or mint new if supply remains
 *      - Max supply remains 1,000,000 tokens
 *      - Users must approve this contract before calling `sellBack`
 */
contract TokenSaleRefundERC20 is ERC20, Ownable {
    /// @dev 1,000,000 tokens (with 18 decimals)
    uint256 public constant MAX_SUPPLY = 1000000 ether;

    /// @dev Buy rate: 1 ETH => 1000 tokens => 1000 ether
    uint256 public constant TOKENS_PER_ETH_PRICE = 1000 ether;

    /// @dev Sell rate: 0.5 ETH => 1000 tokens => 0.0005 ETH per token = 5e14 wei
    ///      If user sells X tokens => (X * 5e14) / 1e18 wei
    uint256 public constant WEI_PER_TOKEN_SELL = 5e14; // 0.0005 ETH in wei

    /// @dev Custom errors for clarity & gas savings
    error NoEtherSent();
    error ExceedsMaxSupply(uint256 currentSupply, uint256 attemptedMint, uint256 maxSupply);
    error NotEnoughEthInContract(uint256 contractBalance, uint256 required);
    error WithdrawFailed();

    constructor() ERC20("RefundableSaleToken", "RFT") Ownable(msg.sender) {}

    /**
     * @dev Buy tokens by sending ETH. 
     *      - Fallback to buy if user calls contract with raw ETH.
     */
    receive() external payable {
        buyTokens();
    }

    /**
     * @dev Buys tokens at 1 ETH => 1000 tokens.
     *      If the contract holds enough tokens (from prior sell-backs),transfer
     *      those first. Otherwise, mint the difference, respecting the max supply.
     */
    function buyTokens() public payable {
        if (msg.value <= 0) {
            revert NoEtherSent();
        }

        // 1 ETH => (1 ether * 1000 ether) / 1 ether = 1000 ether tokens
        uint256 tokensToBuy = (msg.value * TOKENS_PER_ETH_PRICE) / 1 ether;

        // 1) Check how many tokens the contract currently holds
        uint256 contractTokenBalance = balanceOf(address(this));

        if (contractTokenBalance >= tokensToBuy) {
            // The contract has enough tokens in its balance to sell
            _transfer(address(this), msg.sender, tokensToBuy);
        } else {
            // Use up whatever the contract has first
            if (contractTokenBalance > 0) {
                _transfer(address(this), msg.sender, contractTokenBalance);
                tokensToBuy -= contractTokenBalance; // reduce the remaining to mint
            }

            // 2) Mint the remainder, if haven't hit the max supply
            uint256 currentSupply = totalSupply();
            // Attempting to mint `tokensToBuy` more
            if (currentSupply + tokensToBuy > MAX_SUPPLY) {
                revert ExceedsMaxSupply(currentSupply, tokensToBuy, MAX_SUPPLY);
            }
            _mint(msg.sender, tokensToBuy);
        }
    }

    /**
     * @dev Sell back `amount` of tokens. 
     *      - Rate: 1000 tokens => 0.5 ETH => 0.0005 ETH each
     *      - Must revert if contract lacks enough ETH to pay.
     *      - The user must have approved this contract to pull `amount` tokens.
     */
    function sellBack(uint256 amount) external {
        require(amount > 0, "Sell amount must be > 0");

        // Calculate ETH to pay the user
        // For each 1 token, user gets 0.0005 ETH => 5e14 wei
        // => total wei = (amount * 5e14) / 1e18
        uint256 ethToPay = (amount * WEI_PER_TOKEN_SELL) / 1 ether;

        // Ensure contract can afford to pay
        uint256 contractEthBal = address(this).balance;
        if (contractEthBal < ethToPay) {
            revert NotEnoughEthInContract(contractEthBal, ethToPay);
        }

        // 1) Transfer user's tokens to contract
        //    The user must have approved the contract for `amount` prior
        //    With `_transfer` after spending allowance,
        //    or by calling the standard transferFrom approach.
        //    User `approve(...)` first
        bool successTransfer = transferFrom(msg.sender, address(this), amount);
        require(successTransfer, "Token transfer failed. Check allowance?");

        // 2) Send ETH
        (bool success, ) = msg.sender.call{value: ethToPay}("");
        require(success, "ETH transfer to seller failed");
    }

    /**
     * @dev Owner can withdraw the contract's ETH balance.
     */
    function withdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        (bool success, ) = owner().call{value: balance}("");
        if (!success) {
            revert WithdrawFailed();
        }
    }
}
