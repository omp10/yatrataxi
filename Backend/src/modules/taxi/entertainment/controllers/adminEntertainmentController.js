import mongoose from 'mongoose';
import { ApiError } from '../../../../utils/ApiError.js';
import { EntertainmentBooking } from '../models/EntertainmentBooking.js';
import { Venue } from '../models/Venue.js';
import { VenueCategory } from '../models/VenueCategory.js';
import { VenuePartner } from '../models/VenuePartner.js';
import { VenuePartnerWalletTransaction } from '../models/VenuePartnerWalletTransaction.js';
import { VenuePartnerWithdrawalRequest } from '../models/VenuePartnerWithdrawalRequest.js';
import {
  applyPartnerWalletChange,
  assertObjectId,
  cancelBooking,
  getEntertainmentSettings,
  normalizeVenuePayload,
  roundMoney,
  saveEntertainmentSettings,
  serializeBooking,
  serializeVenue,
} from '../services/entertainmentService.js';
import { serializePartner } from './partnerEntertainmentController.js';

const toCleanString = (value) => String(value ?? '').trim();
const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalizePhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
};
const parseCommission = (value, fallback) => {
  if (value === undefined || value === '') return fallback;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 100) throw new ApiError(400, 'Commission must be between 0 and 100%');
  return Math.round(number * 100) / 100;
};

// ───────────────────────────────────────────── categories

export const listCategories = async (_req, res) => {
  const categories = await VenueCategory.find({}).sort({ order: 1, name: 1 }).lean();
  const counts = await Venue.aggregate([{ $group: { _id: '$categoryId', count: { $sum: 1 } } }]);
  const countById = new Map(counts.map((row) => [String(row._id), row.count]));
  res.json({
    success: true,
    data: categories.map((c) => ({ id: String(c._id), name: c.name, description: c.description, image: c.image, order: c.order, active: c.active, venueCount: countById.get(String(c._id)) || 0 })),
  });
};

const categoryPayload = (body = {}) => {
  const name = toCleanString(body.name);
  if (!name) throw new ApiError(400, 'Category name is required');
  return { name, description: toCleanString(body.description), image: toCleanString(body.image), order: Number(body.order) || 0, active: body.active !== false };
};

export const createCategory = async (req, res) => {
  try {
    const category = await VenueCategory.create(categoryPayload(req.body));
    res.status(201).json({ success: true, data: { id: String(category._id), ...categoryPayload(category) } });
  } catch (error) {
    if (error?.code === 11000) throw new ApiError(409, 'A category with this name already exists');
    throw error;
  }
};

export const updateCategory = async (req, res) => {
  assertObjectId(req.params.id, 'category');
  try {
    const category = await VenueCategory.findByIdAndUpdate(req.params.id, { $set: categoryPayload(req.body) }, { returnDocument: 'after' });
    if (!category) throw new ApiError(404, 'Category not found');
    res.json({ success: true, data: { id: String(category._id), ...categoryPayload(category) } });
  } catch (error) {
    if (error?.code === 11000) throw new ApiError(409, 'A category with this name already exists');
    throw error;
  }
};

export const deleteCategory = async (req, res) => {
  assertObjectId(req.params.id, 'category');
  if (await Venue.exists({ categoryId: req.params.id })) {
    throw new ApiError(409, 'This category has venues. Deactivate it instead of deleting.');
  }
  await VenueCategory.deleteOne({ _id: req.params.id });
  res.json({ success: true, data: true });
};

// ───────────────────────────────────────────── partners

export const listPartners = async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) {
    const pattern = new RegExp(escapeRegex(req.query.search), 'i');
    filter.$or = [{ name: pattern }, { businessName: pattern }, { phone: pattern }];
  }
  const partners = await VenuePartner.find(filter).sort({ createdAt: -1 }).lean();
  const venueCounts = await Venue.aggregate([{ $group: { _id: '$partnerId', count: { $sum: 1 } } }]);
  const countById = new Map(venueCounts.map((row) => [String(row._id), row.count]));
  res.json({ success: true, data: partners.map((p) => ({ ...serializePartner(p), venueCount: countById.get(String(p._id)) || 0 })) });
};

const partnerPayload = (body = {}, existing = null) => {
  const name = toCleanString(body.name ?? existing?.name);
  const phone = normalizePhone(body.phone ?? existing?.phone);
  if (!name) throw new ApiError(400, 'Partner name is required');
  if (!/^\d{10}$/.test(phone)) throw new ApiError(400, 'Enter a valid 10-digit mobile number (used for OTP login)');
  const status = body.status ?? existing?.status ?? 'active';
  return {
    name,
    phone,
    businessName: toCleanString(body.businessName ?? existing?.businessName),
    email: toCleanString(body.email ?? existing?.email).toLowerCase(),
    city: toCleanString(body.city ?? existing?.city),
    commissionPercent: parseCommission(body.commissionPercent, existing?.commissionPercent ?? 10),
    status: status === 'inactive' ? 'inactive' : 'active',
    active: status !== 'inactive',
  };
};

