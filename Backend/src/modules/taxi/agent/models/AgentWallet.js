import mongoose from 'mongoose';

const agentWalletTransactionSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: ['credit', 'debit'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    title: {
      type: String,
      default: '',
      trim: true,
    },
    source: {
      type: String,
      default: '',
      trim: true,
    },
    referenceKey: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    bookingType: {
      type: String,
      default: '',
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: true, timestamps: true },
);

const agentWalletSchema = new mongoose.Schema(
  {
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaxiAgent',
      required: true,
      unique: true,
      index: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    lifetimeEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    lifetimePaidOut: {
      type: Number,
      default: 0,
      min: 0,
    },
    transactions: {
      type: [agentWalletTransactionSchema],
      default: [],
    },
  },
  { timestamps: true },
);

export const AgentWallet =
  mongoose.models.TaxiAgentWallet || mongoose.model('TaxiAgentWallet', agentWalletSchema);
