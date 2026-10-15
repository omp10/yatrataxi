import api from '../../../shared/api/axiosInstance';

export const entertainmentService = {
  getCategories: () => api.get('/users/entertainment/categories'),
  getVenues: (params = {}) => api.get('/users/entertainment/venues', { params }),
  getVenue: (venueId, visitDate) => api.get(`/users/entertainment/venues/${venueId}`, { params: { visitDate } }),
  createOrder: (payload) => api.post('/users/entertainment/bookings/order', payload),
  verifyPayment: (payload) => api.post('/users/entertainment/bookings/verify', payload),
  getMyBookings: (params = {}) => api.get('/users/entertainment/bookings', { params }),
  getBooking: (bookingId) => api.get(`/users/entertainment/bookings/${bookingId}`),
  cancelBooking: (bookingId, reason = '') => api.post(`/users/entertainment/bookings/${bookingId}/cancel`, { reason }),
  reviewBooking: (bookingId, payload) => api.post(`/users/entertainment/bookings/${bookingId}/review`, payload),
};
