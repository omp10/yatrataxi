import { Router } from 'express';
import { ApiError } from '../../../../utils/ApiError.js';
import { asyncHandler } from '../../../../utils/asyncHandler.js';
import { hasAdminPermission } from '../../admin/services/adminAccessService.js';
import { authenticate, authenticateOrResolveUser } from '../../middlewares/authMiddleware.js';
import * as admin from '../controllers/adminEntertainmentController.js';
import * as agent from '../controllers/agentEntertainmentController.js';
import * as partner from '../controllers/partnerEntertainmentController.js';
import * as user from '../controllers/userEntertainmentController.js';

export const entertainmentModuleRouter = Router();

// ───── customer app
const userRouter = Router();
userRouter.get('/categories', asyncHandler(user.listCategories));
userRouter.get('/venues', asyncHandler(user.listVenues));
userRouter.get('/venues/:id', asyncHandler(user.getVenue));
userRouter.post('/bookings/order', authenticateOrResolveUser(['user']), asyncHandler(user.createOrder));
userRouter.post('/bookings/verify', authenticateOrResolveUser(['user']), asyncHandler(user.verifyPayment));
userRouter.get('/bookings', authenticateOrResolveUser(['user']), asyncHandler(user.listMyBookings));
userRouter.get('/bookings/:id', authenticateOrResolveUser(['user']), asyncHandler(user.getMyBooking));
userRouter.post('/bookings/:id/cancel', authenticateOrResolveUser(['user']), asyncHandler(user.cancelMyBooking));
userRouter.post('/bookings/:id/review', authenticateOrResolveUser(['user']), asyncHandler(user.reviewMyBooking));
entertainmentModuleRouter.use('/users/entertainment', userRouter);

// ───── venue partner portal (inside the driver/delivery app login)
const partnerRouter = Router();
partnerRouter.use(authenticate(['venue_partner']));
partnerRouter.get('/me', asyncHandler(partner.getMe));
partnerRouter.patch('/me/payout', asyncHandler(partner.updatePayout));
partnerRouter.get('/dashboard', asyncHandler(partner.getDashboard));
partnerRouter.get('/categories', asyncHandler(partner.listCategories));
partnerRouter.get('/venues', asyncHandler(partner.listMyVenues));
partnerRouter.post('/venues', asyncHandler(partner.createMyVenue));
partnerRouter.get('/venues/:id', asyncHandler(partner.getMyVenue));
partnerRouter.put('/venues/:id', asyncHandler(partner.updateMyVenue));
partnerRouter.get('/bookings', asyncHandler(partner.listMyBookings));
partnerRouter.post('/check-in', asyncHandler(partner.checkIn));
partnerRouter.get('/wallet', asyncHandler(partner.getWallet));
partnerRouter.post('/wallet/withdrawals', asyncHandler(partner.requestWithdrawal));
entertainmentModuleRouter.use('/drivers/venue', partnerRouter);

// ───── agent desk
const agentRouter = Router();
agentRouter.use(authenticate(['agent']));
agentRouter.get('/venues', asyncHandler(agent.listVenues));
agentRouter.get('/venues/:id', asyncHandler(agent.getVenue));
agentRouter.post('/bookings/order', asyncHandler(agent.createOrder));
agentRouter.post('/bookings/verify', asyncHandler(agent.verifyPayment));
agentRouter.get('/bookings', asyncHandler(agent.listBookings));
agentRouter.get('/bookings/:id', asyncHandler(agent.getBooking));
entertainmentModuleRouter.use('/agents/entertainment', agentRouter);

// ───── admin panel
const requireEntertainmentPermission = (req, _res, next) => {
  if (!hasAdminPermission(req.auth?.admin, 'entertainment.view')) {
    next(new ApiError(403, 'You do not have access to Entertainment'));
    return;
  }
  next();
};

const adminRouter = Router();
adminRouter.use(authenticate(['admin']), requireEntertainmentPermission);
adminRouter.get('/overview', asyncHandler(admin.getOverview));
adminRouter.get('/settings', asyncHandler(admin.getSettings));
adminRouter.put('/settings', asyncHandler(admin.updateSettings));
adminRouter.get('/categories', asyncHandler(admin.listCategories));
adminRouter.post('/categories', asyncHandler(admin.createCategory));
adminRouter.patch('/categories/:id', asyncHandler(admin.updateCategory));
adminRouter.delete('/categories/:id', asyncHandler(admin.deleteCategory));
adminRouter.get('/partners', asyncHandler(admin.listPartners));
adminRouter.post('/partners', asyncHandler(admin.createPartner));
adminRouter.get('/partners/:id', asyncHandler(admin.getPartner));
adminRouter.patch('/partners/:id', asyncHandler(admin.updatePartner));
adminRouter.get('/venues', asyncHandler(admin.listVenues));
adminRouter.post('/venues', asyncHandler(admin.createVenue));
adminRouter.get('/venues/:id', asyncHandler(admin.getVenue));
adminRouter.patch('/venues/:id', asyncHandler(admin.updateVenue));
adminRouter.get('/bookings', asyncHandler(admin.listBookings));
adminRouter.get('/bookings/:id', asyncHandler(admin.getBooking));
adminRouter.post('/bookings/:id/cancel', asyncHandler(admin.cancelBookingAsAdmin));
adminRouter.get('/withdrawals', asyncHandler(admin.listWithdrawals));
adminRouter.patch('/withdrawals/:id/approve', asyncHandler(admin.approveWithdrawal));
adminRouter.patch('/withdrawals/:id/reject', asyncHandler(admin.rejectWithdrawal));
entertainmentModuleRouter.use('/admin/entertainment', adminRouter);
