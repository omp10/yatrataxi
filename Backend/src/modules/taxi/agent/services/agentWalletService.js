import mongoose from 'mongoose';
import { ApiError } from '../../../../utils/ApiError.js';
import { Agent } from '../models/Agent.js';
import { AgentWallet } from '../models/AgentWallet.js';

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

  const agent = await Agent.findById(agentId).session(session);
  if (!agent) {
    throw new ApiError(404, 'Agent not found');
  }

  await ensureAgentWallet(agentId, session);

  if (referenceKey) {
    const existing = await AgentWallet.findOne({
      agentId,
      'transactions.referenceKey': String(referenceKey).trim(),
    })
      .select('_id')
      .session(session)
      .lean();

    if (existing) {
      return null;
    }
  }

  const signedAmount = normalizedKind === 'debit' ? -normalizedAmount : normalizedAmount;
  const wallet = await AgentWallet.findOne({ agentId }).session(session);
  if (!wallet) {
    throw new ApiError(404, 'Agent wallet not found');
  }

  const nextBalance = roundMoney(Number(wallet.balance || 0) + signedAmount);
  if (nextBalance < 0) {
    throw new ApiError(400, 'Agent wallet balance cannot go negative');
  }

  wallet.balance = nextBalance;
  if (normalizedKind === 'credit') {
    wallet.lifetimeEarned = roundMoney(Number(wallet.lifetimeEarned || 0) + normalizedAmount);
    agent.metrics.totalEarnings = roundMoney(Number(agent.metrics?.totalEarnings || 0) + normalizedAmount);
  } else {
    wallet.lifetimePaidOut = roundMoney(Number(wallet.lifetimePaidOut || 0) + normalizedAmount);
  }

  wallet.transactions.push({
    kind: normalizedKind,
    amount: normalizedAmount,
    title: String(title || '').trim(),
    source: String(source || '').trim(),
    bookingType: String(bookingType || '').trim(),
    referenceKey: String(referenceKey || '').trim(),
    metadata,
  });
  wallet.transactions = wallet.transactions.slice(-100);

  await Promise.all([
    wallet.save({ session }),
    agent.save({ session }),
  ]);

  return {
    wallet: serializeAgentWallet(wallet),
    transaction: wallet.transactions[wallet.transactions.length - 1],
  };
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
