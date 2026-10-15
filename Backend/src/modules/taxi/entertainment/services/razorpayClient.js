import crypto from 'node:crypto';
import { createRazorpayRequestError, resolveConfiguredGatewayCredentials } from '../../services/paymentGatewayService.js';

// All Razorpay traffic for entertainment tickets goes through this object, which
// keeps the gateway in one place (and lets the test suite stand in for it).
export const razorpayGateway = {
  getCredentials: () => resolveConfiguredGatewayCredentials('razor_pay'),

  async request({ method, path, body }) {
    const { keyId, keySecret } = await this.getCredentials();
    const response = await fetch(`https://api.razorpay.com/v1${path}`, {
      method,
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw createRazorpayRequestError(response.status, payload);
    }
    return payload;
  },

  async isValidSignature({ orderId, paymentId, signature }) {
    const { keySecret } = await this.getCredentials();
    const expected = crypto.createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex');
    const given = String(signature || '');
    return given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  },
};
