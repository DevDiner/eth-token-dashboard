"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlchemyProvider, Contract, ethers, Log } from "ethers";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../context/ThemeContext";
import Chart from "../components/Chart";
import { defaultAbiCoder } from "@ethersproject/abi";
// import { tokenPocketWallet } from "@rainbow-me/rainbowkit/wallets";

// function sleep(ms: number) {
//   return new Promise((resolve) => setTimeout(resolve, ms));
// }
function formatString(
  weiValue: bigint,
  decimals: number = 18,
  fractionDigits: number = 4
): string {
  // 1) Convert the raw BigInt to a full decimal string
  const fullString = ethers.formatUnits(weiValue, decimals);
  // e.g. "547197819799999999999.9999999999"

  // 2) Split at the decimal point
  const [intPart, fractionPart = ""] = fullString.split(".");

  // 3) Truncate the fraction to `fractionDigits`
  const truncatedFrac = fractionPart.slice(0, fractionDigits);

  // 4) Reconstruct
  return truncatedFrac.length ? `${intPart}.${truncatedFrac}` : intPart; // no fractional part if fraction is empty
}

// declare global {
//   namespace NodeJS {
//     interface ProcessEnv {
//       NEXT_PUBLIC_ALCHEMY_API_KEY: string;
//     }
//   }
// }

interface MyBlock {
  number: number;
  timestamp: number;
  baseFeePerGas: bigint | null;
  gasUsed: bigint;
  gasLimit: bigint;
  //transactions: string[];
  tokenTransferCount: number;
  tokenTransferVolume: bigint;
  tokenAddress?: string;
}

interface DashboardStats {
  latestBlock: number;
  totalTransactions: number;
  avgGasPrice: number;
  avgGasUsage: number;
}

