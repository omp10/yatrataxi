import { createDefaultBusinessSettings } from '../admin/data/defaultBusinessSettings.js';
import { AdminBusinessSetting } from '../admin/models/AdminBusinessSetting.js';

const defaultTransportRideSettings = createDefaultBusinessSettings().transport_ride || {};
const defaultBidRideSettings = createDefaultBusinessSettings().bid_ride || {};

const toPositiveNumber = (value, fallback) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : fallback;
};

export const getTransportRideSettings = async () => {
  const businessSettings = await AdminBusinessSetting.findOne({ scope: 'default' })
    .select('transport_ride')
    .lean();

  return {
    ...defaultTransportRideSettings,
    ...(businessSettings?.transport_ride || {}),
  };
};

export const getBidRideSettings = async () => {
  const businessSettings = await AdminBusinessSetting.findOne({ scope: 'default' })
    .select('bid_ride')
    .lean();

  return {
    ...defaultBidRideSettings,
    ...(businessSettings?.bid_ride || {}),
  };
};

export const resolveTransportDispatchConfig = async ({ bidding = false } = {}) => {
  const settings = await getTransportRideSettings();
  const driverSearchRadiusKm = toPositiveNumber(
    settings.driver_search_radius,
    toPositiveNumber(defaultTransportRideSettings.driver_search_radius, 5),
  );
  const retryWindowSeconds = toPositiveNumber(
    settings.trip_accept_reject_duration_for_driver,
    toPositiveNumber(defaultTransportRideSettings.trip_accept_reject_duration_for_driver, 15),
  );
  const regularSearchSeconds = toPositiveNumber(
    settings.maximum_time_for_find_drivers_for_regular_ride,
    toPositiveNumber(defaultTransportRideSettings.maximum_time_for_find_drivers_for_regular_ride, 300),
  );
  // Rides where drivers send bids have their own admin-set search time, how long the rider
  // may take to choose once the search ends, and the farthest a driver may be.
  const maxSearchSeconds = bidding
    ? toPositiveNumber(settings.maximum_time_for_find_drivers_for_bitting_ride, regularSearchSeconds)
    : regularSearchSeconds;
  const biddingDecisionSeconds = bidding
    ? toPositiveNumber(
        settings.maximum_time_for_accept_reject_bidding_ride,
        toPositiveNumber(defaultTransportRideSettings.maximum_time_for_accept_reject_bidding_ride, 60),
      )
    : 0;
  const biddingMaxDistanceMeters = bidding
    ? Math.round(toPositiveNumber(settings.bidding_ride_maximum_distance, 0) * 1000)
    : 0;

  return {
    settings,
    dispatchType: String(settings.trip_dispatch_type || defaultTransportRideSettings.trip_dispatch_type) === '2'
      ? 'broadcast'
      : 'one_by_one',
    baseDistanceMeters: Math.round(driverSearchRadiusKm * 1000),
    maxDistanceMeters: Math.round(driverSearchRadiusKm * 1000),
    retryWindowSeconds,
    retryDelayMs: Math.round(retryWindowSeconds * 1000),
    maxSearchSeconds,
    biddingDecisionMs: Math.round(biddingDecisionSeconds * 1000),
    biddingMaxDistanceMeters,
    maxAttempts: Math.max(1, Math.ceil(maxSearchSeconds / retryWindowSeconds)),
  };
};
