import { ethers } from "ethers";
import ClampifyFactory from "../deployments/ClampifyFactory.json";
import ClampifyToken from "../deployments/ClampifyToken.json";

const isBrowser = (): boolean => typeof window !== "undefined";

const { ethereum } = isBrowser() ? window : { ethereum: null };

const contract_address: string = ""; // Clampify Factory Contract Address

// Add RPC URL for the network you're using (0G testnet)
const RPC_URL = "https://evmrpc-testnet.0g.ai/";

interface TokenInfo {
  name: string;
  symbol: string;
  totalSupply: string;
  tokenAmount: string;
  contractAddress: string;
}

export const Mint = async (
  name: string,
  symbol: string,
  initialSupply: string,
  maxSupply: string,
  initialPrice: string,
  creatorLockupPeriod: string,
  lockLiquidity: boolean,
  liquidityLockPeriod: string
): Promise<string> => {
  try {
    const provider =
      ethereum != null
        ? new ethers.providers.Web3Provider(ethereum)
        : new ethers.providers.JsonRpcProvider(RPC_URL);

    const signer = ethereum != null ? provider.getSigner() : null;

    if (!signer) {
      throw new Error("No wallet connected");
    }
    const contract = new ethers.Contract(
      contract_address,
      ClampifyFactory,
      signer
    );
    const initialPriceWei = ethers.utils.parseEther(initialPrice);
    const depositAmount = ethers.utils.parseEther("0.01");

    // Create token
    const tx = await contract.createToken(
      name,
      symbol,
      initialSupply,
      maxSupply,
      initialPriceWei,
      creatorLockupPeriod,
      lockLiquidity,
      liquidityLockPeriod,
      {
        value: depositAmount,
      }
    );

    const receipt = await tx.wait();

    const tokenCreatedEvent = receipt.events[0];
    const tokenAddress = tokenCreatedEvent.address;
    return tokenAddress;
  } catch (error) {
    console.error("Detailed error:", error);
    throw error;
  }
};
export const TokenReturnOnBuy = async (
  tokenAddress: string,
  amount: string
): Promise<TokenInfo> => {
  console.log(tokenAddress, amount);
  try {
    const provider =
      ethereum != null
        ? new ethers.providers.Web3Provider(ethereum)
        : new ethers.providers.JsonRpcProvider();

    const signer = ethereum != null ? provider.getSigner() : null;

    if (!signer) {
      throw new Error("No wallet connected");
    }

    const contract = new ethers.Contract(tokenAddress, ClampifyToken, signer);
    const name = await contract.name();
    const symbol = await contract.symbol();
    const totalSupply = await contract.totalSupply();

    // Add gas limit to prevent out of gas error
    const tokenAmount = await contract.calculatePurchaseReturn(amount);

    return {
      name,
      symbol,
      totalSupply,
      tokenAmount,
      contractAddress: tokenAddress,
    };
  } catch (error) {
    console.error("Detailed error:", error);
    throw error;
  }
};

export const buyTokens = async (
  tokenAddress: string,
  amount: string,
  tokenAmount: string
): Promise<{ hash: string }> => {
  try {
    console.log(tokenAddress, amount, tokenAmount);
    console.log("at buy tokens");

    const provider =
      ethereum != null
        ? new ethers.providers.Web3Provider(ethereum)
        : new ethers.providers.JsonRpcProvider(RPC_URL);

    console.log(provider);

    const signer = ethereum != null ? provider.getSigner() : null;

    if (!signer) {
      throw new Error("No wallet connected");
    }
    const amountInWei = ethers.utils.parseEther(amount);
    console.log(amountInWei);
    console.log(amountInWei);
    const contract = new ethers.Contract(tokenAddress, ClampifyToken, signer);
    const tokenAmountInWei = ethers.utils.parseEther(tokenAmount);

    console.log(contract);

    // Convert amount to Wei
    // const amountInWei = ethers.utils.parseEther("0.001");

    // Execute buy transaction
    const tx = await contract.buyTokens(amountInWei, {
      value: tokenAmountInWei,
    });

    // Wait for transaction confirmation
    const receipt = await tx.wait();
    console.log("Buy transaction confirmed:", receipt);

    return { hash: receipt.transactionHash };
  } catch (error) {
    console.error("Buy tokens error:", error);
    throw error;
  }
};

export const getRecentTransactions = async (
  tokenAddress: string,
  count: number
) => {
  try {
    const provider =
      ethereum != null
        ? new ethers.providers.Web3Provider(ethereum)
        : new ethers.providers.JsonRpcProvider(RPC_URL);

    const signer = ethereum != null ? provider.getSigner() : null;

    if (!signer) {
      throw new Error("No wallet connected");
    }

    const contract = new ethers.Contract(tokenAddress, ClampifyToken, signer);

    const transactions = await contract.getRecentTransactions(count);

    console.log(transactions);

    return {
      accounts: transactions[0],
      isBuys: transactions[1],
      tokenAmounts: transactions[2],
      ethAmounts: transactions[3],
      prices: transactions[4],
      timestamps: transactions[5],
    };
  } catch (error) {
    console.error("Get recent transactions error:", error);
    throw error;
  }
};

