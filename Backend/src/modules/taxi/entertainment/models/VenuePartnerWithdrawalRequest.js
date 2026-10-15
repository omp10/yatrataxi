import mongoose from 'mongoose';

const venuePartnerWithdrawalRequestSchema = new mongoose.Schema(
  {
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'TaxiVenuePartner', required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    payoutSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
    note: { type: String, default: '', trim: true },
    adminNote: { type: String, default: '', trim: true },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: String, default: '' },
  },
  { timestamps: true },
);

export const VenuePartnerWithdrawalRequest =
  mongoose.models.TaxiVenuePartnerWithdrawalRequest
  || mongoose.model('TaxiVenuePartnerWithdrawalRequest', venuePartnerWithdrawalRequestSchema);
