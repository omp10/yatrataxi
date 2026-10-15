import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import QRCode from 'qrcode';
import { env } from '../../../../config/env.js';
import { ApiError } from '../../../../utils/ApiError.js';
import { AdminBusinessSetting } from '../../admin/models/AdminBusinessSetting.js';
import { User } from '../../user/models/User.js';
import { creditAgentCommission, revertAgentCommission } from '../../agent/services/agentCommissionService.js';
import { claimGatewayPayment } from '../../services/paymentCaptureService.js';
import { EntertainmentBooking } from '../models/EntertainmentBooking.js';
import { Venue } from '../models/Venue.js';
import { VenueCategory } from '../models/VenueCategory.js';
import { VenuePartner } from '../models/VenuePartner.js';
import { VenuePartnerWalletTransaction } from '../models/VenuePartnerWalletTransaction.js';
import { VenueSlotInventory } from '../models/VenueSlotInventory.js';
import { razorpayGateway } from './razorpayClient.js';

export const MAX_TICKETS_PER_BOOKING = 50;
const DEFAULT_HOLD_MINUTES = 15;
const TICKET_TOKEN_TYPE = 'entertainment_ticket_checkin';
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export const roundMoney = (value) => Math.round(Number(value || 0) * 100) / 100;
const toCleanString = (value) => String(value ?? '').trim();

export const assertObjectId = (value, label = 'id') => {
  if (!mongoose.isValidObjectId(value)) {
    throw new ApiError(400, `Invalid ${label}`);
  }
  return String(value);
};

// ───────────────────────────────────────────── dates (venues operate in IST)

export const todayIst = () => new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);

export const normalizeVisitDate = (value) => {
  const text = toCleanString(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(new Date(`${text}T00:00:00Z`).getTime())) {
    throw new ApiError(400, 'Visit date must be YYYY-MM-DD');
  }
  return text;
};

const addDays = (dateText, days) => new Date(new Date(`${dateText}T00:00:00Z`).getTime() + days * 86400000).toISOString().slice(0, 10);

const isWeekend = (dateText) => [0, 6].includes(new Date(`${dateText}T00:00:00Z`).getUTCDay());

export const slotStartsAt = (visitDate, startTime) => new Date(`${visitDate}T${startTime || '00:00'}:00+05:30`);

const isValidTime = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(toCleanString(value));

// ───────────────────────────────────────────── admin settings (refund rules)

const normalizeRefundRule = (rule = {}, index = 0) => {
  const refundType = ['percentage', 'fixed', 'none'].includes(rule.refundType) ? rule.refundType : 'percentage';
  return {
    id: toCleanString(rule.id) || `rule-${index + 1}`,
    label: toCleanString(rule.label),
    hoursBeforeVisit: Math.max(0, Number(rule.hoursBeforeVisit) || 0),
    refundType,
    refundValue: refundType === 'none' ? 0 : Math.max(0, Number(rule.refundValue) || 0),
  };
};

export const getEntertainmentSettings = async () => {
  const doc = await AdminBusinessSetting.findOne({ scope: 'default' }).select('entertainment').lean();
  const stored = doc?.entertainment || {};
  return {
    holdMinutes: Math.min(60, Math.max(5, Number(stored.holdMinutes) || DEFAULT_HOLD_MINUTES)),
    // Sorted from the earliest cancellation (most hours before) to the latest.
    refundRules: (Array.isArray(stored.refundRules) ? stored.refundRules : [])
      .map(normalizeRefundRule)
      .sort((a, b) => b.hoursBeforeVisit - a.hoursBeforeVisit),
  };
};

export const saveEntertainmentSettings = async (payload = {}) => {
  const refundRules = (Array.isArray(payload.refundRules) ? payload.refundRules : []).map(normalizeRefundRule);
  for (const rule of refundRules) {
    if (rule.refundType === 'percentage' && rule.refundValue > 100) {
      throw new ApiError(400, 'A percentage refund cannot exceed 100%');
    }
  }
  const next = {
    holdMinutes: Math.min(60, Math.max(5, Number(payload.holdMinutes) || DEFAULT_HOLD_MINUTES)),
    refundRules,
  };
  await AdminBusinessSetting.updateOne({ scope: 'default' }, { $set: { entertainment: next } }, { upsert: true });
  return getEntertainmentSettings();
};