export const getTokenBalance = async (tokenAddress: string) => {
  try {
    const provider =
      ethereum != null
        ? new ethers.providers.Web3Provider(ethereum)
        : new ethers.providers.JsonRpcProvider(RPC_URL);

    const signer = ethereum != null ? provider.getSigner() : null;

    if (!signer) {
      throw new Error("No wallet connected");
    }

    const userAddress = await signer.getAddress();
    const contract = new ethers.Contract(tokenAddress, ClampifyToken, provider);

    const balance = await contract.balanceOf(userAddress);

    return balance.toString();
  } catch (error) {
    console.error("Get token balance error:", error);
    throw error;
  }
};

export const TokenReturnOnSell = async (
  tokenAddress: string,
  amount: string
) => {
  try {
    console.log(tokenAddress, amount);
    const provider =
      ethereum != null
        ? new ethers.providers.Web3Provider(ethereum)
        : new ethers.providers.JsonRpcProvider(RPC_URL);

    const contract = new ethers.Contract(tokenAddress, ClampifyToken, provider);

    const ethAmount = await contract.calculateSaleReturn(
      ethers.utils.parseEther(amount)
    );

    console.log(ethAmount);
    console.log(ethers.utils.formatEther(ethAmount));
    return {
      ethAmount: ethers.utils.formatEther(ethAmount),
    };
  } catch (error) {
    console.error("Calculate sale return error:", error);
    throw error;
  }
};

export const sellTokens = async (tokenAddress: string, amount: string) => {
  try {
    console.log(tokenAddress, amount);
    const provider =
      ethereum != null
        ? new ethers.providers.Web3Provider(ethereum)
        : new ethers.providers.JsonRpcProvider(RPC_URL);

    console.log(provider);
    const signer = ethereum != null ? provider.getSigner() : null;

    console.log(signer);

    if (!signer) {
      throw new Error("No wallet connected");
    }

    const contract = new ethers.Contract(tokenAddress, ClampifyToken, signer);

    console.log(contract);

    const amountInWei = ethers.utils.parseEther(amount);

    const tx = await contract.sellTokens(amountInWei);

    const receipt = await tx.wait();
    console.log("Sell transaction confirmed:", receipt);

    return { hash: receipt.transactionHash };
  } catch (error) {
    console.error("Sell tokens error:", error);
    throw error;
  }
};

export const getTokenPrice = async (tokenAddress: string): Promise<string> => {
  try {
    const provider =
      ethereum != null
        ? new ethers.providers.Web3Provider(ethereum)
        : new ethers.providers.JsonRpcProvider(RPC_URL);

    const contract = new ethers.Contract(tokenAddress, ClampifyToken, provider);

    const price = await contract.getCurrentPrice();
    console.log(price);
    console.log(price.toString());
    console.log(ethers.utils.formatEther(price));
    return ethers.utils.formatEther(price);
  } catch (error) {
    console.error("Get token price error:", error);
    throw error;
  }
};

export const getTopHolders = async (tokenAddress: string) => {
  try {
    const provider =
      ethereum != null
        ? new ethers.providers.Web3Provider(ethereum)
        : new ethers.providers.JsonRpcProvider(RPC_URL);

    const contract = new ethers.Contract(tokenAddress, ClampifyToken, provider);

    // eslint-disable-next-line
    const [holders, balances, percentages] = await contract.getTopHolders();

    return holders.length;
  } catch (error) {
    console.error("Get top holders error:", error);
    throw error;
  }
};

export const getCandleData = async (
  tokenAddress: string,
  count: number = 24
) => {
  try {
    const provider =
      ethereum != null
        ? new ethers.providers.Web3Provider(ethereum)
        : new ethers.providers.JsonRpcProvider(RPC_URL);

    const contract = new ethers.Contract(tokenAddress, ClampifyToken, provider);

    const [timestamps, opens, highs, lows, closes, volumes] =
      await contract.getCandleData(count);
    // Format the data for TradingView
    const candleData = timestamps.map((timestamp: string, i: number) => ({
      time: Number(timestamp) * 1000, // Convert to milliseconds
      open: parseFloat(ethers.utils.formatEther(opens[i])),
      high: parseFloat(ethers.utils.formatEther(highs[i])),
      low: parseFloat(ethers.utils.formatEther(lows[i])),
      close: parseFloat(ethers.utils.formatEther(closes[i])),
      volume: parseFloat(ethers.utils.formatEther(volumes[i])),
    }));

    return candleData;
  } catch (error) {
    console.error("Get candle data error:", error);
    throw error;
  }
};
