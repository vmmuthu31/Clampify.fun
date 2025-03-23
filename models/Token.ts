import mongoose from 'mongoose';

const TokenSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  symbol: {
    type: String,
    required: true,
  },
  creator: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  initialSupply: String,
  maxSupply: String,
  initialPrice: String,
  creatorLockupPeriod: String,
  lockLiquidity: Boolean,
  liquidityLockPeriod: String,
  image: {
    type: String,
    default: '', // Empty string as default if no image provided
  },
});

export default mongoose.models.Token || mongoose.model('Token', TokenSchema); 