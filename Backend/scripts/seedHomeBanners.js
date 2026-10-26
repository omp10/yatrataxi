/**
 * Seed script: add starter hero banners for the user app home screen.
 * Photos are copied into our Cloudinary account (not hotlinked) so the app's
 * on-the-fly optimisation works and the banners don't depend on Unsplash.
 * Safe to re-run: banners whose title already exists are skipped.
 * Usage: node scripts/seedHomeBanners.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/database.js';
import { Banner } from '../src/modules/taxi/admin/promotions/models/Banner.js';
import { createCloudinaryUploadSignature } from '../src/utils/cloudinaryUpload.js';

// Free-to-use photos from Unsplash (https://unsplash.com/license).
const BANNERS = [
  {
    title: 'Move your way',
    subtitle: 'Your next journey starts here',
    cta_label: 'Book a ride',
    link_type: 'deep_link',
    redirect_url: '/ride/select-location',
    sort_order: 0,
    source: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1600&q=85&fm=jpg',
  },
  {
    title: 'Ride in comfort',
    subtitle: 'Premium cars, rented by the hour',
    cta_label: 'Explore rentals',
    link_type: 'deep_link',
    redirect_url: '/taxi/user/rental',
    sort_order: 0,
    source: 'https://images.unsplash.com/photo-1485291571150-772bcfc10da5?w=1600&q=85&fm=jpg',
  },
];

const uploadRemoteImage = async (sourceUrl) => {
  const signed = createCloudinaryUploadSignature({ publicIdPrefix: 'banner-image', resourceType: 'image' });
  const body = new FormData();
  body.append('file', sourceUrl);
  body.append('api_key', signed.api_key);
  Object.entries(signed.fields).forEach(([key, value]) => body.append(key, value));
  body.append('signature', signed.signature);

  const response = await fetch(signed.upload_url, { method: 'POST', body });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.secure_url) {
    throw new Error(payload?.error?.message || `Cloudinary upload failed (${response.status})`);
  }
  return payload.secure_url;
};

const run = async () => {
  await connectDatabase();

  for (const { source, ...banner } of BANNERS) {
    const existing = await Banner.findOne({ title: banner.title }).lean();
    if (existing) {
      console.log(`[seedHomeBanners] skip "${banner.title}" (already exists)`);
      continue;
    }

    const image = await uploadRemoteImage(source);
    await Banner.create({ ...banner, image, media_type: 'image', active: true });
    console.log(`[seedHomeBanners] added "${banner.title}" -> ${image}`);
  }
};

run()
  .catch((error) => {
    console.error('[seedHomeBanners] failed', error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
