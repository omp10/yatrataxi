import mongoose from 'mongoose';

const bookingItemSchema = new mongoose.Schema(
  {
    ticketTypeId: { type: String, required: true },
    name: { type: String, default: '' },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const entertainmentBookingSchema = new mongoose.Schema(
  {
    bookingCode: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'TaxiUser', required: true, index: true },
    venueId: { type: mongoose.Schema.Types.ObjectId, ref: 'TaxiVenue', required: true, index: true },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'TaxiVenuePartner', required: true, index: true },
    bookingSource: { type: String, enum: ['user', 'agent'], default: 'user' },
    customer: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
    },
    venueSnapshot: {
      name: { type: String, default: '' },
      address: { type: String, default: '' },
      city: { type: String, default: '' },
      coverImage: { type: String, default: '' },
      categoryName: { type: String, default: '' },
    },
    visitDate: { type: String, required: true, index: true }, // YYYY-MM-DD
    slotId: { type: String, required: true },
    slotLabel: { type: String, default: '' },
    slotStartTime: { type: String, default: '' },
    slotEndTime: { type: String, default: '' },
    items: { type: [bookingItemSchema], default: [] },
    totalTickets: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    // Money split, fixed at booking time.
    commissionPercent: { type: Number, default: 0 },
    commissionAmount: { type: Number, default: 0 },
    partnerEarning: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'expired', 'failed'],
      default: 'pending',
      index: true,
    },
    // Seat hold for unpaid bookings; released when it passes.
    expiresAt: { type: Date, default: null, index: true },
    payment: {
      provider: { type: String, default: 'razorpay' },
      orderId: { type: String, default: '', index: true },
      paymentId: { type: String, default: '' },
      status: { type: String, default: 'pending' },
      paidAt: { type: Date, default: null },
    },
    // Set once the partner's share has been credited for this booking.
    partnerCreditedAt: { type: Date, default: null },
    checkIn: {
      status: { type: String, enum: ['pending', 'checked_in'], default: 'pending' },
      checkedInAt: { type: Date, default: null },
      checkedInBy: { type: String, default: '' },
    },
    cancellation: {
      cancelledAt: { type: Date, default: null },
      cancelledBy: { type: String, default: '' },
      reason: { type: String, default: '' },
      ruleLabel: { type: String, default: '' },
      refundAmount: { type: Number, default: 0 },
      chargeAmount: { type: Number, default: 0 },
      refundId: { type: String, default: '' },
      refundStatus: { type: String, default: '' },
    },
    cancellationLockedAt: { type: Date, default: null },
    agentMeta: {
      bookedByAgentId: { type: mongoose.Schema.Types.ObjectId, ref: 'TaxiAgent', default: null },
      commissionMode: { type: String, enum: ['direct', 'referral', ''], default: '' },
      commissionAmount: { type: Number, default: 0 },
      commissionCreditedAt: { type: Date, default: null },
      commissionReversed: { type: Boolean, default: false },
    },
    review: {
      rating: { type: Number, default: 0 },
      comment: { type: String, default: '' },
      reviewedAt: { type: Date, default: null },
    },
  },
  { timestamps: true },
);

entertainmentBookingSchema.index({ partnerId: 1, visitDate: 1, status: 1 });
entertainmentBookingSchema.index({ 'agentMeta.bookedByAgentId': 1, createdAt: -1 });

export const EntertainmentBooking =
  mongoose.models.TaxiEntertainmentBooking || mongoose.model('TaxiEntertainmentBooking', entertainmentBookingSchema);
