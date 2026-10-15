import { ApiError } from '../../../../utils/ApiError.js';
import { EntertainmentBooking } from '../models/EntertainmentBooking.js';
import { Venue } from '../models/Venue.js';
import { VenueCategory } from '../models/VenueCategory.js';
import { VenuePartner } from '../models/VenuePartner.js';
import {
  assertObjectId,
  buildCancellationQuote,
  buildTicketQr,
  cancelBooking,
  createBookingOrder,
  expireStaleHolds,
  getSlotAvailability,
  normalizeVisitDate,
  serializeBooking,
  serializeVenue,
  todayIst,
  verifyBookingPayment,
} from '../services/entertainmentService.js';

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const activePartnerIds = async () => (
  await VenuePartner.find({ status: 'active', active: { $ne: false } }).select('_id').lean()
).map((p) => p._id);

export const listCategories = async (_req, res) => {
  const categories = await VenueCategory.find({ active: true }).sort({ order: 1, name: 1 }).lean();
  res.json({ success: true, data: categories.map((c) => ({ id: String(c._id), name: c.name, description: c.description, image: c.image })) });
};

// Shared by the user app and the agent desk.
export const listBookableVenues = async (query = {}) => {
  const filter = { status: 'active', partnerId: { $in: await activePartnerIds() } };
  if (query.categoryId) filter.categoryId = assertObjectId(query.categoryId, 'category');
  if (query.city) filter.city = new RegExp(`^${escapeRegex(query.city)}$`, 'i');
  if (query.search) filter.name = new RegExp(escapeRegex(String(query.search).slice(0, 60)), 'i');

  const [venues, categories] = await Promise.all([
    Venue.find(filter).sort({ rating: -1, createdAt: -1 }).limit(100).lean(),
    VenueCategory.find({}).select('name').lean(),
  ]);
  const categoryById = new Map(categories.map((c) => [String(c._id), c]));
  return venues
    .filter((venue) => (venue.ticketTypes || []).some((t) => t.active) && (venue.timeSlots || []).some((s) => s.active))
    .map((venue) => serializeVenue(venue, { category: categoryById.get(String(venue.categoryId)) }));
};

export const getBookableVenueDetail = async (venueId, visitDateInput) => {
  assertObjectId(venueId, 'venue');
  const venue = await Venue.findOne({ _id: venueId, status: 'active' }).lean();
  const partner = venue ? await VenuePartner.findById(venue.partnerId).lean() : null;
  if (!venue || !partner || partner.status !== 'active' || partner.active === false) {
    throw new ApiError(404, 'Venue is not available');
  }
  const visitDate = visitDateInput ? normalizeVisitDate(visitDateInput) : todayIst();
  await expireStaleHolds();
  const category = await VenueCategory.findById(venue.categoryId).select('name').lean();
  return {
    ...serializeVenue(venue, { category }),
    visitDate,
    slots: await getSlotAvailability(venue, visitDate),
  };
};

export const listVenues = async (req, res) => {
  res.json({ success: true, data: await listBookableVenues(req.query) });
};

export const getVenue = async (req, res) => {
  res.json({ success: true, data: await getBookableVenueDetail(req.params.id, req.query.visitDate) });
};

export const createOrder = async (req, res) => {
  const result = await createBookingOrder({
    userId: req.auth.sub,
    venueId: req.body?.venueId,
    visitDate: req.body?.visitDate,
    slotId: req.body?.slotId,
    items: req.body?.items,
  });
  res.status(201).json({
    success: true,
    data: { booking: serializeBooking(result.booking), razorpayOrder: result.order, keyId: result.keyId },
  });
};

export const verifyPayment = async (req, res) => {
  const booking = await verifyBookingPayment({
    ownerFilter: { userId: req.auth.sub },
    orderId: String(req.body?.razorpay_order_id || ''),
    paymentId: String(req.body?.razorpay_payment_id || ''),
    signature: String(req.body?.razorpay_signature || ''),
  });
  res.json({ success: true, data: serializeBooking(booking) });
};

export const listMyBookings = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const filter = { userId: req.auth.sub, status: { $in: ['confirmed', 'cancelled'] } };
  const [items, total] = await Promise.all([
    EntertainmentBooking.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    EntertainmentBooking.countDocuments(filter),
  ]);
  res.json({ success: true, data: { results: items.map((b) => serializeBooking(b)), total, page, limit } });
};

export const getMyBooking = async (req, res) => {
  assertObjectId(req.params.id, 'booking');
  const booking = await EntertainmentBooking.findOne({ _id: req.params.id, userId: req.auth.sub }).lean();
  if (!booking) throw new ApiError(404, 'Booking not found');
  const ticket = booking.status === 'confirmed' ? await buildTicketQr(booking) : null;
  res.json({
    success: true,
    data: {
      ...serializeBooking(booking),
      ticket: ticket ? { qrValue: ticket.qrValue, qrDataUrl: ticket.qrDataUrl } : null,
      cancellationQuote: await buildCancellationQuote(booking),
    },
  });
};

export const cancelMyBooking = async (req, res) => {
  const booking = await cancelBooking({
    bookingId: req.params.id,
    ownerFilter: { userId: req.auth.sub },
    actor: 'user',
    reason: req.body?.reason,
  });
  res.json({ success: true, data: serializeBooking(booking) });
};

export const reviewMyBooking = async (req, res) => {
  assertObjectId(req.params.id, 'booking');
  const rating = Number(req.body?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new ApiError(400, 'Rating must be 1 to 5');
  const booking = await EntertainmentBooking.findOneAndUpdate(
    { _id: req.params.id, userId: req.auth.sub, 'checkIn.status': 'checked_in', 'review.reviewedAt': null },
    { $set: { review: { rating, comment: String(req.body?.comment || '').trim().slice(0, 500), reviewedAt: new Date() } } },
    { returnDocument: 'after' },
  );
  if (!booking) throw new ApiError(409, 'You can rate a visit once, after your ticket is scanned at the venue');
  try {
    await Venue.updateOne({ _id: booking.venueId }, [
      {
        $set: {
          rating: {
            $round: [{ $divide: [{ $add: [{ $multiply: ['$rating', '$ratingCount'] }, rating] }, { $add: ['$ratingCount', 1] }] }, 1],
          },
          ratingCount: { $add: ['$ratingCount', 1] },
        },
      },
    ], { updatePipeline: true });
  } catch (error) {
    // Undo the review so the visitor can try again.
    await EntertainmentBooking.updateOne({ _id: booking._id }, { $set: { 'review.reviewedAt': null, 'review.rating': 0, 'review.comment': '' } });
    throw error;
  }
  res.json({ success: true, data: serializeBooking(booking) });
};
