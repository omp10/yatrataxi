import { Agent } from '../models/Agent.js';
import { AgentWallet } from '../models/AgentWallet.js';
import { AdminBusinessSetting } from '../../admin/models/AdminBusinessSetting.js';
import { applyAgentWalletAdjustment } from './agentWalletService.js';
import { DEFAULT_AGENT_REFERRAL_SETTINGS } from '../../admin/services/adminService.js';

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

    if (agent.referredByAgent) {
      try {
        const settingDoc = await AdminBusinessSetting.findOne({ scope: 'default' }).session(session).lean();
        const agentReferral = {
          ...DEFAULT_AGENT_REFERRAL_SETTINGS,
          ...(settingDoc?.referral?.agent || {}),
        };
        const agentToAgentEnabled = agentReferral.agent_to_agent_enabled !== false;

        // 1. First booking reward trigger
        if (agentToAgentEnabled && !agent.referralRewardPaid && agentReferral.reward_trigger === 'first_booking') {
          const bonusAmount = Number(agentReferral.agent_referral_bonus ?? DEFAULT_AGENT_REFERRAL_SETTINGS.agent_referral_bonus);
          const welcomeAmount = Number(agentReferral.welcome_bonus ?? DEFAULT_AGENT_REFERRAL_SETTINGS.welcome_bonus);

          if (bonusAmount > 0) {
            await applyAgentWalletAdjustment({
              agentId: agent.referredByAgent,
              amount: bonusAmount,
              kind: 'credit',
              title: `Referral bonus for recruiting agent ${agent.name || agent.phone}`,
              source: 'referral_agent',
              referenceKey: `agent_ref_bonus_${agent._id}_referrer`,
              metadata: { referredAgentId: String(agent._id) },
              session,
            });
            await Agent.updateOne(
              { _id: agent.referredByAgent },
              { $inc: { 'metrics.agentReferralEarnings': bonusAmount } },
              { session },
            );
          }

          if (welcomeAmount > 0) {
            await applyAgentWalletAdjustment({
              agentId: agent._id,
              amount: welcomeAmount,
              kind: 'credit',
              title: 'Agent Welcome Bonus',
              source: 'referral_welcome',
              referenceKey: `agent_welcome_bonus_${agent._id}`,
              metadata: { referredBy: String(agent.referredByAgent) },
              session,
            });
          }

          await Agent.updateOne(
            { _id: agent._id },
            { $set: { referralRewardPaid: true } },
            { session },
          );
        }

        // 2. Override commission
        if (agentToAgentEnabled && agentReferral.override_commission_enabled && Number(agentReferral.override_commission_rate || 0) > 0) {
          const overrideRate = Number(agentReferral.override_commission_rate || 0);
          const overrideAmount = roundMoney(amount * (overrideRate / 100));
          if (overrideAmount > 0) {
            await applyAgentWalletAdjustment({
              agentId: agent.referredByAgent,
              amount: overrideAmount,
              kind: 'credit',
              title: `Override commission (${overrideRate}%) from sub-agent ${agent.name || agent.phone}`,
              source: 'agent_override_commission',
              bookingType: normalizedBookingType,
              referenceKey: `agent_override_${referenceKey}`,
              metadata: {
                fromAgentId: String(agent._id),
                baseCommissionAmount: amount,
                overrideRate,
              },
              session,
            });
            await Agent.updateOne(
              { _id: agent.referredByAgent },
              { $inc: { 'metrics.agentReferralEarnings': overrideAmount } },
              { session },
            );
          }
        }
      } catch (agentAffiliateErr) {
        console.warn('Agent affiliate commission processing error:', agentAffiliateErr);
      }
    }
  }

  return result;
};

export const revertAgentCommission = async ({
  agentId,
  bookingType,
  commissionMode,
  amount,
  referenceKey,
  title,
  metadata = {},
  session = null,
}) => {
  if (!agentId || !referenceKey || !amount || Number(amount) <= 0) {
    return null;
  }

  const agent = await Agent.findById(agentId).session(session);
  if (!agent) {
    return null;
  }

  const normalizedBookingType = String(bookingType || '').trim().toLowerCase();
  const normalizedMode = String(commissionMode || 'direct').trim().toLowerCase() === 'referral' ? 'referral' : 'direct';
  const reversalAmount = roundMoney(amount);

  const result = await applyAgentWalletAdjustment({
    agentId: agent._id,
    amount: reversalAmount,
    kind: 'debit',
    isReversal: true,
    title: title || `Commission reversed for cancelled ${normalizedBookingType} booking`,
    source: `agent_reversal_${normalizedMode}_${normalizedBookingType}`,
    bookingType: normalizedBookingType,
    referenceKey,
    metadata: {
      ...metadata,
      commissionMode: normalizedMode,
      reversedAmount: reversalAmount,
    },
    session,
  });

  if (result) {
    const metricsUpdate = {};
    if (normalizedBookingType === 'bus' || normalizedBookingType === 'pooling') {
      const metricKey = normalizedMode === 'referral' ? 'metrics.referredBusBookings' : 'metrics.directBusBookings';
      if (Number(agent.metrics?.[normalizedMode === 'referral' ? 'referredBusBookings' : 'directBusBookings'] || 0) > 0) {
        metricsUpdate[metricKey] = -1;
      }
    } else {
      const metricKey = normalizedMode === 'referral' ? 'metrics.referredRideBookings' : 'metrics.directRideBookings';
      if (Number(agent.metrics?.[normalizedMode === 'referral' ? 'referredRideBookings' : 'directRideBookings'] || 0) > 0) {
        metricsUpdate[metricKey] = -1;
      }
    }

    if (Object.keys(metricsUpdate).length > 0) {
      await Agent.updateOne(
        { _id: agent._id },
        { $inc: metricsUpdate },
        { session },
      );
    }
  }

  return result;
};

