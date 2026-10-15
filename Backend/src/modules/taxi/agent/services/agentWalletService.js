import mongoose from 'mongoose';
import { ApiError } from '../../../../utils/ApiError.js';
import { Agent } from '../models/Agent.js';
import { AgentWallet } from '../models/AgentWallet.js';
import { claimGatewayPayment, releaseGatewayPayment } from '../../services/paymentCaptureService.js';

const roundMoney = (value) => Math.round(Number(value || 0) * 100) / 100;

export const ensureAgentWallet = async (agentId, session = null) => {
  if (!agentId) {
    throw new ApiError(400, 'agentId is required');
  }

  await AgentWallet.updateOne(
    { agentId },
    {
      $setOnInsert: {
        agentId,
        balance: 0,
        lifetimeEarned: 0,
        lifetimePaidOut: 0,
        transactions: [],
      },
    },
    {
      upsert: true,
      ...(session ? { session } : {}),
    },
  );
};

export const serializeAgentWallet = (wallet = null) => ({
  balance: roundMoney(wallet?.balance || 0),
  lifetimeEarned: roundMoney(wallet?.lifetimeEarned || 0),
  lifetimePaidOut: roundMoney(wallet?.lifetimePaidOut || 0),
  currency: 'INR',
  recentTransactions: Array.isArray(wallet?.transactions)
    ? wallet.transactions
      .slice()
      .reverse()
      .map((item) => ({
        id: String(item._id || ''),
        kind: item.kind || 'credit',
        amount: roundMoney(item.amount || 0),
        title: item.title || '',
        source: item.source || '',
        bookingType: item.bookingType || '',
        createdAt: item.createdAt || null,
        metadata: item.metadata || {},
      }))
    : [],
});

export const applyAgentWalletAdjustment = async ({
  agentId,
  amount,
  kind = 'credit',
  isReversal = false,
  title = '',
  source = '',
  bookingType = '',
  referenceKey = '',
  metadata = {},
  session = null,
}) => {
  const normalizedAmount = roundMoney(amount);
  if (!agentId || !Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw new ApiError(400, 'A positive adjustment amount is required');
  }

  const normalizedKind = String(kind || 'credit').trim().toLowerCase() === 'debit' ? 'debit' : 'credit';
  const normalizedReferenceKey = String(referenceKey || '').trim();

  const agentExists = await Agent.exists({ _id: agentId }).session(session);
  if (!agentExists) {
    throw new ApiError(404, 'Agent not found');
  }

  await ensureAgentWallet(agentId, session);

  let claim = null;
  if (normalizedReferenceKey) {
    // Entries credited before the ledger existed are only visible in the wallet's
    // (capped) transaction list.
    const existing = await AgentWallet.findOne({
      agentId,
      'transactions.referenceKey': normalizedReferenceKey,
    })
      .select('_id')
      .session(session)
      .lean();

    if (existing) {
      return null;
    }

    // The ledger row survives the 100-entry cap on transactions, so a reward or
    // commission keyed by referenceKey can never be paid twice.
    claim = {
      provider: 'agent_wallet',
      paymentId: `${String(agentId)}:${normalizedReferenceKey}`,
      purpose: 'agent_wallet_adjustment',
      ownerType: 'agent',
      ownerId: String(agentId),
      amount: normalizedAmount,
    };
    if (!(await claimGatewayPayment(claim))) {
      return null;
    }
  }

  const transaction = {
    kind: normalizedKind,
    amount: normalizedAmount,
    title: String(title || '').trim(),
    source: String(source || '').trim(),
    bookingType: String(bookingType || '').trim(),
    referenceKey: normalizedReferenceKey,
    metadata,
  };
  const pushTransaction = { transactions: { $each: [transaction], $slice: -100 } };
  const options = { returnDocument: 'after', ...(session ? { session } : {}) };

  try {
    let wallet = null;
    let earningsDelta = 0;

    // Every balance change is a single conditional $inc so concurrent adjustments
    // cannot overwrite each other.
    if (normalizedKind === 'credit') {
      wallet = await AgentWallet.findOneAndUpdate(
        { agentId },
        { $inc: { balance: normalizedAmount, lifetimeEarned: normalizedAmount }, $push: pushTransaction },
        options,
      );
      earningsDelta = normalizedAmount;
    } else if (isReversal) {
      wallet = await AgentWallet.findOneAndUpdate(
        { agentId, balance: { $gte: normalizedAmount } },
        { $inc: { balance: -normalizedAmount, lifetimeEarned: -normalizedAmount }, $push: pushTransaction },
        options,
      ) || await AgentWallet.findOneAndUpdate(
        // Already paid out: the reversal can only take the wallet down to zero.
        { agentId, balance: { $lt: normalizedAmount } },
        { $set: { balance: 0 }, $inc: { lifetimeEarned: -normalizedAmount }, $push: pushTransaction },
        options,
      );
      earningsDelta = -normalizedAmount;
    } else {
      wallet = await AgentWallet.findOneAndUpdate(
        { agentId, balance: { $gte: normalizedAmount } },
        { $inc: { balance: -normalizedAmount, lifetimePaidOut: normalizedAmount }, $push: pushTransaction },
        options,
      );
      if (!wallet) {
        throw new ApiError(400, 'Agent wallet balance cannot go negative');
      }
    }

    if (!wallet) {
      throw new ApiError(404, 'Agent wallet not found');
    }

    if (wallet.lifetimeEarned < 0) {
      wallet = await AgentWallet.findOneAndUpdate({ agentId }, { $set: { lifetimeEarned: 0 } }, options);
    }

    if (earningsDelta !== 0) {
      await Agent.updateOne({ _id: agentId }, { $inc: { 'metrics.totalEarnings': earningsDelta } }, { session });
      if (earningsDelta < 0) {
        await Agent.updateOne(
          { _id: agentId, 'metrics.totalEarnings': { $lt: 0 } },
          { $set: { 'metrics.totalEarnings': 0 } },
          { session },
        );
      }
    }

    return {
      wallet: serializeAgentWallet(wallet),
      transaction: wallet.transactions[wallet.transactions.length - 1],
    };
  } catch (error) {
    if (claim) {
      await releaseGatewayPayment(claim).catch(() => {});
    }
    throw error;
  }
};

export const listAgentWalletTransactions = async (agentId) => {
  await ensureAgentWallet(agentId);
  const wallet = await AgentWallet.findOne({ agentId }).lean();
  return serializeAgentWallet(wallet);
};

export const withMongoSession = async (task) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await task(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};
