import mongoose from 'mongoose';

const agentLoginSessionSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaxiAgent',
      default: null,
    },
    flow: {
      type: String,
      enum: ['existing', 'new'],
      default: 'existing',
      required: true,
    },
    otpHash: {
      type: String,
      required: true,
      select: false,
    },
    otpExpiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

agentLoginSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AgentLoginSession =
  mongoose.models.TaxiAgentLoginSession ||
  mongoose.model('TaxiAgentLoginSession', agentLoginSessionSchema);
