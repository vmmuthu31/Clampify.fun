"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import {
  ArrowUpRight,
  Copy,
  Lock,
  BarChart3,
  Share2,
  Check,
  ChevronDown,
  Users,
  Wallet,
  AlertTriangle,
  PieChart,
  Clock,
  Shield,
  ArrowDown,
  Settings,
  X,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { useParams } from "next/navigation";
import { TokenInfo } from "@/services/tokenCreation";
import { ethers } from "ethers";
import {
  buyTokens,
  getTokenPrice,
  getTopHolders,
  sellTokens,
  TokenReturnOnBuy,
  TokenReturnOnSell,
  getCandleData,
} from "@/services/trade";
import {
  recordTransaction,
  getTokenTransactions,
  getTokenDetails,
} from "@/services/api";
import { usePrivy } from "@privy-io/react-auth";
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  LineSeries,
  LineWidth,
  Time,
  CandlestickData,
} from "lightweight-charts";
import { ITokenData, ITransaction, TransactionType } from "@/lib/types";
import Image from "next/image";

// Simulated token data
const tokenData: ITokenData = {
  id: "clampfrog",
  name: "ClampFrog",
  symbol: "CFROG",
  price: 0.0042,
  priceChange24h: 15.3,
  marketCap: 4200000,
  volume24h: 850000,
  holders: 1245,
  createdAt: "2023-03-15T08:00:00.000Z",
  description:
    "ClampFrog combines the viral appeal of frog memes with Clampify's revolutionary supply locking technology.",
  website: "https://clampfrog.io",
  twitter: "https://twitter.com/ClampFrog",
  telegram: "https://t.me/ClampFrog",
  contractAddress: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  decimals: 18,
  totalSupply: "10000000000",
  circulatingSupply: "3000000000",
  lockedSupply: "7000000000",
  supplyLockPercentage: 70,
  lockDuration: 180, // days
  unlockStyle: "Linear",
  unlockEnd: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString(), // 120 days from now
  creator: "0x1234...5678",
  tradingEnabled: true,
  maxWalletSize: "2", // percent
  maxTxAmount: "1", // percent
  buyTax: "2", // percent
  sellTax: "2", // percent
  // Bonding curve parameters
  bondingCurve: {
    initialPrice: 0.000001,
    reserveRatio: 0.2, // 20%
    currentReserve: 4.2, // in CoreDAO
  },
};

// Add input validation helper
const isValidNumber = (value: string): boolean => {
  return /^\d*\.?\d*$/.test(value) && Number(value) >= 0;
};

