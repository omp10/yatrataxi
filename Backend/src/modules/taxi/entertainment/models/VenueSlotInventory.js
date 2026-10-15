import mongoose from 'mongoose';

// Tickets held or sold for one venue time slot on one date. Bookings reserve
// with a single conditional $inc so concurrent buyers can never oversell.
const venueSlotInventorySchema = new mongoose.Schema(
  {
    venueId: { type: mongoose.Schema.Types.ObjectId, ref: 'TaxiVenue', required: true },
    visitDate: { type: String, required: true }, // YYYY-MM-DD
    slotId: { type: String, required: true },
    reserved: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

venueSlotInventorySchema.index({ venueId: 1, visitDate: 1, slotId: 1 }, { unique: true });

export const VenueSlotInventory =
  mongoose.models.TaxiVenueSlotInventory || mongoose.model('TaxiVenueSlotInventory', venueSlotInventorySchema);
