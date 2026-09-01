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
  label: item.label || '',
  code: item.code || '',
  dropLocation: item.dropLocation || '',
  drop: item.dropLocation || '', // for frontend backwards compatibility
  image: item.image || '',
  imagePublicId: item.imagePublicId || '',
  description: item.description || '',
  order: Number.isFinite(Number(item.order)) ? Number(item.order) : 0,
  active: item.active !== false,
  status: item.active !== false ? 'active' : 'inactive',
  isFeatured: Boolean(item.isFeatured),
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const DEFAULT_EXPLORE_DESTINATIONS = [
  {
    title: 'Taj Mahal',
    label: 'Agra',
    code: 'AGR',
    dropLocation: 'Taj Mahal, Dharmapuri, Forest Colony, Agra, Uttar Pradesh',
    image: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=800&q=80',
    description: 'Iconic ivory-white marble mausoleum on the south bank of the Yamuna river.',
    order: 1,
    active: true,
    isFeatured: true,
  },
  {
    title: 'Hawa Mahal',
    label: 'Jaipur',
    code: 'JAI',
    dropLocation: 'Hawa Mahal, Badi Choupad, J.D.A. Market, Pink City, Jaipur, Rajasthan',
    image: 'https://images.unsplash.com/photo-1603288967358-8686689d0b8f?auto=format&fit=crop&w=800&q=80',
    description: 'Palace of Winds constructed of red and pink sandstone.',
    order: 2,
    active: true,
    isFeatured: true,
  },
  {
    title: 'India Gate',
    label: 'New Delhi',
    code: 'DEL',
    dropLocation: 'India Gate, Rajpath, India Gate, New Delhi, Delhi',
    image: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=800&q=80',
    description: 'War memorial located astride the Rajpath in New Delhi.',
    order: 3,
    active: true,
    isFeatured: true,
  },
  {
    title: 'Gateway of India',
    label: 'Mumbai',
    code: 'BOM',
    dropLocation: 'Gateway of India, Apollo Bandar, Colaba, Mumbai, Maharashtra',
    image: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=800&q=80',
    description: 'Arch-monument built in the 20th century in the city of Mumbai.',
    order: 4,
    active: true,
    isFeatured: false,
  },
  {
    title: 'Varanasi Ghats',
    label: 'Varanasi',
    code: 'VNS',
    dropLocation: 'Dashashwamedh Ghat, Godowlia, Varanasi, Uttar Pradesh',
    image: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=800&q=80',
    description: 'Historic riverfront steps leading to the sacred banks of the Ganges.',
    order: 5,
    active: true,
    isFeatured: false,
  },
];

export const seedDefaultDestinationsIfEmpty = async () => {
  try {
    const count = await ExploreDestination.countDocuments();
    if (count === 0) {
      await ExploreDestination.insertMany(DEFAULT_EXPLORE_DESTINATIONS);
      console.log('Seeded initial Explore India destinations');
    }
  } catch (error) {
    console.error('Error seeding default Explore India destinations:', error);
  }
};

const normalizeDestinationPayload = async (payload, existing = null) => {
  const title = normalizeText(payload.title ?? existing?.title);
  const label = normalizeText(payload.label ?? existing?.label);
  const code = normalizeText(payload.code ?? existing?.code).toUpperCase();
  const dropLocation = normalizeText(payload.dropLocation ?? payload.drop ?? existing?.dropLocation);
  let image = normalizeText(payload.image ?? payload.imageUrl ?? payload.image_url ?? existing?.image);
  let imagePublicId = normalizeText(payload.imagePublicId ?? existing?.imagePublicId);
  const description = normalizeText(payload.description ?? existing?.description);
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

  return {
    title,
    label,
    code,
    dropLocation,
    image,
    imagePublicId,
    description,
    order: Number.isFinite(order) ? order : 0,
    active,
    isFeatured,
  };
};

export const listAdminDestinations = async (query = {}) => {
  const { search, active, page = 1, limit = 50 } = query;
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

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Number(limit) || 50);
  const skip = (safePage - 1) * safeLimit;

  // Auto seed if DB is completely empty on first fetch
  const totalInDb = await ExploreDestination.countDocuments();
  if (totalInDb === 0) {
    await seedDefaultDestinationsIfEmpty();
  }

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

export const listActivePublicDestinations = async () => {
  let items = await ExploreDestination.find({ active: true })
    .sort({ order: 1, createdAt: -1 })
    .lean();

  if (!items || items.length === 0) {
    await seedDefaultDestinationsIfEmpty();
    items = await ExploreDestination.find({ active: true })
      .sort({ order: 1, createdAt: -1 })
      .lean();
  }

  return items.map(serializeDestination);
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
