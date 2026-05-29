
import crypto from 'node:crypto';
import { env } from '../../../../config/env.js';
import { ApiError } from '../../../../utils/ApiError.js';
import { sendOtpSms } from '../../services/smsService.js';
import { signAccessToken } from '../../services/tokenService.js';
import { Agent } from '../models/Agent.js';
import { AgentLoginSession } from '../models/AgentLoginSession.js';

const LOGIN_OTP_TTL_MS = 10 * 60 * 1000;
const TEST_LOGIN_OTP_PHONE = '6268423925';
const TEST_LOGIN_OTP_CODE = '0000';

const toCleanString = (value) => String(value || '').trim();
const normalizePhone = (phone) => {
  const digits = toCleanString(phone).replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
};
const hashOtp = (otp) => crypto.createHash('sha256').update(String(otp)).digest('hex');
const generateOtp = () => String(Math.floor(1000 + Math.random() * 9000));
const getVisibleOtp = (otp) => (process.env.NODE_ENV !== 'production' ? String(otp) : null);
const isTruthy = (value) => ['1', 'true', 'yes', 'on'].includes(toCleanString(value).toLowerCase());

const getStaticAgentOtpConfig = () => ({
  phone: normalizePhone(env.sms?.staticOtpPhone || TEST_LOGIN_OTP_PHONE),
  otp: toCleanString(env.sms?.staticOtpCode || TEST_LOGIN_OTP_CODE),
});

const resolveAgentLoginOtpForPhone = (phone) => {
  const normalizedPhone = normalizePhone(phone);
  const staticOtpConfig = getStaticAgentOtpConfig();
  const defaultOtpEnabled = isTruthy(env.sms?.useDefaultOtp);

  if (defaultOtpEnabled && staticOtpConfig.otp) {
    return {
      otp: staticOtpConfig.otp,
      isStatic: true,
    };
  }

  if (staticOtpConfig.phone && staticOtpConfig.otp && normalizedPhone === staticOtpConfig.phone) {
    return {
      otp: staticOtpConfig.otp,
      isStatic: true,
    };
  }

  return {
    otp: generateOtp(),
    isStatic: false,
  };
};

const publicSessionPayload = (session, debugOtp = null) => ({
  phone: session.phone,
  status: 'otp_sent',
  flow: session.flow || 'existing',
  debugOtp,
});

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

const getSession = async (phone) => {
  const session = await AgentLoginSession.findOne({ phone: normalizePhone(phone) }).select('+otpHash');

  if (!session) {
    throw new ApiError(404, 'Login session not found');
  }

  if (session.expiresAt && new Date(session.expiresAt).getTime() < Date.now()) {
    await AgentLoginSession.deleteOne({ _id: session._id });
    throw new ApiError(410, 'Login session expired');
  }

  return session;
};

export const startAgentLoginOtp = async ({ phone }) => {
  const normalizedPhone = normalizePhone(phone);

  if (!/^\d{10}$/.test(normalizedPhone)) {
    throw new ApiError(400, 'A valid 10-digit mobile number is required');
  }

  const agent = await Agent.findOne({ phone: normalizedPhone });
  const flow = agent ? 'existing' : 'new';

  const { otp, isStatic } = resolveAgentLoginOtpForPhone(normalizedPhone);
  const now = Date.now();

  const session = await AgentLoginSession.findOneAndUpdate(
    { phone: normalizedPhone },
    {
      phone: normalizedPhone,
      agentId: agent?._id || null,
      flow,
      otpHash: hashOtp(otp),
      otpExpiresAt: new Date(now + LOGIN_OTP_TTL_MS),
      verifiedAt: null,
      expiresAt: new Date(now + LOGIN_OTP_TTL_MS),
    },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
  );

  const smsDispatch = isStatic
    ? {
        mode: 'static',
        message: 'Static OTP enabled',
      }
    : await sendOtpSms({
        phone: normalizedPhone,
        otp,
        purpose: 'agent login OTP',
      });

  const debugOtp = getVisibleOtp(otp);
  if (debugOtp) {
    console.log(`[agentLoginOtpService] OTP for ${normalizedPhone} = ${debugOtp} (${smsDispatch.mode})`);
  }

  return {
    message: smsDispatch.mode === 'live' ? 'OTP sent successfully' : 'OTP generated successfully',
    session: publicSessionPayload(session, debugOtp),
  };
};

export const verifyAgentLoginOtp = async ({ phone, otp }) => {
  const session = await getSession(phone);

  if (!otp || toCleanString(otp).length !== 4) {
    throw new ApiError(400, 'A valid 4-digit OTP is required');
  }

  if (!session.otpExpiresAt || new Date(session.otpExpiresAt).getTime() < Date.now()) {
    throw new ApiError(410, 'OTP has expired');
  }

  if (session.otpHash !== hashOtp(otp)) {
    throw new ApiError(401, 'Invalid OTP');
  }

  if (session.flow === 'new') {
    session.verifiedAt = new Date();
    session.expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await session.save();

    return {
      message: 'OTP verified successfully',
      nextStep: 'onboarding',
      phone: session.phone,
    };
  }

  const agent = await Agent.findById(session.agentId);
  if (!agent) {
    throw new ApiError(404, 'Agent account not found');
  }

  const normalizedKycStatus = String(agent.kycStatus || 'pending').toLowerCase();
  const normalizedPortalStatus = String(agent.status || 'inactive').toLowerCase();

  session.verifiedAt = new Date();
  session.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await session.save();

  if (normalizedKycStatus !== 'verified' || agent.active === false || normalizedPortalStatus !== 'active') {
    await AgentLoginSession.deleteOne({ _id: session._id });
    return {
      message: 'Agent account is under review',
      nextStep: 'pending_review',
      agent: {
        id: String(agent._id),
        name: agent.name || '',
        phone: agent.phone || '',
        email: agent.email || '',
        kycStatus: agent.kycStatus || 'pending',
        status: agent.status || 'inactive',
        active: agent.active !== false,
        onboarding: agent.onboarding || {},
      },
    };
  }

  await AgentLoginSession.deleteOne({ _id: session._id });

  return {
    message: 'OTP verified successfully',
    nextStep: 'dashboard',
    ...createAgentSessionPayload(agent),
  };
};
