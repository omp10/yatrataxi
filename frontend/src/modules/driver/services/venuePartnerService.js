import api from '../../../shared/api/axiosInstance';

// Venue partner portal (role `venue_partner`, signed in through the driver app login).
export const venuePartnerService = {
  getMe: () => api.get('/drivers/venue/me'),
  updatePayout: (payout) => api.patch('/drivers/venue/me/payout', { payout }),
  getDashboard: () => api.get('/drivers/venue/dashboard'),
  getCategories: () => api.get('/drivers/venue/categories'),
  getVenues: () => api.get('/drivers/venue/venues'),
  getVenue: (venueId) => api.get(`/drivers/venue/venues/${venueId}`),
  createVenue: (payload) => api.post('/drivers/venue/venues', payload),
  updateVenue: (venueId, payload) => api.put(`/drivers/venue/venues/${venueId}`, payload),
  getBookings: (params = {}) => api.get('/drivers/venue/bookings', { params }),
  checkIn: (qrValue) => api.post('/drivers/venue/check-in', { qrValue }),
  getWallet: () => api.get('/drivers/venue/wallet'),
  requestWithdrawal: (amount, note = '') => api.post('/drivers/venue/wallet/withdrawals', { amount, note }),
};
