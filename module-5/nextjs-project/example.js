import { ethers } from "ethers";

(async () => {
  // 1. Create Alchemy provider
  const provider = new ethers.AlchemyProvider(
    "mainnet",
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
  );

  // 2. Specify the block number or block hash
  const blockNumber = 22179345; // for example

  try {
    // 3. Fetch the entire block, including all transaction objects
    const block = await provider.getBlock(blockNumber, true);

    console.log("Full block data:", block);

    // block.transactions will be an array of transaction objects
    // (not just hashes) if you pass `true`.

    console.log("First transaction in this block:", block.transactions[0]);
  } catch (err) {
    console.error("Error fetching block:", err);
  }
})();
