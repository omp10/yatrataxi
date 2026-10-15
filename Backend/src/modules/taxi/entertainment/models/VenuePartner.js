import mongoose from 'mongoose';

// A business that runs ticketed venues. Created by the admin; logs in to the
// partner portal with OTP on its phone number (role `venue_partner`).
const venuePartnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    businessName: { type: String, default: '', trim: true },
    phone: { type: String, required: true, trim: true, unique: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    city: { type: String, default: '', trim: true },
    // Platform commission taken from every ticket sale, in percent. A venue may
    // override it (Venue.commissionPercent).
    commissionPercent: { type: Number, default: 10, min: 0, max: 100 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
    active: { type: Boolean, default: true },
    wallet: {
      balance: { type: Number, default: 0 },
      lifetimeEarned: { type: Number, default: 0 },
      lifetimePaidOut: { type: Number, default: 0 },
    },
    payout: {
      accountHolder: { type: String, default: '', trim: true },
      bankName: { type: String, default: '', trim: true },
      accountNumber: { type: String, default: '', trim: true },
      ifscCode: { type: String, default: '', trim: true },
      upiId: { type: String, default: '', trim: true },
    },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const VenuePartner =
  mongoose.models.TaxiVenuePartner || mongoose.model('TaxiVenuePartner', venuePartnerSchema);