// Refund for a cancellation made `hoursBeforeVisit` hours before the slot starts:
// the first rule whose threshold is met applies; no matching rule = no refund.
export const quoteRefund = ({ amount, hoursBeforeVisit, rules }) => {
  const rule = rules.find((item) => hoursBeforeVisit >= item.hoursBeforeVisit);
  if (!rule || rule.refundType === 'none') {
    return { allowed: Boolean(rule), refundAmount: 0, chargeAmount: roundMoney(amount), rule: rule || null };
  }
  const refundAmount = rule.refundType === 'fixed'
    ? Math.min(roundMoney(amount), roundMoney(rule.refundValue))
    : roundMoney((amount * Math.min(100, rule.refundValue)) / 100);
  return { allowed: true, refundAmount, chargeAmount: roundMoney(amount - refundAmount), rule };
};

// ───────────────────────────────────────────── venue validation

const normalizeTicketTypes = (items = []) => {
  const seen = new Set();
  return (Array.isArray(items) ? items : []).map((item, index) => {
    const name = toCleanString(item.name);
    const price = Number(item.price);
    if (!name) throw new ApiError(400, `Ticket type ${index + 1} needs a name`);
    if (!Number.isFinite(price) || price <= 0) throw new ApiError(400, `Set a price for ticket "${name}"`);
    const id = toCleanString(item.id) || `tt-${crypto.randomBytes(4).toString('hex')}`;
    if (seen.has(id)) throw new ApiError(400, 'Duplicate ticket type id');
    seen.add(id);
    return {
      id,
      name,
      description: toCleanString(item.description),
      price: roundMoney(price),
      weekendPrice: Math.max(0, roundMoney(item.weekendPrice)),
      active: item.active !== false,
    };
  });
};

const normalizeTimeSlots = (items = []) => {
  const seen = new Set();
  return (Array.isArray(items) ? items : []).map((item, index) => {
    const startTime = toCleanString(item.startTime);
    const endTime = toCleanString(item.endTime);
    if (!isValidTime(startTime) || !isValidTime(endTime) || endTime <= startTime) {
      throw new ApiError(400, `Time slot ${index + 1} needs a valid start and end time`);
    }
    const capacity = Math.floor(Number(item.capacity));
    if (!Number.isFinite(capacity) || capacity < 1) {
      throw new ApiError(400, `Time slot ${index + 1} needs a capacity of at least 1`);
    }
    const id = toCleanString(item.id) || `slot-${crypto.randomBytes(4).toString('hex')}`;
    if (seen.has(id)) throw new ApiError(400, 'Duplicate time slot id');
    seen.add(id);
    return {
      id,
      label: toCleanString(item.label) || `${startTime} - ${endTime}`,
      startTime,
      endTime,
      capacity,
      active: item.active !== false,
    };
  });
};

// Fields a partner may edit; admin-only fields (status, commission) are handled separately.
export const normalizeVenuePayload = async (payload = {}, existing = null) => {
  const pick = (key, fallback) => (payload[key] !== undefined ? payload[key] : (existing ? existing[key] : fallback));

  const name = toCleanString(pick('name', ''));
  if (!name) throw new ApiError(400, 'Venue name is required');

  const categoryId = toCleanString(pick('categoryId', ''));
  assertObjectId(categoryId, 'category');
  const category = await VenueCategory.findOne({ _id: categoryId, active: true }).lean();
  if (!category) throw new ApiError(400, 'Choose an active venue category');

  const ticketTypes = normalizeTicketTypes(pick('ticketTypes', []));
  const timeSlots = normalizeTimeSlots(pick('timeSlots', []));
  if (!ticketTypes.some((item) => item.active)) throw new ApiError(400, 'Add at least one active ticket type');
  if (!timeSlots.some((item) => item.active)) throw new ApiError(400, 'Add at least one active time slot');

  const latitude = Number(payload.latitude ?? existing?.location?.coordinates?.[1]);
  const longitude = Number(payload.longitude ?? existing?.location?.coordinates?.[0]);
  const hasLocation = Number.isFinite(latitude) && Number.isFinite(longitude) && (latitude !== 0 || longitude !== 0);

  const closedDates = (Array.isArray(pick('closedDates', [])) ? pick('closedDates', []) : [])
    .map((value) => normalizeVisitDate(value));

  return {
    name,
    categoryId,
    description: toCleanString(pick('description', '')),
    coverImage: toCleanString(pick('coverImage', '')),
    images: (Array.isArray(pick('images', [])) ? pick('images', []) : []).map(toCleanString).filter(Boolean).slice(0, 12),
    address: toCleanString(pick('address', '')),
    city: toCleanString(pick('city', '')),
    location: hasLocation ? { type: 'Point', coordinates: [longitude, latitude] } : undefined,
    rules: toCleanString(pick('rules', '')),
    amenities: (Array.isArray(pick('amenities', [])) ? pick('amenities', []) : []).map(toCleanString).filter(Boolean).slice(0, 30),
    ticketTypes,
    timeSlots,
    closedDates: [...new Set(closedDates)].sort(),
    bookingWindowDays: Math.min(365, Math.max(1, Math.floor(Number(pick('bookingWindowDays', 30)) || 30))),
  };
};

