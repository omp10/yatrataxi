import api from '../../../shared/api/axiosInstance';

const AGENT_TOKEN_KEY = 'agentToken';
const AGENT_LOGIN_SESSION_KEY = 'agentLoginSession';

const decodeBase64Url = (value) => {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (normalized.length % 4)) % 4;
  return normalized + '='.repeat(padding);
};

const getTokenPayload = (token) => {
  if (!token || typeof token !== 'string') {
    return null;
  }

  try {
    const payload = token.split('.')[1];
    if (!payload) {
      return null;
    }

    return JSON.parse(atob(decodeBase64Url(payload)));
  } catch {
    return null;
  }
};

export const getLocalAgentToken = () => {
  const direct = localStorage.getItem(AGENT_TOKEN_KEY) || '';
  if (direct) {
    return direct;
  }

  const generic = localStorage.getItem('token') || '';
  return getTokenPayload(generic)?.role === 'agent' ? generic : '';
};

export const persistAgentSession = (payload = {}) => {
  const token = payload?.token || '';
  const agent = payload?.agent || {};

  localStorage.setItem(AGENT_TOKEN_KEY, token);
  localStorage.setItem('token', token);
  localStorage.setItem('role', 'agent');
  localStorage.setItem('agentInfo', JSON.stringify(agent));
};

export const clearAgentSession = () => {
  const storedAgentToken = localStorage.getItem(AGENT_TOKEN_KEY) || '';
  const genericToken = localStorage.getItem('token') || '';

  localStorage.removeItem(AGENT_TOKEN_KEY);
  localStorage.removeItem('agentInfo');

  if (storedAgentToken && genericToken === storedAgentToken) {
    localStorage.removeItem('token');
  }

  if (String(localStorage.getItem('role') || '').toLowerCase() === 'agent') {
    localStorage.removeItem('role');
  }
};

export const getStoredAgentLoginSession = () => {
  try {
    const raw = localStorage.getItem(AGENT_LOGIN_SESSION_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveAgentLoginSession = (session = {}) => {
  const nextSession = {
    ...getStoredAgentLoginSession(),
    ...session,
  };

  localStorage.setItem(AGENT_LOGIN_SESSION_KEY, JSON.stringify(nextSession));
  return nextSession;
};

export const clearAgentLoginSession = () => {
  localStorage.removeItem(AGENT_LOGIN_SESSION_KEY);
};

const withAgentAuth = (config = {}) => {
  const token = getLocalAgentToken();
  if (!token) {
    return config;
  }

  return {
    ...config,
    headers: {
      ...(config.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  };
};

export const agentService = {
  sendLoginOtp: (payload) => api.post('/agents/auth/send-otp', payload),
  verifyLoginOtp: (payload) => api.post('/agents/auth/verify-otp', payload),
  getOnboardingDocuments: () => api.get('/agents/onboarding/documents'),
  completeOnboarding: (payload) => api.post('/agents/onboarding/complete', payload),
  login: (payload) => api.post('/agents/login', payload),
  getProfile: () => api.get('/agents/me', withAgentAuth()),
  updateProfile: (payload) => api.patch('/agents/me', payload, withAgentAuth()),
  getDashboard: () => api.get('/agents/dashboard', withAgentAuth()),
  getWallet: () => api.get('/agents/wallet', withAgentAuth()),
  getReferralSummary: () => api.get('/agents/referral', withAgentAuth()),
  getBookings: () => api.get('/agents/bookings', withAgentAuth()),
  resolveCustomer: (payload) => api.post('/agents/customers/resolve', payload, withAgentAuth()),
  createRideBooking: (payload) => api.post('/agents/bookings/rides', payload, withAgentAuth()),
  getBusRoutes: () => api.get('/agents/buses/routes', withAgentAuth()),
  searchBuses: (params) => api.get('/agents/buses/search', withAgentAuth({ params })),
  getBusSeatLayout: (busServiceId, params) => api.get(`/agents/buses/${busServiceId}/seats`, withAgentAuth({ params })),
  createBusBooking: (payload) => api.post('/agents/buses/bookings', payload, withAgentAuth()),
};