const Dashboard = () => {
  const { darkMode} = useTheme();  //Old implementation: const { darkMode, toggleDarkMode } = useTheme();


  // List of popular tokens
  const tokens = [
    { name: "DAI", address: "0x6B175474E89094C44Da98b954EedeAC495271d0F" },
    { name: "USDC", address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" },
    { name: "USDT", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7" },
    {
      name: "PYUSD (PayPal USD)",
      address: "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8",
    },
    { name: "WETH", address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" },
    { name: "WBTC", address: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599" },
  ];

  // State management
  const [alchemy, setAlchemy] = useState<AlchemyProvider | null>(null);
  const [blocks, setBlocks] = useState<MyBlock[]>([]);
  const [newBlockDetected, setNewBlockDetected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default to DAI (or pick whichever token you want as default)
  const [tokenAddress, setTokenAddress] = useState<string>(""); //tokens[1].address
  const [tokenName, setTokenName] = useState<string>("Loading Token...");
  const [tokenDecimals, setTokenDecimals] = useState<number>(18);

  // If have some massive cap to clamp Transfer logs
  // const MAX_SAFE_VALUE = BigInt("100000000000000000000000000000");

  // Persist selected token on page load.
  useEffect(() => {
    const storedToken = localStorage.getItem("selectedToken");
    if (storedToken) {
      setTokenAddress(storedToken);
    } else {
      // If no token is stored, default to the first token in the list.
      setTokenAddress(tokens[0].address);
    }
  }, []);

  // 4) Handler for the dropdown change
  // const handleTokenChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
  //   const newAddress = e.target.value;
  //   // Save to localStorage so we can restore it on next page load
  //   localStorage.setItem("selectedToken", newAddress);
  //   // Update state so your fetch code re-runs
  //   setTokenAddress(newAddress);
  // };
  // -------------------------------------------
  // (A) Fetch the ERC-20 token name whenever `tokenAddress` changes
  useEffect(() => {
    if (!alchemy || !tokenAddress) return;
    const erc20ABI = [
      "function name() view returns (string)",
      "function decimals() view returns (uint8)",
    ];

    (async function fetchTokenName() {
      try {
        const tokenContract = new Contract(tokenAddress, erc20ABI, alchemy);
        const [name, decimals] = await Promise.all([
          tokenContract.name(),
          tokenContract.decimals(),
        ]);
        setTokenName(name);
        setTokenDecimals(decimals);
      } catch (err) {
        console.error("Error fetching token name:", err);
        setTokenName("Unknown Token");
      }
    })();
  }, [alchemy, tokenAddress]);

  // -------------------------------------------
  // (B) Network Info Component
  const NetworkInfo = () => {
    const [networkName, setNetworkName] =
      useState<string>("Loading Network...");
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
      const fetchNetworkInfo = async () => {
        if (!alchemy) return;
        try {
          const network = await alchemy.getNetwork();
          setNetworkName(network.name);
          setIsConnected(true);
        } catch (error) {
          console.error("Error fetching network info:", error);
          setNetworkName("Unknown");
          setIsConnected(false);
        }
      };
      if (alchemy) {
        fetchNetworkInfo();
      }
    }, [alchemy]);

    // (Optional) Another effect to fetch token name in here if needed
    // useEffect(() => {
    //   async function fetchTokenName() {
    //     if (!alchemy) return;
    //     // const tokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
    //     const erc20ABI = ["function name() view returns (string)"];
    //     try {
    //       const tokenContract = new Contract(tokenAddress, erc20ABI, alchemy);
    //       const name = await tokenContract.name();
    //       setTokenName(name);
    //     } catch (err) {
    //       console.error("Error fetching token name:", err);
    //       setTokenName("DAI");
    //     }
    //   }
    //   fetchTokenName();
    // }, [alchemy]);

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={`
          mb-4 p-3 rounded-md
          w-full max-w-3xl mx-auto  
          ${
            darkMode
              ? "bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 text-gray-200"
              : "bg-white/90 backdrop-blur-sm border border-gray-200 text-gray-700 shadow-sm"
          }
        `}
      >
        <div className="flex items-center justify-between w-full">
          {/* Left side  */}
          <div className="flex items-center">
            <div
              className={`
                w-2 h-2 rounded-full mr-2
                ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}
              `}
            />
            <span className="font-medium mr-4">Network: {networkName}</span>
            {/* Right side */}
            <span className="font-medium"> Token: {tokenName}</span>
          </div>
        </div>
      </motion.div>
    );
  };

  // -------------------------------------------
  // (C) Initialize Alchemy
  useEffect(() => {
    const initAlchemy = async () => {
      try {
        const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
        if (!alchemyApiKey) {
          throw new Error("Alchemy API key is not configured");
        }
        const provider = new AlchemyProvider("mainnet", alchemyApiKey);
        setAlchemy(provider);
      } catch (err) {
        console.error("Failed to initialize Alchemy:", err);
        setError(
          "Failed to connect to Ethereum network. Please check your API configuration."
        );
        setIsLoading(false);
      }
    };
    initAlchemy();
  }, []);

  // -------------------------------------------
  // (D) Fetch Latest 10 Blocks
  // const fetchLatestBlocks = useCallback(async () => {
  //   console.log("Starting fetchLatestBlocks");
  //   if (!alchemy || !tokenAddress){
  //   console.log("Alchemy provider or tokenAddress is not available", { alchemy, tokenAddress });
  //   return;
  //   }
  //   try {
  //     const blockNumber = await alchemy.getBlockNumber(); //this is to get the latest block
  //     console.log("Latest block number:", blockNumber);
  //     const fetchedBlocks: MyBlock[] = [];
  //     // const tokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";

  //     for (let i = 0; i < 10; i++) {
  //       const targetBlockNum = blockNumber - i;
  //       console.log(`Processing block number: ${targetBlockNum}`);
  //       if (targetBlockNum < 0){
  //         console.log("Target block number is less than 0, breaking out of loop");
  //         break;
  //       }
  //       const rawBlock = await alchemy.getBlock(targetBlockNum); //get info of the block
  //       console.log("Fetched raw block:", rawBlock);
  //       if (!rawBlock) {
  //         console.log("No block data returned for block", targetBlockNum);
  //       continue;
  //       }
  //       // fetchedBlocks.push({
  //       //   number: rawBlock.number,
  //       //   timestamp: rawBlock.timestamp,
  //       //   baseFeePerGas: rawBlock.baseFeePerGas,
  //       //   gasUsed: rawBlock.gasUsed,
  //       //   gasLimit: rawBlock.gasLimit,
  //       //   transactions: rawBlock.transactions as unknown as string[],
  //       // });

  //       // Fetch each transaction's details and filter by token address
  //       const txDetails = await Promise.all(

  //           rawBlock.transactions.map(async (txHash) => {
  //             console.log("Fetching transaction details for:", txHash);
  //             try {
  //               const tx = await alchemy.getTransaction(txHash);
  //               console.log("Fetched transaction:", tx);
  //               return tx;
  //             } catch (error) {
  //               console.error("Error fetching transaction", txHash, error);
  //               return null;
  //             }
  //           })
  //         );
  //         console.log("All transaction details for block:", txDetails);

  //         const tokenTxs = txDetails.filter(
  //           (tx) =>
  //             tx &&
  //             tx.to &&
  //             tx.to.toLowerCase() === tokenAddress.toLowerCase()
  //         );
  //         console.log("Filtered token transactions:", tokenTxs);

  //         // const filteredTxHashes = tokenTxs.map((tx) => tx!.hash);
  //         const logs = await alchemy.getLogs({
  //           fromBlock: rawBlock.number,
  //           toBlock: rawBlock.number,
  //           address: tokenAddress,
  //           topics: [
  //             ethers.id("Transfer(address,address,uint256)")
  //           ]
  //         });
  //         console.log("Fetched logs for block", rawBlock.number, ":", logs);

  //         let totalTransferred = BigInt(0);
  //         let totalCount = 0;

  //         for (const log of logs) {
  //           console.log("Processing log:", log);
  //           // const decoded = defaultAbiCoder.decode([
  //           //   "address",
  //           //   "address",
  //           //   "uint256"
  //           // ], log.data);
  //           // totalTransferred += decoded[2]; // decoded[2] is value
  //           // transferCount += 1;
  //             // Only 1 unindexed param => 'value' (uint256)
  //           // So data should be 32 bytes => 66 hex chars including "0x"
  //           if (log.data.length !== 66) {
  //             console.warn("Skipping non-standard Transfer log:", log);
  //           continue;
  //         }

  //         try {
  //           // Decode that single uint256
  //           const [rawValue] = defaultAbiCoder.decode(["uint256"], log.data);
  //           console.log("Decoded raw value:", rawValue.toString());
  //           const cappedValue = rawValue > MAX_SAFE_VALUE ? MAX_SAFE_VALUE : rawValue;
  //           console.log("Capped value:", cappedValue.toString());

  //           // // Normalize each DAI transfer by dividing by 1e18 before summing
  //           // const normalized = Number(cappedValue) / 1e18;
  //           // if (Number.isFinite(normalized)) {
  //           //   totalTransferred += (Math.round(normalized * 1e6)); // Store as micro-DAI for accuracy
  //           // }
  //           totalTransferred += rawValue;
  //           totalCount += 1; // Count how many Transfer logs
  //           console.log("Updated totalTransferred:", totalTransferred.toString(), "totalCount:", totalCount);
  //         } catch (err) {
  //         console.warn("Decode error, skipping log:", err);
  //           continue;
  //         }
  //       }
  //       console.log("Final totalTransferred for block", rawBlock.number, ":", totalTransferred.toString());

  //         // if (tokenTxs.length >= 0) {
  //         fetchedBlocks.push({
  //           number: rawBlock.number,
  //           timestamp: rawBlock.timestamp,
  //           baseFeePerGas: rawBlock.baseFeePerGas,
  //           gasUsed: rawBlock.gasUsed,
  //           gasLimit: rawBlock.gasLimit,
  //           //transactions:[totalTransferred.toString()],
  //           tokenTransferCount: totalCount,        // store the count
  //           tokenTransferVolume: totalTransferred,     // store the volume
  //         });
  //     // }
  //   }
  //     console.log("Fetched blocks array:", fetchedBlocks);
  //     setBlocks(fetchedBlocks);
  //     setIsLoading(false);
  //     setError(null); //Clear previous error if successful
  //   } catch (err) {
  //     console.error("Error fetching blocks:", err);
  //     setError("Failed to fetch latest blocks. Please check your Alchemy key or network.");
  //     setIsLoading(false);
  //   }
  // }, [alchemy]);

  // useEffect(() => {
  //   if (alchemy) {
  //     fetchLatestBlocks();
  //   }
  // }, [alchemy, fetchLatestBlocks]);

  const fetchLatestBlocks = useCallback(async () => {
    console.log("Starting fetchLatestBlocks");
    if (!alchemy || !tokenAddress) {
      console.log("Alchemy provider or tokenAddress is not available", {
        alchemy,
        tokenAddress,
      });
      return;
    }
    try {
      const latestBlockNumber = await alchemy.getBlockNumber();
      console.log("Latest block number:", latestBlockNumber);

      // Gather block numbers for the latest 10 blocks.
      const blockNumbers: number[] = [];
      for (let i = 0; i < 10; i++) {
        const bn = latestBlockNumber - i;
        if (bn < 0) break;
        blockNumbers.push(bn);
      }
      console.log("Block numbers to process:", blockNumbers);

      const fetchedBlocks: MyBlock[] = [];
      const batchSize = 1000; // Process 10 blocks at a time

      for (let i = 0; i < blockNumbers.length; i += batchSize) {
        const batch = blockNumbers.slice(i, i + batchSize);
        console.log("Processing batch:", batch);
        // Fetch blocks in parallel within the batch.
        const batchResults = await Promise.all(
          batch.map(async (bn) => {
            console.log(`Fetching block ${bn}`);
            const rawBlock = await alchemy.getBlock(bn);
            console.log("Fetched raw block:", rawBlock);
            if (!rawBlock) return null;

            // Get logs for this block using a single getLogs call.
            // const logs = await alchemy.getLogs({
            //   fromBlock: bn,
            //   toBlock: bn,
            //   address: tokenAddress,
            //   topics: [ethers.id("Transfer(address,address,uint256)")],
            // });

            let logs = await alchemy.getLogs({
              fromBlock: bn,
              toBlock: bn,
              topics: [ethers.id("Transfer(address,address,uint256)")],
            });

            // Safety filter: ensure logs are for selected token
            logs = logs.filter(
              (log) => log.address.toLowerCase() === tokenAddress.toLowerCase()
            );

            // Optional: Log a warning if block looks suspicious
            if (logs.length === 0 && rawBlock.transactions.length > 1000) {
              console.warn(
                `⚠️ Warning: Block ${bn} has >1000 txs but returned 0 logs for token. Possible truncation.`
              );
            }

            console.log(`Fetched logs for block ${bn}:`, logs);

            let totalTransferred = BigInt(0);
            let totalCount = 0;

            for (const log of logs) {
              console.log("Processing log:", log);
              // if (log.data.length !== 66) {
              //   console.warn("Skipping non-standard Transfer log:", log);
              //   continue;
              // }
              try {
                const [rawValueBN] = defaultAbiCoder.decode(
                  ["uint256"],
                  log.data
                );
                const rawValue = BigInt(rawValueBN.toString()); // Convert to native BigInt
                console.log("Decoded raw value:", rawValue.toString());
                totalTransferred += rawValue;
                totalCount++;
                console.log(
                  "Updated totalTransferred:",
                  totalTransferred.toString(),
                  "totalCount:",
                  totalCount
                );
              } catch (err) {
                console.warn("Decode error, skipping log:", err);
                continue;
              }
            }

            console.log(
              `Final totalTransferred for block ${bn}:`,
              totalTransferred.toString()
            );

            return {
              number: rawBlock.number,
              timestamp: rawBlock.timestamp,
              baseFeePerGas: rawBlock.baseFeePerGas,
              gasUsed: rawBlock.gasUsed,
              gasLimit: rawBlock.gasLimit,
              tokenTransferCount: totalCount,
              tokenTransferVolume: totalTransferred,
            } as MyBlock;
          })
        );

        // Filter out any null results and add them to our fetchedBlocks array.
        const validResults = batchResults.filter(
          (b) => b !== null
        ) as MyBlock[];
        fetchedBlocks.push(...validResults);

        // Wait a short delay between batches to throttle requests.
        console.log("Sleeping before next batch...");
        // await sleep(1); // 300ms delay (adjust as needed)
      }

      console.log("Fetched blocks array:", fetchedBlocks);
      // Before setting state, sort ascending
      fetchedBlocks.sort((a, b) => a.number - b.number);
      setBlocks(fetchedBlocks);
      setIsLoading(false);
      setError(null);
    } catch (err) {
      console.error("Error fetching blocks:", err);
      setError(
        "Failed to fetch latest blocks. Please check your Alchemy key or network."
      );
      setIsLoading(false);
    }
  }, [alchemy, tokenAddress]);

  useEffect(() => {
    if (!alchemy || !tokenAddress) return;

    setBlocks([]); // clear stale data
    setIsLoading(true); // show loading spinner
    fetchLatestBlocks();
  }, [alchemy, tokenAddress, fetchLatestBlocks]);

  // -------------------------------------------
  // (E) Listen for New Blocks
  useEffect(() => {
    if (!alchemy) return;
    const handleNewBlock = async (blockNumber: number) => {
      console.log("New block detected:", blockNumber);
      try {
        const rawBlock = await alchemy.getBlock(blockNumber, true);
        console.log("Fetched new block:", rawBlock);
        if (!rawBlock) {
          console.warn("No block data returned for new block", blockNumber);
          return;
        }

        // Fetch transaction details and filter for token transfers
        // const txDetails = await Promise.all(
        //   rawBlock.transactions.map(async (txHash) => {
        //     try {
        //       return await alchemy.getTransaction(txHash);
        //     } catch {
        //       return null;
        //     }
        //   })
        // );

        // const tokenTxs = txDetails.filter(
        //   (tx) =>
        //     tx &&
        //     tx.to &&
        //     tx.to.toLowerCase() === tokenAddress.toLowerCase()
        // );
        // const filteredTxHashes = tokenTxs.map((tx) => tx!.hash);

        // // Only update state if there are token-specific transactions
        //  if (filteredTxHashes.length === 0) return;

        // Grab logs for the newly created block
        // const logs = await alchemy.getLogs({
        //   fromBlock: rawBlock.number,
        //   toBlock: rawBlock.number,
        //   address: tokenAddress,
        //   topics: [
        //     ethers.id("Transfer(address,address,uint256)")
        //   ]
        // });

        let logs: Log[] = [];
        try {
          logs = await alchemy.getLogs({
            fromBlock: blockNumber,
            toBlock: blockNumber,
            address: tokenAddress,
            topics: [ethers.id("Transfer(address,address,uint256)")],
          });
          // Fallback: if no logs returned and there are many transactions, try without the address filter.

          if (logs.length === 0 && rawBlock.transactions.length > 1000) {
            console.warn("Retrying with fallback: removing address filter...");
            logs = await alchemy.getLogs({
              fromBlock: blockNumber,
              toBlock: blockNumber,
              topics: [ethers.id("Transfer(address,address,uint256)")],
            });
            // Manually filter logs that belong to the token (if possible, by comparing against known addresses or by other means).
            logs = logs.filter(
              (log) => log.address.toLowerCase() === tokenAddress.toLowerCase()
            );
          }
        } catch (err) {
          console.error("Error fetching logs for block", blockNumber, err);
        }

        console.log("Fetched logs for new block", rawBlock.number, ":", logs);

        let totalTransferred = BigInt(0);
        let totalCount = 0;
        // for (const log of logs) {
        //   const decoded = defaultAbiCoder.decode(
        //     ["address","address","uint256"],
        //     log.data
        //   );
        //   totalTransferred += decoded[2];
        //   transferCount += 1;
        // }
        for (const log of logs) {
          console.log("Processing new block log:", log);
          // if (log.data.length !== 66) {
          //   console.warn("Skipping non-standard Transfer log:", log);
          //   continue;
          // }
          try {
            const [decodedValue] = defaultAbiCoder.decode(
              ["uint256"],
              log.data
            );
            const rawValue = BigInt(decodedValue.toString());
            console.log("Decoded raw value in new block:", rawValue.toString());
            totalTransferred += rawValue;
            totalCount += 1;
            console.log(
              "Updated totalTransferred for new block:",
              totalTransferred.toString(),
              "totalCount:",
              totalCount
            );
          } catch (err) {
            console.warn("Decode error, skipping log:", err);
            continue;
          }
        }

        // if no relevant logs, you can optionally skip
        if (totalCount === 0) {
          console.log("No relevant logs in new block, skipping update");
          return;
        }

        const blockWithTx: MyBlock = {
          number: rawBlock.number,
          timestamp: rawBlock.timestamp,
          baseFeePerGas: rawBlock.baseFeePerGas,
          gasUsed: rawBlock.gasUsed,
          gasLimit: rawBlock.gasLimit,
          //transactions: filteredTxHashes,
          tokenTransferCount: totalCount,
          tokenTransferVolume: totalTransferred,
          tokenAddress: tokenAddress,
        };
        console.log("New block processed data:", blockWithTx);

        // setBlocks((prev) => {
        //   // Deduplicate blocks by number
        //   if (prev.some((b) =>
        //     b.number === blockWithTx.number &&
        //     b.tokenAddress === tokenAddress
        //   )) {
        setBlocks((prev) => {
          const updated = [
            ...prev.filter(
              (b) =>
                b.number !== blockWithTx.number ||
                b.tokenAddress !== tokenAddress
            ),
            { ...blockWithTx, tokenAddress },
          ];
          return updated.sort((a, b) => a.number - b.number).slice(-10);
        });

        //     console.log("Block already exists, skipping duplicate", blockWithTx.number);
        //   return prev;
        // }
        // const updated = [...prev, blockWithTx];
        //   console.log("Updated blocks list:", updated);
        //   // Reverse the order to have newest on the right (chart uses reverse order)
        //   return updated.sort((a, b) => a.number - b.number).slice(-10);
        // });

        setNewBlockDetected(true);
        setTimeout(() => {
          setNewBlockDetected(false);
          console.log("New block notification cleared");
        }, 3000); //Shows a banner for 3 seconds when a new block arrives.
      } catch (err) {
        console.error("Error fetching new block:", err);
      }
    };
    //This sets up the listener — whenever a new block is created, handleNewBlock is triggered.
    alchemy.on("block", handleNewBlock);
    console.log("Registered new block listener");
    return () => {
      //Stops listening to avoid memory leaks.
      alchemy.off("block", handleNewBlock);
      console.log("Removed new block listener");
    };
  }, [alchemy, tokenAddress]);

  // -------------------------------------------
  // (F) Calculate Gas Metrics
  function calculateGasMetrics(block: MyBlock) {
    if (!block.baseFeePerGas) {
      return { avgGasPrice: 0, gasRatio: 0 };
    }
    const baseFeeGwei = Number(block.baseFeePerGas) / 1e9;
    const gasUsed = Number(block.gasUsed);
    const gasLimit = Number(block.gasLimit);
    const gasRatio = gasLimit > 0 ? (gasUsed / gasLimit) * 100 : 0;
    return { avgGasPrice: baseFeeGwei, gasRatio };
  }

  // -------------------------------------------
  // (G) Derive Stats
  const stats = useMemo<DashboardStats>(() => {
    if (blocks.length === 0) {
      return {
        latestBlock: 0,
        totalTransactions: 0,
        avgGasPrice: 0,
        avgGasUsage: 0,
      };
    }
    const totalTxs = blocks.reduce((acc, b) => acc + b.tokenTransferCount, 0);
    const sumGasPrice = blocks.reduce(
      (acc, b) => acc + calculateGasMetrics(b).avgGasPrice,
      0
    );
    const sumGasRatio = blocks.reduce(
      (acc, b) => acc + calculateGasMetrics(b).gasRatio,
      0
    );

    return {
      latestBlock: blocks[blocks.length - 1].number,
      totalTransactions: totalTxs,
      avgGasPrice: sumGasPrice / blocks.length,
      avgGasUsage: sumGasRatio / blocks.length,
    };
  }, [blocks]);

  // -------------------------------------------
  // (H) Prepare Chart Data
  const tokenVolumeChartData = useMemo(() => {
    return blocks.map((b) => {
      try {
        // Convert the stored value to a bigint if necessary.
        // If tokenTransferVolume is already a bigint, you can pass it directly.
        const weiValue = BigInt(b.tokenTransferVolume);
        // Format using our helper function and convert the result to a number.
        return parseFloat(formatString(weiValue, tokenDecimals, 4));
      } catch (err) {
        console.warn(`Error formatting ${tokenName} volume:`, err);
        return 0;
      }
    });
  }, [blocks, tokenDecimals]);

  const baseFeeChartData = useMemo(
    () => blocks.map((b) => calculateGasMetrics(b).avgGasPrice),
    [blocks]
  );
  const gasUsageChartData = useMemo(
    () => blocks.map((b) => calculateGasMetrics(b).gasRatio),
    [blocks]
  );

  // -------------------------------------------
  // (I) Render
  return (
    <main
      className={`
        flex min-h-screen flex-col p-4 sm:p-6 transition-colors duration-200
        ${
          darkMode ? "bg-[#0a0a0f] text-gray-200" : "bg-[#f8fafc] text-gray-800"
        }
      `}
    >
      {/* Header: Title + Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        {/* Title */}
        <h1
          className={`
            text-xl sm:text-2xl font-semibold
            ${darkMode ? "text-white" : "text-gray-900"}
          `}
        >
          Ethereum Analytics
        </h1>
        {/* Controls row (Dark Mode + Token Dropdown) */}
        <div className="flex items-center gap-3">
          {/* Dark Mode Toggle
          <button
            onClick={toggleDarkMode}
            className={`
              px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
              ${
                darkMode
                  ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-700"
              }
            `}
          >
            {darkMode ? "Light Mode" : "Dark Mode"}
          </button> */}

          {/* Token Selector */}
          <div>
            <label
              htmlFor="token-selector"
              className={`mr-2 text-sm font-medium ${
                darkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Select Token:
            </label>
            <select
              id="token-selector"
              value={tokenAddress}
              onChange={(e) => {
                // Save the selected token to localStorage
                localStorage.setItem("selectedToken", e.target.value);
                // Force a full page reload
                window.location.reload();
              }}
              // onChange={(e) => {
              //   setTokenAddress(e.target.value);
              //   // Persist the selected token
              //   localStorage.setItem("selectedToken", newToken);
              //   // Reload the page
              //   window.location.reload();
              // }}
              className={`
                text-sm px-3 py-1 rounded-md border
                ${
                  darkMode
                    ? "bg-gray-800 border-gray-600 text-gray-200"
                    : "bg-white border-gray-300 text-gray-800"
                }
                focus:outline-none focus:ring-2 focus:ring-indigo-400
              `}
            >
              {tokens.map((t) => (
                <option key={t.address} value={t.address}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Network Info Card */}
      <NetworkInfo />

      {/* Error Banner */}
      {error && (
        <div
          className={`
            rounded-md mb-6 p-4
            ${
              darkMode ? "bg-red-900/30 text-red-200" : "bg-red-50 text-red-700"
            }
          `}
        >
          <div className="flex">
            <p className="text-sm font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* New Block Notification */}
      <AnimatePresence>
        {newBlockDetected && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`
              rounded-md mb-6 p-4
              ${
                darkMode
                  ? "bg-green-900/30 text-green-200"
                  : "bg-green-50 text-green-700"
              }
            `}
          >
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2"></div>
              <p className="text-sm font-medium">
                New block detected! Dashboard updated with latest data.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Dashboard Content */}
      {isLoading ? (
        <LoadingState darkMode={darkMode} tokenName={tokenName} />
      ) : (
        <>
          <StatsGrid stats={stats} darkMode={darkMode} />

          <ChartsSection
            tokenVolumeChartData={tokenVolumeChartData}
            baseFeeChartData={baseFeeChartData}
            gasUsageChartData={gasUsageChartData}
            blocks={blocks}
            darkMode={darkMode}
            tokenName={tokenName}
          />

          <BlocksTable
            blocks={blocks}
            darkMode={darkMode}
            newBlockDetected={newBlockDetected}
            tokenName={tokenName}
            tokenDecimals={tokenDecimals}
          />
        </>
      )}
    </main>
  );
};

// -------------------------------------------
// LoadingState Component
const LoadingState = ({
  darkMode,
  tokenName,
}: {
  darkMode: boolean;
  tokenName: string;
}) => (
  <div className="flex flex-col justify-center items-center min-h-[40vh]">
    <div className="relative w-12 h-12">
      <div
        className={`
          absolute inset-0 rounded-full border-4 border-t-transparent animate-spin
          ${darkMode ? "border-indigo-400" : "border-indigo-600"}
        `}
      />
    </div>
    <p
      className={`
        mt-4 text-base font-medium
        ${darkMode ? "text-indigo-200" : "text-indigo-700"}
      `}
    >
      Connecting to Ethereum Mainnet
    </p>
    <p
      className={`
        text-xs
        ${darkMode ? "text-gray-400" : "text-gray-500"}
      `}
    >
      Fetching latest {tokenName} token data
    </p>
  </div>
);

// -------------------------------------------
// StatsGrid + StatCard
const StatsGrid = ({
  stats,
  darkMode,
}: {
  stats: DashboardStats;
  darkMode: boolean;
}) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
    {
      <StatCard
        title="Latest Block (Chain Height)"
        value={`#${stats.latestBlock}`}
        subtitle=""
        darkMode={darkMode}
        colorClass="border-l-indigo-500"
      />
    }
    <StatCard
      title="Total Transactions in last 10 blocks"
      value={stats.totalTransactions}
      subtitle=""
      darkMode={darkMode}
      colorClass="border-l-purple-500"
    />
    <StatCard
      title="Avg Gas Price (Transaction fee market)"
      value={`${stats.avgGasPrice.toFixed(2)} Gwei`}
      subtitle=""
      darkMode={darkMode}
      colorClass="border-l-blue-500"
    />
    <StatCard
      title="Gas Usage per Block (Average block capacity used)"
      value={`${stats.avgGasUsage.toFixed(1)}%`}
      subtitle=""
      darkMode={darkMode}
      colorClass="border-l-emerald-500"
    />
  </div>
);

const StatCard = ({
  title,
  value,
  subtitle,
  darkMode,
  colorClass,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  darkMode: boolean;
  colorClass: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className={`
      border-l-4 ${colorClass} rounded-md overflow-hidden
      ${
        darkMode
          ? "bg-gray-800/40 backdrop-blur-sm border-t border-r border-b border-gray-700/50"
          : "bg-white/90 backdrop-blur-sm border-t border-r border-b border-gray-200 shadow-sm"
      } p-4
    `}
  >
    <div>
      <p
        className={`
          text-xs uppercase tracking-wider font-medium
          ${darkMode ? "text-gray-400" : "text-gray-500"}
        `}
      >
        {title}
      </p>
      <p
        className={`
          mt-1 text-2xl font-semibold
          ${darkMode ? "text-white" : "text-gray-900"}
        `}
      >
        {value}
      </p>
      <div
        className={`
          text-xs mt-2
          ${darkMode ? "text-gray-500" : "text-gray-500"}
        `}
      >
        {subtitle}
      </div>
    </div>
  </motion.div>
);

// -------------------------------------------
// ChartsSection
const ChartsSection = ({
  tokenVolumeChartData,
  baseFeeChartData,
  gasUsageChartData,
  blocks,
  darkMode,
  tokenName,
}: {
  tokenVolumeChartData: number[];
  baseFeeChartData: number[];
  gasUsageChartData: number[];
  blocks: MyBlock[];
  darkMode: boolean;
  tokenName: string;
}) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
    <ChartCard
      title={`${tokenName} Transfer Volume (Transfers per block)`}
      subtitle=""
      tooltipTitle=""
      tooltipDescription="The total number of a particular tokens' transfers within each block. Helps track network activity and liquidity flows."
      data={tokenVolumeChartData}
      label="Total Transfer Volume per Block"
      blocks={blocks}
      darkMode={darkMode}
    />
    <ChartCard
      title="Base Fee - Gwei (Minimum fee required)"
      subtitle=""
      tooltipTitle=""
      tooltipDescription="The minimum fee per gas required for a transaction. This fee is burned during processing."
      data={baseFeeChartData}
      label="Base Fee (Gwei)"
      blocks={blocks}
      darkMode={darkMode}
    />
    <ChartCard
      title="Gas Usage Ratio (Capacity utilization avg per block)"
      subtitle="gasUsed / gasLimit"
      tooltipTitle=""
      tooltipDescription="The % of available gas used in each block. Higher percentages indicate heavier network usage."
      data={gasUsageChartData}
      label="Gas Usage (%)"
      blocks={blocks}
      darkMode={darkMode}
    />
  </div>
);

const ChartCard = ({
  title,
  subtitle,
  tooltipTitle,
  tooltipDescription,
  data,
  label,
  blocks,
  darkMode,
}: {
  title: string;
  subtitle: string;
  tooltipTitle: string;
  tooltipDescription: string;
  data: number[];
  label: string;
  blocks: MyBlock[];
  darkMode: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    className={`
      rounded-md overflow-hidden
      ${
        darkMode
          ? "bg-gray-800/40 backdrop-blur-sm border border-gray-700/50"
          : "bg-white/90 backdrop-blur-sm border border-gray-200 shadow-sm"
      } p-4
    `}
  >
    <div className="flex justify-between items-start mb-3">
      <div>
        <h3
          className={`
            text-sm font-medium
            ${darkMode ? "text-white" : "text-gray-900"}
          `}
        >
          {title}
        </h3>
        <p
          className={`
            text-xs
            ${darkMode ? "text-gray-400" : "text-gray-500"}
          `}
        >
          {subtitle}
        </p>
      </div>
      <div className="relative group">
        <div className="cursor-help p-1 inline-flex items-center">
          {/* optional icon or info circle */}
        </div>
        <div
          className={`
            absolute z-10 right-0 w-48 p-2 rounded-md text-xs
            opacity-0 invisible group-hover:opacity-100 group-hover:visible
            transition-opacity duration-200
            ${
              darkMode
                ? "bg-gray-700 text-gray-200"
                : "bg-white text-gray-700 border border-gray-200 shadow-md"
            }
          `}
        >
          <p className="font-medium mb-1">{tooltipTitle}</p>
          <p>{tooltipDescription}</p>
        </div>
      </div>
    </div>
    <div className="h-[180px] mt-1">
      <Chart
        data={data}
        label={label}
        darkMode={darkMode}
        xLabels={blocks.map((block) => "#" + block.number.toString())}
      />
    </div>
  </motion.div>
);

// -------------------------------------------
// (J) Enhanced BlocksTable
const BlocksTable = ({
  blocks,
  darkMode,
  newBlockDetected,
  tokenName,
  tokenDecimals,
}: {
  blocks: MyBlock[];
  darkMode: boolean;
  newBlockDetected: boolean;
  tokenName: string;
  tokenDecimals: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className={`
      w-full rounded-lg overflow-hidden shadow-lg
      ${
        darkMode
          ? "bg-gray-800 border border-gray-700"
          : "bg-white border border-gray-200"
      }
    `}
  >
    {/* Table Header Section */}
    <div
      className={`
        flex items-center justify-between
        px-6 py-4
        ${
          darkMode
            ? "bg-gray-700 border-b border-gray-600"
            : "bg-gray-100 border-b border-gray-200"
        }
      `}
    >
      <h3
        className={`
          text-lg font-bold
          ${darkMode ? "text-white" : "text-gray-900"}
        `}
      >
        Recent Blocks
      </h3>
      <div className="flex items-center">
        <div
          className={`
            h-3 w-3 rounded-full mr-2
            ${newBlockDetected ? "bg-green-500 animate-pulse" : "bg-gray-400"}
          `}
        />
        <span
          className={`
            text-sm font-medium
            ${darkMode ? "text-green-200" : "text-gray-700"}
          `}
        >
          Live Updates
        </span>
      </div>
    </div>

    {/* Responsive Scroll Container */}
    <div className="overflow-x-auto">
      <table className="min-w-full table-auto text-sm">
        {/* Table Head */}
        <thead
          className={`
            uppercase text-xs font-semibold tracking-wider
            ${
              darkMode
                ? "bg-gray-700 text-gray-200"
                : "bg-gray-50 text-gray-700"
            }
          `}
        >
          <tr>
            <th className="px-6 py-3 text-left">Block</th>
            <th className="px-6 py-3 text-left">No. of Txs</th>
            <th className="px-6 py-3 text-left">No. of {tokenName}</th>
            <th className="px-6 py-3 text-left">Gas Used</th>
            <th className="px-6 py-3 text-left">Base Fee</th>
            <th className="px-6 py-3 text-left">Age</th>
          </tr>
        </thead>

        {/* Table Body with zebra stripes */}
        <tbody
          className={`${
            darkMode ? "divide-gray-600" : "divide-gray-200"
          } divide-y`}
        >
          {blocks.map((block, i) => {
            const blockNumber = block.number;
            const baseFee = block.baseFeePerGas
              ? Number(block.baseFeePerGas) / 1e9
              : 0;
            // const txCount = block.transactions.length;
            const gasUsed = Number(block.gasUsed);
            const gasLimit = Number(block.gasLimit);
            const gasPercent = gasLimit > 0 ? (gasUsed / gasLimit) * 100 : 0;

            const timestamp = block.timestamp;
            const now = Math.floor(Date.now() / 1000);
            const secondsAgo = now - timestamp;

            return (
              <motion.tr
                key={blockNumber}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                className={`
                  hover:${
                    darkMode ? "bg-gray-700/50" : "bg-indigo-50"
                  } transition-colors
                  ${
                    i % 2 === 0
                      ? darkMode
                        ? "bg-gray-800/40"
                        : "bg-white"
                      : darkMode
                      ? "bg-gray-800/20"
                      : "bg-gray-50"
                  }
                `}
              >
                {/* Block Column */}
                <td className="px-6 py-3 text-gray-900 dark:text-gray-100 whitespace-nowrap">
                  <div className="flex items-center">
                    <div
                      className={`
                        w-2 h-2 rounded-full mr-2
                        ${i === 0 ? "bg-green-500" : "bg-gray-400"}
                      `}
                    />
                    #{blockNumber}
                  </div>
                </td>

                {/* Number of Txs */}
                <td className="px-6 py-3 text-gray-700 dark:text-gray-300">
                  {block.tokenTransferCount}
                </td>

                {/* Amount of Token */}
                <td className="px-6 py-3 text-gray-700 dark:text-gray-300">
                  {/* Convert the raw BigInt to a decimal string in DAI (18 decimals) */}
                  {formatString(block.tokenTransferVolume, tokenDecimals, 4)}{" "}
                  {tokenName}
                </td>

                {/* Gas Used Column */}
                <td className="px-6 py-3 text-gray-700 dark:text-gray-300">
                  <div className="flex items-center space-x-2">
                    <div
                      className={`
                        flex-1 h-2 w-24
                        ${darkMode ? "bg-gray-600" : "bg-gray-200"}
                        rounded-full overflow-hidden
                      `}
                    >
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${Math.min(gasPercent, 100)}%` }}
                      />
                    </div>
                    <span>{gasPercent.toFixed(1)}%</span>
                  </div>
                </td>

                {/* Base Fee Column */}
                <td className="px-6 py-3 text-gray-700 dark:text-gray-300">
                  {baseFee.toFixed(2)} Gwei
                </td>

                {/* Age Column */}
                <td className="px-6 py-3 text-gray-700 dark:text-gray-300">
                  {secondsAgo < 60
                    ? `${secondsAgo}s ago`
                    : secondsAgo < 3600
                    ? `${Math.floor(secondsAgo / 60)}m ago`
                    : `${Math.floor(secondsAgo / 3600)}h ago`}
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </motion.div>
);

export default Dashboard;
