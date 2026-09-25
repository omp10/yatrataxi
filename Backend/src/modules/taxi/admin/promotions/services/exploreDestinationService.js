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
  baseFare: Number.isFinite(Number(item.baseFare)) ? Number(item.baseFare) : 999,
  fare: item.baseFare ? `₹${Number(item.baseFare).toLocaleString('en-IN')}` : '₹999',
  distance: item.distance || '55 km',
  dist: item.distance || '55 km',
  emoji: item.emoji || '🛕',
  order: Number.isFinite(Number(item.order)) ? Number(item.order) : 0,
  active: item.active !== false,
  status: item.active !== false ? 'active' : 'inactive',
  isFeatured: Boolean(item.isFeatured),
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const DEFAULT_EXPLORE_DESTINATIONS = [
  {
    title: 'Ujjain Mahakaleshwar',
    label: 'Ujjain',
    code: 'UJN',
    dropLocation: 'Mahakaleshwar Jyotirlinga, Jaisinghpura, Ujjain, Madhya Pradesh',
    image: 'https://images.unsplash.com/photo-1609766857041-ed402ea8069a?auto=format&fit=crop&w=800&q=80',
    description: 'Mahakaleshwar Jyotirlinga Darshan & Sacred Bhasma Aarti pilgrimage.',
    category: 'spiritual',
    baseFare: 999,
    distance: '55 km',
    emoji: '🛕',
    order: 1,
    active: true,
    isFeatured: true,
  },
  {
    title: 'Omkareshwar Jyotirlinga',
    label: 'Omkareshwar',
    code: 'OMK',
    dropLocation: 'Omkareshwar Mandir, Mandhata Island, Narmada River, Madhya Pradesh',
    image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80',
    description: 'Sacred island Jyotirlinga shrine shaped like the sacred Om symbol.',
    category: 'spiritual',
    baseFare: 1299,
    distance: '77 km',
    emoji: '🙏',
    order: 2,
    active: true,
    isFeatured: true,
  },
  {
    title: 'Maheshwar & Mandu',
    label: 'Maheshwar',
    code: 'MAH',
    dropLocation: 'Ahilya Fort, Narmada Ghat, Maheshwar, Madhya Pradesh',
    image: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80',
    description: 'Historic Ahilya Fort, holy Narmada ghats and architectural marvels.',
    category: 'spiritual',
    baseFare: 1499,
    distance: '91 km',
    emoji: '⛵',
    order: 3,
    active: true,
    isFeatured: true,
  },
  {
    title: 'Orchha Ram Raja Temple',
    label: 'Orchha',
    code: 'ORC',
    dropLocation: 'Shri Ram Raja Mandir, Orchha, Tikamgarh, Madhya Pradesh',
    image: 'https://images.unsplash.com/photo-1605649487212-47bdab064df8?auto=format&fit=crop&w=800&q=80',
    description: 'Sacred temple palace complex where Lord Rama is revered as king.',
    category: 'spiritual',
    baseFare: 3999,
    distance: '320 km',
    emoji: '🏯',
    order: 4,
    active: true,
    isFeatured: false,
  },
  {
    title: 'Pitambara Peeth Datia',
    label: 'Datia',
    code: 'DTI',
    dropLocation: 'Shri Pitambara Peeth, Datia, Madhya Pradesh',
    image: 'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?auto=format&fit=crop&w=800&q=80',
    description: 'Renowned Bagalamukhi Shakti Peeth shrine in holy Datia.',
    category: 'spiritual',
    baseFare: 2899,
    distance: '210 km',
    emoji: '🌸',
    order: 5,
    active: true,
    isFeatured: false,
  },
  {
    title: 'Amarkantak Sacred Source',
    label: 'Amarkantak',
    code: 'AMR',
    dropLocation: 'Narmada Udgam Temple, Amarkantak, Anuppur, Madhya Pradesh',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
    description: 'Sacred source of the Holy Narmada and Son rivers nestled in Maikal hills.',
    category: 'spiritual',
    baseFare: 4499,
    distance: '380 km',
    emoji: '🏔️',
    order: 6,
    active: true,
    isFeatured: false,
  },
  {
    title: 'Taj Mahal',
    label: 'Agra',
    code: 'AGR',
    dropLocation: 'Taj Mahal, Dharmapuri, Forest Colony, Agra, Uttar Pradesh',
    image: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=800&q=80',
    description: 'Iconic ivory-white marble mausoleum on the south bank of the Yamuna river.',
    category: 'heritage',
    baseFare: 3500,
    distance: '580 km',
    emoji: '🏛️',
    order: 7,
    active: true,
    isFeatured: true,
  },
  {
    title: 'Varanasi Ghats',
    label: 'Varanasi',
    code: 'VNS',
    dropLocation: 'Dashashwamedh Ghat, Godowlia, Varanasi, Uttar Pradesh',
    image: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=800&q=80',
    description: 'Historic riverfront steps leading to the sacred banks of the Ganges.',
    category: 'spiritual',
    baseFare: 4999,
    distance: '750 km',
    emoji: '🕉️',
    order: 8,
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
    } else {
      // If DB has destinations but no spiritual category or missing spiritual destinations, check and seed them
      const spiritualCount = await ExploreDestination.countDocuments({ category: 'spiritual' });
      if (spiritualCount === 0) {
        const spiritualItems = DEFAULT_EXPLORE_DESTINATIONS.filter((d) => d.category === 'spiritual');
        for (const item of spiritualItems) {
          const exists = await ExploreDestination.findOne({ code: item.code });
          if (!exists) {
            await ExploreDestination.create(item);
          }
        }
        console.log('Seeded spiritual destinations into Explore India');
      }
    }
  } catch (error) {
    console.error('Error seeding default Explore India destinations:', error);
  }
};

const normalizeDestinationPayload = async (payload, existing = null) => {
  const title = normalizeText(payload.title ?? payload.name ?? existing?.title);
  const label = normalizeText(payload.label ?? existing?.label);
  const code = normalizeText(payload.code ?? existing?.code).toUpperCase();
  const dropLocation = normalizeText(payload.dropLocation ?? payload.drop ?? existing?.dropLocation);
  let image = normalizeText(payload.image ?? payload.imageUrl ?? payload.image_url ?? existing?.image);
  let imagePublicId = normalizeText(payload.imagePublicId ?? existing?.imagePublicId);
  const description = normalizeText(payload.description ?? payload.subtitle ?? existing?.description);
  const category = normalizeText(payload.category ?? existing?.category ?? 'spiritual').toLowerCase();
  const baseFare = Number(payload.baseFare ?? payload.fare ?? existing?.baseFare ?? 999);
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

  return {
    title,
    label,
    code,
    dropLocation,
    image,
    imagePublicId,
    description,
    category: category || 'spiritual',
    baseFare: Number.isFinite(baseFare) && baseFare >= 0 ? baseFare : 999,
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

export const listActivePublicDestinations = async (query = {}) => {
  const filter = { active: true };
  if (query?.category && query.category !== 'all') {
    filter.category = new RegExp(`^${normalizeText(query.category)}$`, 'i');
  }

  // Ensure default destinations exist
  await seedDefaultDestinationsIfEmpty();

  let items = await ExploreDestination.find(filter)
    .sort({ order: 1, createdAt: -1 })
    .lean();

  // If specific category was requested and none found, check without category
  if ((!items || items.length === 0) && query?.category) {
    items = await ExploreDestination.find({ active: true })
      .sort({ order: 1, createdAt: -1 })
      .lean();
  }

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
