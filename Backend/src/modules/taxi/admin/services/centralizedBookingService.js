import mongoose from 'mongoose';
import '../../user/models/User.js';
import '../../driver/models/Driver.js';
import '../models/PoolingRoute.js';
import '../models/PoolingVehicle.js';
import '../models/BusService.js';
import '../models/ServiceStore.js';
import { Ride } from '../../user/models/Ride.js';
import { PoolingBooking } from '../models/PoolingBooking.js';
import { BusBooking } from '../../user/models/BusBooking.js';
import { RentalBookingRequest } from '../models/RentalBookingRequest.js';
import { ApiError } from '../../../../utils/ApiError.js';

// Helper to normalize dates
const parseDateRange = (startDate, endDate) => {
  const filter = {};
  if (startDate) {
    const s = new Date(startDate);
    if (!Number.isNaN(s.getTime())) {
      s.setHours(0, 0, 0, 0);
      filter.$gte = s;
    }
  }
  if (endDate) {
    const e = new Date(endDate);
    if (!Number.isNaN(e.getTime())) {
      e.setHours(23, 59, 59, 999);
      filter.$lte = e;
    }
  }
  return Object.keys(filter).length > 0 ? filter : null;
};

// Map Ride document to unified booking
const mapRideToUnified = (ride) => {
  const isAgent = Boolean(ride.agentMeta?.bookedByAgentId);
  const isSpiritual =
    String(ride.dropAddress || '').toLowerCase().includes('temple') ||
    String(ride.dropAddress || '').toLowerCase().includes('darshan') ||
    String(ride.dropAddress || '').toLowerCase().includes('jyotirlinga') ||
    String(ride.dropAddress || '').toLowerCase().includes('mahakal') ||
    String(ride.dropAddress || '').toLowerCase().includes('omkareshwar');
  const isAirport =
    ride.transport_type === 'airport' ||
    String(ride.pickupAddress || '').toLowerCase().includes('airport') ||
    String(ride.dropAddress || '').toLowerCase().includes('airport');
  const isOneWay = ride.serviceType === 'intercity' || Boolean(ride.intercity?.toCity);
  const isParcel = ride.serviceType === 'parcel';

  let detectedService = 'taxi';
  let serviceLabel = 'City Cab';
  let serviceIcon = '🚖';

  if (isParcel) {
    detectedService = 'parcel';
    serviceLabel = 'Parcel Delivery';
    serviceIcon = '📦';
  } else if (isSpiritual) {
    detectedService = 'spiritual';
    serviceLabel = 'Spiritual Tour';
    serviceIcon = '🛕';
  } else if (isAirport) {
    detectedService = 'airport';
    serviceLabel = 'Airport Cab';
    serviceIcon = '✈️';
  } else if (isOneWay) {
    detectedService = 'oneway';
    serviceLabel = 'One-Way Outstation';
    serviceIcon = '🛣️';
  }

  // Normalize status
  const rawStatus = String(ride.status || '').toLowerCase();
  const liveStatus = String(ride.liveStatus || '').toLowerCase();
  let status = 'confirmed';
  if (rawStatus === 'completed') status = 'completed';
  else if (rawStatus === 'cancelled') status = 'cancelled';
  else if (rawStatus === 'ongoing' || liveStatus === 'started' || liveStatus === 'arriving' || liveStatus === 'accepted') status = 'ongoing';
  else if (rawStatus === 'pending' || rawStatus === 'requested') status = 'pending';

  const customerName =
    ride.agentMeta?.customerName ||
    ride.userId?.name ||
    ride.parcel?.senderName ||
    'Customer';
  const customerPhone =
    ride.agentMeta?.customerPhone ||
    ride.userId?.phone ||
    ride.parcel?.senderMobile ||
    '--';

  const driverName = ride.driverId?.name || (ride.driverId ? 'Assigned Driver' : 'Searching Driver');
  const driverPhone = ride.driverId?.phone || '';
  const vehicleDetails = ride.driverId?.vehicleNumber
    ? `${ride.driverId.vehicleNumber} (${ride.driverId.vehicleType || 'Cab'})`
    : (ride.vehicleIconType || 'Taxi');

  const fare = Number(ride.fare || ride.finalFare || 0);

  return {
    id: String(ride._id),
    rawId: ride._id,
    bookingCode: `RIDE-${String(ride._id).slice(-6).toUpperCase()}`,
    serviceType: detectedService,
    serviceLabel,
    serviceIcon,
    customer: {
      name: customerName,
      phone: customerPhone,
      email: ride.userId?.email || '',
    },
    driverOrProvider: {
      name: driverName,
      phone: driverPhone,
      vehicle: vehicleDetails,
      type: ride.driverId?.vehicleType || 'Cab',
    },
    route: {
      pickup: ride.pickupAddress || 'Indore',
      drop: ride.dropAddress || 'Destination',
      distance: ride.estimatedDistanceMeters ? `${Math.round(ride.estimatedDistanceMeters / 1000)} km` : (ride.intercity?.distance ? `${ride.intercity.distance} km` : '--'),
    },
    fare,
    paymentMethod: String(ride.paymentMethod || ride.payment_opt || 'CASH').toUpperCase(),
    paymentStatus: (status === 'completed' || ride.paymentStatus === 'paid' || ride.paymentStatus === 'completed') ? 'PAID' : (status === 'cancelled' ? 'REFUNDED' : 'PENDING'),
    status,
    source: isAgent ? 'agent' : 'user',
    agentMeta: isAgent
      ? {
          agentId: ride.agentMeta?.bookedByAgentId,
          agentName: ride.agentMeta?.agentName || 'Travel Agent',
          commissionAmount: Number(ride.agentMeta?.commissionAmount || (fare * 0.05).toFixed(2)),
          commissionStatus: 'CREDITED',
        }
      : null,
    createdAt: ride.createdAt,
    scheduledAt: ride.scheduledAt || ride.intercity?.travelDate || ride.createdAt,
  };
};