export const handleBusBookingCommissionReversal = async ({
  booking,
  seatsToCancel = [],
  activeSeats = [],
  isFullCancellation = false,
  cancelledAt = new Date(),
  session = null,
}) => {
  if (!booking?.agentMeta?.bookedByAgentId) {
    return null;
  }

  const currentCommission = Number(booking.agentMeta?.commissionAmount || 0);
  if (currentCommission <= 0) {
    return null;
  }

  const activeCount = Array.isArray(activeSeats) && activeSeats.length > 0 ? activeSeats.length : 1;
  const cancelCount = Array.isArray(seatsToCancel) && seatsToCancel.length > 0 ? seatsToCancel.length : 1;

  const amountToReverse = isFullCancellation
    ? currentCommission
    : Math.min(
        currentCommission,
        roundMoney((currentCommission / activeCount) * cancelCount),
      );

  if (amountToReverse <= 0) {
    return null;
  }

  const cancelledCount = Array.isArray(booking.cancelledSeats) ? booking.cancelledSeats.length : 0;
  const refSuffix = isFullCancellation ? 'full' : `partial_${cancelledCount}`;
  const reversalRef = `agent:bus:reversal:${String(booking._id)}:${refSuffix}`;

  const result = await revertAgentCommission({
    agentId: booking.agentMeta.bookedByAgentId,
    bookingType: 'bus',
    commissionMode: booking.agentMeta.commissionMode || 'direct',
    amount: amountToReverse,
    referenceKey: reversalRef,
    title: `Commission reversed for cancelled bus booking ${booking.bookingCode || String(booking._id).slice(-6)}`,
    metadata: {
      bookingId: String(booking._id),
      bookingCode: booking.bookingCode,
      isFullCancellation,
      cancelledSeats: seatsToCancel.map((s) => s.seatLabel || s.seatId),
    },
    session,
  });

  booking.agentMeta.commissionAmount = isFullCancellation
    ? 0
    : Math.max(0, roundMoney(currentCommission - amountToReverse));
  if (isFullCancellation) {
    booking.agentMeta.commissionReversed = true;
    booking.agentMeta.commissionReversedAt = cancelledAt;
  }

  return result;
};

export const processAgentApprovalReferralReward = async (agentDoc, session = null) => {
  if (!agentDoc || !agentDoc.referredByAgent) {
    return null;
  }

  const subAgentId = String(agentDoc._id);
  const parentAgentId = String(agentDoc.referredByAgent);

  const settingDoc = await AdminBusinessSetting.findOne({ scope: 'default' }).session(session).lean();
  const agentReferral = {
    ...DEFAULT_AGENT_REFERRAL_SETTINGS,
    ...(settingDoc?.referral?.agent || {}),
  };

  const agentToAgentEnabled = agentReferral.agent_to_agent_enabled !== false;
  const trigger = String(agentReferral.reward_trigger || 'on_approval').trim().toLowerCase();

  if (!agentToAgentEnabled || trigger !== 'on_approval') {
    return null;
  }

  const bonusAmount = Number(agentReferral.agent_referral_bonus ?? DEFAULT_AGENT_REFERRAL_SETTINGS.agent_referral_bonus);
  const welcomeAmount = Number(agentReferral.welcome_bonus ?? DEFAULT_AGENT_REFERRAL_SETTINGS.welcome_bonus);

  if (bonusAmount > 0) {
    const refKey = `agent_ref_bonus_${subAgentId}_referrer`;
    const res = await applyAgentWalletAdjustment({
      agentId: parentAgentId,
      amount: bonusAmount,
      kind: 'credit',
      title: `Referral bonus for recruiting agent ${agentDoc.name || agentDoc.phone}`,
      source: 'referral_agent',
      referenceKey: refKey,
      metadata: { referredAgentId: subAgentId },
      session,
    });
    if (res) {
      await Agent.updateOne(
        { _id: parentAgentId },
        { $inc: { 'metrics.agentReferralEarnings': bonusAmount } },
        { session },
      );
    }
  }

  if (welcomeAmount > 0) {
    const welcomeRefKey = `agent_welcome_bonus_${subAgentId}`;
    await applyAgentWalletAdjustment({
      agentId: subAgentId,
      amount: welcomeAmount,
      kind: 'credit',
      title: 'Agent Welcome Bonus',
      source: 'referral_welcome',
      referenceKey: welcomeRefKey,
      metadata: { referredBy: parentAgentId },
      session,
    });
  }

  await Agent.updateOne(
    { _id: subAgentId },
    { $set: { referralRewardPaid: true } },
    { session },
  );

  return true;
};

