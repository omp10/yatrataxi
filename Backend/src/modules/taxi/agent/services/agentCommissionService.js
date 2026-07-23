import { Agent } from '../models/Agent.js';
import { AdminBusinessSetting } from '../../admin/models/AdminBusinessSetting.js';
import { applyAgentWalletAdjustment } from './agentWalletService.js';

const roundMoney = (value) => Math.round(Number(value || 0) * 100) / 100;

export const AGENT_COMMISSION_KEYS = ['directRide', 'referredRide', 'intercity', 'bus', 'pooling'];

const FALLBACK_AGENT_COMMISSION = {
  directRide: { enabled: true, type: 'percentage', value: 5 },
  referredRide: { enabled: true, type: 'percentage', value: 3 },
  intercity: { enabled: true, type: 'percentage', value: 6 },
  bus: { enabled: true, type: 'percentage', value: 4 },
  pooling: { enabled: true, type: 'percentage', value: 4 },
};

const normalizeCommissionRule = (rule = {}) => ({
  enabled: rule?.enabled !== false,
  type: String(rule?.type || 'percentage').trim().toLowerCase() === 'fixed' ? 'fixed' : 'percentage',
  value: Math.max(0, Number(rule?.value || 0) || 0),
});

// Platform-wide commission template applied to every newly created agent. Existing
// agents keep whatever the admin set on them individually.
export const getDefaultAgentCommissionConfig = async () => {
  const settings = await AdminBusinessSetting.findOne({ scope: 'default' }).select('agent_commission').lean();
  const stored = settings?.agent_commission || {};

  return AGENT_COMMISSION_KEYS.reduce((accumulator, key) => {
    accumulator[key] = normalizeCommissionRule(stored[key] || FALLBACK_AGENT_COMMISSION[key]);
    return accumulator;
  }, {});
};

export const saveDefaultAgentCommissionConfig = async (payload = {}) => {
  const next = AGENT_COMMISSION_KEYS.reduce((accumulator, key) => {
    accumulator[key] = normalizeCommissionRule(payload[key] || FALLBACK_AGENT_COMMISSION[key]);
    return accumulator;
  }, {});

  await AdminBusinessSetting.updateOne(
    { scope: 'default' },
    { $set: { agent_commission: next } },
    { upsert: true },
  );

  return next;
};

export const computeAgentCommissionAmount = ({ amount, rule }) => {
  const safeAmount = roundMoney(amount);
  const normalizedRule = normalizeCommissionRule(rule);

  if (!normalizedRule.enabled || safeAmount <= 0 || normalizedRule.value <= 0) {
    return 0;
  }

  if (normalizedRule.type === 'fixed') {
    return Math.min(safeAmount, roundMoney(normalizedRule.value));
  }

  return Math.min(safeAmount, roundMoney((safeAmount * normalizedRule.value) / 100));
};

export const resolveAgentForUserCommission = async ({ ride = null, busBooking = null, user = null }) => {
  const directAgentId = ride?.agentMeta?.bookedByAgentId || busBooking?.agentMeta?.bookedByAgentId || null;
  if (directAgentId) {
    return {
      agentId: String(directAgentId),
      commissionMode: 'direct',
    };
  }

  const referredAgentId = user?.referredByAgent || null;
  if (referredAgentId) {
    return {
      agentId: String(referredAgentId),
      commissionMode: 'referral',
    };
  }

  return null;
};

export const creditAgentCommission = async ({
  agentId,
  bookingType,
  commissionMode,
  grossAmount,
  referenceKey,
  title,
  metadata = {},
  session = null,
}) => {
  if (!agentId || !referenceKey) {
    return null;
  }

  const agent = await Agent.findById(agentId).session(session);
  if (!agent || agent.active === false || String(agent.status || '').toLowerCase() !== 'active') {
    return null;
  }

  const normalizedBookingType = String(bookingType || '').trim().toLowerCase();
  const normalizedMode = String(commissionMode || 'direct').trim().toLowerCase() === 'referral' ? 'referral' : 'direct';
  const commissionKey =
    normalizedBookingType === 'bus'
      ? 'bus'
      : normalizedBookingType === 'pooling'
        ? 'pooling'
        : normalizedBookingType === 'intercity'
          ? 'intercity'
          : normalizedMode === 'referral'
            ? 'referredRide'
            : 'directRide';
  const rule = agent.commissionConfig?.[commissionKey] || {};
  const amount = computeAgentCommissionAmount({
    amount: grossAmount,
    rule,
  });

  if (amount <= 0) {
    return null;
  }

  const result = await applyAgentWalletAdjustment({
    agentId: agent._id,
    amount,
    kind: 'credit',
    title,
    source: `agent_${normalizedMode}_${normalizedBookingType}`,
    bookingType: normalizedBookingType,
    referenceKey,
    metadata: {
      ...metadata,
      commissionMode: normalizedMode,
      commissionRule: normalizeCommissionRule(rule),
      grossAmount: roundMoney(grossAmount),
      commissionAmount: amount,
    },
    session,
  });

  if (result) {
    const metricsUpdate = {};
    if (normalizedBookingType === 'bus' || normalizedBookingType === 'pooling') {
      metricsUpdate[normalizedMode === 'referral' ? 'metrics.referredBusBookings' : 'metrics.directBusBookings'] = 1;
    } else {
      metricsUpdate[normalizedMode === 'referral' ? 'metrics.referredRideBookings' : 'metrics.directRideBookings'] = 1;
    }

    await Agent.updateOne(
      { _id: agent._id },
      { $inc: metricsUpdate },
      { session },
    );
  }

  return result;
};
