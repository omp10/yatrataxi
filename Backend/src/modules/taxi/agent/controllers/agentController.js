import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { ApiError } from '../../../../utils/ApiError.js';
import { hashPassword } from '../../services/passwordService.js';
import { signAccessToken } from '../../services/tokenService.js';
import { normalizePoint } from '../../../../utils/geo.js';
import { Agent } from '../models/Agent.js';
import { AgentLoginSession } from '../models/AgentLoginSession.js';
import { AgentNeededDocument } from '../../admin/models/AgentNeededDocument.js';
import { AgentWithdrawalRequest } from '../models/AgentWithdrawalRequest.js';
import { BusService } from '../../admin/models/BusService.js';
import { BusSeatHold } from '../../user/models/BusSeatHold.js';
import { BusBooking } from '../../user/models/BusBooking.js';
import { PoolingBooking } from '../../admin/models/PoolingBooking.js';
import { User } from '../../user/models/User.js';
import { Ride } from '../../user/models/Ride.js';
import { getRideDetails, createRideRecord } from '../../services/rideService.js';
import { startDispatchFlow } from '../../services/dispatchService.js';
import { listAgentWalletTransactions, serializeAgentWallet, ensureAgentWallet, withMongoSession } from '../services/agentWalletService.js';
import { creditAgentCommission, getDefaultAgentCommissionConfig } from '../services/agentCommissionService.js';
import { startAgentLoginOtp, verifyAgentLoginOtp } from '../services/agentLoginOtpService.js';

const toCleanString = (value) => String(value || '').trim();
const normalizePhone = (value) => {
  const digits = toCleanString(value).replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
};
const normalizeEmail = (value) => toCleanString(value).toLowerCase();
const normalizeReferralCode = (value) => toCleanString(value).toUpperCase();
const roundMoney = (value) => Math.round(Number(value || 0) * 100) / 100;
const slugify = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'document';

const createAgentSessionPayload = (agent) => ({
  token: signAccessToken({ sub: String(agent._id), role: 'agent' }),
  agent: {
    id: String(agent._id),
    name: agent.name || '',
    phone: agent.phone || '',
    email: agent.email || '',
    referralCode: agent.referralCode || '',
    active: agent.active !== false,
    status: agent.status || 'active',
    commissionConfig: agent.commissionConfig || {},
    metrics: agent.metrics || {},
    payout: agent.payout || {},
  },
});

const ensureActiveAgent = (agent) => {
  if (!agent || agent.active === false || String(agent.status || '').toLowerCase() !== 'active') {
    throw new ApiError(403, 'Agent account is inactive');
  }
};

const generateUserReferralCode = (user) => {
  const idPart = String(user?._id || '').slice(-6).toUpperCase();
  const phonePart = String(user?.phone || '').slice(-4);
  return `USR${phonePart}${idPart}`.replace(/\W/g, '');
};

const buildAgentReferralLink = (req, referralCode) => {
  const origin = toCleanString(req.get('origin')) || 'http://localhost:5173';
  return `${origin.replace(/\/+$/, '')}/taxi/user/signup?ref=${encodeURIComponent(referralCode)}`;
};

const serializeCustomer = (user = {}) => ({
  id: String(user._id || ''),
  name: user.name || '',
  phone: user.phone || '',
  email: user.email || '',
  referredByAgent: user.referredByAgent ? String(user.referredByAgent) : '',
  referralCode: user.referralCode || '',
});

const resolveOrCreateCustomer = async ({ agent, customer = {}, session = null }) => {
  const phone = normalizePhone(customer.phone);
  const name = toCleanString(customer.name) || 'Walk-in Customer';
  const email = normalizeEmail(customer.email);

  if (!/^\d{10}$/.test(phone)) {
    throw new ApiError(400, 'Customer phone must be a valid 10-digit number');
  }

  let user = await User.findOne({ phone }).session(session);
  if (user) {
    if (!user.referredByAgent) {
      user.referredByAgent = agent._id;
      await user.save({ session });
      await Agent.updateOne({ _id: agent._id }, { $inc: { 'metrics.totalCustomers': 1 } }, { session });
    }
    return user;
  }

  user = await User.create(
    [{
      phone,
      name,
      email,
      countryCode: '+91',
      password: await hashPassword(crypto.randomBytes(18).toString('hex')),
      isVerified: true,
      active: true,
      isActive: true,
      referredByAgent: agent._id,
    }],
    { session },
  );

  const createdUser = user[0];
  createdUser.referralCode = generateUserReferralCode(createdUser);
  await createdUser.save({ session });
  await Agent.updateOne({ _id: agent._id }, { $inc: { 'metrics.totalCustomers': 1 } }, { session });
  return createdUser;
};