// Map PoolingBooking document to unified booking
const mapPoolingToUnified = (booking) => {
  const isAgent = Boolean(booking.agentMeta?.bookedByAgentId);
  const rawStatus = String(booking.bookingStatus || booking.status || 'confirmed').toLowerCase();
  let status = 'confirmed';
  if (rawStatus === 'completed') status = 'completed';
  else if (rawStatus === 'cancelled') status = 'cancelled';
  else if (rawStatus === 'ongoing' || rawStatus === 'active') status = 'ongoing';
  else if (rawStatus === 'pending') status = 'pending';

  const customerName =
    booking.passenger?.name ||
    booking.agentMeta?.customerName ||
    booking.user?.name ||
    'Passenger';
  const customerPhone =
    booking.passenger?.phone ||
    booking.agentMeta?.customerPhone ||
    booking.user?.phone ||
    '--';

  const fare = Number(booking.fare || booking.totalFare || 0);

  return {
    id: String(booking._id),
    rawId: booking._id,
    bookingCode: booking.bookingId || `POOL-${String(booking._id).slice(-6).toUpperCase()}`,
    serviceType: 'pooling',
    serviceLabel: 'Shared Taxi (Pooling)',
    serviceIcon: '🤝',
    customer: {
      name: customerName,
      phone: customerPhone,
      email: booking.passenger?.email || booking.user?.email || '',
      seats: booking.seatsBooked || 1,
    },
    driverOrProvider: {
      name: booking.driver?.name || (booking.route?.driverName || 'Route Captain'),
      phone: booking.driver?.phone || '',
      vehicle: booking.vehicle?.model ? `${booking.vehicle.model} (${booking.vehicle.registrationNumber || 'Car'})` : 'Shared Car',
      type: 'Shared Cab',
    },
    route: {
      pickup: booking.pickupStopId || booking.pickupLocation || booking.route?.startLocation?.name || 'Pickup Stop',
      drop: booking.dropStopId || booking.dropLocation || booking.route?.endLocation?.name || 'Drop Stop',
      routeName: booking.route?.routeName || 'Intercity Pooling Route',
    },
    fare,
    paymentMethod: String(booking.paymentMethod || 'CASH').toUpperCase(),
    paymentStatus: String(booking.paymentStatus || 'PENDING').toUpperCase(),
    status,
    source: isAgent ? 'agent' : 'user',
    agentMeta: isAgent
      ? {
          agentId: booking.agentMeta?.bookedByAgentId,
          agentName: booking.agentMeta?.agentName || 'Travel Desk Agent',
          commissionAmount: Number(booking.agentMeta?.commissionAmount || (fare * 0.04).toFixed(2)),
          commissionStatus: booking.agentMeta?.commissionReversed ? 'REVERSED' : 'CREDITED',
        }
      : null,
    createdAt: booking.createdAt,
    scheduledAt: booking.departureTime || booking.scheduledAt || booking.createdAt,
  };
};

