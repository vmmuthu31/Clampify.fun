"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import CodeBlock from "@/components/ui/code-block";

export default function DocumentationPage() {
  return (
    <div className="container mx-auto py-20 px-4 max-w-7xl">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          Clampify Documentation
        </h1>
        <p className="text-lg text-muted-foreground">
          A comprehensive guide to interacting with the Clampify platform
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="lifecycle">Token Lifecycle</TabsTrigger>
          <TabsTrigger value="trading">Trading Functions</TabsTrigger>
          <TabsTrigger value="data">Data Functions</TabsTrigger>
          <TabsTrigger value="examples">Example Code</TabsTrigger>
        </TabsList>

        {/* Overview Tab Content */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>What is Clampify?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Clampify is a meme token platform with enhanced supply locking
                and anti-rug pull mechanisms. It allows users to create, trade,
                and govern meme tokens in a sustainable and secure environment.
              </p>
              <div className="bg-sky-900/20 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Key Features</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    Supply locking for large holders to prevent market
                    manipulation
                  </li>
                  <li>
                    Creator lockup periods to ensure sustainable token growth
                  </li>
                  <li>
                    Step function bonding curve for predictable price discovery
                  </li>
                  <li>Comprehensive data tracking for token analytics</li>
                  <li>DEX integration for seamless trading</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contract Architecture</CardTitle>
            </CardHeader>
            <CardContent>
              <CodeBlock
                language="javascript"
                code={`
// Main contracts in the Clampify ecosystem
ClampifyFactory     - Creates and manages tokens
ClampifyToken       - Individual token implementation with bonding curve
ClampifyDEX         - DEX functionality for tokens
ClampifyGovernance  - Community governance for tokens
              `}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                To interact with the Clampify platform, you&apos;ll need to:
              </p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Connect to the Clampify Factory contract</li>
                <li>Create a new token or interact with existing tokens</li>
                <li>
                  Use the provided functions to buy, sell, or transfer tokens
                </li>
                <li>
                  Access data functions to get token statistics and analytics
                </li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Token Lifecycle Tab Content */}
        <TabsContent value="lifecycle" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Token Creation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Token creation happens through the ClampifyFactory contract.
                Users can specify parameters including name, symbol, supply, and
                locking periods.
              </p>
              <CodeBlock
                language="javascript"
                code={`
// Create a new token
const createToken = async () => {
  // Connect to factory contract
  const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);
  
  // Token parameters
  const name = "My Meme Token";
  const symbol = "MEME";
  const initialSupply = ethers.utils.parseUnits("1000000", 18); // 1 million tokens
  const maxSupply = ethers.utils.parseUnits("10000000", 18); // 10 million max
  const initialPrice = ethers.utils.parseEther("0.000001"); // Initial price in ETH
  const creatorLockupPeriod = 7 * 24 * 60 * 60; // 7 days in seconds
  const lockLiquidity = true;
  const liquidityLockPeriod = 30 * 24 * 60 * 60; // 30 days in seconds
  
  // Creation fee (must be >= factory.creationFee())
  const creationFee = ethers.utils.parseEther("0.01");
  
  // Create token
  const tx = await factory.createToken(
    name,
    symbol,
    initialSupply,
    maxSupply,
    initialPrice,
    creatorLockupPeriod,
    lockLiquidity,
    liquidityLockPeriod,
    { value: creationFee }
  );
  
  const receipt = await tx.wait();
  
  // Get the token address from the event
  const event = receipt.events.find(e => e.event === "TokenCreated");
  const tokenAddress = event.args.tokenAddress;
  
  console.log("New token created at:", tokenAddress);
  
  return tokenAddress;
};
              `}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Token Parameters Explained</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parameter</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Recommendation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">name</TableCell>
                    <TableCell>Token name</TableCell>
                    <TableCell>Choose something memorable</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">symbol</TableCell>
                    <TableCell>Token symbol/ticker</TableCell>
                    <TableCell>3-6 characters, uppercase</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">initialSupply</TableCell>
                    <TableCell>Amount to mint to creator</TableCell>
                    <TableCell>20-30% of maxSupply</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">maxSupply</TableCell>
                    <TableCell>Maximum possible supply</TableCell>
                    <TableCell>1M-1B tokens recommended</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">initialPrice</TableCell>
                    <TableCell>Starting price in ETH</TableCell>
                    <TableCell>Low enough for accessibility</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      creatorLockupPeriod
                    </TableCell>
                    <TableCell>Creator token lock time</TableCell>
                    <TableCell>At least 7 days recommended</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">lockLiquidity</TableCell>
                    <TableCell>Whether to lock liquidity</TableCell>
                    <TableCell>True for added security</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      liquidityLockPeriod
                    </TableCell>
                    <TableCell>Liquidity lock time</TableCell>
                    <TableCell>30+ days recommended</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trading Functions Tab Content */}
        <TabsContent value="trading" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Buying Tokens</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Users can buy tokens in two ways: specifying a token amount or
                specifying an ETH amount.
              </p>
              <CodeBlock
                language="javascript"
                code={`
// METHOD 1: Buy specific amount of tokens
const buySpecificTokens = async (tokenAddress, desiredTokenAmount) => {
  const token = new ethers.Contract(tokenAddress, TOKEN_ABI, signer);
  
  // First calculate the price
  const tokenAmountBN = ethers.utils.parseUnits(desiredTokenAmount.toString(), 18);
  const requiredEth = await token.calculatePurchasePrice(tokenAmountBN);
  
  // Add 2% slippage buffer
  const withSlippage = requiredEth.mul(102).div(100);
  
  // Execute purchase with the required ETH
  const tx = await token.buyTokens(tokenAmountBN, { value: withSlippage });
  const receipt = await tx.wait();
  
  // Transaction successful
  console.log("Successfully purchased:", desiredTokenAmount, "tokens");
  return receipt;
};

// METHOD 2: Buy with specific amount of ETH
const buyWithEth = async (tokenAddress, ethAmount) => {
  const token = new ethers.Contract(tokenAddress, TOKEN_ABI, signer);
  
  // Convert ETH amount to wei
  const ethAmountWei = ethers.utils.parseEther(ethAmount.toString());
  
  // Execute purchase
  const tx = await token.buyTokensWithEth({ value: ethAmountWei });
  const receipt = await tx.wait();
  
  // Get the amount of tokens received from the event
  const event = receipt.events.find(e => e.event === "TokensPurchased");
  const tokensMinted = event.args.tokensMinted;
  
  console.log("Purchased tokens:", ethers.utils.formatUnits(tokensMinted, 18));
  return receipt;
};
              `}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Selling Tokens</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Users can sell tokens back to the bonding curve if they
                aren&apos;t locked.
              </p>
              <CodeBlock
                language="javascript"
                code={`
const sellTokens = async (tokenAddress, tokenAmount) => {
  const token = new ethers.Contract(tokenAddress, TOKEN_ABI, signer);
  
  // Check if the user is locked
  const isLocked = await token.isHolderLocked(signer.address);
  if (isLocked) {
    const unlockTime = await token.getHolderUnlockTime(signer.address);
    const unlockDate = new Date(unlockTime.toNumber() * 1000);
    console.error("Your tokens are locked until:", unlockDate.toLocaleString());
    return null;
  }
  
  // Convert token amount to wei
  const tokenAmountWei = ethers.utils.parseUnits(tokenAmount.toString(), 18);
  
  // Check expected return
  const expectedReturn = await token.calculateSaleReturn(tokenAmountWei);
  console.log("Expected ETH return:", ethers.utils.formatEther(expectedReturn));
  
  // Execute sale
  const tx = await token.sellTokens(tokenAmountWei);
  const receipt = await tx.wait();
  
  // Get ETH received from the event
  const event = receipt.events.find(e => e.event === "TokensSold");
  const ethReceived = event.args.amountReceived;
  
  console.log("Sold tokens for:", ethers.utils.formatEther(ethReceived), "ETH");
  return receipt;
};
              `}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Functions Tab Content */}
        <TabsContent value="data" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Price & Market Data</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Get comprehensive token statistics and market data.
              </p>
              <CodeBlock
                language="javascript"
                code={`
const getTokenStatistics = async (tokenAddress) => {
  const token = new ethers.Contract(tokenAddress, TOKEN_ABI, signer);
  
  // Get core statistics
  const [currentPrice, marketCap, volume, ath, atl] = await token.getTokenStatistics();
  
  return {
    currentPrice: ethers.utils.formatEther(currentPrice),
    marketCap: ethers.utils.formatEther(marketCap),
    volume: ethers.utils.formatUnits(volume, 18),
    allTimeHigh: ethers.utils.formatEther(ath),
    allTimeLow: ethers.utils.formatEther(atl)
  };
};

// Get data for price charts
const getCandleData = async (tokenAddress, numberOfCandles = 24) => {
  const token = new ethers.Contract(tokenAddress, TOKEN_ABI, signer);
  
  const [timestamps, opens, highs, lows, closes, volumes] = await token.getCandleData(numberOfCandles);
  
  // Format data for charting libraries
  const candles = [];
  for (let i = 0; i < timestamps.length; i++) {
    candles.push({
      time: timestamps[i].toNumber() * 1000, // Convert to milliseconds
      open: parseFloat(ethers.utils.formatEther(opens[i])),
      high: parseFloat(ethers.utils.formatEther(highs[i])),
      low: parseFloat(ethers.utils.formatEther(lows[i])),
      close: parseFloat(ethers.utils.formatEther(closes[i])),
      volume: parseFloat(ethers.utils.formatUnits(volumes[i], 18))
    });
  }
  
  return candles;
};
              `}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Holder Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Get top token holders for bubble charts and holder distribution.
              </p>
              <CodeBlock
                language="javascript"
                code={`
const getHolderDistribution = async (tokenAddress) => {
  const token = new ethers.Contract(tokenAddress, TOKEN_ABI, signer);
  
  const [holders, balances, percentages] = await token.getTopHolders();
  
  // Format for visualization libraries like D3.js
  const distribution = [];
  for (let i = 0; i < holders.length; i++) {
    distribution.push({
      address: holders[i],
      balance: ethers.utils.formatUnits(balances[i], 18),
      percentage: percentages[i].toNumber() / 100, // Convert to percentage (e.g., 5.25%)
      label: \`\${holders[i].substring(0, 6)}...\${holders[i].substring(38)}\`
    });
  }
  
  return distribution;
};
              `}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Example Code Tab Content */}
        <TabsContent value="examples" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Token Dashboard Example</CardTitle>
              <CardDescription>
                A complete example of a token dashboard using React and
                ethers.js
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock
                language="tsx"
                code={`
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

// The token ABI would be imported from your artifacts
import { TOKEN_ABI } from '@/lib/abis';

const TOKEN_ADDRESS = "0x..."; // Your token address

export default function TokenDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [holders, setHolders] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [signer, setSigner] = useState(null);
  
  useEffect(() => {
    // Connect to wallet
    const connectWallet = async () => {
      if (window.ethereum) {
        try {
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const connectedSigner = provider.getSigner();
          setSigner(connectedSigner);
        } catch (error) {
          console.error("Failed to connect wallet:", error);
        }
      } else {
        console.error("Please install a Web3 wallet like MetaMask");
      }
    };
    
    connectWallet();
  }, []);
  
  useEffect(() => {
    // Load all data when signer is available
    if (signer) {
      const loadData = async () => {
        setLoading(true);
        try {
          const token = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);
          
          // Load stats
          const [currentPrice, marketCap, volume, ath, atl] = await token.getTokenStatistics();
          setStats({
            currentPrice: ethers.utils.formatEther(currentPrice),
            marketCap: ethers.utils.formatEther(marketCap),
            volume: ethers.utils.formatUnits(volume, 18),
            allTimeHigh: ethers.utils.formatEther(ath),
            allTimeLow: ethers.utils.formatEther(atl)
          });
          
          // Load transactions
          const [accounts, isBuys, tokenAmounts, ethAmounts, prices, timestamps] = 
            await token.getRecentTransactions(20);
            
          const formattedTx = [];
          for (let i = 0; i < accounts.length; i++) {
            formattedTx.push({
              account: accounts[i],
              type: isBuys[i] ? 'buy' : 'sell',
              tokenAmount: ethers.utils.formatUnits(tokenAmounts[i], 18),
              ethAmount: ethers.utils.formatEther(ethAmounts[i]),
              price: ethers.utils.formatEther(prices[i]),
              timeAgo: new Date(timestamps[i].toNumber() * 1000).toLocaleString()
            });
          }
          setTransactions(formattedTx);
          
          // Load holder distribution
          const [holders, balances, percentages] = await token.getTopHolders();
          const formattedHolders = [];
          for (let i = 0; i < holders.length; i++) {
            formattedHolders.push({
              address: holders[i],
              shortAddress: \`\${holders[i].substring(0, 6)}...\${holders[i].substring(38)}\`,
              balance: parseFloat(ethers.utils.formatUnits(balances[i], 18)).toLocaleString(),
              percentage: (percentages[i].toNumber() / 100).toFixed(2)
            });
          }
          setHolders(formattedHolders);
          
          // Load chart data
          const [timestamps, opens, highs, lows, closes, volumes] = await token.getCandleData(24);
          
          const formatted = [];
          for (let i = 0; i < timestamps.length; i++) {
            formatted.push({
              time: new Date(timestamps[i].toNumber() * 1000).toLocaleTimeString(),
              price: parseFloat(ethers.utils.formatEther(closes[i]))
            });
          }
          setChartData(formatted);
          
        } catch (error) {
          console.error("Error loading data:", error);
        } finally {
          setLoading(false);
        }
      };
      
      loadData();
      
      // Refresh data every 30 seconds
      const interval = setInterval(() => loadData(), 30000);
      return () => clearInterval(interval);
    }
  }, [signer]);
  
  const handleBuyToken = async () => {
    try {
      const amount = prompt("Enter ETH amount to spend:");
      if (!amount) return;
      
      const token = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);
      const tx = await token.buyTokensWithEth({ 
        value: ethers.utils.parseEther(amount) 
      });
      
      await tx.wait();
      alert("Purchase successful!");
      
      // Refresh data
      window.location.reload();
    } catch (error) {
      console.error("Buy transaction failed:", error);
      alert("Transaction failed: " + error.message);
    }
  };
  
  const handleSellToken = async () => {
    try {
      const amount = prompt("Enter token amount to sell:");
      if (!amount) return;
      
      const token = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);
      const tx = await token.sellTokens(ethers.utils.parseUnits(amount, 18));
      
      await tx.wait();
      alert("Sale successful!");
      
      // Refresh data
      window.location.reload();
    } catch (error) {
      console.error("Sell transaction failed:", error);
      alert("Transaction failed: " + error.message);
    }
  };
  
  if (loading || !stats) {
    return <div className="text-center py-12">Loading dashboard data...</div>;
  }
  
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <h1 className="text-3xl font-bold mb-8 text-center">Token Dashboard</h1>
      
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium">Current Price</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{parseFloat(stats.currentPrice).toFixed(8)} ETH</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium">Market Cap</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{parseFloat(stats.marketCap).toFixed(2)} ETH</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium">Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{parseFloat(stats.volume).toLocaleString()} tokens</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium">All-Time High</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{parseFloat(stats.allTimeHigh).toFixed(8)} ETH</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium">All-Time Low</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {parseFloat(stats.allTimeLow) > 0 ? parseFloat(stats.allTimeLow).toFixed(8) : "N/A"} ETH
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        <Button onClick={handleBuyToken} className="bg-green-500 hover:bg-green-600">
          Buy Tokens
        </Button>
        <Button onClick={handleSellToken} className="bg-red-500 hover:bg-red-600">
          Sell Tokens
        </Button>
      </div>
      
      {/* Price Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Price History (24h)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip formatter={(value) => \`\${value} ETH\`} />
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#8884d8" 
                  activeDot={{ r: 8 }}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      {/* Recent Transactions and Top Holders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx, i) => (
                  <TableRow key={i}>
                    <TableCell className={\`font-medium \${tx.type === 'buy' ? 'text-green-600' : 'text-red-600'}\`}>
                      {tx.type.toUpperCase()}
                    </TableCell>
                    <TableCell>{tx.account.substring(0, 6)}...{tx.account.substring(38)}</TableCell>
                    <TableCell className="text-right">{parseFloat(tx.tokenAmount).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{tx.timeAgo}</TableCell>
                  </TableRow>
                ))}
                {transactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No transactions yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Top Token Holders</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Percentage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holders.map((holder, i) => (
                  <TableRow key={i}>
                    <TableCell>#{i + 1}</TableCell>
                    <TableCell>{holder.shortAddress}</TableCell>
                    <TableCell className="text-right">{holder.balance}</TableCell>
                    <TableCell className="text-right">{holder.percentage}%</TableCell>
                  </TableRow>
                ))}
                {holders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No holders data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      
      <div className="text-center text-muted-foreground text-sm">
        <p>Data refreshes automatically every 30 seconds</p>
        <p className="mt-1">
          <a
            href={\`https://etherscan.io/address/\${TOKEN_ADDRESS}\`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            View Contract on Etherscan
          </a>
        </p>
      </div>
    </div>
  );
}
              `}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
