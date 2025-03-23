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
  address: string;
  creator: string | undefined;
  type: TransactionType;
  amount: string;
  price: string;
  txHash: string;
  name: string;
  symbol: string;
}