export const resolveCommissionPercent = (venue, partner) => {
  const override = venue?.commissionPercent;
  const value = override === null || override === undefined ? partner?.commissionPercent : override;
  return Math.min(100, Math.max(0, Number(value) || 0));
};

// ───────────────────────────────────────────── availability + quotes

const loadBookableVenue = async (venueId) => {
  assertObjectId(venueId, 'venue');
  const venue = await Venue.findById(venueId).lean();
  if (!venue || venue.status !== 'active') {
    throw new ApiError(404, 'Venue is not available');
  }
  const partner = await VenuePartner.findById(venue.partnerId).lean();
  if (!partner || partner.status !== 'active' || partner.active === false) {
    throw new ApiError(404, 'Venue is not available');
  }
  return { venue, partner };
};

const assertBookableDate = (venue, visitDate) => {
  const today = todayIst();
  if (visitDate < today) throw new ApiError(400, 'Visit date is in the past');
  if (visitDate > addDays(today, venue.bookingWindowDays || 30)) {
    throw new ApiError(400, `Tickets can be booked up to ${venue.bookingWindowDays || 30} days ahead`);
  }
  if ((venue.closedDates || []).includes(visitDate)) throw new ApiError(400, 'The venue is closed on this date');
};

export const getSlotAvailability = async (venue, visitDate) => {
  const slots = (venue.timeSlots || []).filter((slot) => slot.active);
  const inventory = await VenueSlotInventory.find({ venueId: venue._id, visitDate, slotId: { $in: slots.map((s) => s.id) } }).lean();
  const reservedBySlot = new Map(inventory.map((row) => [row.slotId, row.reserved]));
  const isClosed = (venue.closedDates || []).includes(visitDate);
  const now = Date.now();

  return slots.map((slot) => {
    const remaining = Math.max(0, slot.capacity - (reservedBySlot.get(slot.id) || 0));
    // Entry tickets stay on sale until the slot ends, so same-day visitors can still buy.
    const ended = slotStartsAt(visitDate, slot.endTime).getTime() <= now;
    return {
      id: slot.id,
      label: slot.label,
      startTime: slot.startTime,
      endTime: slot.endTime,
      capacity: slot.capacity,
      remaining,
      available: !isClosed && !ended && remaining > 0,
      reason: isClosed ? 'closed' : ended ? 'ended' : remaining <= 0 ? 'sold_out' : '',
    };
  });
};

// Prices a basket from the venue's current price list. Client prices are ignored.
export const quoteTickets = ({ venue, partner, visitDate, slotId, items }) => {
  assertBookableDate(venue, visitDate);
  const slot = (venue.timeSlots || []).find((item) => item.id === slotId && item.active);
  if (!slot) throw new ApiError(400, 'Choose an available time slot');
  if (slotStartsAt(visitDate, slot.endTime).getTime() <= Date.now()) {
    throw new ApiError(400, 'This time slot has already ended');
  }

  const weekend = isWeekend(visitDate);
  const merged = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    const id = toCleanString(item.ticketTypeId);
    const quantity = Math.floor(Number(item.quantity));
    if (!id || !Number.isFinite(quantity) || quantity <= 0) continue;
    merged.set(id, (merged.get(id) || 0) + quantity);
  }

  const lines = [...merged.entries()].map(([ticketTypeId, quantity]) => {
    const ticketType = (venue.ticketTypes || []).find((t) => t.id === ticketTypeId && t.active);
    if (!ticketType) throw new ApiError(400, 'One of the selected tickets is no longer sold');
    const unitPrice = roundMoney(weekend && ticketType.weekendPrice > 0 ? ticketType.weekendPrice : ticketType.price);
    return { ticketTypeId, name: ticketType.name, unitPrice, quantity, amount: roundMoney(unitPrice * quantity) };
  });

  const totalTickets = lines.reduce((sum, line) => sum + line.quantity, 0);
  if (totalTickets < 1) throw new ApiError(400, 'Select at least one ticket');
  if (totalTickets > MAX_TICKETS_PER_BOOKING) throw new ApiError(400, `A booking can have at most ${MAX_TICKETS_PER_BOOKING} tickets`);

  const amount = roundMoney(lines.reduce((sum, line) => sum + line.amount, 0));
  const commissionPercent = resolveCommissionPercent(venue, partner);
  const commissionAmount = roundMoney((amount * commissionPercent) / 100);

  return {
    slot,
    items: lines,
    totalTickets,
    amount,
    commissionPercent,
    commissionAmount,
    partnerEarning: roundMoney(amount - commissionAmount),
    isWeekendPricing: weekend,
  };
};

