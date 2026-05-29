import mongoose from 'mongoose';

const agentWithdrawalRequestSchema = new mongoose.Schema(
  {
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaxiAgent',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    requested_currency: {
      type: String,
      default: 'INR',
      trim: true,
      uppercase: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    payment_method: {
      type: String,
      default: 'bank_transfer',
      trim: true,
    },
    payoutSnapshot: {
      bankName: { type: String, default: '', trim: true },
      accountHolder: { type: String, default: '', trim: true },
      accountNumber: { type: String, default: '', trim: true },
      ifscCode: { type: String, default: '', trim: true },
      upiId: { type: String, default: '', trim: true },
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    adminNote: {
      type: String,
      default: '',
      trim: true,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    walletTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  { timestamps: true },
);

agentWithdrawalRequestSchema.index({ createdAt: -1 });

export const AgentWithdrawalRequest =
  mongoose.models.TaxiAgentWithdrawalRequest || mongoose.model('TaxiAgentWithdrawalRequest', agentWithdrawalRequestSchema);