const createAnonymousWalkInCustomer = async ({ agent, session = null }) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const generatedPhone = `8${String(Date.now()).slice(-5)}${String(Math.floor(1000 + Math.random() * 9000)).slice(-4)}`;
    const existing = await User.findOne({ phone: generatedPhone }).session(session);
    if (existing) {
      continue;
    }

    const created = await User.create(
      [{
        phone: generatedPhone,
        name: 'Walk-in Customer',
        email: '',
        countryCode: '+91',
        password: await hashPassword(crypto.randomBytes(18).toString('hex')),
        isVerified: true,
        active: true,
        isActive: true,
        referredByAgent: agent._id,
      }],
      { session },
    );

    const customer = created[0];
    customer.referralCode = generateUserReferralCode(customer);
    await customer.save({ session });
    await Agent.updateOne({ _id: agent._id }, { $inc: { 'metrics.totalCustomers': 1 } }, { session });
    return customer;
  }

  throw new ApiError(500, 'Unable to create walk-in customer for seat reservation');
};

const serializeAgentRideBooking = (ride = {}) => ({
  id: String(ride._id || ''),
  kind: 'ride',
  serviceType: ride.serviceType || 'ride',
  status: ride.status || '',
  liveStatus: ride.liveStatus || '',
  fare: Number(ride.fare || 0),
  amount: Number(ride.fare || 0),
  paymentMethod: ride.paymentMethod || '',
  pickupAddress: ride.pickupAddress || '',
  dropAddress: ride.dropAddress || '',
  customerName: ride.agentMeta?.customerName || '',
  customerPhone: ride.agentMeta?.customerPhone || '',
  commissionAmount: Number(ride.agentMeta?.commissionAmount || 0),
  commissionMode: ride.agentMeta?.commissionMode || '',
  commissionCreditedAt: ride.agentMeta?.commissionCreditedAt || null,
  createdAt: ride.createdAt || null,
});

const serializeAgentBusBooking = (booking = {}) => ({
  id: String(booking._id || ''),
  kind: 'bus',
  bookingCode: booking.bookingCode || '',
  status: booking.status || '',
  travelDate: booking.travelDate || '',
  amount: Number(booking.amount || 0),
  seatLabels: Array.isArray(booking.seatLabels) ? booking.seatLabels : [],
  customerName: booking.agentMeta?.customerName || booking.passenger?.name || '',
  customerPhone: booking.agentMeta?.customerPhone || booking.passenger?.phone || '',
  route: {
    fromCity: booking.routeSnapshot?.originCity || '',
    toCity: booking.routeSnapshot?.destinationCity || '',
    busName: booking.routeSnapshot?.busName || '',
    operatorName: booking.routeSnapshot?.operatorName || '',
  },
  commissionAmount: Number(booking.agentMeta?.commissionAmount || 0),
  commissionMode: booking.agentMeta?.commissionMode || '',
  commissionCreditedAt: booking.agentMeta?.commissionCreditedAt || null,
  createdAt: booking.createdAt || null,
});

const serializeAgentPoolingBooking = (booking = {}) => ({
  id: String(booking._id || ''),
  kind: 'pooling',
  bookingCode: booking.bookingId || '',
  status: booking.bookingStatus || '',
  travelDate: booking.travelDate || '',
  amount: Number(booking.fare || 0),
  seatLabels: Array.isArray(booking.selectedSeats) ? booking.selectedSeats : [],
  customerName: booking.user?.name || '',
  customerPhone: booking.user?.phone || '',
  route: {
    fromCity: booking.pickupLabel || booking.route?.originLabel || '',
    toCity: booking.dropLabel || booking.route?.destinationLabel || '',
    busName: booking.route?.routeName || '',
    operatorName: '',
  },
  commissionAmount: Number(booking.agentMeta?.commissionAmount || 0),
  commissionMode: booking.agentMeta?.commissionMode || '',
  commissionCreditedAt: booking.agentMeta?.commissionCreditedAt || null,
  createdAt: booking.createdAt || null,
});

const flattenBusBlueprintSeats = (blueprint = {}) =>
  ['lowerDeck', 'upperDeck']
    .flatMap((deckKey) => Array.isArray(blueprint?.[deckKey]) ? blueprint[deckKey] : [])
    .flatMap((row) => (Array.isArray(row) ? row : []))
    .filter((cell) => cell?.kind === 'seat' && cell?.id);

const findBusSchedule = (busService, scheduleId) =>
  (Array.isArray(busService?.schedules) ? busService.schedules : []).find(
    (item) => String(item?.id || '') === String(scheduleId || ''),
  );

const normalizeBusTravelDate = (value) => {
  const raw = toCleanString(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(400, 'travelDate must be in YYYY-MM-DD format');
  }

  return parsed.toISOString().slice(0, 10);
};

