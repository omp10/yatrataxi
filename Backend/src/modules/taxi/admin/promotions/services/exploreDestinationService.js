import mongoose from 'mongoose';
import { ApiError } from '../../../../../utils/ApiError.js';
import { ExploreDestination } from '../models/ExploreDestination.js';
import { uploadDataUrlToCloudinary } from '../../../../../utils/cloudinaryUpload.js';

const normalizeText = (value) => String(value ?? '').trim();

const normalizeBoolean = (value, fallback = true) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  return false;
};

const toObjectIdOrThrow = (value, fieldName = 'id') => {
  if (!mongoose.isValidObjectId(value)) {
    throw new ApiError(400, `Invalid ${fieldName}`);
  }
  return new mongoose.Types.ObjectId(String(value));
};

const serializeDestination = (item) => ({
  _id: item._id,
  id: item._id,
  title: item.title || '',
  name: item.title || '', // compatibility with User SpiritualTrip & Agent Desk
  label: item.label || '',
  subtitle: item.description || item.label || '',
  code: item.code || '',
  dropLocation: item.dropLocation || '',
  drop: item.dropLocation || '', // for frontend backwards compatibility
  image: item.image || '',
  imagePublicId: item.imagePublicId || '',
  description: item.description || '',
  category: item.category || 'spiritual',
  // Fares are exactly what the admin entered per vehicle type id; nothing is derived.
  baseFare: Math.max(0, Number(item.baseFare) || 0),
  fare: Number(item.baseFare) > 0 ? `₹${Number(item.baseFare).toLocaleString('en-IN')}` : '',
  vehicleFares: Object.fromEntries(
    Object.entries(typeof item.vehicleFares === 'object' && item.vehicleFares !== null ? item.vehicleFares : {})
      .filter(([key]) => mongoose.isValidObjectId(key))
      .map(([key, value]) => [key, Math.max(0, Number(value) || 0)]),
  ),
  distance: item.distance || '',
  dist: item.distance || '',
  emoji: item.emoji || '🛕',
  order: Number.isFinite(Number(item.order)) ? Number(item.order) : 0,
  active: item.active !== false,
  status: item.active !== false ? 'active' : 'inactive',
  isFeatured: Boolean(item.isFeatured),
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const normalizeDestinationPayload = async (payload, existing = null) => {
  const title = normalizeText(payload.title ?? payload.name ?? existing?.title);
  const label = normalizeText(payload.label ?? existing?.label);
  const code = normalizeText(payload.code ?? existing?.code).toUpperCase();
  const dropLocation = normalizeText(payload.dropLocation ?? payload.drop ?? existing?.dropLocation);
  let image = normalizeText(payload.image ?? payload.imageUrl ?? payload.image_url ?? existing?.image);
  let imagePublicId = normalizeText(payload.imagePublicId ?? existing?.imagePublicId);
  const description = normalizeText(payload.description ?? payload.subtitle ?? existing?.description);
  const category = normalizeText(payload.category ?? existing?.category ?? 'spiritual').toLowerCase();
  const distance = normalizeText(payload.distance ?? payload.dist ?? existing?.distance ?? '');
  const emoji = normalizeText(payload.emoji ?? existing?.emoji ?? '🛕');
  const order = Number(payload.order ?? existing?.order ?? 0);
  const active = normalizeBoolean(payload.active ?? payload.status, existing?.active ?? true);
  const isFeatured = normalizeBoolean(payload.isFeatured, existing?.isFeatured ?? false);

  if (!title) throw new ApiError(400, 'Destination title is required');
  if (!label) throw new ApiError(400, 'City/Location label is required');
  if (!code) throw new ApiError(400, '3-letter destination code is required');
  if (!dropLocation) throw new ApiError(400, 'Drop location address is required');
  if (!image) throw new ApiError(400, 'Destination image is required');

  if (image.startsWith('data:')) {
    try {
      const uploaded = await uploadDataUrlToCloudinary({
        dataUrl: image,
        publicIdPrefix: 'explore-destination',
      });
      image = uploaded.secureUrl;
      imagePublicId = uploaded.publicId;
    } catch (error) {
      console.error('Cloudinary upload error for explore destination:', error);
      throw new ApiError(500, `Failed to upload destination image: ${error.message}`);
    }
  }

  const rawFares = typeof payload.vehicleFares === 'object' && payload.vehicleFares !== null
    ? payload.vehicleFares
    : (existing?.vehicleFares || {});
  // Only real vehicle type ids are priced; a 0 means the vehicle is not offered.
  const vehicleFares = Object.fromEntries(
    Object.entries(rawFares)
      .filter(([key]) => mongoose.isValidObjectId(key))
      .map(([key, value]) => [key, Math.max(0, Number(value) || 0)]),
  );
  const offeredFares = Object.values(vehicleFares).filter((fare) => fare > 0);
  if (offeredFares.length === 0) {
    throw new ApiError(400, 'Enter a fare for at least one vehicle');
  }

  return {
    title,
    label,
    code,
    dropLocation,
    image,
    imagePublicId,
    description,
    category: category || 'spiritual',
    baseFare: Math.min(...offeredFares),
    vehicleFares,
    distance,
    emoji: emoji || '🛕',
    order: Number.isFinite(order) ? order : 0,
    active,
    isFeatured,
  };
};

export const listAdminDestinations = async (query = {}) => {
  const { search, active, category, page = 1, limit = 50 } = query;
  const filter = {};

  if (search) {
    const safeSearch = normalizeText(search);
    filter.$or = [
      { title: { $regex: safeSearch, $options: 'i' } },
      { label: { $regex: safeSearch, $options: 'i' } },
      { code: { $regex: safeSearch, $options: 'i' } },
      { dropLocation: { $regex: safeSearch, $options: 'i' } },
    ];
  }

  if (active !== undefined && active !== null && active !== '' && active !== 'all') {
    filter.active = normalizeBoolean(active);
  }

  if (category && category !== 'all') {
    filter.category = new RegExp(`^${normalizeText(category)}$`, 'i');
  }

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Number(limit) || 50);
  const skip = (safePage - 1) * safeLimit;

  const [items, total] = await Promise.all([
    ExploreDestination.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    ExploreDestination.countDocuments(filter),
  ]);

  return {
    results: items.map(serializeDestination),
    total,
    paginator: {
      current_page: safePage,
      per_page: safeLimit,
      total,
      last_page: Math.max(1, Math.ceil(total / safeLimit)),
    },
  };
};

export const listActivePublicDestinations = async (query = {}) => {
  const filter = { active: true };
  if (query?.category && query.category !== 'all') {
    filter.category = new RegExp(`^${normalizeText(query.category)}$`, 'i');
  }

  const items = await ExploreDestination.find(filter)
    .sort({ order: 1, createdAt: -1 })
    .lean();

  return (items || []).map(serializeDestination);
};

export const getDestinationById = async (id) => {
  const item = await ExploreDestination.findById(toObjectIdOrThrow(id, 'destination id')).lean();
  if (!item) {
    throw new ApiError(404, 'Explore Destination not found');
  }
  return serializeDestination(item);
};

export const createDestination = async (payload) => {
  const normalized = await normalizeDestinationPayload(payload);
  const item = await ExploreDestination.create(normalized);
  return serializeDestination(item.toObject());
};

export const updateDestination = async (id, payload) => {
  const item = await ExploreDestination.findById(toObjectIdOrThrow(id, 'destination id'));
  if (!item) {
    throw new ApiError(404, 'Explore Destination not found');
  }

  const nextPayload = await normalizeDestinationPayload(payload, item.toObject());
  Object.assign(item, nextPayload);
  await item.save();
  return serializeDestination(item.toObject());
};

export const deleteDestination = async (id) => {
  const deleted = await ExploreDestination.findByIdAndDelete(toObjectIdOrThrow(id, 'destination id'));
  if (!deleted) {
    throw new ApiError(404, 'Explore Destination not found');
  }
  return true;
};

export const toggleDestinationStatus = async (id) => {
  const item = await ExploreDestination.findById(toObjectIdOrThrow(id, 'destination id'));
  if (!item) {
    throw new ApiError(404, 'Explore Destination not found');
  }

  item.active = !item.active;
  await item.save();
  return serializeDestination(item.toObject());
};
