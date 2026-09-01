import { Router } from 'express';
import { authenticate } from '../../../middlewares/authMiddleware.js';
import {
  createBanner,
  createPromoCode,
  deleteBanner,
  deleteNotification,
  deletePromoCode,
  getBanners,
  getNotifications,
  getPromoCodes,
  getPromotionsBootstrap,
  getPromotionsServiceLocations,
  getPromotionsUsers,
  pushBanner,
  sendNotification,
  togglePromoCodeStatus,
  updateBanner,
  updatePromoCode,
} from '../controllers/promotionsController.js';
import {
  createExploreDestination,
  deleteExploreDestination,
  getAdminExploreDestinations,
  getExploreDestinationById,
  getPublicExploreDestinations,
  toggleExploreDestinationStatus,
  updateExploreDestination,
} from '../controllers/exploreDestinationController.js';

export const promotionsRouter = Router();

// Public explore destinations endpoint (unauthenticated)
promotionsRouter.get('/user/explore-destinations', getPublicExploreDestinations);
promotionsRouter.get('/taxi/explore-destinations', getPublicExploreDestinations);
promotionsRouter.get('/explore-destinations', getPublicExploreDestinations);

promotionsRouter.use('/admin', authenticate(['admin']));

promotionsRouter.get('/admin/promotions/bootstrap', getPromotionsBootstrap);
promotionsRouter.get('/admin/promos', getPromoCodes);
promotionsRouter.post('/admin/promos', createPromoCode);
promotionsRouter.patch('/admin/promos/:id', updatePromoCode);
promotionsRouter.patch('/admin/promos/:id/toggle', togglePromoCodeStatus);
promotionsRouter.delete('/admin/promos/:id', deletePromoCode);
promotionsRouter.get('/admin/promos/users', getPromotionsUsers);
promotionsRouter.get('/admin/promos/service-locations', getPromotionsServiceLocations);

promotionsRouter.get('/admin/notifications', getNotifications);
promotionsRouter.post('/admin/notifications', sendNotification);
promotionsRouter.post('/admin/notifications/send', sendNotification);
promotionsRouter.delete('/admin/notifications/:id', deleteNotification);
promotionsRouter.delete('/admin/push-notifications/:id', deleteNotification);

promotionsRouter.get('/admin/banners', getBanners);
promotionsRouter.post('/admin/banners', createBanner);
promotionsRouter.patch('/admin/banners/:id', updateBanner);
promotionsRouter.delete('/admin/banners/:id', deleteBanner);
promotionsRouter.post('/admin/banners/:id/push', pushBanner);

// Explore Destinations (Explore India) Admin Routes
promotionsRouter.get('/admin/explore-destinations', getAdminExploreDestinations);
promotionsRouter.post('/admin/explore-destinations', createExploreDestination);
promotionsRouter.get('/admin/explore-destinations/:id', getExploreDestinationById);
promotionsRouter.patch('/admin/explore-destinations/:id', updateExploreDestination);
promotionsRouter.put('/admin/explore-destinations/:id', updateExploreDestination);
promotionsRouter.patch('/admin/explore-destinations/:id/toggle', toggleExploreDestinationStatus);
promotionsRouter.delete('/admin/explore-destinations/:id', deleteExploreDestination);

