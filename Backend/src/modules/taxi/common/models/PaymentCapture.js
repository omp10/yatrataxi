import mongoose from 'mongoose';

// One row per gateway payment that has been turned into money inside the app
// (wallet credit, booking confirmation, ...). The unique index is what stops the
// same payment from being credited twice, whether by a concurrent verify call or
// by replaying it against a different endpoint or account.
const paymentCaptureSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    paymentId: {
      type: String,
      required: true,
      trim: true,
    },
    orderId: {
      type: String,
      default: '',
      trim: true,
    },
    purpose: {
      type: String,
      required: true,
      trim: true,
    },
    ownerType: {
      type: String,
      required: true,
      trim: true,
    },
    ownerId: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

paymentCaptureSchema.index({ provider: 1, paymentId: 1 }, { unique: true });

export const PaymentCapture =
  mongoose.models.TaxiPaymentCapture || mongoose.model('TaxiPaymentCapture', paymentCaptureSchema);
