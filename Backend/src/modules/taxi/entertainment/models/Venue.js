import mongoose from 'mongoose';

const ticketTypeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    price: { type: Number, required: true, min: 0 },
    // Used for Saturday/Sunday visits when set (> 0); otherwise `price` applies.
    weekendPrice: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true },
  },
  { _id: false },
);

const timeSlotSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    label: { type: String, default: '', trim: true },
    startTime: { type: String, required: true, trim: true }, // HH:mm
    endTime: { type: String, required: true, trim: true },
    // Tickets (all types together) that can be sold for this slot on one date.
    capacity: { type: Number, required: true, min: 1 },
    active: { type: Boolean, default: true },
  },
  { _id: false },
);

const pointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true },
  },
  { _id: false },
);

const venueSchema = new mongoose.Schema(
  {
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'TaxiVenuePartner', required: true, index: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'TaxiVenueCategory', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    coverImage: { type: String, default: '', trim: true },
    images: { type: [String], default: [] },
    address: { type: String, default: '', trim: true },
    city: { type: String, default: '', trim: true, index: true },
    // Optional map pin; left unset (not an empty Point) when the venue has none.
    location: { type: pointSchema, default: undefined },
    rules: { type: String, default: '', trim: true },
    amenities: { type: [String], default: [] },
    ticketTypes: { type: [ticketTypeSchema], default: [] },
    timeSlots: { type: [timeSlotSchema], default: [] },
    // YYYY-MM-DD dates on which the venue sells nothing.
    closedDates: { type: [String], default: [] },
    // How many days ahead tickets can be booked.
    bookingWindowDays: { type: Number, default: 30, min: 1, max: 365 },
    // Admin-only override of the partner's commission; null = use the partner's.
    commissionPercent: { type: Number, default: null, min: 0, max: 100 },
    // Partner-created venues wait for admin approval before customers see them.
    status: { type: String, enum: ['pending', 'active', 'inactive', 'rejected'], default: 'pending', index: true },
    adminNote: { type: String, default: '', trim: true },
    rating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

venueSchema.index({ location: '2dsphere' }, { sparse: true });

export const Venue = mongoose.models.TaxiVenue || mongoose.model('TaxiVenue', venueSchema);
