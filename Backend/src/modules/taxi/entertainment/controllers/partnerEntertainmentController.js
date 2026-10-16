import mongoose from 'mongoose';
import { ApiError } from '../../../../utils/ApiError.js';
import { EntertainmentBooking } from '../models/EntertainmentBooking.js';
import { Venue } from '../models/Venue.js';
import { VenueCategory } from '../models/VenueCategory.js';
import { VenuePartner } from '../models/VenuePartner.js';
import { VenuePartnerWalletTransaction } from '../models/VenuePartnerWalletTransaction.js';
import { VenuePartnerWithdrawalRequest } from '../models/VenuePartnerWithdrawalRequest.js';
import {
  assertObjectId,
  checkInTicket,
  normalizeVenuePayload,
  roundMoney,
  serializeBooking,
  serializeVenue,
  todayIst,
} from '../services/entertainmentService.js';

const partnerObjectId = (req) => new mongoose.Types.ObjectId(String(req.auth.sub));

export const serializePartner = (partner) => {
  const p = partner?.toObject ? partner.toObject() : partner;
  return {
    id: String(p._id),
    name: p.name,
    businessName: p.businessName,
    phone: p.phone,
    email: p.email,
    city: p.city,
    commissionPercent: p.commissionPercent,
    status: p.status,
    wallet: {
      balance: roundMoney(p.wallet?.balance),
      lifetimeEarned: roundMoney(p.wallet?.lifetimeEarned),
      lifetimePaidOut: roundMoney(p.wallet?.lifetimePaidOut),
    },
    payout: p.payout || {},
    createdAt: p.createdAt,
  };
};

export const getMe = async (req, res) => {
  res.json({ success: true, data: serializePartner(req.auth.entity) });
};

export const updatePayout = async (req, res) => {
  const payout = req.body?.payout || {};
  const partner = await VenuePartner.findByIdAndUpdate(
    req.auth.sub,
    {
      $set: {
        'payout.accountHolder': String(payout.accountHolder || '').trim(),
        'payout.bankName': String(payout.bankName || '').trim(),
        'payout.accountNumber': String(payout.accountNumber || '').trim(),
        'payout.ifscCode': String(payout.ifscCode || '').trim().toUpperCase(),
        'payout.upiId': String(payout.upiId || '').trim(),
      },
    },
    { returnDocument: 'after' },
  );
  res.json({ success: true, data: serializePartner(partner) });
};