// Map BusBooking document to unified booking
const mapBusToUnified = (booking) => {
  const isAgent = Boolean(booking.agentMeta?.bookedByAgentId || booking.bookingSource === 'agent');
  const rawStatus = String(booking.status || 'confirmed').toLowerCase();
  let status = 'confirmed';
  if (rawStatus === 'completed') status = 'completed';
  else if (rawStatus === 'cancelled') status = 'cancelled';
  else if (rawStatus === 'ongoing') status = 'ongoing';
  else if (rawStatus === 'pending') status = 'pending';

  const customerName = booking.passenger?.name || booking.userId?.name || 'Bus Passenger';
  const customerPhone = booking.passenger?.phone || booking.userId?.phone || '--';
  const fare = Number(booking.amount || 0);

  const busService = booking.busServiceId || booking.busService || {};

  const seatText = Array.isArray(booking.seatLabels) && booking.seatLabels.length > 0
    ? booking.seatLabels.join(', ')
    : (Array.isArray(booking.seatIds) ? booking.seatIds.join(', ') : 'Seats');

  return {
    id: String(booking._id),
    rawId: booking._id,
    bookingCode: booking.bookingCode || `BUS-${String(booking._id).slice(-6).toUpperCase()}`,
    serviceType: 'bus',
    serviceLabel: 'Intercity Bus',
    serviceIcon: '🚌',
    customer: {
      name: customerName,
      phone: customerPhone,
      email: booking.passenger?.email || booking.userId?.email || '',
      seats: seatText,
    },
    driverOrProvider: {
      name: busService?.operatorName || 'Bus Operator',
      phone: busService?.helplineNumber || '',
      vehicle: busService?.busNumber ? `Bus #${busService.busNumber}` : 'Luxury Bus',
      type: busService?.busType || 'AC Sleeper / Seater',
    },
    route: {
      pickup: booking.routeSnapshot?.fromCity || booking.boardingPoint?.locationName || 'Origin Terminal',
      drop: booking.routeSnapshot?.toCity || booking.droppingPoint?.locationName || 'Destination Terminal',
      departureTime: booking.travelDate ? `${booking.travelDate} ${booking.routeSnapshot?.departureTime || ''}` : '--',
    },
    fare,
    paymentMethod: String(booking.paymentMethod || 'CASH').toUpperCase(),
    paymentStatus: String(booking.paymentStatus || (status === 'completed' ? 'PAID' : 'PENDING')).toUpperCase(),
    status,
    source: isAgent ? 'agent' : 'user',
    agentMeta: isAgent
      ? {
          agentId: booking.agentMeta?.bookedByAgentId,
          agentName: 'Agent Partner',
          commissionAmount: Number(booking.agentMeta?.commissionAmount || (fare * 0.05).toFixed(2)),
          commissionStatus: 'CREDITED',
        }
      : null,
    createdAt: booking.createdAt,
    scheduledAt: booking.travelDate || booking.createdAt,
  };
};

