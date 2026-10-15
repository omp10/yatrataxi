import api from '../../../shared/api/axiosInstance';

const base = '/admin/entertainment';

export const entertainmentAdminService = {
  getOverview: () => api.get(`${base}/overview`),
  getSettings: () => api.get(`${base}/settings`),
  saveSettings: (payload) => api.put(`${base}/settings`, payload),
  getCategories: () => api.get(`${base}/categories`),
  createCategory: (payload) => api.post(`${base}/categories`, payload),
  updateCategory: (id, payload) => api.patch(`${base}/categories/${id}`, payload),
  deleteCategory: (id) => api.delete(`${base}/categories/${id}`),
  getPartners: (params = {}) => api.get(`${base}/partners`, { params }),
  getPartner: (id) => api.get(`${base}/partners/${id}`),
  createPartner: (payload) => api.post(`${base}/partners`, payload),
  updatePartner: (id, payload) => api.patch(`${base}/partners/${id}`, payload),
  getVenues: (params = {}) => api.get(`${base}/venues`, { params }),
  getVenue: (id) => api.get(`${base}/venues/${id}`),
  createVenue: (payload) => api.post(`${base}/venues`, payload),
  updateVenue: (id, payload) => api.patch(`${base}/venues/${id}`, payload),
  getBookings: (params = {}) => api.get(`${base}/bookings`, { params }),
  getBooking: (id) => api.get(`${base}/bookings/${id}`),
  cancelBooking: (id, reason) => api.post(`${base}/bookings/${id}/cancel`, { reason }),
  getWithdrawals: (params = {}) => api.get(`${base}/withdrawals`, { params }),
  approveWithdrawal: (id, adminNote = '') => api.patch(`${base}/withdrawals/${id}/approve`, { adminNote }),
  rejectWithdrawal: (id, adminNote = '') => api.patch(`${base}/withdrawals/${id}/reject`, { adminNote }),
};
