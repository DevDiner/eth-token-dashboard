// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TokenSaleRefundERC20
 * @dev ERC20 token contract that allows users to buy tokens with ETH and sell them back for a partial refund.
 * - Users can buy tokens at a fixed rate of `1 ETH = 1000 tokens`
 * - Users can sell tokens back for `0.5 ETH per 1000 tokens`
 * - Contract has a fixed max supply of 1,000,000 tokens
 * - Unsold tokens are stored in the contract for reuse before minting new tokens
 */
contract TokenSaleRefundERC20 is ERC20, Ownable {
    /// @dev Maximum supply of tokens (1,000,000 tokens with 18 decimals).
    uint256 public constant MAX_SUPPLY = 1000000 ether;

    /// @dev Rate at which tokens are bought (1 ETH = 1000 tokens).
    uint256 public constant TOKENS_PER_ETH_PRICE = 1000 ether;

    /// @dev Rate at which tokens are sold back (0.5 ETH per 1000 tokens).
    uint256 public constant WEI_PER_TOKEN_SELL = 5e14; // 0.0005 ETH per token in wei

    /// @dev Custom errors to save gas when reverting.
    error NoEtherSent();
    error ExceedsMaxSupply(uint256 currentSupply, uint256 attemptedMint, uint256 maxSupply);
    error NotEnoughEthInContract(uint256 contractBalance, uint256 required);
    error WithdrawFailed();
    error InsufficientEtherSent();

    /// @dev Debugging events for checking allowances and balances.
    event DebugAllowance(address indexed user, uint256 allowance);
    event DebugBalance(address indexed user, uint256 balance);

    /**
     * @dev Contract constructor initializes the token with a name and symbol.
     * The deployer is set as the owner.
     */
    constructor() ERC20("RefundableSaleToken", "RFT") Ownable(msg.sender) {}

    /**
     * @dev Allows users to buy tokens by sending ETH directly to the contract.
     * This function acts as a fallback to call `buyTokens()`.
     */
    receive() external payable {
        buyTokens();
    }

    /**
     * @dev Allows users to buy tokens at a fixed rate.
     * If the contract has tokens, it transfers them before minting new ones.
     * The function ensures that the total supply does not exceed `MAX_SUPPLY`.
     *
     * Requirements:
     * - The user must send a nonzero amount of ETH.
     * - The contract must have tokens available or be able to mint new ones.
     */
    function buyTokens() public payable {
        if (msg.value <= 0) revert NoEtherSent();
        if (msg.value < 1 ether) revert InsufficientEtherSent();

        uint256 tokensToBuy = (msg.value * TOKENS_PER_ETH_PRICE ) / 1 ether;
        
        if (msg.sender == address(this)) {
            // If contract is buying tokens, store them in the contract itself
            require(totalSupply() + tokensToBuy <= MAX_SUPPLY, "Exceeds max supply");
            _mint(address(this), tokensToBuy);
        } else {
            uint256 contractTokenBalance = balanceOf(address(this));

            if (contractTokenBalance > 0) {
                uint256 tokensToTransfer = tokensToBuy > contractTokenBalance ? contractTokenBalance : tokensToBuy;
                _transfer(address(this), msg.sender, tokensToTransfer);
                tokensToBuy -= tokensToTransfer;
            }

            if (tokensToBuy > 0) {
                if (totalSupply() + tokensToBuy > MAX_SUPPLY) {
                    revert ExceedsMaxSupply(totalSupply(), tokensToBuy, MAX_SUPPLY);
                }
                _mint(msg.sender, tokensToBuy);
            }
        }
    }


    /**
     * @dev Allows users to sell back their tokens in exchange for ETH.
     * The ETH amount is calculated based on `WEI_PER_TOKEN_SELL`.
     *
     * Requirements:
     * - The user must specify a nonzero amount of tokens.
     * - The contract must have enough ETH to process the refund.
     * - The user must have approved the contract to spend their tokens.
     */
    function sellBack(uint256 amount) external {
        require(amount > 0, "Sell amount must be > 0");

        // Calculate ETH payout
        uint256 ethToPay = (amount * WEI_PER_TOKEN_SELL) / 1 ether;
        if (address(this).balance < ethToPay) {
            revert NotEnoughEthInContract(address(this).balance, ethToPay);
        }

        // Ensure the contract has approval to spend the tokens
        require(allowance(msg.sender, address(this)) >= amount, "Incorrect allowance");

        // Emit debugging events before performing transfer
        emit DebugAllowance(msg.sender, allowance(msg.sender, address(this)));
        emit DebugBalance(msg.sender, balanceOf(msg.sender));

        // Transfer tokens from the user to the contract
        _transfer(msg.sender, address(this), amount);

        // Reduce the allowance used
        _approve(msg.sender, address(this), allowance(msg.sender, address(this)) - amount);

        // Send ETH to the user
        (bool success, ) = msg.sender.call{value: ethToPay}("");
        require(success, "ETH transfer failed");
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