export const syncPendingSubAgentReferralRewards = async (agentId) => {
  if (!agentId) return null;

  try {
    const agent = await Agent.findById(agentId);
    if (!agent) return null;

    const settingDoc = await AdminBusinessSetting.findOne({ scope: 'default' }).lean();
    const agentReferral = {
      ...DEFAULT_AGENT_REFERRAL_SETTINGS,
      ...(settingDoc?.referral?.agent || {}),
    };

    const agentToAgentEnabled = agentReferral.agent_to_agent_enabled !== false;
    const trigger = String(agentReferral.reward_trigger || 'on_approval').trim().toLowerCase();

    // 1. If this agent itself was recruited and is verified, ensure welcome bonus is credited
    if (
      agentToAgentEnabled &&
      agent.referredByAgent &&
      String(agent.kycStatus || '').toLowerCase() === 'verified' &&
      trigger === 'on_approval'
    ) {
      const welcomeAmount = Number(agentReferral.welcome_bonus ?? DEFAULT_AGENT_REFERRAL_SETTINGS.welcome_bonus);
      if (welcomeAmount > 0) {
        const welcomeRefKey = `agent_welcome_bonus_${String(agent._id)}`;
        await applyAgentWalletAdjustment({
          agentId: String(agent._id),
          amount: welcomeAmount,
          kind: 'credit',
          title: 'Agent Welcome Bonus',
          source: 'referral_welcome',
          referenceKey: welcomeRefKey,
          metadata: { referredBy: String(agent.referredByAgent) },
        });
      }
    }

    // 2. Check all sub-agents recruited by this agent
    if (agentToAgentEnabled && trigger === 'on_approval') {
      const bonusAmount = Number(agentReferral.agent_referral_bonus ?? DEFAULT_AGENT_REFERRAL_SETTINGS.agent_referral_bonus);
      const welcomeAmount = Number(agentReferral.welcome_bonus ?? DEFAULT_AGENT_REFERRAL_SETTINGS.welcome_bonus);

      const subAgents = await Agent.find({
        referredByAgent: agent._id,
        kycStatus: 'verified',
      }).lean();

      for (const sub of subAgents) {
        const subId = String(sub._id);
        const refKey = `agent_ref_bonus_${subId}_referrer`;

        if (bonusAmount > 0) {
          const res = await applyAgentWalletAdjustment({
            agentId: String(agent._id),
            amount: bonusAmount,
            kind: 'credit',
            title: `Referral bonus for recruiting agent ${sub.name || sub.phone}`,
            source: 'referral_agent',
            referenceKey: refKey,
            metadata: { referredAgentId: subId },
          });

          if (res) {
            await Agent.updateOne(
              { _id: agent._id },
              { $inc: { 'metrics.agentReferralEarnings': bonusAmount } },
            );
          }
        }

        if (welcomeAmount > 0) {
          const welcomeRefKey = `agent_welcome_bonus_${subId}`;
          await applyAgentWalletAdjustment({
            agentId: subId,
            amount: welcomeAmount,
            kind: 'credit',
            title: 'Agent Welcome Bonus',
            source: 'referral_welcome',
            referenceKey: welcomeRefKey,
            metadata: { referredBy: String(agent._id) },
          });
        }

        if (!sub.referralRewardPaid) {
          await Agent.updateOne({ _id: sub._id }, { $set: { referralRewardPaid: true } });
        }
      }
    }

    // 3. Reconcile agent.metrics.agentReferralEarnings from wallet transactions
    const wallet = await AgentWallet.findOne({ agentId: agent._id }).lean();
    if (wallet && Array.isArray(wallet.transactions)) {
      const affiliateTotal = roundMoney(
        wallet.transactions
          .filter(
            (t) =>
              t.kind === 'credit' &&
              ['referral_agent', 'referral_welcome', 'agent_override_commission'].includes(t.source)
          )
          .reduce((sum, t) => sum + Number(t.amount || 0), 0)
      );

      await Agent.updateOne(
        { _id: agent._id },
        { $set: { 'metrics.agentReferralEarnings': affiliateTotal } }
      );
    }
  } catch (err) {
    console.error('syncPendingSubAgentReferralRewards error for agent', agentId, err);
  }
};