// Map RentalBookingRequest to unified booking
const mapRentalToUnified = (rental) => {
  const rawStatus = String(rental.status || 'requested').toLowerCase();
  let status = 'confirmed';
  if (rawStatus === 'completed') status = 'completed';
  else if (rawStatus === 'cancelled' || rawStatus === 'rejected') status = 'cancelled';
  else if (rawStatus === 'active' || rawStatus === 'ongoing' || rawStatus === 'handed_over') status = 'ongoing';
  else if (rawStatus === 'requested' || rawStatus === 'pending') status = 'pending';

  const customerName = rental.customer?.name || rental.user?.name || 'Rental Customer';
  const customerPhone = rental.customer?.phone || rental.user?.phone || '--';
  const fare = Number(rental.totalPrice || rental.estimatedTotal || 0);

  return {
    id: String(rental._id),
    rawId: rental._id,
    bookingCode: rental.bookingCode || rental.requestNumber || `RENT-${String(rental._id).slice(-6).toUpperCase()}`,
    serviceType: 'rental',
    serviceLabel: 'Vehicle Rental',
    serviceIcon: '🚙',
    customer: {
      name: customerName,
      phone: customerPhone,
      email: rental.customer?.email || '',
    },
    driverOrProvider: {
      name: rental.serviceStore?.name || 'Rental Hub',
      phone: rental.serviceStore?.phone || '',
      vehicle: rental.vehicle?.name || rental.vehicleType?.name || 'Rental Vehicle',
      type: rental.vehicleType?.category || 'Car/Bike Rental',
    },
    route: {
      pickup: rental.serviceStore?.address || 'Store Pickup',
      drop: rental.returnLocation || rental.serviceStore?.address || 'Store Return',
      package: rental.rentalPackage?.name || 'Daily/Hourly Package',
    },
    fare,
    paymentMethod: String(rental.paymentMethod || 'ONLINE').toUpperCase(),
    paymentStatus: String(rental.paymentStatus || 'PENDING').toUpperCase(),
    status,
    source: 'user',
    agentMeta: null,
    createdAt: rental.createdAt,
    scheduledAt: rental.pickupDateTime || rental.createdAt,
  };
};

/**
 * List Centralized Bookings across all platform services with unified filtering and pagination
 */