// ───────────────────────────────────────────── inventory (oversell-proof)

const reserveSeats = async ({ venueId, visitDate, slotId, quantity, capacity }) => {
  await VenueSlotInventory.updateOne(
    { venueId, visitDate, slotId },
    { $setOnInsert: { venueId, visitDate, slotId, reserved: 0 } },
    { upsert: true },
  ).catch((error) => {
    if (error?.code !== 11000) throw error;
  });
  const reserved = await VenueSlotInventory.findOneAndUpdate(
    { venueId, visitDate, slotId, reserved: { $lte: capacity - quantity } },
    { $inc: { reserved: quantity } },
    { returnDocument: 'after' },
  );
  if (!reserved) {
    throw new ApiError(409, 'Not enough tickets left for this time slot');
  }
};

const releaseSeats = ({ venueId, visitDate, slotId, quantity }) => VenueSlotInventory.updateOne(
  { venueId, visitDate, slotId, reserved: { $gte: quantity } },
  { $inc: { reserved: -quantity } },
);

// Unpaid bookings whose hold ran out give their seats back.
export const expireStaleHolds = async () => {
  const stale = await EntertainmentBooking.find({ status: 'pending', expiresAt: { $lte: new Date() } })
    .select('_id')
    .limit(200)
    .lean();
  for (const { _id } of stale) {
    const expired = await EntertainmentBooking.findOneAndUpdate(
      { _id, status: 'pending', expiresAt: { $lte: new Date() } },
      { $set: { status: 'expired', 'payment.status': 'expired' } },
      { returnDocument: 'after' },
    );
    if (expired) {
      await releaseSeats({ venueId: expired.venueId, visitDate: expired.visitDate, slotId: expired.slotId, quantity: expired.totalTickets });
    }
  }
};

// ───────────────────────────────────────────── partner wallet (idempotent ledger)

// The ledger row (unique referenceKey) is written first, so a retry or a race can
// never move the balance twice; the balance itself moves with one atomic $inc.
export const applyPartnerWalletChange = async ({ partnerId, kind, type, amount, title, bookingId = null, referenceKey, metadata = {}, requireBalance = false }) => {
  const value = roundMoney(amount);
  if (!(value > 0)) return null;

  let entry;
  try {
    entry = await VenuePartnerWalletTransaction.create({ partnerId, kind, type, amount: value, title, bookingId, referenceKey, metadata });
  } catch (error) {
    if (error?.code === 11000) return null;
    throw error;
  }

  const delta = kind === 'credit' ? value : -value;
  const inc = { 'wallet.balance': delta };
  if (type === 'ticket_sale') inc['wallet.lifetimeEarned'] = value;
  if (type === 'refund_reversal') inc['wallet.lifetimeEarned'] = -value;
  if (type === 'withdrawal') inc['wallet.lifetimePaidOut'] = value;

  const filter = { _id: partnerId, ...(requireBalance ? { 'wallet.balance': { $gte: value } } : {}) };
  const partner = await VenuePartner.findOneAndUpdate(filter, { $inc: inc }, { returnDocument: 'after' });
  if (!partner) {
    await VenuePartnerWalletTransaction.deleteOne({ _id: entry._id });
    throw new ApiError(requireBalance ? 400 : 404, requireBalance ? 'Wallet balance is too low' : 'Partner not found');
  }

  entry.balanceAfter = roundMoney(partner.wallet?.balance);
  await entry.save();
  return { entry, partner };
};

// ───────────────────────────────────────────── booking lifecycle

