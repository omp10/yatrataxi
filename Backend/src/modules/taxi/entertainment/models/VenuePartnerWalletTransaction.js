import mongoose from 'mongoose';

// Ledger of every change to a venue partner's wallet. `referenceKey` is unique so
// the same booking credit, refund reversal or payout can never be applied twice.
const venuePartnerWalletTransactionSchema = new mongoose.Schema(
  {
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'TaxiVenuePartner', required: true, index: true },
    kind: { type: String, enum: ['credit', 'debit'], required: true },
    type: {
      type: String,
      enum: ['ticket_sale', 'refund_reversal', 'withdrawal', 'adjustment'],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    balanceAfter: { type: Number, default: 0 },
    title: { type: String, default: '' },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'TaxiEntertainmentBooking', default: null },
    referenceKey: { type: String, required: true, unique: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export const VenuePartnerWalletTransaction =
  mongoose.models.TaxiVenuePartnerWalletTransaction
  || mongoose.model('TaxiVenuePartnerWalletTransaction', venuePartnerWalletTransactionSchema);
