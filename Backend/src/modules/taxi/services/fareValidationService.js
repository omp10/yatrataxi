import mongoose from 'mongoose';
import { ApiError } from '../../../utils/ApiError.js';
import { SetPrice } from '../admin/models/SetPrice.js';
import { Vehicle } from '../admin/models/Vehicle.js';
import { ExploreDestination } from '../admin/promotions/models/ExploreDestination.js';

// Client and server both round to the rupee; this absorbs that rounding only.
const FARE_ROUNDING_TOLERANCE = 1;

const EARTH_RADIUS_KM = 6371;

const toRadians = (value) => (Number(value) * Math.PI) / 180;

// Straight-line distance. A road route is never shorter, so a fare computed on it
// is a floor every honest booking clears.
export const straightLineDistanceKm = (fromCoords = [], toCoords = []) => {
  const [fromLng, fromLat] = fromCoords.map(Number);
  const [toLng, toLat] = toCoords.map(Number);

  if (![fromLng, fromLat, toLng, toLat].every(Number.isFinite)) {
    return 0;
  }

  const latDelta = toRadians(toLat - fromLat);
  const lngDelta = toRadians(toLng - fromLng);
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(lngDelta / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const toNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

// Mirrors the ride booking screen's estimate (SelectVehicle calculateEstimatedFare).
export const calculateRideFareFromRule = ({ rule, distanceKm, durationMinutes = 0 }) => {
  const basePrice = toNumber(rule?.base_price);
  const baseDistance = Math.max(0, toNumber(rule?.base_distance));
  const pricePerDistance = toNumber(rule?.price_per_distance);
  const timePrice = toNumber(rule?.time_price);
  const serviceTax = toNumber(rule?.service_tax);
  const safeDistanceKm = Math.max(0, toNumber(distanceKm));
  const isWithinBaseDistance = baseDistance > 0 && safeDistanceKm <= baseDistance;
  const subtotal = isWithinBaseDistance
    ? basePrice
    : basePrice
      + Math.max(0, safeDistanceKm - baseDistance) * pricePerDistance
      + Math.max(0, toNumber(durationMinutes)) * timePrice;

  if (subtotal <= 0) {
    return 0;
  }

  return Math.max(0, Math.round(subtotal + (subtotal * serviceTax) / 100));
};

const findActiveRideRules = async ({ vehicleTypeId, transportTypes }) => SetPrice.find({
  vehicle_type: vehicleTypeId,
  active: 1,
  status: 'active',
  transport_type: { $in: transportTypes },
  pricing_scope: { $in: ['ride', null] },
}).lean();

// Cheapest configured rate for this vehicle over the straight-line distance with no
// time charge. Using the cheapest rule keeps a booking from being rejected just
// because the client matched a different (pricier) service-location rule.
const minimumRideFare = async ({ vehicleTypeId, transportTypes, distanceKm }) => {
  const rules = await findActiveRideRules({ vehicleTypeId, transportTypes });
  const fares = rules
    .map((rule) => calculateRideFareFromRule({ rule, distanceKm, durationMinutes: 0 }))
    .filter((fare) => fare > 0);

  return fares.length ? Math.min(...fares) : null;
};

const minimumParcelFare = async ({ vehicleTypeId, distanceKm }) => {
  const vehicle = await Vehicle.findById(vehicleTypeId).select('delivery_distance_pricing').lean();
  const pricing = vehicle?.delivery_distance_pricing || {};
  const basePrice = toNumber(pricing.base_price);
  const freeDistance = toNumber(pricing.free_distance);
  const distancePrice = toNumber(pricing.distance_price);
  const hasVehiclePricing = Boolean(pricing.enabled) || basePrice > 0 || distancePrice > 0;

  // Same formula as the parcel booking screen (SenderReceiverDetails calculateVehicleFare).
  if (hasVehiclePricing) {
    return Math.max(0, Math.round(basePrice + Math.max(0, distanceKm - freeDistance) * distancePrice));
  }

  return minimumRideFare({ vehicleTypeId, transportTypes: ['delivery', 'both'], distanceKm });
};

export const resolveIntercityPackageRow = async ({ packageId, vehicleTypeId }) => {
  if (!packageId || !mongoose.Types.ObjectId.isValid(String(packageId))) {
    return null;
  }

  const packagePrice = await SetPrice.findOne({
    _id: packageId,
    pricing_scope: 'package',
    active: 1,
    status: 'active',
  }).lean();

  if (!packagePrice) {
    throw new ApiError(400, 'Selected outstation package is not available');
  }

  const row = (packagePrice.package_vehicle_prices || []).find(
    (item) => String(item?.vehicle_type || '') === String(vehicleTypeId),
  );

  if (!row || toNumber(row.base_price) <= 0) {
    throw new ApiError(400, 'Selected vehicle is not priced for this outstation package');
  }

  return { packagePrice, row };
};

const isRoundTrip = (tripType) => String(tripType || '').trim().toLowerCase().replace(/[\s_-]+/g, '') === 'roundtrip';

export const resolveSpiritualDestinationFare = async ({ destinationId, vehicleTypeId }) => {
  if (!destinationId || !mongoose.Types.ObjectId.isValid(String(destinationId))) {
    throw new ApiError(400, 'Select a pilgrimage destination');
  }

  const destination = await ExploreDestination.findOne({ _id: destinationId, active: true }).lean();
  if (!destination) {
    throw new ApiError(400, 'Selected pilgrimage destination is not available');
  }

  const fare = toNumber(destination.vehicleFares?.[String(vehicleTypeId)]);

  if (fare <= 0) {
    throw new ApiError(400, 'Selected vehicle is not priced for this destination');
  }

  return { destination, fare: Math.round(fare) };
};

const minimumAirportFare = async ({ vehicleTypeId }) => {
  const rules = await SetPrice.find({
    vehicle_type: vehicleTypeId,
    active: 1,
    status: 'active',
    enable_airport_ride: true,
  }).lean();

  const fares = rules
    .map((rule) => toNumber(rule.base_price) + toNumber(rule.airport_surge) + toNumber(rule.support_airport_fee))
    .filter((fare) => fare > 0);

  return fares.length ? Math.round(Math.min(...fares)) : null;
};

/**
 * Prices a booking from the admin's configuration. Fixed-price products
 * (pilgrimage destinations, outstation packages, airport transfers) return
 * { fixedFare }, which replaces whatever the client sent. Metered rides and parcels
 * are estimated on the booking screen from the road route, so the server returns
 * { minimumFare }, the floor a genuine estimate always clears.
 */
export const resolveServerFare = async ({
  serviceType,
  fareContextType = '',
  destinationId = null,
  vehicleTypeId,
  pickupCoords,
  dropCoords,
  intercity = {},
}) => {
  if (!vehicleTypeId) {
    throw new ApiError(400, 'vehicleTypeId is required');
  }

  const distanceKm = straightLineDistanceKm(pickupCoords, dropCoords);
  const contextType = String(fareContextType || '').trim().toLowerCase();

  if (contextType === 'spiritual') {
    const { fare } = await resolveSpiritualDestinationFare({ destinationId, vehicleTypeId });
    return { fixedFare: fare };
  }

  if (contextType === 'airport') {
    return { fixedFare: await minimumAirportFare({ vehicleTypeId }) };
  }

  if (serviceType === 'intercity' && intercity?.packageId) {
    const { row } = await resolveIntercityPackageRow({ packageId: intercity.packageId, vehicleTypeId });
    if (!isRoundTrip(intercity.tripType)) {
      return { fixedFare: Math.round(toNumber(row.base_price)) };
    }

    // Round-trip prices are set by the admin per package and vehicle.
    const roundTripFare = toNumber(row.round_trip_price);
    if (roundTripFare <= 0) {
      throw new ApiError(400, 'Round trip is not offered for this vehicle on this package');
    }
    return { fixedFare: Math.round(roundTripFare) };
  }

  if (serviceType === 'parcel') {
    return { minimumFare: await minimumParcelFare({ vehicleTypeId, distanceKm }) };
  }

  return { minimumFare: await minimumRideFare({ vehicleTypeId, transportTypes: ['taxi', 'both'], distanceKm }) };
};

// Returns the fare to book with: the server price for fixed-price products, or the
// client's estimate once it is confirmed not to undercut the configured rate.
export const resolveBookableFare = async ({ fare, ...context }) => {
  const { fixedFare, minimumFare } = await resolveServerFare(context);
  const serverFare = fixedFare ?? minimumFare;

  if (!Number.isFinite(serverFare) || serverFare === null || serverFare <= 0) {
    throw new ApiError(400, 'Pricing is not configured for this vehicle and service');
  }

  if (fixedFare !== undefined) {
    return fixedFare;
  }

  if (Number(fare) + FARE_ROUNDING_TOLERANCE < minimumFare) {
    throw new ApiError(400, `Fare is below the configured price for this trip (minimum Rs ${minimumFare})`);
  }

  return Number(fare);
};
