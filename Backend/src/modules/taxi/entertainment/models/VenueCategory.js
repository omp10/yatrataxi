import mongoose from 'mongoose';

// Admin-managed kinds of venue: Waterpark, Theme park, Zoo, ...
const venueCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    image: { type: String, default: '', trim: true },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

venueCategorySchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

export const VenueCategory =
  mongoose.models.TaxiVenueCategory || mongoose.model('TaxiVenueCategory', venueCategorySchema);
