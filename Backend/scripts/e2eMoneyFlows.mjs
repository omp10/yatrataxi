/**
 * Money-flow regression suite: fares, PIN, commissions, promos, wallets, referrals,
 * outstation, pilgrimage, rental, pooling, bus, agents. Runs against a RUNNING API.
 *
 *   MONGODB_URI=mongodb://127.0.0.1:27018/?replicaSet=rs0 MONGODB_DB_NAME=appzeto_taxi_qa \
 *   API_URL=http://localhost:5055/api node scripts/e2eMoneyFlows.mjs
 *
 * Refuses to run against a non-local database. Every fixture is tagged E2E_MONEY and
 * removed in the finally block; settings it changes are restored.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: new URL('../.env', import.meta.url) });

const API = process.env.API_URL || 'http://localhost:5055/api';
const TAG = 'E2E_MONEY';

if (!/^mongodb:\/\/(127\.0\.0\.1|localhost)[:/]/.test(String(process.env.MONGODB_URI || ''))) {
  console.error('Refusing to run: MONGODB_URI must point at a local database.');
  process.exit(1);
}

const { signAccessToken } = await import('../src/modules/taxi/services/tokenService.js');
const { hashPassword } = await import('../src/modules/taxi/services/passwordService.js');
const { User } = await import('../src/modules/taxi/user/models/User.js');
const { UserWallet } = await import('../src/modules/taxi/user/models/UserWallet.js');
const { Driver } = await import('../src/modules/taxi/driver/models/Driver.js');
const { WalletTransaction } = await import('../src/modules/taxi/driver/models/WalletTransaction.js');
const { Agent } = await import('../src/modules/taxi/agent/models/Agent.js');
const { AgentWallet } = await import('../src/modules/taxi/agent/models/AgentWallet.js');
const { Ride } = await import('../src/modules/taxi/user/models/Ride.js');
const { SetPrice } = await import('../src/modules/taxi/admin/models/SetPrice.js');
const { ExploreDestination } = await import('../src/modules/taxi/admin/promotions/models/ExploreDestination.js');
const { PromoCode } = await import('../src/modules/taxi/admin/promotions/models/PromoCode.js');
const { PromoUserCounter } = await import('../src/modules/taxi/admin/promotions/models/PromoUserCounter.js');
const { PromoRedemption } = await import('../src/modules/taxi/admin/promotions/models/PromoRedemption.js');
const { RentalVehicleType } = await import('../src/modules/taxi/admin/models/RentalVehicleType.js');
const { RentalBookingRequest } = await import('../src/modules/taxi/admin/models/RentalBookingRequest.js');
const { PoolingRoute } = await import('../src/modules/taxi/admin/models/PoolingRoute.js');
const { PoolingVehicle } = await import('../src/modules/taxi/admin/models/PoolingVehicle.js');
const { PoolingBooking } = await import('../src/modules/taxi/admin/models/PoolingBooking.js');
const { PoolingSeatReservation } = await import('../src/modules/taxi/admin/models/PoolingSeatReservation.js');
const { BusService } = await import('../src/modules/taxi/admin/models/BusService.js');
const { BusBooking } = await import('../src/modules/taxi/user/models/BusBooking.js');
const { BusSeatHold } = await import('../src/modules/taxi/user/models/BusSeatHold.js');
const { AdminBusinessSetting } = await import('../src/modules/taxi/admin/models/AdminBusinessSetting.js');
const { PaymentCapture } = await import('../src/modules/taxi/common/models/PaymentCapture.js');
const { applyAgentWalletAdjustment } = await import('../src/modules/taxi/agent/services/agentWalletService.js');
const { claimGatewayPayment } = await import('../src/modules/taxi/services/paymentCaptureService.js');
const { straightLineDistanceKm, calculateRideFareFromRule } = await import('../src/modules/taxi/services/fareValidationService.js');

const results = [];
const ok = (name) => { results.push(['PASS', name]); console.log(`  ok    ${name}`); };
const bad = (name, info = '') => { results.push(['FAIL', name, info]); console.log(`  FAIL  ${name} :: ${String(info).slice(0, 300)}`); };
const check = (cond, name, info = '') => (cond ? ok(name) : bad(name, info));
const near = (a, b, eps = 0.011) => Math.abs(Number(a) - Number(b)) <= eps;

const call = async (method, url, { token, body } = {}) => {
  const res = await fetch(`${API}${url}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let payload = null;
  try { payload = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, payload, data: payload?.data, message: payload?.message };
};

const made = { users: [], drivers: [], agents: [], rides: [], promos: [], rentals: [], poolRoutes: [], poolVehicles: [], buses: [] };
const restore = [];

// Fixtures that already exist in the QA copy of the client data.
const SEDAN = '69dcb5faba63a3e24641c45d';
const SERVICE_LOCATION = '6a9725dd26aec7c66dbaae3c';
const PICKUP = [73.7898, 19.9975]; // Nashik
const DROP = [73.8567, 20.0712];

try {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME });
  const st = Date.now().toString().slice(-6);
  const pw = await hashPassword('e2e-money-123');

  const rideRule = await SetPrice.findOne({ vehicle_type: SEDAN, active: 1, status: 'active', pricing_scope: { $in: ['ride', null] }, transport_type: { $in: ['taxi', 'both'] } }).lean();
  if (!rideRule) throw new Error('QA data has no active SEDAN ride price rule');
  const commissionPct = Number(rideRule.admin_commission_from_driver || 0);

  const mkUser = async (suffix, extra = {}) => {
    const u = await User.create({ phone: `81${st}${suffix}`.slice(0, 10), name: `${TAG} User ${suffix}`, password: pw, isVerified: true, active: true, isActive: true, ...extra });
    made.users.push(u._id);
    return { doc: u, token: signAccessToken({ sub: String(u._id), role: 'user' }) };
  };
  const mkDriver = async (suffix, balance = 1000) => {
    const d = await Driver.create({
      name: `${TAG} Driver ${suffix}`, phone: `82${st}${suffix}`.slice(0, 10), password: pw, vehicleType: 'car',
      vehicleTypeId: SEDAN, approve: true, status: 'approved', isOnline: true, isOnRide: false,
      location: { type: 'Point', coordinates: PICKUP }, wallet: { balance, isBlocked: false },
    });
    made.drivers.push(d._id);
    return { doc: d, token: signAccessToken({ sub: String(d._id), role: 'driver' }) };
  };
  const walletOf = async (driverId) => Number((await Driver.findById(driverId).select('wallet').lean())?.wallet?.balance || 0);
  const resetDriver = (driverId) => Driver.updateOne({ _id: driverId }, { $set: { isOnRide: false, isOnline: true, 'wallet.isBlocked': false } });

  // Runs a ride from accept to completion as the driver; returns the final ride doc.
  const driveRide = async (rideId, driver, { pin } = {}) => {
    let r = await call('PATCH', `/rides/${rideId}/status`, { token: driver.token, body: { status: 'accepted' } });
    if (r.status !== 200) return { error: `accept ${r.status} ${r.message}` };
    await call('PATCH', `/rides/${rideId}/status`, { token: driver.token, body: { status: 'arriving' } });
    const ride = await Ride.findById(rideId).lean();
    r = await call('PATCH', `/rides/${rideId}/status`, { token: driver.token, body: { status: 'started', otp: pin ?? ride.otp } });
    if (r.status !== 200) return { error: `start ${r.status} ${r.message}` };
    r = await call('PATCH', `/rides/${rideId}/status`, { token: driver.token, body: { status: 'completed', paymentMethod: 'cash' } });
    if (r.status !== 200) return { error: `complete ${r.status} ${r.message}` };
    await resetDriver(driver.doc._id);
    return { ride: await Ride.findById(rideId).lean() };
  };

  const distanceKm = straightLineDistanceKm(PICKUP, DROP);
  const floorFare = calculateRideFareFromRule({ rule: rideRule, distanceKm, durationMinutes: 0 });
  const roadFare = floorFare + 60; // what a real client estimate (longer road + time) looks like
  const rideBody = (extra = {}) => ({
    pickup: PICKUP, drop: DROP, pickupAddress: `${TAG} pickup`, dropAddress: `${TAG} drop`,
    vehicleTypeId: SEDAN, vehicleTypeIds: [SEDAN], service_location_id: SERVICE_LOCATION, transport_type: 'taxi',
    paymentMethod: 'cash', estimatedDistanceMeters: Math.round(distanceKm * 1300), estimatedDurationMinutes: 25, ...extra,
  });
  const cancelActive = async (userDoc) => {
    await Ride.updateMany({ userId: userDoc._id, status: { $in: ['searching', 'accepted', 'ongoing'] } }, { $set: { status: 'cancelled', liveStatus: 'cancelled' } });
    await User.updateOne({ _id: userDoc._id }, { $set: { currentRideId: null } });
  };

  // ───────────────────────────────────────────── removed money/auth backdoors
  console.log('\n== removed endpoints ==');
  const u1 = await mkUser('01');
  const d1 = await mkDriver('01', 1000);
  for (const [method, url, token] of [
    ['POST', '/users/wallet/topup', u1.token],
    ['POST', '/drivers/wallet/top-up', d1.token],
    ['POST', '/users/register', null],
    ['POST', '/drivers/register', null],
  ]) {
    const r = await call(method, url, { token, body: { amount: 5000, name: 'x', phone: '9000000099', password: 'x', vehicleType: 'sedan', location: PICKUP } });
    check(r.status === 404, `${method} ${url} is gone`, `HTTP ${r.status} ${r.message}`);
  }
  check(await walletOf(d1.doc._id) === 1000, 'driver wallet untouched by removed top-up', await walletOf(d1.doc._id));

  // ───────────────────────────────────────────── fare validation
  console.log('\n== ride fare is validated by the server ==');
  let r = await call('POST', '/rides', { token: u1.token, body: rideBody({ fare: 1 }) });
  check(r.status === 400 && /below the configured price/.test(r.message || ''), 'Rs1 ride rejected', `${r.status} ${r.message}`);
  r = await call('POST', '/rides', { token: u1.token, body: rideBody({ fare: 0 }) });
  check(r.status === 400, 'Rs0 ride rejected', `${r.status} ${r.message}`);
  r = await call('POST', '/rides', { token: u1.token, body: rideBody({ fare: roadFare }) });
  const ride1Id = r.data?.ride?._id;
  check(r.status === 201 && ride1Id && r.data.ride.fare === roadFare, `honest estimate Rs${roadFare} accepted (floor Rs${floorFare})`, `${r.status} ${r.message}`);
  if (ride1Id) made.rides.push(ride1Id);

  // ───────────────────────────────────────────── PIN + lifecycle
  console.log('\n== ride PIN checked server-side ==');
  r = await call('PATCH', `/rides/${ride1Id}/status`, { token: d1.token, body: { status: 'accepted' } });
  check(r.status === 200, 'driver accepts ride', `${r.status} ${r.message}`);
  check(r.data && r.data.otp === '', 'accept response hides the PIN from driver', JSON.stringify(r.data?.otp));
  r = await call('GET', `/rides/${ride1Id}`, { token: d1.token });
  check(r.status === 200 && !r.data?.otp, 'driver GET ride has no PIN', JSON.stringify(r.data?.otp));
  r = await call('GET', `/rides/${ride1Id}`, { token: u1.token });
  check(r.status === 200 && /^\d{4}$/.test(String(r.data?.otp || '')), 'rider GET ride has the PIN', JSON.stringify(r.data?.otp));
  r = await call('POST', `/rides/${ride1Id}/resend-otp`, { token: d1.token });
  check(r.status === 200 && !r.data?.otp, 'resend-otp does not reveal PIN to driver', JSON.stringify(r.data));
  r = await call('PATCH', `/rides/${ride1Id}/status`, { token: d1.token, body: { status: 'completed', paymentMethod: 'cash' } });
  check(r.status === 409, 'cannot complete a ride that never started', `${r.status} ${r.message}`);
  r = await call('PATCH', `/rides/${ride1Id}/status`, { token: d1.token, body: { status: 'started' } });
  check(r.status === 400, 'start without PIN rejected', `${r.status} ${r.message}`);
  r = await call('PATCH', `/rides/${ride1Id}/status`, { token: d1.token, body: { status: 'started', otp: '0000' === (await Ride.findById(ride1Id).lean()).otp ? '1111' : '0000' } });
  check(r.status === 400, 'start with wrong PIN rejected', `${r.status} ${r.message}`);
  const ride1Otp = (await Ride.findById(ride1Id).lean()).otp;
  r = await call('PATCH', `/rides/${ride1Id}/status`, { token: d1.token, body: { status: 'started', otp: ride1Otp } });
  check(r.status === 200 && r.data?.liveStatus === 'started', 'start with correct PIN', `${r.status} ${r.message}`);

  // ───────────────────────────────────────────── settlement: cash, no promo
  console.log('\n== cash ride settlement ==');
  const before1 = await walletOf(d1.doc._id);
  r = await call('PATCH', `/rides/${ride1Id}/status`, { token: d1.token, body: { status: 'completed', paymentMethod: 'cash' } });
  check(r.status === 200, 'driver completes ride', `${r.status} ${r.message}`);
  const done1 = await Ride.findById(ride1Id).lean();
  const expectedCommission1 = Math.round(roadFare * commissionPct) / 100;
  check(near(done1.commissionAmount, expectedCommission1), `commission = ${commissionPct}% of fare (Rs${expectedCommission1})`, done1.commissionAmount);
  check(near(done1.driverEarnings, roadFare - expectedCommission1), 'driver earnings = fare - commission', done1.driverEarnings);
  check(near(await walletOf(d1.doc._id), before1 - expectedCommission1), 'cash ride: wallet debited by commission only', `${before1} -> ${await walletOf(d1.doc._id)}`);
  r = await call('PATCH', `/rides/${ride1Id}/status`, { token: d1.token, body: { status: 'completed' } });
  check(r.status === 409 && near(await walletOf(d1.doc._id), before1 - expectedCommission1), 'repeat completion does not settle twice', `${r.status}`);
  await resetDriver(d1.doc._id);

  // ───────────────────────────────────────────── promo is funded by the platform
  console.log('\n== promo discount comes out of the admin share ==');
  const u2 = await mkUser('02');
  const promo = await PromoCode.create({
    code: `E2E${st}`, active: true, from_date: new Date(Date.now() - 86400000), to_date: new Date(Date.now() + 86400000),
    transport_type: 'all', service_location_id: SERVICE_LOCATION, service_location_ids: [SERVICE_LOCATION], discount_percentage: 20, maximum_discount_amount: 0,
    uses_per_user: 3, max_uses_total: 0, user_specific: false,
  });
  made.promos.push(promo._id);
  r = await call('POST', '/rides', { token: u2.token, body: rideBody({ fare: roadFare, promo_code: promo.code }) });
  const ride2Id = r.data?.ride?._id;
  if (ride2Id) made.rides.push(ride2Id);
  const discount = Math.round(roadFare * 0.2 * 100) / 100;
  check(r.status === 201 && near(r.data.ride.fare, roadFare - discount), `rider pays Rs${roadFare - discount} after 20% promo`, `${r.status} ${r.message} fare=${r.data?.ride?.fare}`);
  const before2 = await walletOf(d1.doc._id);
  let out = await driveRide(ride2Id, d1);
  check(!out.error, 'promo ride completes', out.error);
  if (out.ride) {
    const grossCommission = Math.round(roadFare * commissionPct) / 100;
    check(near(out.ride.commissionAmount, grossCommission), 'commission on pre-discount fare', out.ride.commissionAmount);
    check(near(out.ride.driverEarnings, roadFare - grossCommission), 'driver earns full fare minus commission', out.ride.driverEarnings);
    check(near(await walletOf(d1.doc._id), before2 + discount - grossCommission), 'cash wallet: +discount -commission', `${before2} -> ${await walletOf(d1.doc._id)}`);
  }

  // ───────────────────────────────────────────── agent commissions
  console.log('\n== agent commission: credited at completion, right rate ==');
  const agent = await Agent.create({
    phone: `83${st}01`.slice(0, 10), name: `${TAG} Agent`, password: pw, active: true, status: 'active', referralCode: `EM${st}`,
    commissionConfig: {
      directRide: { enabled: true, type: 'percentage', value: 10 },
      referredRide: { enabled: true, type: 'percentage', value: 3 },
      intercity: { enabled: true, type: 'percentage', value: 6 },
      bus: { enabled: true, type: 'percentage', value: 4 },
      pooling: { enabled: true, type: 'percentage', value: 5 },
    },
  });
  made.agents.push(agent._id);
  const agentToken = signAccessToken({ sub: String(agent._id), role: 'agent' });
  const agentBalance = async () => Number((await AgentWallet.findOne({ agentId: agent._id }).lean())?.balance || 0);

  r = await call('POST', '/agents/bookings/rides', { token: agentToken, body: rideBody({ fare: 1000000, customer: { name: `${TAG} Cust`, phone: `84${st}01`.slice(0, 10) } }) });
  const bigRideId = r.data?._id;
  if (bigRideId) made.rides.push(bigRideId);
  check(r.status === 201, 'agent books ride', `${r.status} ${r.message}`);
  check(await agentBalance() === 0, 'no commission credited at booking time', await agentBalance());
  if (bigRideId) {
    await Ride.updateOne({ _id: bigRideId }, { $set: { status: 'cancelled', liveStatus: 'cancelled' } });
    const custId = (await Ride.findById(bigRideId).lean()).userId;
    await User.updateOne({ _id: custId }, { $set: { currentRideId: null } });
    made.users.push(custId);
  }
  check(await agentBalance() === 0, 'cancelled agent ride pays nothing', await agentBalance());

  r = await call('POST', '/agents/bookings/rides', { token: agentToken, body: rideBody({ fare: roadFare, customer: { name: `${TAG} Cust2`, phone: `84${st}02`.slice(0, 10) } }) });
  const agentRideId = r.data?._id;
  if (agentRideId) made.rides.push(agentRideId);
  out = await driveRide(agentRideId, d1);
  check(!out.error, 'agent-booked ride completes', out.error);
  check(near(await agentBalance(), roadFare * 0.10), 'direct booking pays directRide 10%', await agentBalance());
  if (agentRideId) made.users.push((await Ride.findById(agentRideId).lean()).userId);

  const referred = await mkUser('03', { referredByAgent: agent._id });
  r = await call('POST', '/rides', { token: referred.token, body: rideBody({ fare: roadFare }) });
  const refRideId = r.data?.ride?._id;
  if (refRideId) made.rides.push(refRideId);
  const beforeRef = await agentBalance();
  out = await driveRide(refRideId, d1);
  check(!out.error, 'referred customer ride completes', out.error);
  check(near(await agentBalance() - beforeRef, roadFare * 0.03), 'referral ride pays referredRide 3% (not 10%)', (await agentBalance()) - beforeRef);

  // ───────────────────────────────────────────── pilgrimage fixed price
  console.log('\n== spiritual trip priced from destination ==');
  const dest = await ExploreDestination.create({
    title: `${TAG} Temple`, label: 'Nashik', code: 'EMT', dropLocation: 'Panchavati, Nashik', image: 'https://example.com/x.jpg',
    category: 'spiritual', baseFare: 3600, vehicleFares: { [SEDAN]: 3600 }, active: true,
  });
  const spiritualUser = await mkUser('04');
  r = await call('POST', '/rides', { token: spiritualUser.token, body: rideBody({ fare: 10, serviceType: 'spiritual', fareContext: { type: 'spiritual', destinationId: String(dest._id) }, scheduledAt: new Date(Date.now() + 86400000).toISOString() }) });
  if (r.data?.ride?._id) made.rides.push(r.data.ride._id);
  check(r.status === 201 && r.data.ride.fare === 3600, 'client fare ignored, destination fare Rs3600 charged', `${r.status} ${r.message} fare=${r.data?.ride?.fare}`);
  await cancelActive(spiritualUser.doc);
  r = await call('POST', '/rides', { token: spiritualUser.token, body: rideBody({ fare: 3600, vehicleTypeId: '69dcb5faba63a3e24641c45b', vehicleTypeIds: ['69dcb5faba63a3e24641c45b'], fareContext: { type: 'spiritual', destinationId: String(dest._id) } }) });
  check(r.status === 400, 'unpriced vehicle for destination rejected', `${r.status} ${r.message}`);
  await ExploreDestination.deleteOne({ _id: dest._id });

  // ───────────────────────────────────────────── outstation package
  console.log('\n== outstation package price + admin round trip ==');
  const pkg = await SetPrice.findOne({ pricing_scope: 'package', active: 1, status: 'active', 'package_vehicle_prices.vehicle_type': SEDAN }).lean();
  if (pkg) {
    const row = pkg.package_vehicle_prices.find((item) => String(item.vehicle_type) === SEDAN);
    restore.push(() => SetPrice.updateOne({ _id: pkg._id }, { $set: { package_vehicle_prices: pkg.package_vehicle_prices } }));
    const ic = await mkUser('05');
    const icBody = (tripType, fare) => rideBody({ fare, serviceType: 'intercity', transport_type: 'intercity', intercity: { packageId: String(pkg._id), tripType, fromCity: 'A', toCity: 'B' }, scheduledAt: new Date(Date.now() + 86400000).toISOString() });
    r = await call('POST', '/rides', { token: ic.token, body: icBody('One Way', 1) });
    if (r.data?.ride?._id) made.rides.push(r.data.ride._id);
    check(r.status === 201 && r.data.ride.fare === Math.round(row.base_price), `one-way charged package price Rs${row.base_price}`, `${r.status} ${r.message} fare=${r.data?.ride?.fare}`);
    check(r.data?.ride?.pricingSnapshot?.admin_commission_from_driver === Number(row.admin_commission_from_driver ?? 0), 'commission snapshot taken from package row', JSON.stringify(r.data?.ride?.pricingSnapshot));
    await cancelActive(ic.doc);
    await SetPrice.updateOne({ _id: pkg._id, 'package_vehicle_prices.vehicle_type': SEDAN }, { $set: { 'package_vehicle_prices.$.round_trip_price': 0 } });
    r = await call('POST', '/rides', { token: ic.token, body: icBody('Round Trip', 5000) });
    check(r.status === 400 && /Round trip is not offered/.test(r.message || ''), 'round trip without admin price rejected', `${r.status} ${r.message}`);
    await SetPrice.updateOne({ _id: pkg._id, 'package_vehicle_prices.vehicle_type': SEDAN }, { $set: { 'package_vehicle_prices.$.round_trip_price': 1350 } });
    r = await call('POST', '/rides', { token: ic.token, body: icBody('Round Trip', 1) });
    if (r.data?.ride?._id) made.rides.push(r.data.ride._id);
    check(r.status === 201 && r.data.ride.fare === 1350, 'round trip charged admin round-trip price Rs1350', `${r.status} ${r.message} fare=${r.data?.ride?.fare}`);
    await cancelActive(ic.doc);
    r = await call('GET', '/users/intercity-packages');
    const catVehicle = (r.payload?.results || []).find((p) => p.id === String(pkg._id))?.vehicles?.find((v) => v.vehicleTypeId === SEDAN);
    check(catVehicle?.roundTripPrice === 1350, 'catalog exposes roundTripPrice to the app', JSON.stringify(catVehicle));
  } else {
    bad('outstation package fixture', 'no active package with SEDAN in QA data');
  }

  // ───────────────────────────────────────────── rental
  console.log('\n== rental priced and paid server-side ==');
  const rentalVehicle = await RentalVehicleType.findOne({ status: 'active', active: { $ne: false }, 'advancePayment.enabled': true }).lean();
  if (rentalVehicle) {
    const pack = rentalVehicle.pricing.find((p) => p.active !== false);
    const advance = Number(rentalVehicle.advancePayment.amount);
    const ru = await mkUser('06');
    await UserWallet.updateOne({ userId: ru.doc._id }, { $set: { balance: advance + 500, transactions: [] } }, { upsert: true });
    const pickupAt = new Date(Date.now() + 2 * 86400000);
    const returnAt = new Date(pickupAt.getTime() + (pack.durationHours + 2) * 3600000);
    const ref = `RNT-E2E${st}`;
    const bookingBody = (payment, extra = {}) => ({
      bookingReference: ref, vehicleTypeId: String(rentalVehicle._id), pickupDateTime: pickupAt.toISOString(), returnDateTime: returnAt.toISOString(),
      totalCost: 1, payableNow: 1, paymentStatus: 'paid', selectedPackage: { id: pack.id, price: 1 }, payment, ...extra,
    });
    r = await call('POST', '/users/rental-bookings', { token: ru.token, body: bookingBody({ provider: 'razorpay', orderId: 'order_fake', paymentId: 'pay_fake', signature: 'bad' }) });
    check(r.status === 400, 'fake Razorpay payment rejected', `${r.status} ${r.message}`);
    r = await call('POST', '/users/rental-bookings', { token: ru.token, body: bookingBody({ provider: 'wallet' }) });
    check(r.status === 400, '"paid" via wallet without a debit rejected', `${r.status} ${r.message}`);
    r = await call('POST', '/users/rental-advance/wallet', { token: ru.token, body: { amount: 1, bookingReference: ref, vehicleId: String(rentalVehicle._id) } });
    check(r.status === 400, 'wallet advance with wrong amount rejected', `${r.status} ${r.message}`);
    const [p1, p2] = await Promise.all([
      call('POST', '/users/rental-advance/wallet', { token: ru.token, body: { amount: advance, bookingReference: ref, vehicleId: String(rentalVehicle._id) } }),
      call('POST', '/users/rental-advance/wallet', { token: ru.token, body: { amount: advance, bookingReference: ref, vehicleId: String(rentalVehicle._id) } }),
    ]);
    const walletAfter = Number((await UserWallet.findOne({ userId: ru.doc._id }).lean()).balance);
    check(p1.status === 201 && p2.status === 201 && near(walletAfter, 500), 'double-submitted advance debited once', `${p1.status}/${p2.status} balance=${walletAfter}`);
    r = await call('POST', '/users/rental-bookings', { token: ru.token, body: bookingBody({ provider: 'wallet' }) });
    const expectedTotal = pack.price + 2 * pack.extraHourPrice;
    check(r.status === 201 && r.data?.paymentStatus === 'paid', 'booking with real wallet advance accepted', `${r.status} ${r.message}`);
    check(near(r.data?.totalCost, expectedTotal), `server-computed total Rs${expectedTotal} (client sent Rs1)`, r.data?.totalCost);
    check(near(r.data?.payableNow, advance), 'server-computed advance', r.data?.payableNow);
    const rental = await RentalBookingRequest.findOne({ bookingReference: ref }).lean();
    if (rental) made.rentals.push(rental._id);
    r = await call('POST', '/users/rental-bookings', { token: ru.token, body: bookingBody({ provider: 'wallet' }, { totalCost: 5 }) });
    const after = await RentalBookingRequest.findOne({ bookingReference: ref }).lean();
    check(r.status === 200 && near(after.totalCost, expectedTotal), 'resubmitting cannot rewrite a booking', `${r.status} total=${after?.totalCost}`);
  } else {
    bad('rental fixture', 'no rental vehicle with advance payment in QA data');
  }

  // ───────────────────────────────────────────── pooling (agent + user)
  console.log('\n== shared taxi priced from route ==');
  const pv = await PoolingVehicle.create({ name: `${TAG} Pool Car`, vehicleModel: 'E2E', capacity: 3, vehicleNumber: `${TAG}1`, status: 'active',
    serviceTaxPercentage: 5, blueprint: { cols: 2, layout: [{ type: 'seat', r: 0, c: 0 }, { type: 'seat', r: 0, c: 1 }, { type: 'seat', r: 1, c: 0, status: 'blocked' }] } });
  made.poolVehicles.push(pv._id);
  const pr = await PoolingRoute.create({ routeName: `${TAG} Route`, originLabel: `${TAG}ville`, destinationLabel: `${TAG}pur`, status: 'active', active: true,
    farePerSeat: 300, assignedVehicleTypeIds: [pv._id], schedules: [{ id: 'esch', label: 'AM', departureTime: '08:00', status: 'active' }],
    pickupPoints: [{ id: 'ep1', name: 'P1' }], dropPoints: [{ id: 'ed1', name: 'D1' }] });
  made.poolRoutes.push(pr._id);
  const travelDate = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  const poolBody = (seats, extra = {}) => ({ routeId: String(pr._id), vehicleId: String(pv._id), scheduleId: 'esch', travelDate, selectedSeats: seats, pickupStopId: 'ep1', dropStopId: 'ed1', ...extra });
  const poolAgentBefore = await agentBalance();
  r = await call('POST', '/agents/pooling/bookings', { token: agentToken, body: poolBody(['0-0'], { farePerSeat: 1, customer: { name: `${TAG} PCust`, phone: `84${st}03`.slice(0, 10) } }) });
  check(r.status === 201 && near(r.data?.amount, 315), 'agent pooling fare from route: 300 + 5% tax (client farePerSeat ignored)', `${r.status} ${r.message} amount=${r.data?.amount}`);
  check(near(await agentBalance() - poolAgentBefore, 315 * 0.05), 'agent earns pooling 5%', (await agentBalance()) - poolAgentBefore);
  r = await call('POST', '/agents/pooling/bookings', { token: agentToken, body: poolBody(['0-0'], { customer: { name: `${TAG} PCust`, phone: `84${st}03`.slice(0, 10) } }) });
  check(r.status === 409, 'same seat cannot be sold twice', `${r.status} ${r.message}`);
  r = await call('POST', '/agents/pooling/bookings', { token: agentToken, body: poolBody(['1-0'], { customer: { name: `${TAG} PCust`, phone: `84${st}03`.slice(0, 10) } }) });
  check(r.status === 400, 'admin-blocked layout seat not sellable', `${r.status} ${r.message}`);
  const pu = await mkUser('07');
  r = await call('POST', '/users/pooling/bookings/verify', { token: pu.token, body: poolBody(['0-1'], { razorpay_order_id: 'order_x', razorpay_payment_id: 'pay_x', razorpay_signature: 'nope' }) });
  check(r.status === 400, 'pooling verify with forged signature rejected', `${r.status} ${r.message}`);

  // ───────────────────────────────────────────── bus cash booking cancel
  console.log('\n== bus cash ticket can be cancelled ==');
  const setting = await AdminBusinessSetting.findOne({ scope: 'default' }).lean();
  restore.push(() => AdminBusinessSetting.updateOne({ scope: 'default' }, { $set: { transport_ride: setting?.transport_ride || {} } }));
  await AdminBusinessSetting.updateOne({ scope: 'default' }, { $set: { 'transport_ride.enable_bus_service': '1', 'transport_ride.enable_cash_seat_booking': '1' } });
  const busRow = ['A1', 'A2'].map((l) => ({ kind: 'seat', id: `E-${l}`, label: l, variant: 'seat', status: 'available' }));
  const bus = await BusService.create({ operatorName: `${TAG} Op`, busName: `${TAG} Bus`, seatPrice: 250, variantPricing: { seat: 250 }, fareCurrency: 'INR', status: 'active', capacity: 2,
    blueprint: { templateKey: 'seater_2_2', lowerDeck: [busRow], upperDeck: [] },
    route: { routeName: `${TAG} bus`, originCity: `${TAG}ville`, destinationCity: `${TAG}pur`, distanceKm: '75', durationHours: '2' },
    schedules: [{ id: 'bsch', label: 'AM', departureTime: '07:00', arrivalTime: '09:00', activeDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], status: 'active' }],
    cancellationRules: [{ id: 'erule', hoursBeforeDeparture: 1, refundType: 'percentage', refundValue: 50, label: 'Late' }] });
  made.buses.push(bus._id);
  const bu = await mkUser('08');
  const busDate = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  r = await call('POST', '/users/bus-bookings/order', { token: bu.token, body: { busServiceId: String(bus._id), scheduleId: 'bsch', travelDate: busDate, seatIds: ['E-A1'], paymentMethod: 'cash',
    passenger: { name: 'E2E Pax', age: 30, gender: 'Male', phone: '9000000077', email: 'e2e@test.local' } } });
  const busBookingId = r.data?.booking?.id;
  check(r.status === 201 && r.data?.booking?.status === 'confirmed', 'cash bus booking confirmed', `${r.status} ${r.message}`);
  const [c1, c2] = await Promise.all([
    call('POST', `/users/bus-bookings/${busBookingId}/cancel`, { token: bu.token, body: {} }),
    call('POST', `/users/bus-bookings/${busBookingId}/cancel`, { token: bu.token, body: {} }),
  ]);
  const cancelled = await BusBooking.findById(busBookingId).lean();
  check(cancelled?.status === 'cancelled' && [c1.status, c2.status].includes(200), 'cash ticket cancels (no gateway refund needed)', `${c1.status}/${c2.status} ${c1.message} ${c2.message}`);
  check((cancelled?.cancelledSeats || []).length === 1, 'double cancel processed once', (cancelled?.cancelledSeats || []).length);

  // ───────────────────────────────────────────── wallets: atomic + idempotent
  console.log('\n== agent wallet is atomic and idempotent ==');
  const before = await agentBalance();
  await Promise.all(Array.from({ length: 20 }, (_, i) => applyAgentWalletAdjustment({ agentId: agent._id, amount: 10, kind: 'credit', title: 'e2e', referenceKey: `e2e-par-${st}-${i}` })));
  check(near(await agentBalance(), before + 200), '20 concurrent credits all land', `${before} -> ${await agentBalance()}`);
  const before3 = await agentBalance();
  await Promise.allSettled(Array.from({ length: 5 }, () => applyAgentWalletAdjustment({ agentId: agent._id, amount: 50, kind: 'credit', title: 'e2e dup', referenceKey: `e2e-dup-${st}` })));
  check(near(await agentBalance(), before3 + 50), 'same referenceKey credited once under concurrency', `${before3} -> ${await agentBalance()}`);
  r = await (async () => { try { await applyAgentWalletAdjustment({ agentId: agent._id, amount: 999999, kind: 'debit', title: 'e2e overdraw' }); return 'no-error'; } catch (e) { return e.message; } })();
  check(/negative/.test(r), 'agent wallet cannot be overdrawn', r);

  console.log('\n== gateway payment ledger ==');
  const pid = `pay_e2e_${st}`;
  check(await claimGatewayPayment({ provider: 'razorpay', paymentId: pid, purpose: 'user_wallet_topup', ownerType: 'user', ownerId: 'u1' }) === true, 'first claim succeeds');
  check(await claimGatewayPayment({ provider: 'razorpay', paymentId: pid, purpose: 'user_wallet_topup', ownerType: 'user', ownerId: 'u1' }) === false, 'same owner retry is a no-op');
  r = await (async () => { try { await claimGatewayPayment({ provider: 'razorpay', paymentId: pid, purpose: 'driver_wallet_topup', ownerType: 'driver', ownerId: 'd1' }); return 'claimed'; } catch (e) { return e.statusCode || e.status || e.message; } })();
  check(r === 409, 'same payment cannot credit a second wallet', r);
  await PaymentCapture.deleteMany({ paymentId: pid });
} catch (error) {
  bad('suite crashed', error?.stack || error);
} finally {
  try {
    for (const fn of restore) await fn();
    const rideIds = made.rides.filter(Boolean);
    await Ride.deleteMany({ _id: { $in: rideIds } });
    await WalletTransaction.deleteMany({ driverId: { $in: made.drivers } });
    await PromoRedemption.deleteMany({ promo_id: { $in: made.promos } });
    await PromoUserCounter.deleteMany({ promo_id: { $in: made.promos } });
    await PromoCode.deleteMany({ _id: { $in: made.promos } });
    await RentalBookingRequest.deleteMany({ _id: { $in: made.rentals } });
    await PoolingSeatReservation.deleteMany({ route: { $in: made.poolRoutes } });
    await PoolingBooking.deleteMany({ route: { $in: made.poolRoutes } });
    await PoolingRoute.deleteMany({ _id: { $in: made.poolRoutes } });
    await PoolingVehicle.deleteMany({ _id: { $in: made.poolVehicles } });
    await BusSeatHold.deleteMany({ busServiceId: { $in: made.buses } });
    await BusBooking.deleteMany({ busServiceId: { $in: made.buses } });
    await BusService.deleteMany({ _id: { $in: made.buses } });
    await AgentWallet.deleteMany({ agentId: { $in: made.agents } });
    await Agent.deleteMany({ _id: { $in: made.agents } });
    await Driver.deleteMany({ _id: { $in: made.drivers } });
    await UserWallet.deleteMany({ userId: { $in: made.users } });
    await User.deleteMany({ _id: { $in: made.users } });
    await PaymentCapture.deleteMany({ ownerId: { $in: [...made.agents, ...made.users, ...made.drivers].map(String) } });
  } catch (cleanupError) {
    console.error('cleanup error', cleanupError);
  }
  await mongoose.disconnect();
  const failed = results.filter((item) => item[0] === 'FAIL');
  console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
  process.exit(failed.length ? 1 : 0);
}
