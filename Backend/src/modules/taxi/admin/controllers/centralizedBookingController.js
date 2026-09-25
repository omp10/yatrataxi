import { asyncHandler } from '../../../../utils/asyncHandler.js';
import * as bookingService from '../services/centralizedBookingService.js';

const ok = (res, data, message = 'Success') => res.json({ success: true, message, data });

export const getCentralizedBookings = asyncHandler(async (req, res) => {
  const result = await bookingService.listCentralizedBookings(req.query);
  return ok(res, result, 'Centralized bookings fetched successfully');
});

export const getCentralizedBookingStats = asyncHandler(async (_req, res) => {
  const stats = await bookingService.getCentralizedBookingStats();
  return ok(res, stats, 'Booking stats fetched successfully');
});

export const updateCentralizedBookingStatus = asyncHandler(async (req, res) => {
  const { serviceType, id } = req.params;
  const { status, adminNote } = req.body;
  const updated = await bookingService.updateCentralizedBookingStatus(serviceType, id, status, adminNote);
  return ok(res, updated, `Booking ${status} successfully`);
});
