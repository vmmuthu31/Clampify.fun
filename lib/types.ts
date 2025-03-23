export interface TokenRecord {
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

export enum TransactionType {
  CREATE = "CREATE",
  BUY = "BUY",
  SELL = "SELL",
}

export interface ITransactionData {
  address: string | undefined;
  creator: string | undefined;
  type: TransactionType;
  amount: string;
  price: string;
  txHash: string;
  name: string | undefined;
  symbol: string | undefined;
}

export interface ITokenData {
  id: string;
  name: string;
  symbol: string;
  price: number;
  priceChange24h: number;
  marketCap: number;
  volume24h: number;
  holders: number;
  createdAt: string;
  description: string;
  website: string;
  twitter: string;
  telegram: string;
  contractAddress: string;
  decimals: number;
  totalSupply: string;
  circulatingSupply: string;
  lockedSupply: string;
  supplyLockPercentage: number;
  lockDuration: number;
  unlockStyle: string;
  unlockEnd: string;
  creator: string;
  tradingEnabled: boolean;
  maxWalletSize: string;
  maxTxAmount: string;
  buyTax: string;
  sellTax: string;
  bondingCurve: {
    initialPrice: number;
    reserveRatio: number;
    currentReserve: number;
  };
}

export interface ITransaction {
  userAddress: string;
  type: string;
  amount: string;
  price: string;
  timestamp: string;
  txHash: string;
}
