interface TokenRecord {
  address: string;
  name: string;
  symbol: string;
  creator: string;
  initialSupply: string;
  maxSupply: string;
  initialPrice: string;
  creatorLockupPeriod: string;
  lockLiquidity: boolean;
  liquidityLockPeriod: string;
  image: string;
}

interface TransactionData {
  account: string;
  isBuy: boolean;
  tokenAmount: string;
  ethAmount: string;
  price: string;
  timestamp: number;
  tokenAddress: string;
}

export const createTokenRecord = async (tokenData: TokenRecord) => {
  try {
    const response = await fetch("/api/tokens", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tokenData),
    });

    if (!response.ok) {
      throw new Error("Failed to create token record");
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating token record:", error);
    throw error;
  }
};

export const recordTransaction = async (transactionData: TransactionData) => {
  console.log("transactionData", transactionData);
  const response = await fetch("/api/transactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(transactionData),
  });
  return response.json();
};

export const getTokenTransactions = async (tokenAddress: string) => {
  const response = await fetch(
    `/api/transactions?tokenAddress=${tokenAddress}`
  );
  return response.json();
};

export const getTokenDetails = async (address: string) => {
  try {
    const response = await fetch(`/api/tokens/${address}`);
    if (!response.ok) {
      throw new Error("Failed to fetch token details");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching token details:", error);
    throw error;
  }
};