const searchBusSeatAvailability = async ({ busService, scheduleId, travelDate }) => {
  const heldSeats = await BusSeatHold.find({
    busServiceId: busService._id,
    scheduleId,
    travelDate,
    status: { $in: ['held', 'booked'] },
  })
    .select('seatId')
    .lean();

  const blockedIds = new Set(heldSeats.map((item) => String(item.seatId || '')));
  return flattenBusBlueprintSeats(busService.blueprint || {}).map((seat) => ({
    id: String(seat.id || ''),
    label: seat.label || seat.id || '',
    variant: seat.variant || 'seat',
    status: blockedIds.has(String(seat.id || '')) ? 'booked' : 'available',
  }));
};

const resolveBusSeatPrice = (busService = {}, seat = {}) => {
  const variantPricing = busService?.variantPricing || {};
  const defaultPrice = Number(busService?.seatPrice || 0);
  const variantKey = String(seat?.variant || 'seat').trim().toLowerCase();
  const resolvedPrice = variantPricing?.[variantKey] ?? variantPricing?.seat ?? defaultPrice;
  return Number.isFinite(Number(resolvedPrice)) ? Number(resolvedPrice) : defaultPrice;
};

const createBusBookingCode = () =>
  `BAG${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

export const sendAgentLoginOtp = async (req, res) => {
  const result = await startAgentLoginOtp({
    phone: req.body?.phone,
  });

  res.json({
    success: true,
    message: result.message,
    data: result,
  });
};

export const loginAgent = async (req, res) => {
  const result = await verifyAgentLoginOtp({
    phone: req.body?.phone,
    otp: req.body?.otp,
  });

  res.json({
    success: true,
    message: result.message,
    data: result,
  });
};

const buildAgentDocumentFields = (item = {}) => {
  const baseKey = `${slugify(item.name)}_${String(item._id || '').replace(/[^a-zA-Z0-9]/g, '')}`;
  if (String(item.image_type || 'front_back') === 'front_back') {
    return [
      { key: `${baseKey}_front`, label: `${item.name} Front`, side: 'front', required: item.is_required !== false },
      { key: `${baseKey}_back`, label: `${item.name} Back`, side: 'back', required: item.is_required !== false },
    ];
  }

  return [
    {
      key: baseKey,
      label: String(item.image_type || '') === 'back' ? `${item.name} Back` : String(item.image_type || '') === 'front' ? `${item.name} Front` : item.name,
      side: String(item.image_type || '') === 'back' ? 'back' : String(item.image_type || '') === 'front' ? 'front' : 'single',
      required: item.is_required !== false,
    },
  ];
};

export const getAgentOnboardingDocuments = async (_req, res) => {
  const items = await AgentNeededDocument.find({ active: true }).sort({ createdAt: -1 }).lean();
  res.json({
    success: true,
    data: {
      results: items.map((item) => ({
        id: String(item._id),
        name: item.name || '',
        image_type: item.image_type || 'front_back',
        is_required: item.is_required !== false,
        has_expiry_date: Boolean(item.has_expiry_date),
        has_identify_number: Boolean(item.has_identify_number),
        fields: buildAgentDocumentFields(item),
      })),
    },
  });
};

export const completeAgentOnboarding = async (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  const name = toCleanString(req.body?.name);
  const email = normalizeEmail(req.body?.email);
  const notes = toCleanString(req.body?.notes);
  const rawDocuments = req.body?.documents && typeof req.body.documents === 'object' ? req.body.documents : {};
  const rawDocumentMeta = req.body?.documentMeta && typeof req.body.documentMeta === 'object' ? req.body.documentMeta : {};

  if (!/^\d{10}$/.test(phone)) {
    throw new ApiError(400, 'A valid 10-digit phone number is required');
  }
  if (!name) {
    throw new ApiError(400, 'Agent name is required');
  }

  const session = await AgentLoginSession.findOne({ phone });
  if (!session || session.flow !== 'new' || !session.verifiedAt) {
    throw new ApiError(403, 'Verify OTP before completing onboarding');
  }

  const configuredDocs = await AgentNeededDocument.find({ active: true }).lean();
  const requiredFields = configuredDocs.flatMap((item) => buildAgentDocumentFields(item).filter((field) => field.required));
  const missingField = requiredFields.find((field) => !toCleanString(rawDocuments?.[field.key]?.imageUrl || rawDocuments?.[field.key]?.secureUrl || rawDocuments?.[field.key]?.url));
  if (missingField) {
    throw new ApiError(400, `Please upload ${missingField.label}`);
  }

  const missingMetaRequirement = configuredDocs.find((item) => {
    const templateMeta = rawDocumentMeta[String(item._id)] || {};
    if (item.has_identify_number && !toCleanString(templateMeta.documentNumber)) {
      return true;
    }
    if (item.has_expiry_date && !toCleanString(templateMeta.expiryDate)) {
      return true;
    }
    return false;
  });

  if (missingMetaRequirement) {
    if (missingMetaRequirement.has_identify_number) {
      throw new ApiError(400, `Please enter the ID number for ${missingMetaRequirement.name}`);
    }
    throw new ApiError(400, `Please enter the expiry date for ${missingMetaRequirement.name}`);
  }

  const documentConfigMap = new Map(configuredDocs.map((item) => [String(item._id), item]));
  const fieldConfigMap = new Map(
    configuredDocs.flatMap((item) =>
      buildAgentDocumentFields(item).map((field) => [field.key, { field, config: item }]),
    ),
  );

  const documents = Object.fromEntries(
    Object.entries(rawDocuments).map(([key, value]) => [
      key,
      (() => {
        const fieldConfig = fieldConfigMap.get(key);
        const configId = String(fieldConfig?.config?._id || '');
        const templateMeta = rawDocumentMeta[configId] || {};
        return {
          label: toCleanString(value?.label) || key,
          side: toCleanString(value?.side) || 'single',
          imageUrl: toCleanString(value?.imageUrl || value?.secureUrl || value?.url),
          uploadedAt: value?.uploadedAt ? new Date(value.uploadedAt) : new Date(),
          documentNumber: documentConfigMap.get(configId)?.has_identify_number ? toCleanString(templateMeta.documentNumber) : '',
          expiryDate:
            documentConfigMap.get(configId)?.has_expiry_date && toCleanString(templateMeta.expiryDate)
              ? new Date(templateMeta.expiryDate)
              : null,
        };
      })(),
    ]),
  );

  const existingAgent = await Agent.findOne({ phone });
  if (existingAgent) {
    throw new ApiError(409, 'Agent account already exists for this number');
  }

  const generatedPassword = await hashPassword(crypto.randomBytes(18).toString('hex'));
  const agent = await Agent.create({
    phone,
    name,
    email,
    password: generatedPassword,
    active: false,
    status: 'inactive',
    kycStatus: 'pending',
    commissionConfig: await getDefaultAgentCommissionConfig(),
    documents,
    notes,
    onboarding: {
      submittedAt: new Date(),
      reviewedAt: null,
      reviewNote: '',
    },
  });

  agent.referralCode = `AGT${String(agent.phone || '').slice(-4)}${String(agent._id).slice(-6).toUpperCase()}`.replace(/\W/g, '');
  await agent.save();
  await session.deleteOne();

  res.status(201).json({
    success: true,
    data: {
      nextStep: 'pending_review',
      agent: {
        id: String(agent._id),
        name: agent.name || '',
        phone: agent.phone || '',
        email: agent.email || '',
        kycStatus: agent.kycStatus || 'pending',
        status: agent.status || 'inactive',
        active: false,
        onboarding: agent.onboarding || {},
      },
    },
  });
};

export const getAgentProfile = async (req, res) => {
  const agent = await Agent.findById(req.auth.sub).lean();
  if (!agent) {
    throw new ApiError(404, 'Agent not found');
  }

  res.json({
    success: true,
    data: {
      ...createAgentSessionPayload(agent).agent,
      referralLink: buildAgentReferralLink(req, agent.referralCode || ''),
    },
  });
};

export const updateAgentProfile = async (req, res) => {
  const update = {
    name: toCleanString(req.body?.name),
    email: normalizeEmail(req.body?.email),
    notes: toCleanString(req.body?.notes),
    payout: {
      bankName: toCleanString(req.body?.payout?.bankName),
      accountHolder: toCleanString(req.body?.payout?.accountHolder),
      accountNumber: toCleanString(req.body?.payout?.accountNumber),
      ifscCode: toCleanString(req.body?.payout?.ifscCode),
      upiId: toCleanString(req.body?.payout?.upiId),
    },
  };

  const agent = await Agent.findByIdAndUpdate(
    req.auth.sub,
    { $set: update },
    { new: true, runValidators: true },
  );

  if (!agent) {
    throw new ApiError(404, 'Agent not found');
  }

  res.json({
    success: true,
    data: createAgentSessionPayload(agent).agent,
  });
};

export const getAgentWallet = async (req, res) => {
  const wallet = await listAgentWalletTransactions(req.auth.sub);
  res.json({
    success: true,
    data: wallet,
  });
};

const serializeAgentWithdrawal = (item = {}) => ({
  id: String(item._id || ''),
  amount: roundMoney(item.amount || 0),
  status: item.status || 'pending',
  paymentMethod: item.payment_method || '',
  notes: item.notes || '',
  adminNote: item.adminNote || '',
  payoutSnapshot: item.payoutSnapshot || {},
  reviewedAt: item.reviewedAt || null,
  createdAt: item.createdAt || null,
});

export const listAgentWithdrawalRequests = async (req, res) => {
  const items = await AgentWithdrawalRequest.find({ agentId: req.auth.sub })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  res.json({ success: true, data: { results: items.map(serializeAgentWithdrawal) } });
};

export const createAgentWithdrawalRequest = async (req, res) => {
  const amount = roundMoney(req.body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(400, 'Withdrawal amount must be greater than zero');
  }

  const agent = await Agent.findById(req.auth.sub).lean();
  if (!agent) {
    throw new ApiError(404, 'Agent not found');
  }

  const payout = agent.payout || {};
  if (!toCleanString(payout.upiId) && !(toCleanString(payout.accountNumber) && toCleanString(payout.ifscCode))) {
    throw new ApiError(400, 'Add your bank account or UPI ID in profile before requesting a withdrawal');
  }

  const pending = await AgentWithdrawalRequest.findOne({ agentId: agent._id, status: 'pending' }).lean();
  if (pending) {
    throw new ApiError(409, 'You already have a pending withdrawal request');
  }

  const wallet = await listAgentWalletTransactions(agent._id);
  if (amount > wallet.balance) {
    throw new ApiError(400, 'Withdrawal amount exceeds your wallet balance');
  }

  const request = await AgentWithdrawalRequest.create({
    agentId: agent._id,
    amount,
    payment_method: toCleanString(payout.upiId) ? 'upi' : 'bank_transfer',
    payoutSnapshot: {
      bankName: toCleanString(payout.bankName),
      accountHolder: toCleanString(payout.accountHolder),
      accountNumber: toCleanString(payout.accountNumber),
      ifscCode: toCleanString(payout.ifscCode),
      upiId: toCleanString(payout.upiId),
    },
    notes: toCleanString(req.body?.notes),
  });

  res.status(201).json({ success: true, data: serializeAgentWithdrawal(request.toObject()) });
};

export const getAgentReferralSummary = async (req, res) => {
  const agent = await Agent.findById(req.auth.sub).lean();
  if (!agent) {
    throw new ApiError(404, 'Agent not found');
  }

  const referredUsers = await User.find({ referredByAgent: agent._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .select('name phone email createdAt')
    .lean();

  res.json({
    success: true,
    data: {
      referralCode: agent.referralCode || '',
      referralLink: buildAgentReferralLink(req, agent.referralCode || ''),
      qrValue: buildAgentReferralLink(req, agent.referralCode || ''),
      metrics: agent.metrics || {},
      referredUsers: referredUsers.map((user) => ({
        id: String(user._id),
        name: user.name || '',
        phone: user.phone || '',
        email: user.email || '',
        createdAt: user.createdAt || null,
      })),
    },
  });
};

// Commission actually credited per channel, summed from the bookings themselves so
// the dashboard cannot drift from what was paid into the wallet.
const summariseAgentCommission = async (agentId) => {
  const match = { 'agentMeta.bookedByAgentId': new mongoose.Types.ObjectId(String(agentId)) };
  const group = {
    _id: '$agentMeta.commissionMode',
    commission: { $sum: '$agentMeta.commissionAmount' },
    bookings: { $sum: 1 },
  };

  const [rideRows, busRows, poolRows] = await Promise.all([
    Ride.aggregate([{ $match: match }, { $group: group }]),
    BusBooking.aggregate([{ $match: match }, { $group: group }]),
    PoolingBooking.aggregate([{ $match: match }, { $group: group }]),
  ]);

  const pick = (rows, mode) => {
    const row = rows.find((item) => String(item._id || 'direct') === mode);
    return { commission: roundMoney(row?.commission || 0), bookings: Number(row?.bookings || 0) };
  };

  const channels = {
    directRides: pick(rideRows, 'direct'),
    referralRides: pick(rideRows, 'referral'),
    directBuses: pick(busRows, 'direct'),
    referralBuses: pick(busRows, 'referral'),
    directPooling: pick(poolRows, 'direct'),
    referralPooling: pick(poolRows, 'referral'),
  };

  const all = Object.values(channels);
  return {
    channels,
    totalCommission: roundMoney(all.reduce((sum, item) => sum + item.commission, 0)),
    totalBookings: all.reduce((sum, item) => sum + item.bookings, 0),
  };
};

export const getAgentDashboard = async (req, res) => {
  const [agent, wallet, rides, buses, commission] = await Promise.all([
    Agent.findById(req.auth.sub).lean(),
    listAgentWalletTransactions(req.auth.sub),
    Ride.find({ 'agentMeta.bookedByAgentId': req.auth.sub })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    BusBooking.find({ 'agentMeta.bookedByAgentId': req.auth.sub })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    summariseAgentCommission(req.auth.sub),
  ]);

  if (!agent) {
    throw new ApiError(404, 'Agent not found');
  }

  res.json({
    success: true,
    data: {
      profile: createAgentSessionPayload(agent).agent,
      wallet,
      recentRides: rides.map(serializeAgentRideBooking),
      recentBusBookings: buses.map(serializeAgentBusBooking),
      commission,
      quickStats: {
        totalDirectRideBookings: Number(agent.metrics?.directRideBookings || 0),
        totalReferredRideBookings: Number(agent.metrics?.referredRideBookings || 0),
        totalDirectBusBookings: Number(agent.metrics?.directBusBookings || 0),
        totalReferredBusBookings: Number(agent.metrics?.referredBusBookings || 0),
        totalCustomers: Number(agent.metrics?.totalCustomers || 0),
      },
    },
  });
};

export const listAgentBookings = async (req, res) => {
  const [rides, buses, pooling] = await Promise.all([
    Ride.find({ 'agentMeta.bookedByAgentId': req.auth.sub })
      .sort({ createdAt: -1 })
      .lean(),
    BusBooking.find({ 'agentMeta.bookedByAgentId': req.auth.sub })
      .sort({ createdAt: -1 })
      .lean(),
    PoolingBooking.find({ 'agentMeta.bookedByAgentId': req.auth.sub })
      .sort({ createdAt: -1 })
      .populate('route', 'routeName originLabel destinationLabel')
      .populate('user', 'name phone')
      .lean(),
  ]);

  const serializedRides = rides.map(serializeAgentRideBooking);
  const serializedBuses = buses.map(serializeAgentBusBooking);
  const serializedPooling = pooling.map(serializeAgentPoolingBooking);
  const everything = [...serializedRides, ...serializedBuses, ...serializedPooling];

  res.json({
    success: true,
    data: {
      rides: serializedRides,
      buses: serializedBuses,
      pooling: serializedPooling,
      summary: {
        totalBookings: everything.length,
        totalCommission: roundMoney(
          everything.reduce((sum, item) => sum + Number(item.commissionAmount || 0), 0),
        ),
        totalBookingValue: roundMoney(
          everything.reduce((sum, item) => sum + Number(item.amount || 0), 0),
        ),
      },
    },
  });
};

export const resolveAgentCustomer = async (req, res) => {
  const agent = await Agent.findById(req.auth.sub);
  if (!agent) {
    throw new ApiError(404, 'Agent not found');
  }

  const customer = await withMongoSession((session) =>
    resolveOrCreateCustomer({
      agent,
      customer: req.body,
      session,
    }));

  res.status(201).json({
    success: true,
    data: serializeCustomer(customer),
  });
};

export const createAgentRideBooking = async (req, res) => {
  const agent = await Agent.findById(req.auth.sub);
  if (!agent) {
    throw new ApiError(404, 'Agent not found');
  }

  const customer = await withMongoSession((session) =>
    resolveOrCreateCustomer({
      agent,
      customer: req.body?.customer || {},
      session,
    }));

  const ride = await createRideRecord({
    userId: customer._id,
    pickupCoords: normalizePoint(req.body?.pickup, 'pickup'),
    dropCoords: normalizePoint(req.body?.drop, 'drop'),
    pickupAddress: req.body?.pickupAddress,
    dropAddress: req.body?.dropAddress,
    fare: req.body?.fare,
    estimatedDistanceMeters: req.body?.estimatedDistanceMeters,
    estimatedDurationMinutes: req.body?.estimatedDurationMinutes,
    vehicleTypeId: req.body?.vehicleTypeId,
    vehicleTypeIds: req.body?.vehicleTypeIds,
    vehicleIconType: req.body?.vehicleIconType,
    vehicleIconUrl: req.body?.vehicleIconUrl,
    paymentMethod: req.body?.paymentMethod,
    serviceType: req.body?.serviceType,
    parcel: req.body?.parcel,
    intercity: req.body?.intercity,
    promo_code: req.body?.promo_code,
    service_location_id: req.body?.service_location_id,
    transport_type: req.body?.transport_type,
    scheduledAt: req.body?.scheduledAt,
    bookingMode: req.body?.bookingMode,
    userMaxBidFare: req.body?.userMaxBidFare,
    bidStepAmount: req.body?.bidStepAmount,
    agentMeta: {
      bookedByAgentId: agent._id,
      customerName: customer.name || '',
      customerPhone: customer.phone || '',
      customerId: customer._id,
      referralCodeApplied: customer.referredByAgent ? agent.referralCode || '' : '',
    },
  });

  await startDispatchFlow(ride);
  const hydratedRide = await getRideDetails(ride._id);

  res.status(201).json({
    success: true,
    data: hydratedRide,
  });
};

export const listAgentBusRoutes = async (_req, res) => {
  const items = await BusService.find({ status: 'active' })
    .select('route seatPrice variantPricing operatorName')
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    success: true,
    data: items.map((item) => ({
      id: String(item._id),
      fromCity: item.route?.originCity || '',
      toCity: item.route?.destinationCity || '',
      routeName: item.route?.routeName || '',
      operatorName: item.operatorName || '',
      startingPrice: Number(item.seatPrice || 0),
      variantPricing: item.variantPricing || null,
    })),
  });
};

export const searchAgentBuses = async (req, res) => {
  const fromCity = toCleanString(req.query?.fromCity);
  const toCity = toCleanString(req.query?.toCity);
  const travelDate = normalizeBusTravelDate(req.query?.date);

  const buses = await BusService.find({
    status: 'active',
    ...(fromCity ? { 'route.originCity': new RegExp(`^${fromCity}$`, 'i') } : {}),
    ...(toCity ? { 'route.destinationCity': new RegExp(`^${toCity}$`, 'i') } : {}),
  }).lean();

  const results = await Promise.all(
    buses.flatMap((busService) =>
      (Array.isArray(busService.schedules) ? busService.schedules : []).map(async (schedule) => {
        const seats = await searchBusSeatAvailability({
          busService,
          scheduleId: schedule.id,
          travelDate,
        });
        return {
          id: `${String(busService._id)}:${String(schedule.id)}`,
          busServiceId: String(busService._id),
          scheduleId: String(schedule.id || ''),
          travelDate,
          fromCity: busService.route?.originCity || '',
          toCity: busService.route?.destinationCity || '',
          routeName: busService.route?.routeName || '',
          busName: busService.busName || '',
          operatorName: busService.operatorName || '',
          departure: schedule.departureTime || '',
          arrival: schedule.arrivalTime || '',
          availableSeats: seats.filter((item) => item.status === 'available').length,
          price: Number(busService.seatPrice || 0),
          variantPricing: busService.variantPricing || null,
        };
      }),
    ),
  );

  res.json({
    success: true,
    data: results,
  });
};

export const getAgentBusSeatLayout = async (req, res) => {
  const busService = await BusService.findById(req.params.id).lean();
  if (!busService || String(busService.status || '') !== 'active') {
    throw new ApiError(404, 'Bus service not found');
  }

  const scheduleId = toCleanString(req.query?.scheduleId);
  const travelDate = normalizeBusTravelDate(req.query?.date);
  const schedule = findBusSchedule(busService, scheduleId);

  if (!schedule) {
    throw new ApiError(404, 'Bus schedule not found');
  }

  const seats = await searchBusSeatAvailability({
    busService,
    scheduleId,
    travelDate,
  });
  const seatStatusById = new Map(seats.map((seat) => [String(seat.id || ''), seat.status || 'available']));
  const normalizeDeck = (deckRows = []) =>
    deckRows.map((row) =>
      (Array.isArray(row) ? row : []).map((cell) => {
        if (!cell || cell.kind !== 'seat') {
          return cell;
        }

        const seatId = String(cell.id || '');
        return {
          ...cell,
          status: seatStatusById.get(seatId) || 'available',
        };
      }),
    );
  const blueprint = {
    templateKey: busService.blueprint?.templateKey || 'seater_2_2',
    lowerDeck: normalizeDeck(busService.blueprint?.lowerDeck || []),
    upperDeck: normalizeDeck(busService.blueprint?.upperDeck || []),
  };

  res.json({
    success: true,
    data: {
      busServiceId: String(busService._id),
      scheduleId,
      travelDate,
      availableSeats: seats.filter((seat) => seat.status === 'available').length,
      bus: {
        busServiceId: String(busService._id),
        scheduleId,
        travelDate,
        fromCity: busService.route?.originCity || '',
        toCity: busService.route?.destinationCity || '',
        routeName: busService.route?.routeName || '',
        busName: busService.busName || '',
        operatorName: busService.operatorName || '',
        serviceNumber: busService.serviceNumber || '',
        coachType: busService.coachType || '',
        busCategory: busService.busCategory || '',
        departure: schedule.departureTime || '',
        arrival: schedule.arrivalTime || '',
        price: Number(busService.seatPrice || 0),
        variantPricing: busService.variantPricing || null,
        fareCurrency: busService.fareCurrency || 'INR',
      },
      blueprint,
      seats,
    },
  });
};

export const createAgentBusBooking = async (req, res) => {
  const agent = await Agent.findById(req.auth.sub);
  if (!agent) {
    throw new ApiError(404, 'Agent not found');
  }

  const busServiceId = toCleanString(req.body?.busServiceId);
  const scheduleId = toCleanString(req.body?.scheduleId);
  const travelDate = normalizeBusTravelDate(req.body?.travelDate || req.body?.date);
  const seatIds = Array.isArray(req.body?.seatIds)
    ? [...new Set(req.body.seatIds.map((item) => toCleanString(item)).filter(Boolean))]
    : [];

  if (!mongoose.Types.ObjectId.isValid(busServiceId)) {
    throw new ApiError(400, 'Valid bus service is required');
  }
  if (!scheduleId || seatIds.length === 0) {
    throw new ApiError(400, 'scheduleId and seatIds are required');
  }

  const busService = await BusService.findById(busServiceId).lean();
  if (!busService || String(busService.status || '') !== 'active') {
    throw new ApiError(404, 'Active bus service not found');
  }

  const schedule = findBusSchedule(busService, scheduleId);
  if (!schedule) {
    throw new ApiError(404, 'Bus schedule not found');
  }

  const requestedCustomer = req.body?.customer || req.body?.passenger || {};
  const requestedCustomerPhone = normalizePhone(requestedCustomer?.phone);
  const customer = await withMongoSession((session) =>
    (/^\d{10}$/.test(requestedCustomerPhone)
      ? resolveOrCreateCustomer({
          agent,
          customer: requestedCustomer,
          session,
        })
      : createAnonymousWalkInCustomer({
          agent,
          session,
        })));

  const seats = await searchBusSeatAvailability({
    busService,
    scheduleId,
    travelDate,
  });
  const availableSeatMap = new Map(
    seats.filter((seat) => seat.status === 'available').map((seat) => [seat.id, seat]),
  );

  const invalidSeat = seatIds.find((seatId) => !availableSeatMap.has(seatId));
  if (invalidSeat) {
    throw new ApiError(409, `Seat ${invalidSeat} is not available`);
  }

  const amount = roundMoney(
    seatIds.reduce((sum, seatId) => sum + resolveBusSeatPrice(busService, availableSeatMap.get(seatId)), 0),
  );

  const booking = await withMongoSession(async (session) => {
    const created = await BusBooking.create(
      [{
        userId: customer._id,
        busServiceId: busService._id,
        bookingCode: createBusBookingCode(),
        scheduleId,
        travelDate,
        seatIds,
        seatLabels: seatIds.map((seatId) => availableSeatMap.get(seatId)?.label || seatId),
        passenger: {
          name: customer.name || '',
          phone: customer.phone || '',
          email: customer.email || '',
        },
        amount,
        bookingSource: 'agent',
        currency: busService.fareCurrency || 'INR',
        status: 'confirmed',
        routeSnapshot: {
          originCity: busService.route?.originCity || '',
          destinationCity: busService.route?.destinationCity || '',
          departureTime: schedule?.departureTime || '',
          arrivalTime: schedule?.arrivalTime || '',
          durationHours: busService.route?.durationHours || '',
          busName: busService.busName || '',
          operatorName: busService.operatorName || '',
          coachType: busService.coachType || '',
          busCategory: busService.busCategory || '',
          registrationNumber: busService.registrationNumber || '',
          driverName: busService.driverName || '',
          driverPhone: busService.driverPhone || '',
        },
        payment: {
          provider: 'agent_manual',
          orderId: '',
          paymentId: '',
          signature: '',
          status: 'paid',
          paidAt: new Date(),
        },
        agentMeta: {
          bookedByAgentId: agent._id,
          customerId: customer._id,
          customerName: customer.name || '',
          customerPhone: customer.phone || '',
        },
        notes: toCleanString(req.body?.notes),
      }],
      { session },
    );

    const bookingDoc = created[0];
    await BusSeatHold.insertMany(
      seatIds.map((seatId) => ({
        busServiceId: busService._id,
        bookingId: bookingDoc._id,
        userId: customer._id,
        scheduleId,
        travelDate,
        seatId,
        holdToken: bookingDoc.bookingCode,
        status: 'booked',
        expiresAt: null,
      })),
      { session, ordered: true },
    );

    const commissionResult = await creditAgentCommission({
      agentId: agent._id,
      bookingType: 'bus',
      commissionMode: 'direct',
      grossAmount: amount,
      referenceKey: `agent:bus:${String(bookingDoc._id)}`,
      title: `Bus booking commission for ${bookingDoc.bookingCode}`,
      metadata: {
        bookingId: String(bookingDoc._id),
        bookingCode: bookingDoc.bookingCode,
        userId: String(customer._id),
      },
      session,
    });

    if (commissionResult) {
      bookingDoc.agentMeta = {
        ...(bookingDoc.agentMeta || {}),
        commissionAmount: commissionResult.transaction?.amount || 0,
        commissionCreditedAt: commissionResult.transaction?.createdAt || new Date(),
      };
      await bookingDoc.save({ session });
    }

    return bookingDoc;
  });

  res.status(201).json({
    success: true,
    data: serializeAgentBusBooking(booking),
  });
};
