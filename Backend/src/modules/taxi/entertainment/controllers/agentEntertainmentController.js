import { ApiError } from '../../../../utils/ApiError.js';
import { resolveOrCreateCustomer } from '../../agent/controllers/agentController.js';
import { withMongoSession } from '../../agent/services/agentWalletService.js';
import { EntertainmentBooking } from '../models/EntertainmentBooking.js';
import {
  assertObjectId,
  buildTicketQr,
  createBookingOrder,
  serializeBooking,
  verifyBookingPayment,
} from '../services/entertainmentService.js';
import { getBookableVenueDetail, listBookableVenues } from './userEntertainmentController.js';

const agentFilter = (req) => ({ 'agentMeta.bookedByAgentId': req.auth.sub, bookingSource: 'agent' });

export const listVenues = async (req, res) => {
  res.json({ success: true, data: await listBookableVenues(req.query) });
};

export const getVenue = async (req, res) => {
  res.json({ success: true, data: await getBookableVenueDetail(req.params.id, req.query.visitDate) });
};

// The agent sells on behalf of a customer; the ticket is issued to that customer
// and the agent earns its "entertainment" commission once the payment confirms.
export const createOrder = async (req, res) => {
  const agent = req.auth.entity;
  const customerInput = req.body?.customer || {};
  if (!/^\d{10}$/.test(String(customerInput.phone || '').replace(/\D/g, ''))) {
    throw new ApiError(400, 'Enter the customer\'s 10-digit mobile number');
  }
  const customer = await withMongoSession((session) => resolveOrCreateCustomer({ agent, customer: customerInput, session }));
  const result = await createBookingOrder({
    userId: customer._id,
    customer: { name: customerInput.name || customer.name, phone: customer.phone, email: customerInput.email || customer.email },
    venueId: req.body?.venueId,
    visitDate: req.body?.visitDate,
    slotId: req.body?.slotId,
    items: req.body?.items,
    agentId: agent._id,
  });
  res.status(201).json({
    success: true,
    data: { booking: serializeBooking(result.booking), razorpayOrder: result.order, keyId: result.keyId },
  });
};

export const verifyPayment = async (req, res) => {
  const booking = await verifyBookingPayment({
    ownerFilter: agentFilter(req),
    orderId: String(req.body?.razorpay_order_id || ''),
    paymentId: String(req.body?.razorpay_payment_id || ''),
    signature: String(req.body?.razorpay_signature || ''),
  });
  res.json({ success: true, data: serializeBooking(booking, { includeMoney: true }) });
};

export const listBookings = async (req, res) => {
  const filter = { ...agentFilter(req), status: { $in: ['confirmed', 'cancelled'] } };
  const items = await EntertainmentBooking.find(filter).sort({ createdAt: -1 }).limit(100).lean();
  res.json({ success: true, data: items.map((b) => serializeBooking(b, { includeMoney: true })) });
};

export const getBooking = async (req, res) => {
  assertObjectId(req.params.id, 'booking');
  const booking = await EntertainmentBooking.findOne({ _id: req.params.id, ...agentFilter(req) }).lean();
  if (!booking) throw new ApiError(404, 'Booking not found');
  const ticket = booking.status === 'confirmed' ? await buildTicketQr(booking) : null;
  res.json({
    success: true,
    data: { ...serializeBooking(booking, { includeMoney: true }), ticket: ticket ? { qrValue: ticket.qrValue, qrDataUrl: ticket.qrDataUrl } : null },
  });
};