// Update the getTimeAgo function
const getTimeAgo = (timestamp: string) => {
  const now = new Date();
  const txTime = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - txTime.getTime()) / 1000);

  if (isNaN(diffInSeconds)) return "Just now";

  if (diffInSeconds < 60) {
    return `${diffInSeconds} ${diffInSeconds === 1 ? "second" : "seconds"} ago`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? "minute" : "minutes"} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? "hour" : "hours"} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} ${diffInDays === 1 ? "day" : "days"} ago`;
};

interface CandleDataPoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export default function TokenPage() {
  const params = useParams();
  const tokenId = params.id as string; // Get the ID from URL
  const [isClient, setIsClient] = useState(false);
  const [copiedText, setCopiedText] = useState("");
  const [activeTimeframe, setActiveTimeframe] = useState("1D");
  const [activeTab, setActiveTab] = useState("metrics");
  const [tradeType, setTradeType] = useState("buy");
  const [tokenAmount, setTokenAmount] = useState("");
  const [coreAmount, setCoreAmount] = useState("");
  const [slippage, setSlippage] = useState(0.5);
  const [showSlippageSettings, setShowSlippageSettings] = useState(false);
  const { toast } = useToast();
  const [topHolders, setTopHolders] = useState<number>(0);
  const [tokenDetails, setTokenDetails] = useState<{
    name: string;
    symbol: string;
    totalSupply: string;
    decimals: number;
    balance: string;
    creatorLockupPeriod: string;
    initialSupply: string;
    initialPrice: string;
    contractAddress: string;
    marketCap: string;
    volume24h: string;
  } | null>(null);
  const [estimatedReturn, setEstimatedReturn] = useState<string>("");
  const [isCalculating, setIsCalculating] = useState(false);
  const [isTransacting, setIsTransacting] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<{
    status: "success" | "error" | null;
    hash?: string;
    error?: string;
  }>({ status: null });
  const [recentTransactions, setRecentTransactions] = useState<{
    accounts: string[];
    isBuys: boolean[];
    tokenAmounts: string[];
    ethAmounts: string[];
    prices: string[];
    timestamps: string[];
    type: string[];
    txHashes: string[];
  } | null>(null);
  const [tokenBalance, setTokenBalance] = useState<string>("");
  const [currentPrice, setCurrentPrice] = useState<string>("0");
  const { user } = usePrivy();
  const [candleData, setCandleData] = useState<
    {
      time: 0;
      open: 0;
      high: 0;
      low: 0;
      close: 0;
      volume: 0;
    }[]
  >([]);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [tokenImage, setTokenImage] = useState<string>("");
  const [tokenLockDetails, setTokenLockDetails] = useState<{
    lockLiquidity: boolean;
    liquidityLockPeriod: string;
    creatorLockupPeriod: string;
  }>({
    lockLiquidity: false,
    liquidityLockPeriod: "0",
    creatorLockupPeriod: "0",
  });

  // Calculate days left in lock
  const daysLeft = Math.ceil(
    (new Date(tokenData.unlockEnd as string).getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24)
  );

  useEffect(() => {
    const fetchTokenInfo = async () => {
      if (tokenId) {
        console.log("Token ID from URL:", tokenId);
        const tokenInfo = await TokenInfo(tokenId);

        console.log("Token Info:", tokenInfo);
        // Format BigNumber values
        const formattedInfo = {
          ...tokenInfo,
          totalSupply: tokenInfo.totalSupply.toString(),
          balance: tokenInfo.balance.toString(),
          initialPrice: ethers.utils.formatEther(tokenInfo.initialPrice || "0"),
        };

        console.log("Token Info:", formattedInfo);
        setTokenDetails(formattedInfo);

        const topHolders = await getTopHolders(tokenInfo.contractAddress);
        console.log("Top Holders:", topHolders);
        setTopHolders(topHolders);
        const formattedTokenBalance = ethers.utils.formatEther(
          tokenInfo.balance.toString()
        );
        setTokenBalance(formattedTokenBalance);

        // Get token details including image and lock info
        const { token } = await getTokenDetails(tokenId);
        if (token) {
          setTokenImage(token.image);
          setTokenLockDetails({
            lockLiquidity: token.lockLiquidity,
            liquidityLockPeriod: token.liquidityLockPeriod,
            creatorLockupPeriod: token.creatorLockupPeriod,
          });
        }
      }
    };

    fetchTokenInfo();
  }, [tokenId]);

  // Percent unlocked so far
  const percentUnlocked = Math.min(
    100,
    Math.max(
      0,
      100 - (daysLeft / tokenData.lockDuration) * tokenData.supplyLockPercentage
    )
  );

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Add this helper function at component level
  const calculateEstimatedReturn = async (
    value: string,
    contractAddress: string
  ) => {
    if (value && contractAddress) {
      setIsCalculating(true);
      try {
        const tokenReturnOnBuy = await TokenReturnOnBuy(contractAddress, value);
        // Format the token amount from Wei to ETH
        const formattedAmount = ethers.utils.formatEther(
          tokenReturnOnBuy.tokenAmount
        );
        setEstimatedReturn(formattedAmount);
      } catch (error) {
        console.error("Error calculating return:", error);
        setEstimatedReturn("0");
      } finally {
        setIsCalculating(false);
      }
    } else {
      setEstimatedReturn("0");
    }
  };

  // Update the input handler
  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    if (value === "" || isValidNumber(value)) {
      if (tradeType === "buy") {
        setCoreAmount(value);
        if (value && tokenDetails?.contractAddress) {
          const amountInWei = ethers.utils.parseEther(value);
          await calculateEstimatedReturn(
            amountInWei.toString(),
            tokenDetails.contractAddress
          );
        } else {
          setEstimatedReturn("0");
        }
      } else {
        // For sell, only update token amount and calculate return once
        setTokenAmount(value);
        if (value && tokenDetails?.contractAddress) {
          setIsCalculating(true);
          try {
            const sellReturn = await TokenReturnOnSell(
              tokenDetails.contractAddress,
              value
            );
            setEstimatedReturn(sellReturn.ethAmount);
            setCoreAmount(sellReturn.ethAmount);
          } catch (error) {
            console.error("Error calculating sell return:", error);
            setEstimatedReturn("0");
            setCoreAmount("0");
          } finally {
            setIsCalculating(false);
          }
        } else {
          setEstimatedReturn("0");
          setCoreAmount("0");
        }
      }
    }
  };

  const handleTradeTypeToggle = (type: string) => {
    setTradeType(type);
    // Reset inputs
    setTokenAmount("");
    setCoreAmount("");
  };

  const fetchCurrentPrice = async () => {
    if (tokenDetails?.contractAddress) {
      try {
        const price = await getTokenPrice(tokenDetails.contractAddress);
        setCurrentPrice(price);
      } catch (error) {
        console.error("Error fetching price:", error);
      }
    }
  };

  useEffect(() => {
    if (tokenDetails?.contractAddress) {
      fetchCurrentPrice();
    }
    // eslint-disable-next-line
  }, [tokenDetails?.contractAddress]);

  const handleTrade = async () => {
    try {
      setIsTransacting(true);
      setTransactionStatus({ status: null });

      if (tradeType === "buy") {
        console.log(coreAmount, "coreAmount");
        console.log(estimatedReturn, "estimatedReturn");
        if (!coreAmount || !estimatedReturn) {
          console.log("Invalid amount");
          return;
        }
        const coreAmountInWei = ethers.utils.parseEther(coreAmount);

        const tokenReturnOnBuy = await TokenReturnOnBuy(
          tokenDetails?.contractAddress || "",
          coreAmountInWei.toString()
        );
        console.log(tokenReturnOnBuy);
        setEstimatedReturn(tokenReturnOnBuy.tokenAmount.toString());

        const buy = await buyTokens(
          tokenDetails?.contractAddress || "",
          estimatedReturn,
          coreAmount
        );
        if (buy.hash) {
          // Record the buy transaction
          await recordTransaction({
            address: tokenDetails?.contractAddress || undefined,
            creator: user?.wallet?.address,
            type: TransactionType.BUY,
            amount: estimatedReturn,
            price: coreAmount,
            txHash: buy.hash,
            name: tokenDetails?.name || undefined,
            symbol: tokenDetails?.symbol || undefined,
          });

          setTransactionStatus({
            status: "success",
            hash: buy.hash,
          });
          await fetchCurrentPrice();
        }
      } else {
        const tokenReturnOnBuy = await TokenReturnOnSell(
          tokenDetails?.contractAddress || "",
          tokenAmount
        );
        setEstimatedReturn(tokenReturnOnBuy.ethAmount.toString());

        const sell = await sellTokens(
          tokenDetails?.contractAddress || "",
          tokenAmount
        );
        if (sell.hash) {
          // Record the sell transaction
          await recordTransaction({
            address: tokenDetails?.contractAddress,
            creator: user?.wallet?.address,
            type: TransactionType.SELL,
            amount: tokenAmount,
            price: currentPrice,
            txHash: sell.hash,
            name: tokenDetails?.name,
            symbol: tokenDetails?.symbol,
          });

          setTransactionStatus({
            status: "success",
            hash: sell.hash,
          });
          await fetchCurrentPrice();
        }
      }
    } catch (error) {
      console.error("Transaction failed:", error);
      setTransactionStatus({
        status: "error",
        error: (error as Error).message || "Transaction failed",
      });
    } finally {
      setIsTransacting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });

    setTimeout(() => {
      setCopiedText("");
    }, 2000);
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      if (tokenId) {
        try {
          // Fetch transactions from our database
          const { transactions } = await getTokenTransactions(tokenId);
          console.log("DB Transactions:", transactions);

          if (transactions && transactions.length > 0) {
            setRecentTransactions({
              accounts: transactions.map(
                (tx: ITransaction) => tx.userAddress || ""
              ),
              isBuys: transactions.map((tx: ITransaction) => tx.type === "BUY"),
              tokenAmounts: transactions.map(
                (tx: ITransaction) => tx.amount || "0"
              ),
              ethAmounts: transactions.map(
                (tx: ITransaction) => tx.amount || "0"
              ),
              prices: transactions.map((tx: ITransaction) => tx.price || "0"),
              timestamps: transactions.map(
                (tx: ITransaction) => tx.timestamp || new Date().toISOString()
              ),
              type: transactions.map((tx: ITransaction) => tx.type || ""),
              txHashes: transactions.map((tx: ITransaction) => tx.txHash || ""),
            });
          }
        } catch (error) {
          console.error("Error fetching transactions:", error);
        }
      }
    };

    fetchData();
  }, [tokenId]);

  // Update the initializeChart function
  const initializeChart = useCallback(() => {
    if (!chartContainerRef.current || candleData.length === 0) return;

    const chartOptions = {
      layout: {
        background: { type: ColorType.Solid, color: "#0D0B15" },
        textColor: "#d1d4dc",
      },
      grid: {
        vertLines: { color: "rgba(42, 46, 57, 0.6)" },
        horzLines: { color: "rgba(42, 46, 57, 0.6)" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "rgba(42, 46, 57, 0.6)",
        textColor: "#d1d4dc",
      },
      rightPriceScale: {
        borderColor: "rgba(42, 46, 57, 0.6)",
        textColor: "#d1d4dc",
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "#758696",
          width: 1 as LineWidth,
          style: LineStyle.Dashed,
        },
        horzLine: {
          color: "#758696",
          width: 1 as LineWidth,
          style: LineStyle.Dashed,
        },
      },
    };

    const chart = createChart(chartContainerRef.current, chartOptions);
    // Create series with professional styling
    const mainSeries = chart.addSeries(LineSeries, {
      title: "Price",
      lastValueVisible: true,
      priceLineVisible: false,
      baseLineVisible: false,
      color: "#26a69a",
    });

    // Set the data
    mainSeries.setData(
      candleData
        .sort((a, b) => a.time - b.time)
        .map((d) => ({
          time: d.time as Time,
          value: d.close,
        }))
    );

    // Add volume series
    const volumeSeries = chart.addSeries(LineSeries, {
      title: "Volume",
      lastValueVisible: true,
      priceLineVisible: false,
      baseLineVisible: false,
      color: "rgba(38, 166, 154, 0.5)",
      priceScaleId: "",
    });

    // Set volume data
    volumeSeries.setData(
      candleData
        .sort((a, b) => a.time - b.time)
        .map((d) => ({
          time: d.time as Time,
          value: d.volume,
        }))
    );

    // Handle legend updates
    const legend = document.createElement("div");
    legend.style.position = "absolute";
    legend.style.left = "12px";
    legend.style.top = "12px";
    legend.style.zIndex = "1";
    legend.style.fontSize = "12px";
    legend.style.color = "#d1d4dc";
    legend.style.fontFamily = "sans-serif";
    chartContainerRef.current.appendChild(legend);

    chart.subscribeCrosshairMove((param) => {
      if (param.time) {
        const data = param.seriesData.get(mainSeries) as CandlestickData;
        if (data) {
          legend.innerHTML = `
            <div style="font-size: 13px; margin: 4px 0;">
              O <span style="color: #d1d4dc">${data.open.toFixed(6)}</span> 
              H <span style="color: #d1d4dc">${data.high.toFixed(6)}</span> 
              L <span style="color: #d1d4dc">${data.low.toFixed(6)}</span> 
              C <span style="color: #d1d4dc">${data.close.toFixed(6)}</span>
            </div>
          `;
        }
      } else {
        legend.innerHTML = "";
      }
    });

    // Fit content and add margin
    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [candleData]);

  // Update the useEffect for fetching candle data
  useEffect(() => {
    const fetchCandleData = async () => {
      if (tokenId) {
        try {
          const data = await getCandleData(tokenId);
          // Format the data for the chart
          const formattedData = data.map((d: CandleDataPoint) => ({
            time: Math.floor(d.time / 1000) as Time,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
            volume: d.volume,
          }));
          setCandleData(formattedData);
        } catch (error) {
          console.error("Error fetching candle data:", error);
        }
      }
    };

    fetchCandleData();
  }, [tokenId]);

  // Initialize chart when candle data changes
  useEffect(() => {
    const cleanup = initializeChart();
    return () => {
      if (cleanup) cleanup();
    };
  }, [initializeChart]);

  // Add resize handler
  useEffect(() => {
    const handleResize = () => {
      if (chartContainerRef.current) {
        const cleanup = initializeChart();
        if (cleanup) cleanup();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [initializeChart]);

  // Add helper function to format duration
  const formatLockDuration = (seconds: string) => {
    const days = Math.floor(parseInt(seconds) / 86400);
    if (days > 0) {
      return `${days} days`;
    }
    const hours = Math.floor(parseInt(seconds) / 3600);
    return `${hours} hours`;
  };

  if (!isClient) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-[#0D0B15]">
      <Navbar />

      <div className="container mx-auto px-4 pt-32 pb-20">
        {/* Token Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            {tokenImage && (
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#ffae5c]/20">
                <Image
                  src={tokenImage}
                  alt={tokenDetails?.name || "Token"}
                  className="w-full h-full object-cover"
                  width={64}
                  height={64}
                />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold text-white">
                  {tokenDetails?.name || "Loading..."}
                </h1>
                <span className="text-white/60 text-xl">
                  {tokenDetails?.symbol || "..."}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="px-2 py-1 rounded-md bg-[#ffae5c]/10 border border-[#ffae5c]/20 text-white/80 text-xs flex items-center gap-1">
                  <Shield className="w-3 h-3 text-[#ffae5c]" />
                  <span>Clampify Verified</span>
                </div>
                <div className="px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20 text-green-400 text-xs">
                  Live
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Button
              onClick={() =>
                copyToClipboard(window.location.href, "Share link")
              }
              variant="outline"
              size="icon"
              className="border-[#ffae5c]/30 bg-[#ffae5c]/5 hover:bg-[#ffae5c]/10"
            >
              <Share2 className="w-5 h-5 text-white" />
            </Button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2/3 width on large screens) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Price Card with GeckoTerminal Integration */}
            <div className="bg-[#0D0B15] rounded-xl overflow-hidden border border-[#2A2E39]">
              <div className="p-4 border-b border-[#2A2E39]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[#ffae5c]" />
                    <h3 className="text-lg font-medium text-white">
                      Price Chart
                    </h3>
                  </div>
                  <div className="flex gap-2">
                    {["1H", "1D", "1W", "1M"].map((timeframe) => (
                      <Button
                        key={timeframe}
                        variant="ghost"
                        className={`px-3 py-1 ${
                          activeTimeframe === timeframe
                            ? "bg-[#ffae5c] text-white"
                            : "text-white/70 hover:text-white"
                        }`}
                        onClick={() => setActiveTimeframe(timeframe)}
                      >
                        {timeframe}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="relative">
                <div ref={chartContainerRef} className="h-[400px] w-full" />
              </div>
            </div>

            {/* Token Metrics Tabs */}
            <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-[#ffae5c]/20 p-6">
              <div className="mb-6">
                <div className="flex overflow-x-auto scrollbar-hide px-1 py-1 gap-1 bg-black/30 rounded-xl">
                  {[
                    {
                      value: "metrics",
                      label: "Overview",
                      icon: <BarChart3 className="w-4 h-4" />,
                    },
                    {
                      value: "security",
                      label: "Security",
                      icon: <Shield className="w-4 h-4" />,
                    },
                    {
                      value: "holders",
                      label: "Holders",
                      icon: <Users className="w-4 h-4" />,
                    },
                  ].map((tab) => (
                    <button
                      key={tab.value}
                      className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg whitespace-nowrap transition-all duration-200 ${
                        activeTab === tab.value
                          ? "bg-gradient-to-r from-[#ffae5c] to-[#4834D4] text-white shadow-md shadow-[#ffae5c]/20 font-medium"
                          : "text-white/60 hover:text-white hover:bg-white/5"
                      }`}
                      onClick={() => setActiveTab(tab.value)}
                    >
                      <span
                        className={
                          activeTab === tab.value
                            ? "text-white"
                            : "text-[#ffae5c]"
                        }
                      >
                        {tab.icon}
                      </span>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <div className="relative">
                {/* Overview Tab Content */}
                <div
                  className={`transition-all duration-300 ${
                    activeTab === "metrics"
                      ? "opacity-100"
                      : "opacity-0 absolute inset-0 pointer-events-none"
                  }`}
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                      <div className="text-white/60 text-sm">Market Cap</div>
                      <div className="text-white font-bold text-lg">
                        {parseFloat(
                          ethers.utils.formatEther(
                            tokenDetails?.marketCap.toString() || "0"
                          )
                        )?.toFixed(4)}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/60 text-sm">24h Volume</div>
                      <div className="text-white font-bold text-lg">
                        {parseFloat(
                          ethers.utils.formatEther(
                            tokenDetails?.volume24h.toString() || "0"
                          )
                        )?.toFixed(4)}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/60 text-sm">Total Supply</div>
                      <div className="text-white font-bold text-lg">
                        {parseFloat(tokenDetails?.totalSupply || "0")?.toFixed(
                          4
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/60 text-sm">Holders</div>
                      <div className="text-white font-bold text-lg">
                        {topHolders}
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-white/10 my-6" />

                  {/* Supply Distribution Card */}
                  <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-[#ffae5c]/20 p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <PieChart className="w-5 h-5 text-[#ffae5c]" />
                      <h3 className="text-lg font-medium text-white">
                        Supply Distribution
                      </h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="text-white font-medium mb-2">
                          Total Supply Distribution
                        </div>
                        <div className="flex items-center">
                          <div className="w-full h-5 bg-[#ffae5c]/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#ffae5c]/80 to-[#4834D4]/80"
                              style={{
                                width: `${
                                  ((parseInt(
                                    tokenDetails?.initialSupply || "0"
                                  ) /
                                    2 +
                                    (tokenLockDetails.lockLiquidity
                                      ? parseInt(
                                          tokenDetails?.initialSupply || "0"
                                        ) * 0.2
                                      : 0)) /
                                    parseInt(
                                      tokenDetails?.totalSupply || "1"
                                    )) *
                                  100
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                        <div className="flex justify-between mt-2 text-sm">
                          <div className="text-white/60">
                            <span className="inline-block w-3 h-3 rounded-full bg-[#ffae5c]/80 mr-2"></span>
                            Circulating:{" "}
                            {formatNumber(
                              parseInt(tokenDetails?.initialSupply || "0")
                            )}{" "}
                            ({30}%)
                          </div>
                          <div className="text-white/60">
                            <span className="inline-block w-3 h-3 rounded-full bg-[#ffae5c]/20 mr-2"></span>
                            Locked:{" "}
                            {formatNumber(
                              parseInt(tokenDetails?.initialSupply || "0") / 2 +
                                (tokenLockDetails.lockLiquidity
                                  ? parseInt(
                                      tokenDetails?.initialSupply || "0"
                                    ) * 0.2
                                  : 0)
                            )}{" "}
                            ({70}%)
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="text-white font-medium mb-2">
                          Lock Details
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">Creator Lock:</span>
                            <span className="text-white">
                              {formatNumber(
                                parseInt(tokenDetails?.initialSupply || "0") / 2
                              )}{" "}
                              (
                              {formatLockDuration(
                                tokenLockDetails.creatorLockupPeriod
                              )}
                              )
                            </span>
                          </div>
                          {tokenLockDetails.lockLiquidity && (
                            <div className="flex justify-between text-sm">
                              <span className="text-white/60">
                                Liquidity Lock:
                              </span>
                              <span className="text-white">
                                {formatNumber(
                                  parseInt(tokenDetails?.initialSupply || "0") *
                                    0.2
                                )}{" "}
                                (
                                {formatLockDuration(
                                  tokenLockDetails.liquidityLockPeriod
                                )}
                                )
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-white/10 my-6" />

                  <div>
                    <div className="text-white font-medium mb-2">
                      About {tokenDetails?.name || "Loading..."}
                    </div>
                    <p className="text-white/70">{tokenData.description}</p>
                  </div>
                </div>

                {/* Security Tab Content */}
                <div
                  className={`transition-all duration-300 ${
                    activeTab === "security"
                      ? "opacity-100"
                      : "opacity-0 absolute inset-0 pointer-events-none"
                  }`}
                >
                  <div className="p-4 bg-[#ffae5c]/10 rounded-xl flex items-start gap-3">
                    <div className="mt-1">
                      <Shield className="w-5 h-5 text-[#ffae5c]" />
                    </div>
                    <div>
                      <div className="text-white font-medium">
                        Clampify Protected
                      </div>
                      <p className="text-white/70 text-sm">
                        This token includes advanced supply locking and anti-rug
                        pull protection.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6 mt-6">
                    <div>
                      <div className="text-white font-medium mb-2 flex items-center">
                        <Lock className="w-4 h-4 mr-2 text-[#ffae5c]" />
                        Supply Lock Status
                      </div>
                      <div className="bg-black/30 rounded-xl p-4 space-y-4">
                        <div className="flex justify-between">
                          <span className="text-white/60">
                            Lock Percentage:
                          </span>
                          <span className="text-white">
                            {tokenData.supplyLockPercentage}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Unlock Style:</span>
                          <span className="text-white">
                            {tokenData.unlockStyle} Release
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Lock Duration:</span>
                          <span className="text-white">
                            {tokenData.lockDuration} days
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Days Remaining:</span>
                          <span className="text-white">{daysLeft} days</span>
                        </div>

                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-white/60">
                              Unlock Progress:
                            </span>
                            <span className="text-white">
                              {percentUnlocked?.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full h-3 bg-[#ffae5c]/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#ffae5c] to-[#4834D4]"
                              style={{ width: `${percentUnlocked}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-white font-medium mb-2 flex items-center">
                        <Shield className="w-4 h-4 mr-2 text-[#ffae5c]" />
                        Anti-Rug Protection
                      </div>
                      <div className="bg-black/30 rounded-xl p-4 space-y-4">
                        <div className="flex justify-between">
                          <span className="text-white/60">
                            Max Wallet Size:
                          </span>
                          <span className="text-white">
                            {tokenData.maxWalletSize}% (
                            {formatNumber(
                              (parseInt(tokenDetails?.totalSupply || "0") *
                                parseFloat(tokenData.maxWalletSize)) /
                                100
                            )}{" "}
                            tokens)
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">
                            Max Transaction:
                          </span>
                          <span className="text-white">
                            {tokenData.maxTxAmount}% (
                            {formatNumber(
                              (parseInt(tokenDetails?.totalSupply || "0") *
                                parseFloat(tokenData.maxTxAmount)) /
                                100
                            )}{" "}
                            tokens)
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Buy Tax:</span>
                          <span className="text-white">
                            {tokenData.buyTax}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Sell Tax:</span>
                          <span className="text-white">
                            {tokenData.sellTax}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Holders Tab Content */}
                <div
                  className={`transition-all duration-300 ${
                    activeTab === "holders"
                      ? "opacity-100"
                      : "opacity-0 absolute inset-0 pointer-events-none"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-[#ffae5c]" />
                    <h3 className="text-lg font-medium text-white">
                      Top Token Holders
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {[
                      {
                        address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
                        percent: 15.3,
                        tokens: 1530000000,
                        tag: "Team (Locked)",
                      },
                      {
                        address: "0x3A54fBc48BF578BE35B8B856917816f22D7d6C4e",
                        percent: 7.2,
                        tokens: 720000000,
                        tag: "Marketing",
                      },
                      {
                        address: "0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db",
                        percent: 5.5,
                        tokens: 550000000,
                      },
                      {
                        address: "0x5AEDA56215b167893e80B4fE645BA6d5Bab767DE",
                        percent: 4.8,
                        tokens: 480000000,
                      },
                      {
                        address: "0x6A355BB6fC990e82B99b6C500a8d586e3aDd30e3",
                        percent: 3.2,
                        tokens: 320000000,
                      },
                    ].map((holder, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 bg-black/20 rounded-xl hover:bg-black/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#ffae5c]/20 flex items-center justify-center text-white/70">
                            {i + 1}
                          </div>
                          <div>
                            <div className="text-white font-medium">
                              {holder.address.slice(0, 6)}...
                              {holder.address.slice(-4)}
                            </div>
                            {holder.tag && (
                              <div className="text-[#ffae5c] text-xs">
                                {holder.tag}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-white">{holder.percent}%</div>
                          <div className="text-white/50 text-sm">
                            {formatNumber(holder.tokens)} tokens
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="text-center mt-4">
                    <Button variant="link" className="text-[#ffae5c]">
                      View All Holders <ChevronDown className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Transactions Section */}
            <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-[#ffae5c]/20 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#ffae5c]" />
                  <h3 className="text-lg font-medium text-white">
                    Recent Transactions
                  </h3>
                </div>
                <Button variant="link" className="text-[#ffae5c]">
                  View All
                </Button>
              </div>

              <div className="space-y-3">
                {recentTransactions?.accounts.map((account, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-black/20 rounded-xl hover:bg-black/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full ${
                          recentTransactions?.type[i] === "BUY"
                            ? "bg-green-500/20"
                            : recentTransactions?.type[i] === "SELL"
                            ? "bg-red-500/20"
                            : "bg-purple-500/20"
                        } flex items-center justify-center`}
                      >
                        {recentTransactions?.type[i] === "CREATE" ? (
                          <Rocket className="w-4 h-4 text-purple-400" />
                        ) : recentTransactions?.type[i] === "BUY" ? (
                          <ArrowUpRight className="w-4 h-4 text-green-400" />
                        ) : (
                          <ArrowDown className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                      <div>
                        <div className="text-white font-medium">
                          {recentTransactions?.type[i] === "CREATE" ? (
                            <>
                              Token Created:{" "}
                              {tokenDetails?.name || "Unknown Token"}
                            </>
                          ) : (
                            <>
                              {recentTransactions?.type[i]}{" "}
                              {parseFloat(
                                recentTransactions?.tokenAmounts[i] || "0"
                              )?.toFixed(2)}{" "}
                              {tokenDetails?.symbol}
                            </>
                          )}
                        </div>
                        <div className="text-white/50 text-sm flex items-center gap-2">
                          by{" "}
                          {account
                            ? `${account.slice(0, 6)}...${account.slice(-4)}`
                            : "Unknown"}
                          {recentTransactions?.txHashes?.[i] && (
                            <a
                              href={
                                recentTransactions?.type[i] === "CREATE"
                                  ? `https://amoy.polygonscan.com/address/${recentTransactions.txHashes[i]}`
                                  : `https://amoy.polygonscan.com/tx/${recentTransactions.txHashes[i]}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#6C5CE7] hover:underline"
                            >
                              {recentTransactions?.type[i] === "CREATE"
                                ? "View Contract"
                                : "View Tx"}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {recentTransactions?.type[i] !== "CREATE" && (
                        <div className="text-white">
                          {parseFloat(
                            recentTransactions?.prices[i] || "0"
                          )?.toFixed(10)}{" "}
                          tCORE
                        </div>
                      )}
                      <div className="text-white/50 text-xs">
                        {getTimeAgo(
                          recentTransactions?.timestamps[i] ||
                            new Date().toISOString()
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column (1/3 width on large screens) */}
          <div className="space-y-6">
            {/* Trading Card */}
            <div className="bg-black/30 backdrop-blur-sm rounded-xl border border-[#ffae5c]/20 overflow-hidden top-24">
              {/* Buy/Sell Header */}
              <div className="grid grid-cols-2">
                <button
                  className={`py-4 text-center font-medium text-lg transition-colors ${
                    tradeType === "buy"
                      ? "bg-gradient-to-r from-[#ffae5c] to-[#4834D4] text-white"
                      : "bg-black/40 text-white/60 hover:text-white hover:bg-black/50"
                  }`}
                  onClick={() => handleTradeTypeToggle("buy")}
                >
                  Buy
                </button>
                <button
                  className={`py-4 text-center font-medium text-lg transition-colors ${
                    tradeType === "sell"
                      ? "bg-gradient-to-r from-[#ffae5c] to-[#4834D4] text-white"
                      : "bg-black/40 text-white/60 hover:text-white hover:bg-black/50"
                  }`}
                  onClick={() => handleTradeTypeToggle("sell")}
                >
                  Sell
                </button>
              </div>

              {/* Trading Form */}
              <div className="p-6">
                {/* Amount Input */}
                <div className="mb-6">
                  <div className="flex justify-between text-white/60 text-sm mb-2 px-1">
                    <span>{tradeType === "buy" ? "You Pay" : "You Sell"}</span>
                    {tradeType === "sell" && (
                      <div className="flex items-center gap-1 text-[#ffae5c]">
                        <Wallet className="w-3.5 h-3.5" />
                        <span>
                          {tokenBalance} {tokenDetails?.symbol || "..."}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="bg-black/40 rounded-xl border border-[#ffae5c]/10 focus-within:border-[#ffae5c]/30 transition-colors overflow-hidden">
                    <div className="flex">
                      <input
                        type="text"
                        placeholder="0"
                        className="bg-transparent border-none text-white text-xl font-medium w-full outline-none px-4 py-5"
                        value={tradeType === "buy" ? coreAmount : tokenAmount}
                        onChange={handleInputChange}
                        inputMode="decimal"
                        pattern="[0-9]*[.]?[0-9]*"
                      />
                      <div className="flex items-center px-4 text-white">
                        <div className="flex items-center gap-2 bg-[#ffae5c]/20 px-3 py-2 rounded-lg">
                          {tradeType === "buy" ? (
                            <>
                              <div className="w-6 h-6 rounded-full bg-[#ffae5c]/30 flex items-center justify-center">
                                P
                              </div>
                              <span>POL</span>
                            </>
                          ) : (
                            <>
                              <div className="w-6 h-6 rounded-full bg-[#ffae5c]/30 flex items-center justify-center">
                                🐸
                              </div>
                              <span>{tokenDetails?.symbol || "..."}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Amount Buttons */}
                <div className="grid grid-cols-4 gap-2 mb-6">
                  <button
                    className="py-2 bg-black/30 text-white/60 hover:text-white hover:bg-[#ffae5c]/10 rounded-lg text-sm font-medium transition-colors"
                    onClick={() => {
                      if (tradeType === "buy") {
                        setCoreAmount("");
                      } else {
                        setTokenAmount("");
                      }
                    }}
                  >
                    Reset
                  </button>

                  {tradeType === "buy" ? (
                    // Core amount buttons
                    <>
                      <button
                        className="py-2 bg-black/30 text-white/60 hover:text-white hover:bg-[#ffae5c]/10 rounded-lg text-sm font-medium transition-colors"
                        onClick={() => setCoreAmount("1")}
                      >
                        1
                      </button>
                      <button
                        className="py-2 bg-black/30 text-white/60 hover:text-white hover:bg-[#ffae5c]/10 rounded-lg text-sm font-medium transition-colors"
                        onClick={() => setCoreAmount("5")}
                      >
                        5
                      </button>
                      <button
                        className="py-2 bg-black/30 text-white/60 hover:text-white hover:bg-[#ffae5c]/10 rounded-lg text-sm font-medium transition-colors"
                        onClick={() => setCoreAmount("10")}
                      >
                        10
                      </button>
                    </>
                  ) : (
                    // Token percentage buttons
                    <>
                      <button
                        className="py-2 bg-black/30 text-white/60 hover:text-white hover:bg-[#ffae5c]/10 rounded-lg text-sm font-medium transition-colors"
                        onClick={() => {
                          const maxAmount =
                            parseInt(tokenDetails?.totalSupply || "0") *
                            0.001 *
                            0.25;
                          setTokenAmount(maxAmount?.toFixed(0));
                        }}
                      >
                        25%
                      </button>
                      <button
                        className="py-2 bg-black/30 text-white/60 hover:text-white hover:bg-[#ffae5c]/10 rounded-lg text-sm font-medium transition-colors"
                        onClick={() => {
                          const maxAmount =
                            parseInt(tokenDetails?.totalSupply || "0") *
                            0.001 *
                            0.5;
                          setTokenAmount(maxAmount?.toFixed(0));
                        }}
                      >
                        50%
                      </button>
                      <button
                        className="py-2 bg-black/30 text-white/60 hover:text-white hover:bg-[#ffae5c]/10 rounded-lg text-sm font-medium transition-colors"
                        onClick={() => {
                          const maxAmount =
                            parseInt(tokenDetails?.totalSupply || "0") *
                            0.001 *
                            0.75;
                          setTokenAmount(maxAmount?.toFixed(0));
                        }}
                      >
                        75%
                      </button>
                    </>
                  )}
                </div>

                {/* Estimated Receive Amount */}
                <div className="bg-black/20 rounded-xl p-4 mb-6 border border-[#ffae5c]/10">
                  <div className="flex justify-between text-white/60 text-sm mb-1">
                    <span>You&apos;ll Receive (estimated)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-white text-xl font-medium">
                      {tradeType === "buy" ? (
                        isCalculating ? (
                          <span className="text-white/50">Calculating...</span>
                        ) : estimatedReturn ? (
                          parseFloat(estimatedReturn)?.toFixed(2)
                        ) : (
                          "0"
                        )
                      ) : coreAmount ? (
                        parseFloat(coreAmount)
                      ) : (
                        "0"
                      )}
                    </div>
                    <div className="text-white/80">
                      {tradeType === "buy"
                        ? tokenDetails?.symbol || "..."
                        : "POL"}
                    </div>
                  </div>
                </div>

                {/* Settings Row */}
                <div className="flex justify-between items-center mb-6 py-2 px-1">
                  <button
                    className="flex items-center gap-1 text-white/60 hover:text-white text-sm"
                    onClick={() =>
                      setShowSlippageSettings(!showSlippageSettings)
                    }
                  >
                    <Settings className="w-4 h-4" />
                    <span>Slippage: {slippage}%</span>
                  </button>

                  <div className="flex items-center gap-1 text-white/60 text-sm">
                    <span>
                      1 {tokenDetails?.symbol || "..."} ≈ $
                      {tokenDetails?.initialPrice || "Loading..."}
                    </span>
                  </div>
                </div>

                {/* Slippage Settings Modal */}
                {showSlippageSettings && (
                  <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
                    <div className="bg-[#0D0B15] rounded-xl p-6 border border-[#ffae5c]/30 max-w-sm w-full">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-white text-lg font-medium">
                          Set Slippage Tolerance
                        </h3>
                        <button
                          className="text-white/60 hover:text-white"
                          onClick={() => setShowSlippageSettings(false)}
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {[0.1, 0.5, 1.0, 2.0].map((value) => (
                          <button
                            key={value}
                            className={`px-4 py-2 rounded-lg text-sm ${
                              slippage === value
                                ? "bg-gradient-to-r from-[#ffae5c] to-[#4834D4] text-white"
                                : "bg-black/40 text-white/60 hover:text-white"
                            }`}
                            onClick={() => setSlippage(value)}
                          >
                            {value}%
                          </button>
                        ))}
                      </div>
                      <div className="relative mb-6">
                        <input
                          type="number"
                          className="w-full bg-black/40 border border-[#ffae5c]/20 text-white h-12 pl-3 pr-8 py-2 rounded-lg"
                          placeholder="Custom"
                          value={slippage}
                          onChange={(e) =>
                            setSlippage(parseFloat(e.target.value) || 0.5)
                          }
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60">
                          %
                        </div>
                      </div>
                      <Button
                        className="w-full py-3 rounded-lg bg-gradient-to-r from-[#ffae5c] to-[#4834D4] text-white font-medium"
                        onClick={() => setShowSlippageSettings(false)}
                      >
                        Save Settings
                      </Button>
                    </div>
                  </div>
                )}

                {/* Trade Button */}
                <button
                  className={`w-full py-4 rounded-xl text-center font-medium text-lg ${
                    !coreAmount || parseFloat(coreAmount) <= 0
                      ? "bg-[#ffae5c]/40 text-white/70 cursor-not-allowed"
                      : "bg-gradient-to-r from-[#ffae5c] to-[#4834D4] text-white hover:opacity-90"
                  }`}
                  onClick={handleTrade}
                  // disabled={
                  //   !tokenAmount ||
                  //   parseFloat(tokenAmount) <= 0 ||
                  //   !coreAmount ||
                  //   parseFloat(coreAmount) <= 0
                  // }
                >
                  Place Trade
                </button>

                {/* Tax Info */}
                <div className="mt-3 text-center">
                  <span className="px-3 py-1 bg-[#ffae5c]/10 text-white/70 text-sm rounded-full">
                    {tradeType === "buy"
                      ? `Buy Tax: ${tokenData.buyTax}%`
                      : `Sell Tax: ${tokenData.sellTax}%`}
                  </span>
                </div>
              </div>
            </div>

            {/* Token Info Card */}
            <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-[#ffae5c]/20 p-6">
              <h3 className="text-lg font-medium text-white mb-4">
                Token Information
              </h3>

              <div className="space-y-4">
                <div>
                  <div className="text-white/60 text-sm mb-1">
                    Contract Address
                  </div>
                  <div className="flex items-center justify-between bg-black/30 rounded-lg p-3">
                    <span className="text-white text-sm truncate mr-2">
                      {tokenDetails?.contractAddress || "Loading..."}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-md hover:bg-[#ffae5c]/10"
                      onClick={() =>
                        copyToClipboard(
                          tokenDetails?.contractAddress || "",
                          "Contract address"
                        )
                      }
                    >
                      {copiedText === "Contract address" ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4 text-white/70" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-white/60 text-sm">Decimals</div>
                    <div className="text-white">
                      {tokenDetails?.decimals || "Loading..."}
                    </div>
                  </div>
                  <div>
                    <div className="text-white/60 text-sm">Launch Date</div>
                    {/* <div className="text-white">
                      {tokenDetails?.createdAt
                        ? new Date(tokenDetails.createdAt).toLocaleDateString()
                        : "Loading..."}
                    </div> */}
                  </div>
                </div>

                <Separator className="bg-white/10" />
              </div>
            </div>

            {/* Supply Lock Card */}
            <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-[#ffae5c]/20 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-5 h-5 text-[#ffae5c]" />
                <h3 className="text-lg font-medium text-white">Supply Lock</h3>
              </div>

              <div className="bg-[#ffae5c]/10 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-[#ffae5c]" />
                  <div className="text-white font-medium">Unlock Schedule</div>
                </div>
                <p className="text-white/70 text-sm mb-4">
                  {tokenData.unlockStyle === "Linear"
                    ? "Tokens unlock gradually every day for the entire lock period."
                    : "Tokens unlock based on predefined milestones."}
                </p>

                <div className="flex justify-between mb-2">
                  <span className="text-white/60 text-sm">Days remaining:</span>
                  <span className="text-white text-sm font-medium">
                    {daysLeft} of {tokenData.lockDuration}
                  </span>
                </div>

                <div className="w-full h-3 bg-black/30 rounded-full overflow-hidden mb-1">
                  <div
                    className="h-full bg-gradient-to-r from-[#ffae5c] to-[#4834D4]"
                    style={{
                      width: `${
                        ((tokenData.lockDuration - daysLeft) /
                          tokenData.lockDuration) *
                        100
                      }%`,
                    }}
                  />
                </div>

                <div className="flex justify-between text-xs text-white/50">
                  <span>Start</span>
                  <span>
                    End: {new Date(tokenData.unlockEnd).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-white/70">Initially Locked:</span>
                  <span className="text-white font-medium">
                    {tokenData.supplyLockPercentage}% (
                    {formatNumber(parseInt(tokenDetails?.totalSupply || "0"))})
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-white/70">Currently Locked:</span>
                  <span className="text-white font-medium">
                    {(
                      tokenData.supplyLockPercentage - percentUnlocked
                    )?.toFixed(1)}
                    % (
                    {formatNumber(
                      (parseInt(tokenDetails?.totalSupply || "0") *
                        percentUnlocked) /
                        100
                    )}
                    )
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-white/70">Already Unlocked:</span>
                  <span className="text-white font-medium">
                    {percentUnlocked?.toFixed(1)}% (
                    {formatNumber(
                      (parseInt(tokenDetails?.totalSupply || "0") *
                        percentUnlocked) /
                        100
                    )}
                    )
                  </span>
                </div>
              </div>
            </div>

            {/* Anti-Rug Protections Card */}
            <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-[#ffae5c]/20 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-[#ffae5c]" />
                <h3 className="text-lg font-medium text-white">
                  Anti-Rug Safeguards
                </h3>
              </div>

              <Accordion type="single" collapsible className="w-full">
                <AccordionItem
                  value="wallet-limit"
                  className="border-b border-[#ffae5c]/10"
                >
                  <AccordionTrigger className="text-white hover:no-underline py-3">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-[#ffae5c]" />
                      <span>Wallet Size Limit</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-white/70 pb-4">
                    Maximum {tokenData.maxWalletSize}% of total supply per
                    wallet. This prevents single entities from obtaining too
                    much control.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem
                  value="tx-limit"
                  className="border-b border-[#ffae5c]/10"
                >
                  <AccordionTrigger className="text-white hover:no-underline py-3">
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="w-4 h-4 text-[#ffae5c]" />
                      <span>Transaction Limit</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-white/70 pb-4">
                    Maximum {tokenData.maxTxAmount}% of total supply per
                    transaction. This prevents large dumps that could crash the
                    price.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem
                  value="tax"
                  className="border-b border-[#ffae5c]/10"
                >
                  <AccordionTrigger className="text-white hover:no-underline py-3">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-[#ffae5c]" />
                      <span>Transaction Taxes</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-white/70 pb-4">
                    Buy tax: {tokenData.buyTax}%<br />
                    Sell tax: {tokenData.sellTax}%<br />
                    <br />
                    Taxes are used for liquidity additions, marketing, and
                    development.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="liquidity" className="border-0">
                  <AccordionTrigger className="text-white hover:no-underline py-3">
                    <div className="flex items-center gap-2">
                      <PieChart className="w-4 h-4 text-[#ffae5c]" />
                      <span>Liquidity Protection</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-white/70 pb-4">
                    Liquidity tokens are locked for {tokenData.lockDuration}{" "}
                    days, making it impossible for the creator to withdraw
                    liquidity (rug pull).
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </div>

        {/* Additional Information or Warning */}
        <div className="mt-8 p-5 bg-[#ffae5c]/5 backdrop-blur-sm rounded-xl border border-[#ffae5c]/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#ffae5c] mt-1 flex-shrink-0" />
            <div>
              <div className="text-white font-medium mb-1">Disclaimer</div>
              <p className="text-white/70">
                Clampify provides anti-rug pull protection and supply locking,
                but this is not investment advice. Always do your own research
                before investing in any cryptocurrency. While this token has
                safeguards in place, the value can still fluctuate based on
                market conditions.
              </p>
            </div>
          </div>
        </div>

        {isTransacting && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50">
            <div className="text-center p-6 bg-[#0D0B15] rounded-xl border border-[#ffae5c]/20">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-[#ffae5c]/20 border-t-[#ffae5c] animate-spin"></div>
              <p className="text-white">Transaction in progress...</p>
            </div>
          </div>
        )}

        {!isTransacting && transactionStatus.status && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50">
            <div className="text-center p-6 bg-[#0D0B15] rounded-xl border border-[#ffae5c]/20 max-w-md w-full">
              {transactionStatus.status === "success" ? (
                <>
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    Transaction Successful!
                  </h3>
                  <Button
                    className="mt-4 bg-[#ffae5c]"
                    onClick={() =>
                      window.open(
                        `https://amoy.polygonscan.com/tx/${transactionStatus.hash}`,
                        "_blank"
                      )
                    }
                  >
                    View on Explorer
                  </Button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                    <X className="w-8 h-8 text-red-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    Transaction Failed
                  </h3>
                  <p className="text-white/70">{transactionStatus.error}</p>
                </>
              )}
              <Button
                variant="ghost"
                className="mt-4 ml-4 bg-[#ffae5c] text-white"
                onClick={() => setTransactionStatus({ status: null })}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
