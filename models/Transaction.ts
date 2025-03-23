import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
  tokenAddress: {
    type: String,
    required: true,
  },
  userAddress: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['BUY', 'SELL', 'CREATE'],
    required: true,
  },
  amount: String,
  price: String,
  txHash: String,
  name: String,
  symbol: String,
  timestamp: {
    type: Date,
    default: Date.now,
  }
});

export default mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema); 