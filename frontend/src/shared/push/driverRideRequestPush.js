export const DRIVER_RIDE_REQUEST_PUSH_EVENT = 'driver:ride-request-push';

const parsePayload = (payload) => {
  if (typeof payload !== 'string') return payload || {};

  try {
    return JSON.parse(payload);
  } catch {
    return {};
  }
};

const parsePoint = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export const normalizeDriverRideRequestPush = (payload = {}) => {
  const parsedPayload = parsePayload(payload);
  const data = parsePayload(parsedPayload?.data || parsedPayload?.message?.data || parsedPayload);

  if (String(data?.type || '').toLowerCase() !== 'ride_request' || !data?.rideId) {
    return null;
  }

  return {
    ...data,
    type: data.serviceType || 'ride',
    rideId: String(data.rideId),
    fare: Number(data.fare || 0),
    estimatedDistanceMeters: Number(data.estimatedDistanceMeters || 0),
    estimatedDurationMinutes: Number(data.estimatedDurationMinutes || 0),
    acceptRejectDurationSeconds: Number(data.acceptRejectDurationSeconds || data.expiresInSeconds || 0),
    pickupLocation: parsePoint(data.pickupLocation),
    dropLocation: parsePoint(data.dropLocation),
    source: 'fcm',
  };
};

export const dispatchDriverRideRequestPush = (payload) => {
  const request = normalizeDriverRideRequestPush(payload);
  if (!request || typeof window === 'undefined') return false;

  window.dispatchEvent(new CustomEvent(DRIVER_RIDE_REQUEST_PUSH_EVENT, {
    detail: request,
  }));
  return true;
};