export const listCentralizedBookings = async (query = {}) => {
  const {
    serviceType = 'all',
    status = 'all',
    source = 'all',
    search = '',
    startDate = '',
    endDate = '',
    page = 1,
    limit = 20,
  } = query;

  const dateFilter = parseDateRange(startDate, endDate);

  // Prepare database filters
  const rideFilter = {};
  const poolingFilter = {};
  const busFilter = {};
  const rentalFilter = {};

  if (dateFilter) {
    rideFilter.createdAt = dateFilter;
    poolingFilter.createdAt = dateFilter;
    busFilter.createdAt = dateFilter;
    rentalFilter.createdAt = dateFilter;
  }

  // Source filter
  if (source === 'agent') {
    rideFilter['agentMeta.bookedByAgentId'] = { $ne: null };
    poolingFilter['agentMeta.bookedByAgentId'] = { $ne: null };
    busFilter['agentMeta.bookedByAgentId'] = { $ne: null };
  } else if (source === 'user') {
    rideFilter['agentMeta.bookedByAgentId'] = null;
    poolingFilter['agentMeta.bookedByAgentId'] = null;
    busFilter['agentMeta.bookedByAgentId'] = null;
  }

  // Fetch in parallel based on selected serviceType
  const shouldFetchRides = ['all', 'taxi', 'spiritual', 'airport', 'oneway', 'parcel'].includes(serviceType);
  const shouldFetchPooling = ['all', 'pooling'].includes(serviceType);
  const shouldFetchBus = ['all', 'bus'].includes(serviceType);
  const shouldFetchRental = ['all', 'rental'].includes(serviceType);

  const fetchLimit = 300; // fetch recent slice to aggregate in memory

  const [rides, pooling, bus, rentals] = await Promise.all([
    shouldFetchRides
      ? Ride.find(rideFilter)
          .sort({ createdAt: -1 })
          .limit(fetchLimit)
          .select('serviceType transport_type pickupAddress dropAddress estimatedDistanceMeters intercity fare totalFare estimatedFare paymentMethod payment_opt paymentStatus status agentMeta createdAt scheduledAt userId driverId')
          .populate('userId', 'name phone email')
          .populate('driverId', 'name phone vehicleType vehicleNumber')
          .lean()
      : [],
    shouldFetchPooling
      ? PoolingBooking.find(poolingFilter)
          .sort({ createdAt: -1 })
          .limit(fetchLimit)
          .select('bookingCode user route vehicle passenger seatsBooked totalFare fare bookingStatus status agentMeta createdAt travelDate')
          .populate('user', 'name phone email')
          .populate('route', 'routeName startLocation endLocation')
          .populate('vehicle', 'model registrationNumber')
          .lean()
      : [],
    shouldFetchBus
      ? BusBooking.find(busFilter)
          .sort({ createdAt: -1 })
          .limit(fetchLimit)
          .select('bookingCode userId busServiceId passenger passengers pickupStop dropStop totalFare fare status paymentStatus agentMeta createdAt travelDate departureTime seats')
          .populate('userId', 'name phone email')
          .populate('busServiceId', 'operatorName busNumber busType helplineNumber')
          .lean()
      : [],
    shouldFetchRental
      ? RentalBookingRequest.find(rentalFilter)
          .sort({ createdAt: -1 })
          .limit(fetchLimit)
          .select('bookingCode customer serviceLocation selectedPackage vehicleType vehicle rentalDays dailyRate estimatedAmount status paymentStatus paymentMethod agentMeta createdAt')
          .lean()
      : [],
  ]);

  // Transform to unified objects
  let unified = [
    ...rides.map(mapRideToUnified),
    ...pooling.map(mapPoolingToUnified),
    ...bus.map(mapBusToUnified),
    ...rentals.map(mapRentalToUnified),
  ];

  // Specific serviceType filter if user selected non-all
  if (serviceType !== 'all') {
    unified = unified.filter((b) => b.serviceType === serviceType);
  }

  // Status filter
  if (status !== 'all') {
    unified = unified.filter((b) => b.status === status);
  }

  // Source filter
  if (source !== 'all') {
    unified = unified.filter((b) => b.source === source);
  }

  // Free text search
  if (search) {
    const s = search.toLowerCase().trim();
    unified = unified.filter((b) =>
      b.bookingCode.toLowerCase().includes(s) ||
      b.customer.name.toLowerCase().includes(s) ||
      b.customer.phone.toLowerCase().includes(s) ||
      b.driverOrProvider.name.toLowerCase().includes(s) ||
      b.route.pickup.toLowerCase().includes(s) ||
      b.route.drop.toLowerCase().includes(s) ||
      b.serviceLabel.toLowerCase().includes(s)
    );
  }

  // Sort by createdAt descending
  unified.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Pagination
  const total = unified.length;
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Number(limit) || 20);
  const skip = (safePage - 1) * safeLimit;
  const paginated = unified.slice(skip, skip + safeLimit);

  return {
    results: paginated,
    total,
    paginator: {
      current_page: safePage,
      per_page: safeLimit,
      total,
      last_page: Math.max(1, Math.ceil(total / safeLimit)),
    },
  };
};

/**
 * Get Real-Time Aggregate Stats for Centralized Booking command center
 */
