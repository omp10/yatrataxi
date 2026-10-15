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
  localStorage.removeItem(AGENT_TOKEN_KEY);
  localStorage.removeItem('agentInfo');
  localStorage.removeItem(AGENT_LOGIN_SESSION_KEY);

  try {
    sessionStorage.removeItem(AGENT_TOKEN_KEY);
    sessionStorage.removeItem('agentInfo');
    sessionStorage.removeItem(AGENT_LOGIN_SESSION_KEY);
  } catch {}

  const genericToken = localStorage.getItem('token') || '';
  const genericRole = String(localStorage.getItem('role') || '').toLowerCase();
  const tokenRole = String(getTokenPayload(genericToken)?.role || '').toLowerCase();
  if (!genericToken || genericRole === 'agent' || tokenRole === 'agent') {
    localStorage.removeItem('token');
  }

  try {
    const sessionToken = sessionStorage.getItem('token') || '';
    const sessionRole = String(sessionStorage.getItem('role') || '').toLowerCase();
    const sessionTokenRole = String(getTokenPayload(sessionToken)?.role || '').toLowerCase();
    if (!sessionToken || sessionRole === 'agent' || sessionTokenRole === 'agent') {
      sessionStorage.removeItem('token');
    }
  } catch {}

  if (String(localStorage.getItem('role') || '').toLowerCase() === 'agent') {
    localStorage.removeItem('role');
  }
  try {
    if (String(sessionStorage.getItem('role') || '').toLowerCase() === 'agent') {
      sessionStorage.removeItem('role');
    }
  } catch {}

  if (String(localStorage.getItem('chatRole') || '').toLowerCase() === 'agent') {
    localStorage.removeItem('chatRole');
  }
  try {
    if (String(sessionStorage.getItem('chatRole') || '').toLowerCase() === 'agent') {
      sessionStorage.removeItem('chatRole');
    }
  } catch {}
};

export const logoutAgent = (navigate) => {
  clearAgentSession();

  if (typeof navigate === 'function') {
    navigate('/taxi/agent/login', { replace: true });
    return;
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('agent:logout'));

    try {
      if (window.history && typeof window.history.replaceState === 'function') {
        window.history.replaceState(null, '', '/taxi/agent/login');
        window.dispatchEvent(new PopStateEvent('popstate'));
        return;
      }
    } catch {}

    window.location.replace('/taxi/agent/login');
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
  getWithdrawals: () => api.get('/agents/wallet/withdrawals', withAgentAuth()),
  requestWithdrawal: (payload) => api.post('/agents/wallet/withdrawals', payload, withAgentAuth()),
  getReferralSummary: () => api.get('/agents/referral', withAgentAuth()),
  getBookings: () => api.get('/agents/bookings', withAgentAuth()),
  resolveCustomer: (payload) => api.post('/agents/customers/resolve', payload, withAgentAuth()),
  createRideBooking: (payload) => api.post('/agents/bookings/rides', payload, withAgentAuth()),
  getAirports: () => api.get('/agents/airports', withAgentAuth()),
  getBusRoutes: () => api.get('/agents/buses/routes', withAgentAuth()),
  searchBuses: (params) => api.get('/agents/buses/search', withAgentAuth({ params })),
  getBusSeatLayout: (busServiceId, params) => api.get(`/agents/buses/${busServiceId}/seats`, withAgentAuth({ params })),
  createBusBooking: (payload) => api.post('/agents/buses/bookings', payload, withAgentAuth()),
  getPoolingRoutes: () => api.get('/agents/pooling/routes', withAgentAuth()),
  createPoolingBooking: (payload) => api.post('/agents/pooling/bookings', payload, withAgentAuth()),
};