export const createPartner = async (req, res) => {
  try {
    const partner = await VenuePartner.create(partnerPayload(req.body));
    res.status(201).json({ success: true, data: serializePartner(partner) });
  } catch (error) {
    if (error?.code === 11000) throw new ApiError(409, 'A partner with this mobile number already exists');
    throw error;
  }
};

export const updatePartner = async (req, res) => {
  assertObjectId(req.params.id, 'partner');
  const existing = await VenuePartner.findById(req.params.id).lean();
  if (!existing) throw new ApiError(404, 'Partner not found');
  try {
    const partner = await VenuePartner.findByIdAndUpdate(req.params.id, { $set: partnerPayload(req.body, existing) }, { returnDocument: 'after' });
    res.json({ success: true, data: serializePartner(partner) });
  } catch (error) {
    if (error?.code === 11000) throw new ApiError(409, 'A partner with this mobile number already exists');
    throw error;
  }
};

export const getPartner = async (req, res) => {
  assertObjectId(req.params.id, 'partner');
  const partner = await VenuePartner.findById(req.params.id).lean();
  if (!partner) throw new ApiError(404, 'Partner not found');
  const [venues, transactions, stats] = await Promise.all([
    Venue.find({ partnerId: partner._id }).sort({ createdAt: -1 }).lean(),
    VenuePartnerWalletTransaction.find({ partnerId: partner._id }).sort({ createdAt: -1 }).limit(50).lean(),
    EntertainmentBooking.aggregate([
      { $match: { partnerId: partner._id, status: 'confirmed' } },
      { $group: { _id: null, bookings: { $sum: 1 }, tickets: { $sum: '$totalTickets' }, sales: { $sum: '$amount' }, gst: { $sum: '$gstAmount' }, commission: { $sum: '$commissionAmount' }, earnings: { $sum: '$partnerEarning' } } },
    ]),
  ]);
  res.json({
    success: true,
    data: {
      ...serializePartner(partner),
      venues: venues.map((v) => serializeVenue(v, { includeAdmin: true })),
      transactions: transactions.map((t) => ({ id: String(t._id), kind: t.kind, type: t.type, amount: t.amount, balanceAfter: t.balanceAfter, title: t.title, createdAt: t.createdAt })),
      stats: {
        bookings: stats[0]?.bookings || 0,
        tickets: stats[0]?.tickets || 0,
        sales: roundMoney(stats[0]?.sales),
        gst: roundMoney(stats[0]?.gst),
        commission: roundMoney(stats[0]?.commission),
        earnings: roundMoney(stats[0]?.earnings),
      },
    },
  });
};

// ───────────────────────────────────────────── venues

export const listVenues = async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.partnerId) filter.partnerId = assertObjectId(req.query.partnerId, 'partner');
  if (req.query.categoryId) filter.categoryId = assertObjectId(req.query.categoryId, 'category');
  if (req.query.search) filter.name = new RegExp(escapeRegex(req.query.search), 'i');
  const [venues, categories, partners] = await Promise.all([
    Venue.find(filter).sort({ createdAt: -1 }).lean(),
    VenueCategory.find({}).select('name').lean(),
    VenuePartner.find({}).select('name businessName commissionPercent').lean(),
  ]);
  const catById = new Map(categories.map((c) => [String(c._id), c]));
  const partnerById = new Map(partners.map((p) => [String(p._id), p]));
  res.json({
    success: true,
    data: venues.map((v) => {
      const partner = partnerById.get(String(v.partnerId));
      return {
        ...serializeVenue(v, { category: catById.get(String(v.categoryId)), includeAdmin: true }),
        partnerName: partner ? (partner.businessName || partner.name) : '',
        effectiveCommissionPercent: v.commissionPercent ?? partner?.commissionPercent ?? 0,
      };
    }),
  });
};

export const getVenue = async (req, res) => {
  assertObjectId(req.params.id, 'venue');
  const venue = await Venue.findById(req.params.id).lean();
  if (!venue) throw new ApiError(404, 'Venue not found');
  const [category, partner] = await Promise.all([
    VenueCategory.findById(venue.categoryId).select('name').lean(),
    VenuePartner.findById(venue.partnerId).lean(),
  ]);
  res.json({ success: true, data: { ...serializeVenue(venue, { category, includeAdmin: true }), partner: partner ? serializePartner(partner) : null } });
};

