import { Router } from 'express';
import { asyncHandler } from '../../../../utils/asyncHandler.js';
import { authenticate } from '../../middlewares/authMiddleware.js';
import {
  createAgentBusBooking,
  createAgentRideBooking,
  createAgentWithdrawalRequest,
  listAgentWithdrawalRequests,
  completeAgentOnboarding,
  getAgentDashboard,
  getAgentOnboardingDocuments,
  getAgentProfile,
  getAgentReferralSummary,
  getAgentWallet,
  listAgentBookings,
  listAgentBusRoutes,
  sendAgentLoginOtp,
  loginAgent,
  resolveAgentCustomer,
  searchAgentBuses,
  getAgentBusSeatLayout,
  updateAgentProfile,
  saveAgentFcmToken,
} from '../controllers/agentController.js';

export const agentRouter = Router();

agentRouter.post('/auth/send-otp', asyncHandler(sendAgentLoginOtp));
agentRouter.post('/auth/verify-otp', asyncHandler(loginAgent));
agentRouter.get('/onboarding/documents', asyncHandler(getAgentOnboardingDocuments));
agentRouter.post('/onboarding/complete', asyncHandler(completeAgentOnboarding));
agentRouter.post('/login', asyncHandler(loginAgent));
agentRouter.get('/me', authenticate(['agent']), asyncHandler(getAgentProfile));
agentRouter.patch('/me', authenticate(['agent']), asyncHandler(updateAgentProfile));
agentRouter.get('/dashboard', authenticate(['agent']), asyncHandler(getAgentDashboard));
agentRouter.get('/wallet', authenticate(['agent']), asyncHandler(getAgentWallet));
agentRouter.get('/wallet/withdrawals', authenticate(['agent']), asyncHandler(listAgentWithdrawalRequests));
agentRouter.post('/wallet/withdrawals', authenticate(['agent']), asyncHandler(createAgentWithdrawalRequest));
agentRouter.get('/referral', authenticate(['agent']), asyncHandler(getAgentReferralSummary));
agentRouter.get('/bookings', authenticate(['agent']), asyncHandler(listAgentBookings));
agentRouter.post('/customers/resolve', authenticate(['agent']), asyncHandler(resolveAgentCustomer));
agentRouter.post('/bookings/rides', authenticate(['agent']), asyncHandler(createAgentRideBooking));
agentRouter.get('/buses/routes', authenticate(['agent']), asyncHandler(listAgentBusRoutes));
agentRouter.get('/buses/search', authenticate(['agent']), asyncHandler(searchAgentBuses));
agentRouter.get('/buses/:id/seats', authenticate(['agent']), asyncHandler(getAgentBusSeatLayout));
agentRouter.post('/buses/bookings', authenticate(['agent']), asyncHandler(createAgentBusBooking));
agentRouter.post('/fcm-token', authenticate(['agent']), asyncHandler(saveAgentFcmToken));