const createBookingCode = () => `ENT${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

export const createBookingOrder = async ({ userId, customer = {}, venueId, visitDate, slotId, items, agentId = null }) => {
  await expireStaleHolds();
  const normalizedDate = normalizeVisitDate(visitDate);
  const { venue, partner } = await loadBookableVenue(venueId);
  const quote = quoteTickets({ venue, partner, visitDate: normalizedDate, slotId: toCleanString(slotId), items });
  const settings = await getEntertainmentSettings();
  const category = await VenueCategory.findById(venue.categoryId).select('name').lean();
  const user = await User.findById(userId).select('name phone email referredByAgent').lean();
  if (!user) throw new ApiError(404, 'Customer not found');

  await reserveSeats({ venueId: venue._id, visitDate: normalizedDate, slotId: quote.slot.id, quantity: quote.totalTickets, capacity: quote.slot.capacity });

  let booking;
  try {
    booking = await EntertainmentBooking.create({
      bookingCode: createBookingCode(),
      userId,
      venueId: venue._id,
      partnerId: partner._id,
      bookingSource: agentId ? 'agent' : 'user',
      customer: {
        name: toCleanString(customer.name) || user.name || '',
        phone: toCleanString(customer.phone) || user.phone || '',
        email: toCleanString(customer.email) || user.email || '',
      },
      venueSnapshot: {
        name: venue.name,
        address: venue.address,
        city: venue.city,
        coverImage: venue.coverImage || venue.images?.[0] || '',
        categoryName: category?.name || '',
      },
      visitDate: normalizedDate,
      slotId: quote.slot.id,
      slotLabel: quote.slot.label,
      slotStartTime: quote.slot.startTime,
      slotEndTime: quote.slot.endTime,
      items: quote.items,
      totalTickets: quote.totalTickets,
      amount: quote.amount,
      commissionPercent: quote.commissionPercent,
      commissionAmount: quote.commissionAmount,
      partnerEarning: quote.partnerEarning,
      status: 'pending',
      expiresAt: new Date(Date.now() + settings.holdMinutes * 60 * 1000),
      agentMeta: agentId
        ? { bookedByAgentId: agentId, commissionMode: 'direct' }
        : user.referredByAgent
          ? { bookedByAgentId: user.referredByAgent, commissionMode: 'referral' }
          : {},
    });

    const order = await razorpayGateway.request({
      method: 'POST',
      path: '/orders',
      body: {
        amount: Math.round(quote.amount * 100),
        currency: 'INR',
        receipt: booking.bookingCode,
        notes: { bookingId: String(booking._id), userId: String(userId), purpose: 'entertainment_booking' },
      },
    });
    booking.payment.orderId = order.id;
    await booking.save();

    const { keyId } = await razorpayGateway.getCredentials();
    return { booking, order: { id: order.id, amount: order.amount, currency: order.currency || 'INR' }, keyId };
  } catch (error) {
    await releaseSeats({ venueId: venue._id, visitDate: normalizedDate, slotId: quote.slot.id, quantity: quote.totalTickets });
    if (booking) {
      await EntertainmentBooking.updateOne({ _id: booking._id }, { $set: { status: 'failed', 'payment.status': 'failed' } });
    }
    throw error;
  }
};

const settleConfirmedBooking = async (booking) => {
  const partnerCredit = await applyPartnerWalletChange({
    partnerId: booking.partnerId,
    kind: 'credit',
    type: 'ticket_sale',
    amount: booking.partnerEarning,
    title: `Ticket sale ${booking.bookingCode}`,
    bookingId: booking._id,
    referenceKey: `ent:sale:${booking._id}`,
    metadata: { amount: booking.amount, commissionAmount: booking.commissionAmount },
  });
  if (partnerCredit) {
    await EntertainmentBooking.updateOne({ _id: booking._id }, { $set: { partnerCreditedAt: new Date() } });
  }

  const agentId = booking.agentMeta?.bookedByAgentId;
  if (agentId) {
    const result = await creditAgentCommission({
      agentId,
      bookingType: 'entertainment',
      commissionMode: booking.agentMeta.commissionMode || 'direct',
      grossAmount: booking.amount,
      referenceKey: `agent:entertainment:${booking._id}`,
      title: `Ticket commission ${booking.bookingCode}`,
      metadata: { bookingId: String(booking._id), bookingCode: booking.bookingCode },
    });
    if (result?.transaction) {
      await EntertainmentBooking.updateOne({ _id: booking._id }, {
        $set: {
          'agentMeta.commissionAmount': Number(result.transaction.amount || 0),
          'agentMeta.commissionCreditedAt': new Date(),
        },
      });
    }
  }
};

// Confirms a paid booking. The signature proves the order was paid; the order is
// then matched to this booking and amount, and the payment can only be used once.
export const verifyBookingPayment = async ({ ownerFilter, orderId, paymentId, signature }) => {
  if (!orderId || !paymentId || !signature) throw new ApiError(400, 'Payment details are required');
  if (!(await razorpayGateway.isValidSignature({ orderId, paymentId, signature }))) {
    throw new ApiError(400, 'Invalid payment signature');
  }

  const booking = await EntertainmentBooking.findOne({ 'payment.orderId': orderId, ...ownerFilter });
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (booking.status === 'confirmed') return booking;

  const order = await razorpayGateway.request({ method: 'GET', path: `/orders/${encodeURIComponent(orderId)}` });
  if (Number(order?.amount) !== Math.round(booking.amount * 100) || String(order?.notes?.bookingId || '') !== String(booking._id)) {
    throw new ApiError(400, 'Payment does not match this booking');
  }

  const claimed = await claimGatewayPayment({
    provider: 'razorpay',
    paymentId,
    orderId,
    purpose: 'entertainment_booking',
    ownerType: 'entertainment_booking',
    ownerId: String(booking._id),
    amount: booking.amount,
  });
  if (!claimed) return EntertainmentBooking.findById(booking._id);

  // The hold may have run out while the customer was paying: take the seats again
  // if they are still free, otherwise refund the payment in full.
  if (booking.status !== 'pending') {
    const venue = await Venue.findById(booking.venueId).lean();
    const slot = (venue?.timeSlots || []).find((s) => s.id === booking.slotId);
    try {
      if (!slot) throw new ApiError(409, 'Time slot no longer exists');
      await reserveSeats({ venueId: booking.venueId, visitDate: booking.visitDate, slotId: booking.slotId, quantity: booking.totalTickets, capacity: slot.capacity });
      await EntertainmentBooking.updateOne({ _id: booking._id, status: { $in: ['expired', 'failed'] } }, { $set: { status: 'pending' } });
    } catch (error) {
      const refund = await razorpayGateway.request({ method: 'POST', path: `/payments/${paymentId}/refund`, body: { amount: Math.round(booking.amount * 100) } });
      await EntertainmentBooking.updateOne({ _id: booking._id }, {
        $set: {
          status: 'failed',
          'payment.paymentId': paymentId,
          'payment.status': 'refunded',
          'cancellation.refundAmount': booking.amount,
          'cancellation.refundId': refund?.id || '',
          'cancellation.refundStatus': refund?.status || 'processed',
          'cancellation.reason': 'Tickets sold out before payment completed',
        },
      });
      throw new ApiError(409, 'Tickets sold out before your payment completed. The full amount has been refunded.');
    }
  }

  const confirmed = await EntertainmentBooking.findOneAndUpdate(
    { _id: booking._id, status: 'pending' },
    { $set: { status: 'confirmed', expiresAt: null, 'payment.paymentId': paymentId, 'payment.status': 'paid', 'payment.paidAt': new Date() } },
    { returnDocument: 'after' },
  );
  if (!confirmed) return EntertainmentBooking.findById(booking._id);

  await settleConfirmedBooking(confirmed);
  return EntertainmentBooking.findById(confirmed._id);
};

export const buildCancellationQuote = async (booking, { asAdmin = false } = {}) => {
  if (booking.status !== 'confirmed') return { allowed: false, reason: 'Only confirmed bookings can be cancelled' };
  if (booking.checkIn?.status === 'checked_in') return { allowed: false, reason: 'Tickets have already been used' };
  const hoursBeforeVisit = (slotStartsAt(booking.visitDate, booking.slotStartTime).getTime() - Date.now()) / 3600000;
  if (asAdmin) {
    return { allowed: true, refundAmount: booking.amount, chargeAmount: 0, ruleLabel: 'Cancelled by admin (full refund)', hoursBeforeVisit };
  }
  if (hoursBeforeVisit <= 0) return { allowed: false, reason: 'The visit time has already started' };
  const { rules } = { rules: (await getEntertainmentSettings()).refundRules };
  if (!rules.length) return { allowed: false, reason: 'These tickets cannot be cancelled' };
  const quote = quoteRefund({ amount: booking.amount, hoursBeforeVisit, rules });
  if (!quote.allowed) return { allowed: false, reason: 'It is too late to cancel these tickets' };
  return {
    allowed: true,
    refundAmount: quote.refundAmount,
    chargeAmount: quote.chargeAmount,
    ruleLabel: quote.rule?.label || `${quote.rule?.hoursBeforeVisit}h+ before visit`,
    hoursBeforeVisit,
  };
};

export const cancelBooking = async ({ bookingId, ownerFilter = {}, actor, reason = '', asAdmin = false }) => {
  assertObjectId(bookingId, 'booking');
  const locked = await EntertainmentBooking.findOneAndUpdate(
    {
      _id: bookingId,
      ...ownerFilter,
      status: 'confirmed',
      $or: [{ cancellationLockedAt: null }, { cancellationLockedAt: { $lt: new Date(Date.now() - 2 * 60 * 1000) } }],
    },
    { $set: { cancellationLockedAt: new Date() } },
    { returnDocument: 'after' },
  );
  if (!locked) {
    const existing = await EntertainmentBooking.findOne({ _id: bookingId, ...ownerFilter }).lean();
    if (!existing) throw new ApiError(404, 'Booking not found');
    if (existing.status === 'cancelled') return existing;
    throw new ApiError(409, existing.status === 'confirmed' ? 'A cancellation is already in progress' : 'Only confirmed bookings can be cancelled');
  }

  try {
    const quote = await buildCancellationQuote(locked, { asAdmin });
    if (!quote.allowed) throw new ApiError(409, quote.reason);

    let refund = null;
    if (quote.refundAmount > 0) {
      refund = await razorpayGateway.request({
        method: 'POST',
        path: `/payments/${locked.payment.paymentId}/refund`,
        body: { amount: Math.round(quote.refundAmount * 100), notes: { bookingCode: locked.bookingCode } },
      });
    }

    const cancelled = await EntertainmentBooking.findOneAndUpdate(
      { _id: locked._id, status: 'confirmed' },
      {
        $set: {
          status: 'cancelled',
          cancellationLockedAt: null,
          'payment.status': quote.refundAmount > 0 ? (quote.refundAmount >= locked.amount ? 'refunded' : 'partially_refunded') : 'paid',
          cancellation: {
            cancelledAt: new Date(),
            cancelledBy: actor,
            reason: toCleanString(reason),
            ruleLabel: quote.ruleLabel,
            refundAmount: quote.refundAmount,
            chargeAmount: quote.chargeAmount,
            refundId: refund?.id || '',
            refundStatus: refund ? (refund.status || 'processed') : 'not_applicable',
          },
        },
      },
      { returnDocument: 'after' },
    );

    await releaseSeats({ venueId: locked.venueId, visitDate: locked.visitDate, slotId: locked.slotId, quantity: locked.totalTickets });

    // The refund comes out of both shares in proportion: the partner keeps its
    // share of the cancellation charge, the platform keeps its commission on it.
    const refundRatio = locked.amount > 0 ? quote.refundAmount / locked.amount : 0;
    if (locked.partnerCreditedAt && refundRatio > 0) {
      await applyPartnerWalletChange({
        partnerId: locked.partnerId,
        kind: 'debit',
        type: 'refund_reversal',
        amount: roundMoney(locked.partnerEarning * refundRatio),
        title: `Refund for cancelled booking ${locked.bookingCode}`,
        bookingId: locked._id,
        referenceKey: `ent:refund:${locked._id}`,
        metadata: { refundAmount: quote.refundAmount },
      });
    }
    const agentCommission = Number(locked.agentMeta?.commissionAmount || 0);
    if (locked.agentMeta?.bookedByAgentId && agentCommission > 0 && refundRatio > 0) {
      await revertAgentCommission({
        agentId: locked.agentMeta.bookedByAgentId,
        bookingType: 'entertainment',
        commissionMode: locked.agentMeta.commissionMode || 'direct',
        amount: roundMoney(agentCommission * refundRatio),
        referenceKey: `agent:entertainment:reversal:${locked._id}`,
        title: `Commission reversed for cancelled tickets ${locked.bookingCode}`,
        metadata: { bookingId: String(locked._id) },
      });
      await EntertainmentBooking.updateOne({ _id: locked._id }, { $set: { 'agentMeta.commissionReversed': true } });
    }

    return cancelled;
  } catch (error) {
    await EntertainmentBooking.updateOne({ _id: locked._id }, { $set: { cancellationLockedAt: null } });
    throw error;
  }
};

// ───────────────────────────────────────────── QR ticket + gate check-in

export const signTicketToken = (booking) => jwt.sign(
  { type: TICKET_TOKEN_TYPE, bookingId: String(booking._id), bookingCode: booking.bookingCode },
  env.jwtSecret,
  { expiresIn: '400d' },
);

export const buildTicketQr = async (booking) => {
  const token = signTicketToken(booking);
  const qrValue = JSON.stringify({ type: 'entertainment_ticket', token });
  const qrDataUrl = await QRCode.toDataURL(qrValue, { errorCorrectionLevel: 'M', margin: 2, width: 280 });
  return { token, qrValue, qrDataUrl };
};

const resolveBookingFromScan = async (rawValue) => {
  const value = toCleanString(rawValue);
  if (!value) throw new ApiError(400, 'Scan a ticket QR or enter the booking code');
  let token = value;
  try {
    const parsed = JSON.parse(value);
    if (parsed?.token) token = String(parsed.token);
  } catch {
    // plain token or booking code
  }

  if (/^ENT[A-Z0-9]+$/i.test(token)) {
    return EntertainmentBooking.findOne({ bookingCode: token.toUpperCase() });
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new ApiError(400, 'This QR is not a valid ticket');
  }
  if (payload?.type !== TICKET_TOKEN_TYPE || !payload.bookingId) throw new ApiError(400, 'This QR is not a valid ticket');
  return EntertainmentBooking.findById(payload.bookingId);
};

export const checkInTicket = async ({ partnerId, qrValue, actorLabel = 'partner' }) => {
  const booking = await resolveBookingFromScan(qrValue);
  if (!booking || String(booking.partnerId) !== String(partnerId)) {
    throw new ApiError(404, 'Ticket not found for your venues');
  }
  if (booking.status !== 'confirmed') throw new ApiError(409, `Ticket is ${booking.status}`);
  if (booking.visitDate !== todayIst()) {
    throw new ApiError(409, `Ticket is for ${booking.visitDate}, not today`);
  }

  const checkedIn = await EntertainmentBooking.findOneAndUpdate(
    { _id: booking._id, status: 'confirmed', 'checkIn.status': 'pending' },
    { $set: { 'checkIn.status': 'checked_in', 'checkIn.checkedInAt': new Date(), 'checkIn.checkedInBy': actorLabel } },
    { returnDocument: 'after' },
  );
  return { booking: checkedIn || booking, alreadyCheckedIn: !checkedIn };
};

// ───────────────────────────────────────────── serializers

export const serializeBooking = (booking, { includeMoney = false } = {}) => {
  const b = booking?.toObject ? booking.toObject() : booking;
  return {
    id: String(b._id),
    bookingCode: b.bookingCode,
    status: b.status,
    venueId: String(b.venueId),
    venue: b.venueSnapshot,
    visitDate: b.visitDate,
    slot: { id: b.slotId, label: b.slotLabel, startTime: b.slotStartTime, endTime: b.slotEndTime },
    items: b.items,
    totalTickets: b.totalTickets,
    amount: b.amount,
    currency: b.currency,
    customer: b.customer,
    bookingSource: b.bookingSource,
    payment: { status: b.payment?.status, paidAt: b.payment?.paidAt || null },
    checkIn: b.checkIn,
    cancellation: b.cancellation?.cancelledAt ? b.cancellation : null,
    review: b.review?.reviewedAt ? b.review : null,
    expiresAt: b.expiresAt || null,
    createdAt: b.createdAt,
    ...(includeMoney
      ? {
          commissionPercent: b.commissionPercent,
          commissionAmount: b.commissionAmount,
          partnerEarning: b.partnerEarning,
          agentCommission: Number(b.agentMeta?.commissionAmount || 0),
          agentId: b.agentMeta?.bookedByAgentId ? String(b.agentMeta.bookedByAgentId) : '',
          agentCommissionMode: b.agentMeta?.commissionMode || '',
          partnerId: String(b.partnerId),
          userId: String(b.userId),
        }
      : {}),
  };
};

export const serializeVenue = (venue, { category = null, minPrice = null, includeAdmin = false } = {}) => {
  const v = venue?.toObject ? venue.toObject() : venue;
  const activeTickets = (v.ticketTypes || []).filter((t) => t.active);
  return {
    id: String(v._id),
    name: v.name,
    description: v.description,
    coverImage: v.coverImage || v.images?.[0] || '',
    images: v.images || [],
    address: v.address,
    city: v.city,
    latitude: v.location?.coordinates?.[1] ?? null,
    longitude: v.location?.coordinates?.[0] ?? null,
    rules: v.rules,
    amenities: v.amenities || [],
    categoryId: String(v.categoryId),
    categoryName: category?.name || '',
    ticketTypes: includeAdmin ? v.ticketTypes : activeTickets,
    timeSlots: includeAdmin ? v.timeSlots : (v.timeSlots || []).filter((s) => s.active),
    closedDates: v.closedDates || [],
    bookingWindowDays: v.bookingWindowDays,
    minPrice: minPrice ?? (activeTickets.length ? Math.min(...activeTickets.map((t) => t.price)) : 0),
    rating: v.rating || 0,
    ratingCount: v.ratingCount || 0,
    ...(includeAdmin
      ? { status: v.status, adminNote: v.adminNote, commissionPercent: v.commissionPercent, partnerId: String(v.partnerId), createdAt: v.createdAt }
      : {}),
  };
};