const adminVenueFields = (body = {}, existing = null) => {
  const fields = {};
  if (body.status !== undefined) {
    if (!['pending', 'active', 'inactive', 'rejected'].includes(body.status)) throw new ApiError(400, 'Invalid venue status');
    fields.status = body.status;
  }
  if (body.commissionPercent !== undefined) {
    fields.commissionPercent = body.commissionPercent === null || body.commissionPercent === '' ? null : parseCommission(body.commissionPercent, existing?.commissionPercent ?? null);
  }
  if (body.adminNote !== undefined) fields.adminNote = toCleanString(body.adminNote).slice(0, 500);
  return fields;
};

export const createVenue = async (req, res) => {
  const partnerId = assertObjectId(req.body?.partnerId, 'partner');
  if (!(await VenuePartner.exists({ _id: partnerId }))) throw new ApiError(404, 'Partner not found');
  const payload = await normalizeVenuePayload(req.body || {});
  const venue = await Venue.create({ ...payload, partnerId, status: 'active', ...adminVenueFields(req.body) });
  res.status(201).json({ success: true, data: serializeVenue(venue, { includeAdmin: true }) });
};

export const updateVenue = async (req, res) => {
  assertObjectId(req.params.id, 'venue');
  const venue = await Venue.findById(req.params.id);
  if (!venue) throw new ApiError(404, 'Venue not found');
  // Admin may change only status/commission/note, or the full venue details.
  if (req.body?.name !== undefined) {
    Object.assign(venue, await normalizeVenuePayload(req.body, venue.toObject()));
  }
  Object.assign(venue, adminVenueFields(req.body, venue.toObject()));
  await venue.save();
  res.json({ success: true, data: serializeVenue(venue, { includeAdmin: true }) });
};

// ───────────────────────────────────────────── bookings

const bookingFilterFromQuery = (query = {}) => {
  const filter = { status: { $in: ['confirmed', 'cancelled'] } };
  if (query.status) filter.status = query.status;
  // ObjectIds, not strings: this filter is also used in an aggregation, which does not cast.
  if (query.venueId) filter.venueId = new mongoose.Types.ObjectId(assertObjectId(query.venueId, 'venue'));
  if (query.partnerId) filter.partnerId = new mongoose.Types.ObjectId(assertObjectId(query.partnerId, 'partner'));
  if (query.source) filter.bookingSource = query.source;
  if (query.from || query.to) {
    filter.visitDate = {};
    if (query.from) filter.visitDate.$gte = String(query.from).slice(0, 10);
    if (query.to) filter.visitDate.$lte = String(query.to).slice(0, 10);
  }
  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ bookingCode: pattern }, { 'customer.name': pattern }, { 'customer.phone': pattern }, { 'venueSnapshot.name': pattern }];
  }
  return filter;
};

export const listBookings = async (req, res) => {
  const filter = bookingFilterFromQuery(req.query);
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
  const [items, total, summary] = await Promise.all([
    EntertainmentBooking.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    EntertainmentBooking.countDocuments(filter),
    EntertainmentBooking.aggregate([
      { $match: { ...filter, status: 'confirmed' } },
      {
        $group: {
          _id: null,
          bookings: { $sum: 1 },
          tickets: { $sum: '$totalTickets' },
          sales: { $sum: '$amount' },
          gst: { $sum: '$gstAmount' },
          commission: { $sum: '$commissionAmount' },
          partnerEarnings: { $sum: '$partnerEarning' },
          agentCommission: { $sum: '$agentMeta.commissionAmount' },
        },
      },
    ]),
  ]);
  const s = summary[0] || {};
  res.json({
    success: true,
    data: {
      results: items.map((b) => serializeBooking(b, { includeMoney: true })),
      total,
      page,
      limit,
      summary: {
        bookings: s.bookings || 0,
        tickets: s.tickets || 0,
        sales: roundMoney(s.sales),
        gst: roundMoney(s.gst),
        commission: roundMoney(s.commission),
        partnerEarnings: roundMoney(s.partnerEarnings),
        agentCommission: roundMoney(s.agentCommission),
      },
    },
  });
};

export const getBooking = async (req, res) => {
  assertObjectId(req.params.id, 'booking');
  const booking = await EntertainmentBooking.findById(req.params.id).lean();
  if (!booking) throw new ApiError(404, 'Booking not found');
  res.json({ success: true, data: serializeBooking(booking, { includeMoney: true }) });
};

export const cancelBookingAsAdmin = async (req, res) => {
  const booking = await cancelBooking({ bookingId: req.params.id, actor: 'admin', reason: req.body?.reason, asAdmin: true });
  res.json({ success: true, data: serializeBooking(booking, { includeMoney: true }) });
};

