import jwt from 'jsonwebtoken';
import { env } from '../../../config/env.js';
import { ApiError } from '../../../utils/ApiError.js';

const BUS_CHECK_IN_TOKEN_TYPE = 'bus_ticket_checkin';

export const signBusCheckInToken = (booking = {}) => {
  const bookingId = String(booking?._id || booking?.id || '').trim();
  if (!bookingId) {
    throw new ApiError(400, 'Bus booking id is required to generate QR');
  }

  return jwt.sign(
    {
      type: BUS_CHECK_IN_TOKEN_TYPE,
      bookingId,
      bookingCode: booking.bookingCode || '',
      tokenVersion: Number(booking?.checkIn?.tokenVersion || 1),
    },
    env.jwtSecret,
    { expiresIn: '30d' },
  );
};

export const verifyBusCheckInToken = (token = '') => {
  const rawToken = String(token || '').trim();
  if (!rawToken) {
    throw new ApiError(400, 'Ticket QR token is required');
  }

  try {
    const payload = jwt.verify(rawToken, env.jwtSecret);
    if (payload?.type !== BUS_CHECK_IN_TOKEN_TYPE || !payload?.bookingId) {
      throw new ApiError(400, 'Invalid ticket QR');
    }
    return payload;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(401, 'Ticket QR is invalid or expired');
  }
};