export const getDashboard = async (req, res) => {
  const partnerId = partnerObjectId(req);
  const today = todayIst();
  const since = new Date(Date.now() - 29 * 86400000);
  since.setUTCHours(0, 0, 0, 0);

  const [partner, todayAgg, totalsAgg, dailyAgg, upcoming, venueCounts] = await Promise.all([
    VenuePartner.findById(partnerId).lean(),
    EntertainmentBooking.aggregate([
      { $match: { partnerId, visitDate: today, status: 'confirmed' } },
      {
        $group: {
          _id: null,
          bookings: { $sum: 1 },
          tickets: { $sum: '$totalTickets' },
          checkedInTickets: { $sum: { $cond: [{ $eq: ['$checkIn.status', 'checked_in'] }, '$totalTickets', 0] } },
        },
      },
    ]),
    EntertainmentBooking.aggregate([
      { $match: { partnerId, status: { $in: ['confirmed', 'cancelled'] }, 'payment.paidAt': { $ne: null } } },
      {
        $group: {
          _id: '$status',
          bookings: { $sum: 1 },
          tickets: { $sum: '$totalTickets' },
          sales: { $sum: { $ifNull: ['$subtotal', '$amount'] } },
          earnings: { $sum: '$partnerEarning' },
          refunds: { $sum: '$cancellation.refundAmount' },
        },
      },
    ]),
    EntertainmentBooking.aggregate([
      { $match: { partnerId, status: 'confirmed', 'payment.paidAt': { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$payment.paidAt', timezone: '+05:30' } },
          sales: { $sum: { $ifNull: ['$subtotal', '$amount'] } },
          earnings: { $sum: '$partnerEarning' },
          tickets: { $sum: '$totalTickets' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    EntertainmentBooking.find({ partnerId, status: 'confirmed', visitDate: { $gte: today } })
      .sort({ visitDate: 1, slotStartTime: 1 })
      .limit(8)
      .lean(),
    Venue.aggregate([{ $match: { partnerId } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  const confirmed = totalsAgg.find((row) => row._id === 'confirmed') || {};
  const cancelled = totalsAgg.find((row) => row._id === 'cancelled') || {};
  const dailyByDate = new Map(dailyAgg.map((row) => [row._id, row]));
  const daily = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(since.getTime() + index * 86400000 + 5.5 * 3600000).toISOString().slice(0, 10);
    const row = dailyByDate.get(date) || {};
    return { date, sales: roundMoney(row.sales), earnings: roundMoney(row.earnings), tickets: row.tickets || 0 };
  });

  res.json({
    success: true,
    data: {
      partner: serializePartner(partner),
      today: {
        date: today,
        bookings: todayAgg[0]?.bookings || 0,
        tickets: todayAgg[0]?.tickets || 0,
        checkedInTickets: todayAgg[0]?.checkedInTickets || 0,
      },
      totals: {
        bookings: confirmed.bookings || 0,
        ticketsSold: confirmed.tickets || 0,
        sales: roundMoney(confirmed.sales),
        earnings: roundMoney(confirmed.earnings),
        cancelledBookings: cancelled.bookings || 0,
        refunded: roundMoney(cancelled.refunds),
      },
      daily,
      upcoming: upcoming.map((b) => serializeBooking(b, { includeMoney: true })),
      venues: Object.fromEntries(venueCounts.map((row) => [row._id, row.count])),
    },
  });
};

export const listCategories = async (_req, res) => {
  const categories = await VenueCategory.find({ active: true }).sort({ order: 1, name: 1 }).lean();
  res.json({ success: true, data: categories.map((c) => ({ id: String(c._id), name: c.name })) });
};

export const listMyVenues = async (req, res) => {
  const [venues, categories] = await Promise.all([
    Venue.find({ partnerId: req.auth.sub }).sort({ createdAt: -1 }).lean(),
    VenueCategory.find({}).select('name').lean(),
  ]);
  const byId = new Map(categories.map((c) => [String(c._id), c]));
  res.json({ success: true, data: venues.map((v) => serializeVenue(v, { category: byId.get(String(v.categoryId)), includeAdmin: true })) });
};

const loadOwnVenue = async (req) => {
  assertObjectId(req.params.id, 'venue');
  const venue = await Venue.findOne({ _id: req.params.id, partnerId: req.auth.sub });
  if (!venue) throw new ApiError(404, 'Venue not found');
  return venue;
};

export const getMyVenue = async (req, res) => {
  const venue = await loadOwnVenue(req);
  const category = await VenueCategory.findById(venue.categoryId).select('name').lean();
  res.json({ success: true, data: serializeVenue(venue, { category, includeAdmin: true }) });
};

export const createMyVenue = async (req, res) => {
  const payload = await normalizeVenuePayload(req.body || {});
  // A partner's new venue goes live once the admin approves it.
  const venue = await Venue.create({ ...payload, partnerId: req.auth.sub, status: 'pending' });
  res.status(201).json({ success: true, data: serializeVenue(venue, { includeAdmin: true }) });
};

export const updateMyVenue = async (req, res) => {
  const venue = await loadOwnVenue(req);
  const payload = await normalizeVenuePayload(req.body || {}, venue.toObject());
  Object.assign(venue, payload);
  if (venue.status === 'rejected') venue.status = 'pending';
  await venue.save();
  res.json({ success: true, data: serializeVenue(venue, { includeAdmin: true }) });
};

export const listMyBookings = async (req, res) => {
  const filter = { partnerId: req.auth.sub, status: { $in: ['confirmed', 'cancelled'] } };
  if (req.query.status && ['confirmed', 'cancelled'].includes(req.query.status)) filter.status = req.query.status;
  if (req.query.venueId) filter.venueId = assertObjectId(req.query.venueId, 'venue');
  if (req.query.visitDate) filter.visitDate = String(req.query.visitDate).slice(0, 10);
  if (req.query.checkIn === 'checked_in' || req.query.checkIn === 'pending') filter['checkIn.status'] = req.query.checkIn;
  const search = String(req.query.search || '').trim();
  if (search) {
    const pattern = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ bookingCode: pattern }, { 'customer.name': pattern }, { 'customer.phone': pattern }];
  }
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
  const [items, total] = await Promise.all([
    EntertainmentBooking.find(filter).sort({ visitDate: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    EntertainmentBooking.countDocuments(filter),
  ]);
  res.json({ success: true, data: { results: items.map((b) => serializeBooking(b, { includeMoney: true })), total, page, limit } });
};

export const checkIn = async (req, res) => {
  const result = await checkInTicket({ partnerId: req.auth.sub, qrValue: req.body?.qrValue || req.body?.code, actorLabel: 'venue_partner' });
  res.json({ success: true, data: { booking: serializeBooking(result.booking, { includeMoney: true }), alreadyCheckedIn: result.alreadyCheckedIn } });
};

export const getWallet = async (req, res) => {
  const [partner, transactions, withdrawals] = await Promise.all([
    VenuePartner.findById(req.auth.sub).lean(),
    VenuePartnerWalletTransaction.find({ partnerId: req.auth.sub }).sort({ createdAt: -1 }).limit(100).lean(),
    VenuePartnerWithdrawalRequest.find({ partnerId: req.auth.sub }).sort({ createdAt: -1 }).limit(50).lean(),
  ]);
  res.json({
    success: true,
    data: {
      wallet: serializePartner(partner).wallet,
      transactions: transactions.map((t) => ({
        id: String(t._id), kind: t.kind, type: t.type, amount: t.amount, balanceAfter: t.balanceAfter, title: t.title, createdAt: t.createdAt,
      })),
      withdrawals: withdrawals.map((w) => ({
        id: String(w._id), amount: w.amount, status: w.status, adminNote: w.adminNote, createdAt: w.createdAt, reviewedAt: w.reviewedAt,
      })),
    },
  });
};

export const requestWithdrawal = async (req, res) => {
  const amount = roundMoney(req.body?.amount);
  if (!(amount >= 1)) throw new ApiError(400, 'Enter an amount of at least Rs 1');
  const partner = await VenuePartner.findById(req.auth.sub).lean();
  const pending = await VenuePartnerWithdrawalRequest.aggregate([
    { $match: { partnerId: partner._id, status: 'pending' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const available = roundMoney(Number(partner.wallet?.balance || 0) - Number(pending[0]?.total || 0));
  if (amount > available) throw new ApiError(400, `You can withdraw up to Rs ${Math.max(0, available)}`);
  const payout = partner.payout || {};
  if (!payout.upiId && !(payout.accountNumber && payout.ifscCode)) {
    throw new ApiError(400, 'Add your bank account or UPI ID before requesting a payout');
  }
  const request = await VenuePartnerWithdrawalRequest.create({
    partnerId: partner._id,
    amount,
    payoutSnapshot: payout,
    note: String(req.body?.note || '').trim().slice(0, 300),
  });
  res.status(201).json({ success: true, data: { id: String(request._id), amount: request.amount, status: request.status } });
};