export const getCentralizedBookingStats = async () => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    totalRides,
    todayRides,
    totalPooling,
    todayPooling,
    totalBus,
    todayBus,
    totalRental,
    todayRental,
    recentRides,
    recentPooling,
    recentBus,
  ] = await Promise.all([
    Ride.countDocuments(),
    Ride.countDocuments({ createdAt: { $gte: todayStart } }),
    PoolingBooking.countDocuments(),
    PoolingBooking.countDocuments({ createdAt: { $gte: todayStart } }),
    BusBooking.countDocuments(),
    BusBooking.countDocuments({ createdAt: { $gte: todayStart } }),
    RentalBookingRequest.countDocuments(),
    RentalBookingRequest.countDocuments({ createdAt: { $gte: todayStart } }),
    Ride.find().sort({ createdAt: -1 }).limit(300).select('fare status agentMeta serviceType').lean(),
    PoolingBooking.find().sort({ createdAt: -1 }).limit(300).select('fare totalFare bookingStatus agentMeta').lean(),
    BusBooking.find().sort({ createdAt: -1 }).limit(300).select('amount status agentMeta').lean(),
  ]);

  const totalBookings = totalRides + totalPooling + totalBus + totalRental;
  const todayBookings = todayRides + todayPooling + todayBus + todayRental;

  let totalRevenue = 0;
  let totalAgentCommission = 0;
  let activeOngoing = 0;
  let completedCount = 0;
  let cancelledCount = 0;

  for (const r of recentRides) {
    totalRevenue += Number(r.fare || 0);
    if (r.agentMeta?.commissionAmount) totalAgentCommission += Number(r.agentMeta.commissionAmount);
    if (r.status === 'ongoing' || r.status === 'accepted') activeOngoing += 1;
    else if (r.status === 'completed') completedCount += 1;
    else if (r.status === 'cancelled') cancelledCount += 1;
  }

  for (const p of recentPooling) {
    const f = Number(p.fare || p.totalFare || 0);
    totalRevenue += f;
    if (p.agentMeta?.commissionAmount) totalAgentCommission += Number(p.agentMeta.commissionAmount);
    if (p.bookingStatus === 'ongoing' || p.bookingStatus === 'active') activeOngoing += 1;
    else if (p.bookingStatus === 'completed') completedCount += 1;
    else if (p.bookingStatus === 'cancelled') cancelledCount += 1;
  }

  for (const b of recentBus) {
    const a = Number(b.amount || 0);
    totalRevenue += a;
    if (b.agentMeta?.commissionAmount) totalAgentCommission += Number(b.agentMeta.commissionAmount);
    if (b.status === 'ongoing') activeOngoing += 1;
    else if (b.status === 'confirmed' || b.status === 'completed') completedCount += 1;
    else if (b.status === 'cancelled') cancelledCount += 1;
  }

  return {
    totalBookings,
    todayBookings,
    totalRevenue: Math.round(totalRevenue),
    totalAgentCommission: Math.round(totalAgentCommission * 100) / 100,
    activeOngoing,
    completedCount,
    cancelledCount,
    breakdown: {
      rides: totalRides,
      pooling: totalPooling,
      bus: totalBus,
      rental: totalRental,
    },
  };
};

/**
 * Update any booking status
 */
export const updateCentralizedBookingStatus = async (serviceType, id, status, adminNote = '') => {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, 'Invalid booking ID');
  }

  if (['taxi', 'spiritual', 'airport', 'oneway', 'parcel'].includes(serviceType)) {
    const ride = await Ride.findById(id);
    if (!ride) throw new ApiError(404, 'Ride booking not found');
    ride.status = status;
    if (adminNote) ride.cancellationReason = adminNote;
    await ride.save();
    return mapRideToUnified(ride);
  }

  if (serviceType === 'pooling') {
    const booking = await PoolingBooking.findById(id);
    if (!booking) throw new ApiError(404, 'Pooling booking not found');
    booking.bookingStatus = status;
    await booking.save();
    return mapPoolingToUnified(booking);
  }

  if (serviceType === 'bus') {
    const booking = await BusBooking.findById(id);
    if (!booking) throw new ApiError(404, 'Bus booking not found');
    booking.status = status;
    await booking.save();
    return mapBusToUnified(booking);
  }

  if (serviceType === 'rental') {
    const rental = await RentalBookingRequest.findById(id);
    if (!rental) throw new ApiError(404, 'Rental booking not found');
    rental.status = status;
    await rental.save();
    return mapRentalToUnified(rental);
  }

  throw new ApiError(400, `Unsupported service type: ${serviceType}`);
};
