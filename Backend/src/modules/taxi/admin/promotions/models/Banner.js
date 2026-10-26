import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    // URL of the banner media. Holds a video URL when media_type is 'video'.
    image: {
      type: String,
      required: true,
      trim: true,
    },
    media_type: {
      type: String,
      enum: ['image', 'video'],
      default: 'image',
      trim: true,
    },
    // Still frame shown while a video loads (and if it fails to play).
    poster: {
      type: String,
      default: '',
      trim: true,
    },
    subtitle: {
      type: String,
      default: '',
      trim: true,
    },
    cta_label: {
      type: String,
      default: '',
      trim: true,
    },
    sort_order: {
      type: Number,
      default: 0,
    },
    link_type: {
      type: String,
      enum: ['external_link', 'deep_link'],
      default: 'external_link',
      trim: true,
    },
    external_link: {
      type: String,
      default: '',
      trim: true,
    },
    deep_link: {
      type: String,
      default: '',
      trim: true,
    },
    redirect_url: {
      type: String,
      default: '',
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    push_count: {
      type: Number,
      default: 0,
    },
    last_pushed_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

bannerSchema.index({ active: 1, createdAt: -1 });
bannerSchema.index({ active: 1, sort_order: 1, createdAt: -1 });

export const Banner = mongoose.models.TaxiBanner || mongoose.model('TaxiBanner', bannerSchema);