// ───────────────────────────────────────────── partner payouts

export const listWithdrawals = async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const [requests, partners] = await Promise.all([
    VenuePartnerWithdrawalRequest.find(filter).sort({ createdAt: -1 }).limit(200).lean(),
    VenuePartner.find({}).select('name businessName phone wallet').lean(),
  ]);
  const byId = new Map(partners.map((p) => [String(p._id), p]));
  res.json({
    success: true,
    data: requests.map((r) => {
      const partner = byId.get(String(r.partnerId));
      return {
        id: String(r._id),
        partnerId: String(r.partnerId),
        partnerName: partner ? (partner.businessName || partner.name) : '',
        partnerPhone: partner?.phone || '',
        walletBalance: roundMoney(partner?.wallet?.balance),
        amount: r.amount,
        status: r.status,
        payout: r.payoutSnapshot || {},
        note: r.note,
        adminNote: r.adminNote,
        createdAt: r.createdAt,
        reviewedAt: r.reviewedAt,
      };
    }),
  });
};

export const approveWithdrawal = async (req, res) => {
  assertObjectId(req.params.id, 'withdrawal request');
  // Claim the request first so two clicks cannot pay it twice.
  const request = await VenuePartnerWithdrawalRequest.findOneAndUpdate(
    { _id: req.params.id, status: 'pending' },
    { $set: { status: 'approved', reviewedAt: new Date(), reviewedBy: String(req.auth.sub), adminNote: toCleanString(req.body?.adminNote) } },
    { returnDocument: 'after' },
  );
  if (!request) throw new ApiError(409, 'Only pending requests can be approved');
  try {
    await applyPartnerWalletChange({
      partnerId: request.partnerId,
      kind: 'debit',
      type: 'withdrawal',
      amount: request.amount,
      title: 'Payout approved by admin',
      referenceKey: `ent:withdrawal:${request._id}`,
      metadata: { withdrawalRequestId: String(request._id) },
      requireBalance: true,
    });
  } catch (error) {
    await VenuePartnerWithdrawalRequest.updateOne({ _id: request._id }, { $set: { status: 'pending', reviewedAt: null, reviewedBy: '' } });
    throw error;
  }
  res.json({ success: true, data: { id: String(request._id), status: 'approved' } });
};

export const rejectWithdrawal = async (req, res) => {
  assertObjectId(req.params.id, 'withdrawal request');
  const request = await VenuePartnerWithdrawalRequest.findOneAndUpdate(
    { _id: req.params.id, status: 'pending' },
    { $set: { status: 'rejected', reviewedAt: new Date(), reviewedBy: String(req.auth.sub), adminNote: toCleanString(req.body?.adminNote) } },
    { returnDocument: 'after' },
  );
  if (!request) throw new ApiError(409, 'Only pending requests can be rejected');
  res.json({ success: true, data: { id: String(request._id), status: 'rejected' } });
};

// ───────────────────────────────────────────── settings + overview

export const getSettings = async (_req, res) => {
  res.json({ success: true, data: await getEntertainmentSettings() });
};

export const updateSettings = async (req, res) => {
  res.json({ success: true, data: await saveEntertainmentSettings(req.body || {}) });
};

export const getOverview = async (_req, res) => {
  const [partners, venuesByStatus, money, pendingWithdrawals] = await Promise.all([
    VenuePartner.countDocuments({}),
    Venue.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    EntertainmentBooking.aggregate([
      { $match: { status: 'confirmed' } },
      { $group: { _id: null, bookings: { $sum: 1 }, tickets: { $sum: '$totalTickets' }, sales: { $sum: '$amount' }, gst: { $sum: '$gstAmount' }, commission: { $sum: '$commissionAmount' }, partnerEarnings: { $sum: '$partnerEarning' } } },
    ]),
    VenuePartnerWithdrawalRequest.aggregate([{ $match: { status: 'pending' } }, { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$amount' } } }]),
  ]);
  res.json({
    success: true,
    data: {
      partners,
      venues: Object.fromEntries(venuesByStatus.map((row) => [row._id, row.count])),
      bookings: money[0]?.bookings || 0,
      tickets: money[0]?.tickets || 0,
      sales: roundMoney(money[0]?.sales),
      gst: roundMoney(money[0]?.gst),
      commission: roundMoney(money[0]?.commission),
      partnerEarnings: roundMoney(money[0]?.partnerEarnings),
      pendingWithdrawals: { count: pendingWithdrawals[0]?.count || 0, amount: roundMoney(pendingWithdrawals[0]?.amount) },
    },
  });
};
