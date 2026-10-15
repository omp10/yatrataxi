import { ApiError } from '../../../utils/ApiError.js';
import { PaymentCapture } from '../common/models/PaymentCapture.js';

const DUPLICATE_KEY_ERROR = 11000;

/**
 * Records that a gateway payment has been used. Returns true when this call claimed
 * it, false when the same owner already claimed it for the same purpose (a retry),
 * and throws 409 when it was already used by someone else or for something else.
 *
 * The claim is its own atomic insert, deliberately outside any transaction: a
 * duplicate-key error inside a transaction aborts it. Callers that fail to apply
 * the money after a successful claim must call releaseGatewayPayment.
 */
export const claimGatewayPayment = async ({
  provider,
  paymentId,
  orderId = '',
  purpose,
  ownerType,
  ownerId,
  amount = 0,
}) => {
  const normalizedProvider = String(provider || '').trim().toLowerCase();
  const normalizedPaymentId = String(paymentId || '').trim();

  if (!normalizedProvider || !normalizedPaymentId) {
    throw new ApiError(400, 'Payment reference is required');
  }

  try {
    await PaymentCapture.create({
      provider: normalizedProvider,
      paymentId: normalizedPaymentId,
      orderId: String(orderId || '').trim(),
      purpose,
      ownerType,
      ownerId: String(ownerId),
      amount: Number(amount || 0),
    });
    return true;
  } catch (error) {
    if (error?.code !== DUPLICATE_KEY_ERROR) {
      throw error;
    }
  }

  const existing = await PaymentCapture.findOne({
    provider: normalizedProvider,
    paymentId: normalizedPaymentId,
  }).lean();

  if (
    existing
    && existing.purpose === purpose
    && existing.ownerType === ownerType
    && existing.ownerId === String(ownerId)
  ) {
    return false;
  }

  throw new ApiError(409, 'This payment has already been used');
};

export const releaseGatewayPayment = async ({ provider, paymentId }) => {
  await PaymentCapture.deleteOne({
    provider: String(provider || '').trim().toLowerCase(),
    paymentId: String(paymentId || '').trim(),
  });
};

/**
 * Claims the payment, then runs applyCredit. If applyCredit throws, the claim is
 * released so the user can retry. Returns { claimed, result }.
 */
export const applyGatewayPaymentOnce = async (claim, applyCredit) => {
  const claimed = await claimGatewayPayment(claim);
  if (!claimed) {
    return { claimed: false, result: null };
  }

  try {
    return { claimed: true, result: await applyCredit() };
  } catch (error) {
    await releaseGatewayPayment(claim).catch(() => {});
    throw error;
  }
};
