// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {TokenSaleRefundERC20} from "../src/TokenSaleRefund.sol";

/**
 * @dev Foundry test contract for TokenSaleRefundERC20.
 * Goal: Achieve 100% line, branch, and function coverage.
 */
contract TokenSaleRefundERC20Test is Test {
    TokenSaleRefundERC20 internal tokenSale;

    // Test addresses.
    address internal owner = address(11);
    address internal alice = address(12);
    address internal bob   = address(13);

    // Helper constants.
    uint256 internal constant INIT_ETH = 100 ether;
    uint256 internal constant TOKENS_PER_ETH = 1000 ether; // 1 ETH = 1000 tokens.
    uint256 internal constant SELL_RATE_WEI_PER_TOKEN = 5e14; // 0.0005 ETH per token.

    function setUp() public {
        vm.label(owner, "Owner");
        vm.label(alice, "Alice");
        vm.label(bob, "Bob");

        vm.prank(owner);
        tokenSale = new TokenSaleRefundERC20();

        vm.deal(alice, INIT_ETH);
        vm.deal(bob, INIT_ETH);
    }

    // --- buyTokens() Tests ---

    function testBuyTokensWithReceiveFallback() public {
        uint256 buyAmount = 1 ether;
        vm.prank(alice);
        (bool success, ) = address(tokenSale).call{value: buyAmount}("");
        assertTrue(success, "Fallback call failed");

        uint256 aliceBalance = tokenSale.balanceOf(alice);
        assertEq(aliceBalance, TOKENS_PER_ETH, "Alice should have 1000 tokens");
    }

    function testBuyTokensDirectFunctionCall() public {
        uint256 buyAmount = 2 ether;
        vm.prank(alice);
        tokenSale.buyTokens{value: buyAmount}();
        uint256 aliceBalance = tokenSale.balanceOf(alice);
        assertEq(aliceBalance, 2 * TOKENS_PER_ETH, "Alice should have 2000 tokens");
    }

    function testBuyTokensNoEtherSent() public {
        vm.prank(alice);
        vm.expectRevert(TokenSaleRefundERC20.NoEtherSent.selector);
        tokenSale.buyTokens{value: 0}();
    }

    function testBuyTokensBelowMinimum() public {
        // Expect revert if msg.value < 1 ETH.
        vm.prank(alice);
        vm.expectRevert(TokenSaleRefundERC20.InsufficientEtherSent.selector);
        tokenSale.buyTokens{value: 1 wei}();
    }

    function testBuyTokensContractHasTokens() public {
        // Simulate a prior sellBack: Alice buys 10,000 tokens and sells them back.
        vm.prank(alice);
        tokenSale.buyTokens{value: 10 ether}();

        vm.prank(alice);
        tokenSale.approve(address(tokenSale), 10_000 ether);
        vm.prank(alice);
        tokenSale.sellBack(10_000 ether);

        uint256 contractBalBefore = tokenSale.balanceOf(address(tokenSale));
        assertEq(contractBalBefore, 10_000 ether, "Contract should have 10,000 tokens");

        // Bob buys tokens; contract's stored tokens are used.
        vm.prank(bob);
        tokenSale.buyTokens{value: 12 ether}();

        uint256 bobBalance = tokenSale.balanceOf(bob);
        assertEq(bobBalance, 12_000 ether, "Bob should have 12,000 tokens");

        uint256 contractBalAfter = tokenSale.balanceOf(address(tokenSale));
        assertEq(contractBalAfter, 0, "Contract should have 0 tokens left");
    }

    function testBuyTokensUsesStoredTokensFully() public {
        // Scenario: Contract holds tokens that partially cover the purchase.
        // 1) Alice buys 10 ETH worth of tokens (10,000 tokens).
        vm.prank(alice);
        tokenSale.buyTokens{value: 10 ether}();
        // 2) Alice sells back all her tokens; contract now holds 10,000 tokens.
        vm.prank(alice);
        tokenSale.approve(address(tokenSale), 10_000 ether);
        vm.prank(alice);
        tokenSale.sellBack(10_000 ether);

        // 3) Bob now buys 5 ETH worth of tokens.
        vm.prank(bob);
        tokenSale.buyTokens{value: 5 ether}();

        uint256 bobBalance = tokenSale.balanceOf(bob);
        assertEq(bobBalance, 5000 ether, "Bob should have 5000 tokens from stored tokens");

        // Contract should have 10,000 - 5000 = 5000 tokens left.
        uint256 contractBal = tokenSale.balanceOf(address(tokenSale));
        assertEq(contractBal, 5000 ether, "Contract should have 5000 tokens remaining");
    }

    function testBuyTokensFullyCoveredByStoredTokens() public {
        // New test: Purchase is fully covered by stored tokens.
        // 1) Alice buys 5 ETH worth of tokens (5000 tokens).
        vm.prank(alice);
        tokenSale.buyTokens{value: 5 ether}();
        // 2) Alice sells back her tokens; contract now holds exactly 5000 tokens.
        vm.prank(alice);
        tokenSale.approve(address(tokenSale), 5000 ether);
        vm.prank(alice);
        tokenSale.sellBack(5000 ether);
        
        uint256 storedTokens = tokenSale.balanceOf(address(tokenSale));
        assertEq(storedTokens, 5000 ether, "Contract should have 5000 tokens stored");

        // 3) Bob buys exactly 5 ETH worth of tokens (5000 tokens).
        vm.prank(bob);
        tokenSale.buyTokens{value: 5 ether}();

        uint256 bobBalance = tokenSale.balanceOf(bob);
        assertEq(bobBalance, 5000 ether, "Bob should have 5000 tokens");

        // The contract's stored tokens should be fully used (zero remaining).
        uint256 contractBalance = tokenSale.balanceOf(address(tokenSale));
        assertEq(contractBalance, 0, "Contract should have 0 tokens left");
    }

    function testBuyTokensExceedsMaxSupply() public {
        vm.deal(alice, 2000 ether);

        // First buy: 999.999 ETH => 999,999 tokens.
        vm.prank(alice);
        tokenSale.buyTokens{value: 999.999 ether}();

        // Second buy: 2 ETH => 2000 tokens.
        // That would push total supply to 999,999 + 2000 = 1,001,999 tokens,
        // which exceeds MAX_SUPPLY.
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                TokenSaleRefundERC20.ExceedsMaxSupply.selector,
                tokenSale.totalSupply(), // expected 999,999 tokens
                2000 ether,              // attempted mint = 2000 tokens
                tokenSale.MAX_SUPPLY()   // 1,000,000 tokens
            )
        );
        tokenSale.buyTokens{value: 2 ether}();
    }

    function testBuyTokensExactlyMaxSupply() public {
        // Buy exactly 1,000,000 tokens using 1000 ETH.
        vm.deal(alice, 2000 ether);
        vm.prank(alice);
        tokenSale.buyTokens{value: 1000 ether}();

        assertEq(tokenSale.totalSupply(), 1_000_000 ether, "Should reach max supply exactly");

        // Next, attempt to buy additional tokens; should revert.
        // For 100 ETH, expected tokensToBuy = 100,000 tokens.
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                TokenSaleRefundERC20.ExceedsMaxSupply.selector,
                1_000_000 ether,  // current supply
                100000 ether,     // attempted mint (100,000 tokens)
                tokenSale.MAX_SUPPLY()
            )
        );
        tokenSale.buyTokens{value: 100 ether}();
    }

    // --- Test to Cover Self-Buy Revert Branch ---
    function testContractSelfBuyExceedsMaxSupply() public {
        // Deploy a fresh instance of the contract to isolate this test.
        TokenSaleRefundERC20 freshTokenSale = new TokenSaleRefundERC20();

        // Set a target total supply = MAX_SUPPLY - 1000 tokens.
        uint256 target = freshTokenSale.MAX_SUPPLY() - 1000 ether; // 1e24 - 1000 ether = 999000 tokens.
        // Calculate required ETH to mint exactly 'target' tokens:
        uint256 requiredEth = (target / TOKENS_PER_ETH) * 1 ether; // 999 ether.
        
        vm.deal(alice, requiredEth + 1 ether);
        vm.prank(alice);
        freshTokenSale.buyTokens{value: requiredEth}();
        assertEq(freshTokenSale.totalSupply(), target, "Total supply should be target");

        // Now have the contract (self-buy) attempt to buy tokens.
        // We set the contract's balance to 2.1 ETH.
        vm.deal(address(freshTokenSale), 2.1 ether);
        vm.prank(address(freshTokenSale));
        vm.expectRevert(
            abi.encodeWithSelector(
                TokenSaleRefundERC20.ExceedsMaxSupply.selector,
                freshTokenSale.totalSupply(), // expected: target (999000 tokens)
                2100 ether,                   // attempted mint = 2.1 ETH * 1000 = 2100 tokens.
                freshTokenSale.MAX_SUPPLY()   // 1,000,000 tokens.
            )
        );
        freshTokenSale.buyTokens{value: 2.1 ether}();
    }

    // --- sellBack() Tests ---

    function testSellBackHappyPath() public {
        // Alice buys 1000 tokens for 1 ETH.
        vm.prank(alice);
        tokenSale.buyTokens{value: 1 ether}();
        assertEq(tokenSale.balanceOf(alice), 1000 ether, "Alice should have 1000 tokens");

        // Contract holds 1 ETH.
        assertEq(address(tokenSale).balance, 1 ether, "Contract should have 1 ETH");

        uint256 toSell = 1000 ether;
        vm.prank(alice);
        tokenSale.approve(address(tokenSale), 0);
        assertEq(tokenSale.allowance(alice, address(tokenSale)), 0);

        address tokenContract = address(tokenSale);
        vm.prank(alice);
        tokenSale.approve(tokenContract, toSell);
        assertEq(tokenSale.allowance(alice, tokenContract), toSell, "Approval failed");

        // sellBack(0) should revert.
        vm.prank(alice);
        vm.expectRevert(bytes("Sell amount must be > 0"));
        tokenSale.sellBack(0);

        // Alice sells back her 1000 tokens.
        uint256 aliceEthBefore = alice.balance;
        vm.prank(alice);
        tokenSale.sellBack(toSell);

        uint256 aliceEthAfter = alice.balance;
        assertEq(aliceEthAfter, aliceEthBefore + 0.5 ether, "Alice should receive 0.5 ETH");

        // After sellBack, contract should hold 0.5 ETH and 1000 tokens.
        assertEq(address(tokenContract).balance, 0.5 ether, "Contract should have 0.5 ETH");
        assertEq(tokenSale.balanceOf(tokenContract), 1000 ether, "Contract should have 1000 tokens");
    }

    function testSellBackNotEnoughEthInContract() public {
        // Alice buys 1000 tokens.
        vm.prank(alice);
        tokenSale.buyTokens{value: 1 ether}();

        // Withdraw all ETH from the contract.
        vm.prank(owner);
        tokenSale.withdrawETH();

        // Approve and attempt to sell back.
        vm.prank(alice);
        tokenSale.approve(address(tokenSale), 1000 ether);

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                TokenSaleRefundERC20.NotEnoughEthInContract.selector,
                0,
                0.5 ether
            )
        );
        tokenSale.sellBack(1000 ether);
    }

    function testSellBackIncorrectAllowance() public {
        // Alice buys 1000 tokens.
        vm.prank(alice);
        tokenSale.buyTokens{value: 1 ether}();
        // Do not approve tokens, so allowance remains 0.
        vm.prank(alice);
        vm.expectRevert(bytes("Incorrect allowance"));
        tokenSale.sellBack(1000 ether);
    }

    function testSellBackCallFailure() public {
        // Deploy a malicious contract that reverts on receiving ETH.
        RevertFallback newUser = new RevertFallback();
        vm.deal(address(newUser), 2 ether);

        // newUser buys tokens via fallback.
        vm.prank(address(newUser));
        (bool success, ) = address(tokenSale).call{value: 1 ether}("");
        assertTrue(success, "Buy tokens call failed");

        uint256 newUserBal = tokenSale.balanceOf(address(newUser));
        assertGt(newUserBal, 0, "newUser should have > 0 tokens");

        vm.prank(address(newUser));
        tokenSale.approve(address(tokenSale), newUserBal);

        // newUser attempts to sell back tokens; ETH transfer will revert.
        vm.prank(address(newUser));
        vm.expectRevert(bytes("ETH transfer failed"));
        tokenSale.sellBack(newUserBal);
    }

    // --- withdrawETH() Tests ---

    function testWithdrawETH() public {
        vm.prank(alice);
        tokenSale.buyTokens{value: 5 ether}();
        assertEq(address(tokenSale).balance, 5 ether, "Contract should have 5 ETH");

        uint256 ownerEthBefore = owner.balance;
        vm.prank(owner);
        tokenSale.withdrawETH();
        uint256 ownerEthAfter = owner.balance;
        assertEq(ownerEthAfter, ownerEthBefore + 5 ether, "Owner should receive 5 ETH");
        assertEq(address(tokenSale).balance, 0, "Contract should have 0 ETH");
    }

    function testWithdrawETHCallFailure() public {
        RevertFallback newOwnerContract = new RevertFallback();
        vm.prank(owner);
        tokenSale.transferOwnership(address(newOwnerContract));

        vm.prank(alice);
        tokenSale.buyTokens{value: 1 ether}();

        vm.prank(address(newOwnerContract));
        vm.expectRevert(TokenSaleRefundERC20.WithdrawFailed.selector);
        tokenSale.withdrawETH();
    }

    // --- Additional Test to Cover Self-Buy Success Branch ---
    function testContractSelfBuy() public {
        // Give the contract some ETH so it can call itself.
        vm.deal(address(tokenSale), 2 ether);

        vm.prank(address(tokenSale));
        (bool success, ) = address(tokenSale).call{value: 2 ether}("");
        assertTrue(success, "Contract self-call fallback failed");

        // tokensToBuy = (2 ETH * 1000) / 1 = 2000 tokens.
        uint256 contractTokenBal = tokenSale.balanceOf(address(tokenSale));
        assertEq(contractTokenBal, 2000 ether, "Contract should have minted 2000 tokens to itself");

        uint256 supply = tokenSale.totalSupply();
        assertEq(supply, 2000 ether, "Total supply should be 2000 after self-buy");
    }

    function testSellBackPartialAllowanceReduction() public {
        // Alice buys 1 ETH worth of tokens = 1000 tokens.
        vm.prank(alice);
        tokenSale.buyTokens{value: 1 ether}();
        assertEq(tokenSale.balanceOf(alice), 1000 ether, "Alice should have 1000 tokens");
        
        // Instead of approving exactly 1000 tokens, approve 2000 tokens.
        vm.prank(alice);
        tokenSale.approve(address(tokenSale), 2000 ether);
        assertEq(tokenSale.allowance(alice, address(tokenSale)), 2000 ether, "Approval should be 2000 tokens");
        
        // Call sellBack with 1000 tokens.
        uint256 aliceEthBefore = alice.balance;
        vm.prank(alice);
        tokenSale.sellBack(1000 ether);
        
        // After selling back 1000 tokens, Alice should receive 0.5 ETH.
        uint256 aliceEthAfter = alice.balance;
        assertEq(aliceEthAfter, aliceEthBefore + 0.5 ether, "Alice should receive 0.5 ETH");
        
        // The remaining allowance should now be 2000 - 1000 = 1000 tokens.
        uint256 remainingAllowance = tokenSale.allowance(alice, address(tokenSale));
        assertEq(remainingAllowance, 1000 ether, "Remaining allowance should be 1000 tokens");
    }

    function testContractSelfBuyExceedsMaxSupply_StringRevert() public {
        // Deploy a fresh instance to isolate the test.
        TokenSaleRefundERC20 freshTokenSale = new TokenSaleRefundERC20();
        
        // Set a target total supply = MAX_SUPPLY - 1000 tokens.
        uint256 target = freshTokenSale.MAX_SUPPLY() - 1000 ether; // e.g. 1e24 - 1000 tokens
        // Calculate the required ETH to mint exactly 'target' tokens:
        // (target / TOKENS_PER_ETH_PRICE) yields the number of ETH needed.
        uint256 requiredEth = (target / freshTokenSale.TOKENS_PER_ETH_PRICE()) * 1 ether; // e.g. 999 ether.
        
        // Fund Alice so she can mint the target amount.
        vm.deal(alice, requiredEth + 1 ether);  
        vm.prank(alice);
        freshTokenSale.buyTokens{value: requiredEth}();
        assertEq(freshTokenSale.totalSupply(), target, "Total supply should be target");

        // Now simulate a self-buy (contract calling itself) that would mint 2100 tokens:
        // 2.1 ETH * 1000 tokens/ETH = 2100 tokens, which would exceed MAX_SUPPLY.
        vm.deal(address(freshTokenSale), 2.1 ether);
        vm.prank(address(freshTokenSale));
        // Expect the self-buy to revert with the string "Exceeds max supply"
        vm.expectRevert(bytes("Exceeds max supply"));
        freshTokenSale.buyTokens{value: 2.1 ether}();
    }


}

/**
 * @dev Helper contract that reverts on receiving ETH.
 * Used to simulate failure scenarios for sellBack() and withdrawETH().
 */
contract RevertFallback {
    receive() external payable {
        revert("I always fail");
    }
}
