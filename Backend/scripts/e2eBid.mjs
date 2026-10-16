/**
 * Bidding regression suite. Exercises both negotiation modes against a RUNNING API with
 * real socket connections for the drivers and the rider:
 *   - local rides on a bidding-enabled vehicle  (user raises the fare in steps)
 *   - outstation rides                          (drivers bid, rider picks one)
 *
 *   MONGODB_URI=mongodb://127.0.0.1:27018/?replicaSet=rs0 MONGODB_DB_NAME=appzeto_taxi_qa \
 *   API_URL=http://localhost:5055/api node scripts/e2eBid.mjs
 *
 * Refuses to run against a non-local database. Fixtures are tagged E2E_BID and removed
 * in the finally block; the vehicle/settings it changes are restored.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createRequire } from 'node:module';
dotenv.config({ path: new URL('../.env', import.meta.url) });

const API = process.env.API_URL || 'http://localhost:5055/api';
const SOCKET_ORIGIN = API.replace(/\/api\/?$/, '');
const TAG = 'E2E_BID';

if (!/^mongodb:\/\/(127\.0\.0\.1|localhost)[:/]/.test(String(process.env.MONGODB_URI || ''))) {
  console.error('Refusing to run: MONGODB_URI must point at a local database.');
  process.exit(1);
}

const require = createRequire(import.meta.url);
const { io } = require(process.env.SOCKET_IO_CLIENT || '../../frontend/node_modules/socket.io-client');

const { signAccessToken } = await import('../src/modules/taxi/services/tokenService.js');
const { hashPassword } = await import('../src/modules/taxi/services/passwordService.js');
const { User } = await import('../src/modules/taxi/user/models/User.js');
const { UserWallet } = await import('../src/modules/taxi/user/models/UserWallet.js');
const { Driver } = await import('../src/modules/taxi/driver/models/Driver.js');
const { WalletTransaction } = await import('../src/modules/taxi/driver/models/WalletTransaction.js');
const { Ride } = await import('../src/modules/taxi/user/models/Ride.js');
const { RideBid } = await import('../src/modules/taxi/user/models/RideBid.js');
const { SetPrice } = await import('../src/modules/taxi/admin/models/SetPrice.js');
const { Vehicle } = await import('../src/modules/taxi/admin/models/Vehicle.js');
const { AdminBusinessSetting } = await import('../src/modules/taxi/admin/models/AdminBusinessSetting.js');
const { straightLineDistanceKm, calculateRideFareFromRule } = await import('../src/modules/taxi/services/fareValidationService.js');

const results = [];
const ok = (name) => { results.push(['PASS', name]); console.log(`  ok    ${name}`); };
const bad = (name, info = '') => { results.push(['FAIL', name, info]); console.log(`  FAIL  ${name} :: ${String(info).slice(0, 400)}`); };
const check = (cond, name, info = '') => (cond ? ok(name) : bad(name, info));
const note = (text) => console.log(`        · ${text}`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

const made = { users: [], drivers: [], rides: [] };
const restore = [];
const sockets = [];

const SEDAN = '69dcb5faba63a3e24641c45d';
const AUTO = '69dcb5faba63a3e24641c45e';
const SERVICE_LOCATION = '6a9725dd26aec7c66dbaae3c';
const PICKUP = [73.7898, 19.9975];
const DROP = [73.8567, 20.0712];

// Collects every event a socket receives so tests can assert on what each app would see.
const connect = (token) => new Promise((resolve, reject) => {
  const socket = io(SOCKET_ORIGIN, { auth: { token }, transports: ['websocket'], reconnection: false });
  const log = [];
  socket.onAny((event, payload) => log.push({ event, payload, at: Date.now() }));
  socket.on('connect', () => resolve({ socket, log, of: (event) => log.filter((entry) => entry.event === event) }));
  socket.on('connect_error', reject);
  sockets.push(socket);
});

try {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME });
  const st = Date.now().toString().slice(-6);
  const pw = await hashPassword('e2e-bid-123');

  // ───────────────────────────────────────────── fixtures
  const vehicleBefore = await Vehicle.findById(SEDAN).select('dispatch_type').lean();
  await Vehicle.updateOne({ _id: SEDAN }, { $set: { dispatch_type: 'both' } });
  restore.push(() => Vehicle.updateOne({ _id: SEDAN }, { $set: { dispatch_type: vehicleBefore?.dispatch_type || 'normal' } }));
  const settingsBefore = await AdminBusinessSetting.findOne({ scope: 'default' }).select('bid_ride').lean();
  await AdminBusinessSetting.updateOne({ scope: 'default' }, { $set: { bid_ride: {
    bidding_low_percentage: '10', bidding_high_percentage: '20', bidding_amount_increase_or_decrease: '10',
    user_bidding_low_percentage: '10', user_bidding_high_percentage: '20', user_bidding_amount_increase_or_decrease: '10',
    user_fare_increase_wait_minutes: '2',
  } } });
  restore.push(() => AdminBusinessSetting.updateOne({ scope: 'default' }, { $set: { bid_ride: settingsBefore?.bid_ride || {} } }));

  const rideRule = await SetPrice.findOne({ vehicle_type: SEDAN, active: 1, status: 'active', pricing_scope: { $in: ['ride', null] }, transport_type: { $in: ['taxi', 'both'] } }).lean();
  if (!rideRule) throw new Error('QA data has no active SEDAN ride price rule');
  const commissionPct = Number(rideRule.admin_commission_from_driver || 0);

  const mkUser = async (suffix) => {
    const u = await User.create({ phone: `71${st}${suffix}`.slice(0, 10), name: `${TAG} User ${suffix}`, password: pw, isVerified: true, active: true, isActive: true });
    made.users.push(u._id);
    return { doc: u, token: signAccessToken({ sub: String(u._id), role: 'user' }) };
  };
  const mkDriver = async (suffix, { balance = 1000, vehicleTypeId = SEDAN, vehicleType = 'car', vehicleIconType = 'car', offset = 0 } = {}) => {
    const d = await Driver.create({
      name: `${TAG} Driver ${suffix}`, phone: `72${st}${suffix}`.slice(0, 10), password: pw, vehicleType, vehicleIconType,
      vehicleTypeId, approve: true, status: 'approved', isOnline: true, isOnRide: false,
      location: { type: 'Point', coordinates: [PICKUP[0] + offset, PICKUP[1]] }, wallet: { balance, isBlocked: false },
    });
    made.drivers.push(d._id);
    return { doc: d, id: String(d._id), token: signAccessToken({ sub: String(d._id), role: 'driver' }) };
  };
  const cancelActive = async (userDoc) => {
    await Ride.updateMany({ userId: userDoc._id, status: { $in: ['searching', 'accepted', 'ongoing'] } }, { $set: { status: 'cancelled', liveStatus: 'cancelled' } });
    await User.updateOne({ _id: userDoc._id }, { $set: { currentRideId: null } });
  };
  const resetDriver = (driverId) => Driver.updateOne({ _id: driverId }, { $set: { isOnRide: false, isOnline: true, 'wallet.isBlocked': false } });
  const driverBalance = async (driverId) => Number((await Driver.findById(driverId).select('wallet').lean())?.wallet?.balance || 0);

  const distanceKm = straightLineDistanceKm(PICKUP, DROP);
  const floorFare = calculateRideFareFromRule({ rule: rideRule, distanceKm, durationMinutes: 0 });
  const roadFare = floorFare + 60;
  const rideBody = (extra = {}) => ({
    pickup: PICKUP, drop: DROP, pickupAddress: `${TAG} pickup`, dropAddress: `${TAG} drop`,
    vehicleTypeId: SEDAN, vehicleTypeIds: [SEDAN], service_location_id: SERVICE_LOCATION, transport_type: 'taxi',
    paymentMethod: 'cash', estimatedDistanceMeters: Math.round(distanceKm * 1300), estimatedDurationMinutes: 25, ...extra,
  });

  const completeRide = async (rideId, driver) => {
    await call('PATCH', `/rides/${rideId}/status`, { token: driver.token, body: { status: 'arriving' } });
    const ride = await Ride.findById(rideId).lean();
    let r = await call('PATCH', `/rides/${rideId}/status`, { token: driver.token, body: { status: 'started', otp: ride.otp } });
    if (r.status !== 200) return { error: `start ${r.status} ${r.message}` };
    r = await call('PATCH', `/rides/${rideId}/status`, { token: driver.token, body: { status: 'completed', paymentMethod: 'cash' } });
    if (r.status !== 200) return { error: `complete ${r.status} ${r.message}` };
    await resetDriver(driver.doc._id);
    return { ride: await Ride.findById(rideId).lean() };
  };

  // ═══════════════════════════════════════════ A. local ride, user raises the fare
  console.log('\n== A. local bidding ride: rider raises the fare in steps ==');
  const uA = await mkUser('01');
  const dA1 = await mkDriver('01');
  const dA2 = await mkDriver('02', { offset: 0.002 });
  const dAuto = await mkDriver('03', { vehicleTypeId: AUTO, vehicleType: 'auto', vehicleIconType: 'auto' });
  const sockA1 = await connect(dA1.token);
  const sockA2 = await connect(dA2.token);
  const sockAuto = await connect(dAuto.token);
  const sockUA = await connect(uA.token);

  let r = await call('POST', '/rides', { token: uA.token, body: rideBody({ fare: roadFare, bookingMode: 'bidding', userMaxBidFare: roadFare }) });
  const rideA = r.data?.ride;
  if (rideA?._id) made.rides.push(rideA._id);
  check(r.status === 201 && rideA?.pricingNegotiationMode === 'user_increment_only', 'bidding vehicle on a local ride => rider-raises-fare mode', `${r.status} ${r.message} ${rideA?.pricingNegotiationMode}`);
  note(`rider asked for Rs${roadFare}; ride created with fare=Rs${rideA?.fare}, baseFare=Rs${rideA?.baseFare}, floor=${rideA?.bidFloorFare}, ceiling=${rideA?.bidCeilingMaxFare}, step=${rideA?.bidStepAmount}, bookingMode=${rideA?.bookingMode}`);
  check(rideA?.fare === roadFare && rideA?.bidFloorFare === roadFare, 'rider starts at exactly the fare they were shown', `shown Rs${roadFare} but ride fare Rs${rideA?.fare} floor ${rideA?.bidFloorFare}`);
  check(rideA?.nextFareIncreaseAt && new Date(rideA.nextFareIncreaseAt) > new Date(), 'first fare increase is locked behind the wait time', String(rideA?.nextFareIncreaseAt));
  await sleep(1500);
  const reqA1 = sockA1.of('rideRequest').at(-1)?.payload;
  const reqAuto = sockAuto.of('rideRequest').at(-1)?.payload;
  check(Boolean(reqA1) && Number(reqA1.fare) === Number(rideA?.fare), 'nearby SEDAN driver is offered the ride at the ride fare', JSON.stringify(reqA1 && { fare: reqA1.fare, bidding: reqA1.bidding }));
  check(!reqAuto, 'driver with a different vehicle type is not offered the ride');
  check(!reqA1?.bidding?.enabled, 'rider-raises mode shows no bid box to drivers (plain accept)', JSON.stringify(reqA1?.bidding));

  r = await call('PATCH', `/rides/${rideA._id}/status`, { token: dAuto.token, body: { status: 'accepted' } });
  check(r.status !== 200, 'a driver of another vehicle type cannot accept it', `${r.status}`);

  r = await call('PATCH', `/rides/${rideA._id}/bids/ceiling`, { token: uA.token, body: { incrementSteps: 1 } });
  r = await call('PATCH', `/rides/${rideA._id}/bids/ceiling`, { token: uA.token, body: { incrementSteps: 1 } });
  check(r.status === 409, 'cannot raise the fare before the wait time is over', `${r.status} ${r.message}`);

  await Ride.updateOne({ _id: rideA._id }, { $set: { nextFareIncreaseAt: new Date(Date.now() - 1000) } });
  const logBefore = sockA1.log.length;
  r = await call('PATCH', `/rides/${rideA._id}/bids/ceiling`, { token: uA.token, body: { incrementSteps: 1 } });
  const raisedFare = r.data?.fare;
  check(r.status === 200 && raisedFare === rideA.fare + rideA.bidStepAmount, `fare raised by one step (Rs${rideA.fare} -> Rs${rideA.fare + rideA.bidStepAmount})`, `${r.status} ${r.message} ${raisedFare}`);
  await sleep(1500);
  const reoffer = sockA1.log.slice(logBefore).filter((e) => e.event === 'rideRequest').at(-1)?.payload;
  check(Number(reoffer?.fare) === raisedFare, 'drivers are re-offered the ride at the raised fare', JSON.stringify(reoffer && { fare: reoffer.fare }));
  const raisedEvent = sockUA.of('rideBiddingUpdated').at(-1)?.payload;
  check(Number(raisedEvent?.fare) === raisedFare, 'rider app receives the new fare live', JSON.stringify(raisedEvent && { fare: raisedEvent.fare }));

  r = await call('PATCH', `/rides/${rideA._id}/bids/ceiling`, { token: uA.token, body: { incrementSteps: 1 } });
  check(r.status === 409, 'a second raise is again locked by the wait time', `${r.status} ${r.message}`);
  await Ride.updateOne({ _id: rideA._id }, { $set: { nextFareIncreaseAt: new Date(Date.now() - 1000) } });
  r = await call('PATCH', `/rides/${rideA._id}/bids/ceiling`, { token: uA.token, body: { incrementSteps: 50 } });
  const ceilingA = rideA.bidCeilingMaxFare;
  check(r.status === 200 && r.data?.fare === ceilingA, `a huge raise stops at the admin ceiling (Rs${ceilingA})`, `${r.status} ${r.message} fare=${r.data?.fare}`);
  await Ride.updateOne({ _id: rideA._id }, { $set: { nextFareIncreaseAt: new Date(Date.now() - 1000) } });
  r = await call('PATCH', `/rides/${rideA._id}/bids/ceiling`, { token: uA.token, body: { incrementSteps: 1 } });
  check(r.status === 409 && /ceiling/i.test(r.message || ''), 'cannot raise above the ceiling', `${r.status} ${r.message}`);

  // a second user must not touch this ride
  const uOther = await mkUser('09');
  r = await call('PATCH', `/rides/${rideA._id}/bids/ceiling`, { token: uOther.token, body: { incrementSteps: 1 } });
  check(r.status === 404, "another rider can't change my fare", `${r.status}`);

  // driver wins it at the raised fare and the money follows that fare
  const balBefore = await driverBalance(dA1.doc._id);
  r = await call('PATCH', `/rides/${rideA._id}/status`, { token: dA1.token, body: { status: 'accepted' } });
  check(r.status === 200, 'driver accepts at the raised fare', `${r.status} ${r.message}`);
  const done = await completeRide(rideA._id, dA1);
  const finalFareA = done.ride?.fare;
  check(!done.error && finalFareA === ceilingA, `trip completes at the raised fare Rs${ceilingA}`, done.error || finalFareA);
  const balAfter = await driverBalance(dA1.doc._id);
  const expectedCommission = Math.round(finalFareA * commissionPct) / 100;
  note(`driver wallet ${balBefore} -> ${balAfter} (commission ${commissionPct}% of Rs${finalFareA} = Rs${expectedCommission})`);
  check(Math.abs((balBefore - balAfter) - expectedCommission) < 0.02, 'admin commission is taken on the raised fare', `${balBefore - balAfter} vs ${expectedCommission}`);
  await cancelActive(uA.doc);

  // a ride not requesting bidding on the same vehicle stays a normal ride
  r = await call('POST', '/rides', { token: uA.token, body: rideBody({ fare: roadFare }) });
  if (r.data?.ride?._id) made.rides.push(r.data.ride._id);
  check(r.status === 201 && r.data?.ride?.pricingNegotiationMode === 'none' && r.data?.ride?.fare === roadFare, 'same vehicle booked normally stays a plain fixed-fare ride', `${r.status} ${r.data?.ride?.pricingNegotiationMode}`);
  await cancelActive(uA.doc);

  // ═══════════════════════════════════════════ B. outstation, drivers bid
  console.log('\n== B. outstation ride: drivers bid, rider picks ==');
  const pkg = await SetPrice.findOne({ pricing_scope: 'package', active: 1, status: 'active', 'package_vehicle_prices.vehicle_type': SEDAN }).lean();
  if (!pkg) {
    bad('QA data has an outstation package for the SEDAN', 'none found');
  } else {
    const row = pkg.package_vehicle_prices.find((item) => String(item.vehicle_type) === SEDAN);
    const uB = await mkUser('02');
    const dB1 = await mkDriver('11');
    const dB2 = await mkDriver('12', { offset: 0.002 });
    const dB3 = await mkDriver('13', { offset: 0.003 });
    const sB1 = await connect(dB1.token);
    const sB2 = await connect(dB2.token);
    const sB3 = await connect(dB3.token);
    const sUB = await connect(uB.token);
    const icBody = (extra = {}) => rideBody({
      fare: Math.round(row.base_price), serviceType: 'intercity', transport_type: 'intercity', bookingMode: 'bidding',
      intercity: { packageId: String(pkg._id), tripType: 'One Way', fromCity: 'A', toCity: 'B' }, ...extra,
    });

    r = await call('POST', '/rides', { token: uB.token, body: icBody({ userMaxBidFare: Math.round(row.base_price) + 20 }) });
    const rideB = r.data?.ride;
    if (rideB?._id) made.rides.push(rideB._id);
    check(r.status === 201 && rideB?.pricingNegotiationMode === 'driver_bid' && rideB?.bookingMode === 'bidding', 'outstation + bidding vehicle => driver-bid mode', `${r.status} ${r.message} ${rideB?.pricingNegotiationMode}`);
    const baseB = Number(rideB?.baseFare);
    note(`package price Rs${baseB}; floor=Rs${rideB?.bidFloorFare} (drivers may bid down), rider max=Rs${rideB?.userMaxBidFare}, hard ceiling=Rs${rideB?.bidCeilingMaxFare}, step=Rs${rideB?.bidStepAmount}, ride fare=Rs${rideB?.fare}`);
    await sleep(1500);
    const reqB1 = sB1.of('rideRequest').at(-1)?.payload;
    check(Boolean(reqB1?.bidding) && reqB1.bidding.bidStepAmount === rideB.bidStepAmount, 'drivers get a bid box with the step and range', JSON.stringify(reqB1?.bidding));

    r = await call('PATCH', `/rides/${rideB._id}/status`, { token: dB1.token, body: { status: 'accepted' } });
    check(r.status === 409, 'a driver cannot skip the bid and just accept a bidding ride', `${r.status} ${r.message}`);

    const bid = (driver, sock, amount) => new Promise((resolve) => {
      const before = sock.log.length;
      driver.socket.emit('submitRideBid', { rideId: rideB._id, bidFare: amount });
      setTimeout(() => {
        const fresh = sock.log.slice(before);
        resolve({
          submitted: fresh.find((e) => e.event === 'rideBidSubmitted')?.payload,
          error: fresh.find((e) => e.event === 'errorMessage')?.payload?.message,
        });
      }, 900);
    });
    const step = rideB.bidStepAmount;
    let res = await bid(sB1, sB1, rideB.bidFloorFare - step);
    check(Boolean(res.error), 'bid below the floor is refused', JSON.stringify(res));
    res = await bid(sB1, sB1, rideB.userMaxBidFare + step);
    check(Boolean(res.error), "bid above the rider's max is refused", JSON.stringify(res));
    res = await bid(sB1, sB1, baseB + 3);
    check(Boolean(res.error) && /steps/i.test(res.error), 'bid that is not a whole step is refused', JSON.stringify(res));

    const bidHigh = rideB.userMaxBidFare;
    const bidMid = baseB;
    const bidLow = rideB.bidFloorFare;
    res = await bid(sB1, sB1, bidHigh);
    check(res.submitted?.bid?.bidFare === bidHigh, `driver 1 bids Rs${bidHigh}`, JSON.stringify(res));
    res = await bid(sB2, sB2, bidMid);
    check(res.submitted?.bid?.bidFare === bidMid, `driver 2 bids Rs${bidMid}`, JSON.stringify(res));
    res = await bid(sB3, sB3, bidLow);
    check(res.submitted?.bid?.bidFare === bidLow, `driver 3 bids Rs${bidLow} (below the package price)`, JSON.stringify(res));
    res = await bid(sB1, sB1, bidMid + step);
    check(res.submitted?.bid?.bidFare === bidMid + step, 'a driver can revise their own bid (one bid per driver)', JSON.stringify(res));
    check((await RideBid.countDocuments({ rideId: rideB._id })) === 3, 'exactly one bid row per driver');
    const liveUpdates = sUB.of('rideBidUpdated');
    check(liveUpdates.length >= 4, 'rider app receives each bid live', `${liveUpdates.length} events`);

    r = await call('GET', `/rides/${rideB._id}/bids`, { token: uB.token });
    const listed = r.data?.bids || [];
    check(r.status === 200 && listed.length === 3 && listed[0].bidFare <= listed[1].bidFare && listed[1].bidFare <= listed[2].bidFare, 'rider sees all bids sorted lowest first', JSON.stringify(listed.map((b) => b.bidFare)));
    check(listed.every((b) => b.driver?.name), 'each bid shows driver and vehicle details');
    r = await call('GET', `/rides/${rideB._id}/bids`, { token: uOther.token });
    check(r.status === 404, "another rider can't read my bids", `${r.status}`);

    // rider raises the ceiling so drivers may bid higher
    r = await call('PATCH', `/rides/${rideB._id}/bids/ceiling`, { token: uB.token, body: { incrementSteps: 1 } });
    check(r.status === 200 && r.data?.userMaxBidFare === rideB.userMaxBidFare + step, 'rider can raise their max one step', `${r.status} ${r.message} ${r.data?.userMaxBidFare}`);
    const ceilingHard = rideB.bidCeilingMaxFare;
    r = await call('PATCH', `/rides/${rideB._id}/bids/ceiling`, { token: uB.token, body: { incrementSteps: 99 } });
    note(`after a 99-step raise the rider max is Rs${r.data?.userMaxBidFare} (admin hard ceiling Rs${ceilingHard}); status ${r.status}`);
    check(r.status === 200 && r.data?.userMaxBidFare <= ceilingHard, "rider's max can never exceed the admin's highest bid level", `${r.status} max=${r.data?.userMaxBidFare} ceiling=${ceilingHard}`);

    // rider picks the lowest bid
    const lowBid = listed[0];
    const otherPending = listed.filter((b) => b.id !== lowBid.id);
    r = await call('POST', `/rides/${rideB._id}/bids/${otherPending[0].id}/accept`, { token: uOther.token });
    check(r.status !== 200, "another rider can't accept a bid on my ride", `${r.status}`);
    const driverOfLow = [dB1, dB2, dB3].find((d) => d.id === lowBid.driverId);
    const sockOfLow = driverOfLow === dB1 ? sB1 : driverOfLow === dB2 ? sB2 : sB3;
    const balBeforeB = await driverBalance(driverOfLow.doc._id);
    r = await call('POST', `/rides/${rideB._id}/bids/${lowBid.id}/accept`, { token: uB.token });
    check(r.status === 200 && r.data?.status === 'accepted', 'rider accepts the lowest bid', `${r.status} ${r.message} ${JSON.stringify(r.payload?.errors || r.payload?.details || r.payload).slice(0, 300)}`);
    const rideAfter = await Ride.findById(rideB._id).lean();
    check(String(rideAfter.driverId) === lowBid.driverId && rideAfter.fare === lowBid.bidFare && rideAfter.biddingStatus === 'accepted', `ride fare becomes the winning bid Rs${lowBid.bidFare}`, JSON.stringify({ fare: rideAfter.fare, st: rideAfter.biddingStatus }));
    const statuses = (await RideBid.find({ rideId: rideB._id }).lean()).map((b) => `${b.bidFare}:${b.status}`).sort();
    check(statuses.filter((s) => s.endsWith(':accepted')).length === 1 && statuses.filter((s) => s.endsWith(':rejected')).length === 2, 'the other two bids are closed as rejected', statuses.join(' '));
    await sleep(800);
    check(sB1.of('rideRequestClosed').length + sB2.of('rideRequestClosed').length + sB3.of('rideRequestClosed').length >= 2, 'losing drivers are told the request is closed');
    r = await call('POST', `/rides/${rideB._id}/bids/${otherPending[0].id}/accept`, { token: uB.token });
    check(r.status === 409, 'a second accept on the same ride is refused', `${r.status} ${r.message}`);
    res = await bid(sB1 === sockOfLow ? sB2 : sB1, sB1 === sockOfLow ? sB2 : sB1, bidMid);
    check(Boolean(res.error), 'no more bids once the ride is won', JSON.stringify(res));

    const doneB = await completeRide(rideB._id, driverOfLow);
    check(!doneB.error && doneB.ride?.fare === lowBid.bidFare, `trip completes at the bid fare Rs${lowBid.bidFare}`, doneB.error || doneB.ride?.fare);
    const balAfterB = await driverBalance(driverOfLow.doc._id);
    const commB = Math.round(lowBid.bidFare * Number(pkg.package_vehicle_prices.find((p) => String(p.vehicle_type) === SEDAN)?.admin_commission_from_driver ?? commissionPct)) / 100;
    note(`winner wallet ${balBeforeB} -> ${balAfterB}; expected commission about Rs${commB} on Rs${lowBid.bidFare}`);
    check(Math.abs((balBeforeB - balAfterB) - commB) < 0.02, 'commission is taken on the winning bid, not the package price', `${balBeforeB - balAfterB} vs ${commB}`);
    await cancelActive(uB.doc);
    for (const d of [dB1, dB2, dB3]) await resetDriver(d.doc._id);

    // ── driver unavailable at accept time
    console.log('\n== C. edge cases ==');
    r = await call('POST', '/rides', { token: uB.token, body: icBody({ userMaxBidFare: Math.round(row.base_price) + 20 }) });
    const rideC = r.data?.ride;
    if (rideC?._id) made.rides.push(rideC._id);
    await sleep(1200);
    const bidC = (driver, sock, amount) => new Promise((resolve) => {
      const before = sock.log.length;
      driver.socket.emit('submitRideBid', { rideId: rideC._id, bidFare: amount });
      setTimeout(() => resolve(sock.log.slice(before).find((e) => e.event === 'rideBidSubmitted')?.payload?.bid), 800);
    });
    const placed = await bidC(sB1, sB1, Number(rideC.baseFare));
    check(Boolean(placed), 'bid placed on a second ride', JSON.stringify(placed));
    await Driver.updateOne({ _id: dB1.doc._id }, { $set: { isOnline: false } });
    r = await call('POST', `/rides/${rideC._id}/bids/${placed?.id}/accept`, { token: uB.token });
    check(r.status === 409, 'cannot accept a bid from a driver who went offline', `${r.status} ${r.message}`);
    await Driver.updateOne({ _id: dB1.doc._id }, { $set: { isOnline: true } });
    r = await call('PATCH', `/rides/${rideC._id}/cancel`, { token: uB.token, body: { reason: 'test' } });
    note(`cancel ride with open bids -> ${r.status} ${r.message || ''}`);
    const afterCancel = await Ride.findById(rideC._id).lean();
    const bidsAfterCancel = await RideBid.find({ rideId: rideC._id }).lean();
    check(afterCancel.status === 'cancelled' && afterCancel.biddingStatus === 'cancelled', 'cancelled ride closes bidding', JSON.stringify({ s: afterCancel.status, b: afterCancel.biddingStatus }));
    check(bidsAfterCancel.every((b) => b.status !== 'pending'), 'bids on a cancelled ride are no longer pending', bidsAfterCancel.map((b) => b.status).join());
    res = await bid(sB2, sB2, Number(rideC.baseFare));
    await cancelActive(uB.doc);
  }

  // ═══════════════════════════════════════════ D. promo, timing and distance settings
  console.log('\n== D. promo on a local bid ride, admin timing and distance settings ==');
  {
    const { PromoCode } = await import('../src/modules/taxi/admin/promotions/models/PromoCode.js');
    const { PromoUserCounter } = await import('../src/modules/taxi/admin/promotions/models/PromoUserCounter.js');
    const { PromoRedemption } = await import('../src/modules/taxi/admin/promotions/models/PromoRedemption.js');
    const uD = await mkUser('03');
    const promo = await PromoCode.create({
      code: `${TAG}${st}`, active: true, from_date: new Date(Date.now() - 3600000), to_date: new Date(Date.now() + 86400000),
      transport_type: 'all', service_location_id: SERVICE_LOCATION, service_location_ids: [SERVICE_LOCATION],
      discount_percentage: 20, maximum_discount_amount: 0, uses_per_user: 5, max_uses_total: 0,
    });
    restore.push(async () => {
      await PromoRedemption.deleteMany({ promo_id: promo._id });
      await PromoUserCounter.deleteMany({ promo_id: promo._id });
      await PromoCode.deleteOne({ _id: promo._id });
    });
    r = await call('POST', '/rides', { token: uD.token, body: rideBody({ fare: roadFare, bookingMode: 'bidding', userMaxBidFare: roadFare, promo_code: promo.code }) });
    const rideD = r.data?.ride;
    if (rideD?._id) made.rides.push(rideD._id);
    const discount = rideD?.promo?.discount_amount || 0;
    check(r.status === 201 && discount > 0 && rideD.fare === roadFare - discount, `promo applies to the shown fare (Rs${roadFare} - Rs${discount})`, `${r.status} ${r.message} fare=${rideD?.fare}`);
    await Ride.updateOne({ _id: rideD._id }, { $set: { nextFareIncreaseAt: new Date(Date.now() - 1000) } });
    r = await call('PATCH', `/rides/${rideD._id}/bids/ceiling`, { token: uD.token, body: { incrementSteps: 99 } });
    check(r.status === 200 && r.data?.fare === rideD.bidCeilingMaxFare - discount, `raises stop at the ceiling minus the promo discount (Rs${rideD.bidCeilingMaxFare - discount})`, `${r.status} ${r.message} fare=${r.data?.fare}`);
    await cancelActive(uD.doc);

    // timing: search 2s, rider gets 3s to decide when bids are waiting
    const transportBefore = await AdminBusinessSetting.findOne({ scope: 'default' }).select('transport_ride').lean();
    restore.push(() => AdminBusinessSetting.updateOne({ scope: 'default' }, { $set: { transport_ride: transportBefore?.transport_ride || {} } }));
    const setTransport = (patch) => AdminBusinessSetting.updateOne({ scope: 'default' }, { $set: Object.fromEntries(Object.entries(patch).map(([k, v]) => [`transport_ride.${k}`, v])) });
    const pkgD = await SetPrice.findOne({ pricing_scope: 'package', active: 1, status: 'active', 'package_vehicle_prices.vehicle_type': SEDAN }).lean();
    const rowD = pkgD.package_vehicle_prices.find((x) => String(x.vehicle_type) === SEDAN);
    const bidBody = () => rideBody({
      fare: Math.round(rowD.base_price), serviceType: 'intercity', transport_type: 'intercity', bookingMode: 'bidding', userMaxBidFare: Math.round(rowD.base_price) + 20,
      intercity: { packageId: String(pkgD._id), tripType: 'One Way', fromCity: 'A', toCity: 'B' },
    });
    await setTransport({ trip_accept_reject_duration_for_driver: '1', maximum_time_for_find_drivers_for_bitting_ride: '2', maximum_time_for_accept_reject_bidding_ride: '3', maximum_time_for_find_drivers_for_regular_ride: '300', bidding_ride_maximum_distance: '50' });
    const uE = await mkUser('04');
    const dE = await mkDriver('21');
    const sE = await connect(dE.token);
    const statusOf = async (id) => (await Ride.findById(id).select('status biddingStatus').lean());

    r = await call('POST', '/rides', { token: uE.token, body: bidBody() });
    const rideNoBids = r.data?.ride;
    if (rideNoBids?._id) made.rides.push(rideNoBids._id);
    await sleep(5000);
    check((await statusOf(rideNoBids._id)).status === 'cancelled', 'bid ride with no bids closes when the admin search time ends', JSON.stringify(await statusOf(rideNoBids._id)));
    await cancelActive(uE.doc);
    await resetDriver(dE.doc._id);

    r = await call('POST', '/rides', { token: uE.token, body: bidBody() });
    const rideWithBid = r.data?.ride;
    if (rideWithBid?._id) made.rides.push(rideWithBid._id);
    await sleep(800);
    sE.socket.emit('submitRideBid', { rideId: rideWithBid._id, bidFare: Number(rideWithBid.baseFare) });
    await sleep(1800);
    check((await statusOf(rideWithBid._id)).status === 'searching', 'with a bid waiting, the ride stays open past the search time (rider decision window)', JSON.stringify(await statusOf(rideWithBid._id)));
    await sleep(3800);
    const closed = await statusOf(rideWithBid._id);
    const bidAfter = await RideBid.findOne({ rideId: rideWithBid._id }).lean();
    check(closed.status === 'cancelled' && bidAfter?.status === 'expired', 'ride closes and the bid expires once the rider decision window ends', JSON.stringify({ closed, bid: bidAfter?.status }));
    await cancelActive(uE.doc);
    await resetDriver(dE.doc._id);

    // a rider who picks a bid inside the window wins normally
    r = await call('POST', '/rides', { token: uE.token, body: bidBody() });
    const rideInTime = r.data?.ride;
    if (rideInTime?._id) made.rides.push(rideInTime._id);
    await sleep(800);
    sE.socket.emit('submitRideBid', { rideId: rideInTime._id, bidFare: Number(rideInTime.baseFare) });
    await sleep(2200);
    const pendingBid = await RideBid.findOne({ rideId: rideInTime._id, status: 'pending' }).lean();
    r = await call('POST', `/rides/${rideInTime._id}/bids/${pendingBid?._id}/accept`, { token: uE.token });
    check(r.status === 200 && (await statusOf(rideInTime._id)).status === 'accepted', 'choosing a bid inside the decision window still works', `${r.status} ${r.message}`);
    await cancelActive(uE.doc);
    await resetDriver(dE.doc._id);

    // distance: a driver ~1.6 km away is skipped when bidding rides are capped at 1 km (all other test drivers go offline so only this one can match)
    await Driver.updateMany({ _id: { $in: made.drivers, $ne: dE.doc._id } }, { $set: { isOnline: false } });
    await Driver.updateOne({ _id: dE.doc._id }, { $set: { location: { type: 'Point', coordinates: [PICKUP[0] + 0.016, PICKUP[1]] } } });
    await setTransport({ maximum_time_for_find_drivers_for_bitting_ride: '300', maximum_time_for_accept_reject_bidding_ride: '60', trip_accept_reject_duration_for_driver: '15', bidding_ride_maximum_distance: '1' });
    const seenBefore = sE.of('rideRequest').length;
    r = await call('POST', '/rides', { token: uE.token, body: bidBody() });
    const rideCap = r.data?.ride;
    if (rideCap?._id) made.rides.push(rideCap._id);
    await sleep(1500);
    check(sE.of('rideRequest').length === seenBefore, 'bidding distance cap keeps farther drivers out', `${sE.of('rideRequest').length - seenBefore} requests`);
    await cancelActive(uE.doc);
    await setTransport({ bidding_ride_maximum_distance: '50' });
    const seenMid = sE.of('rideRequest').length;
    r = await call('POST', '/rides', { token: uE.token, body: bidBody() });
    const rideNoCap = r.data?.ride;
    if (rideNoCap?._id) made.rides.push(rideNoCap._id);
    await sleep(1500);
    check(sE.of('rideRequest').length > seenMid, 'the same driver is offered the ride when the cap allows it', `${sE.of('rideRequest').length - seenMid} requests; create=${r.status} ${r.message}; driver=${JSON.stringify(await Driver.findById(dE.doc._id).select('isOnline isOnRide location').lean())}`);
    await cancelActive(uE.doc);
  }
} catch (error) {
  bad('bid suite crashed', error?.stack || error);
} finally {
  for (const socket of sockets) socket.close();
  for (const undo of restore.reverse()) { try { await undo(); } catch (error) { console.error('restore failed', error); } }
  if (mongoose.connection.readyState === 1) {
    await RideBid.deleteMany({ rideId: { $in: made.rides } });
    await Ride.deleteMany({ $or: [{ _id: { $in: made.rides } }, { userId: { $in: made.users } }] });
    await WalletTransaction.deleteMany({ driverId: { $in: made.drivers } });
    await Driver.deleteMany({ _id: { $in: made.drivers } });
    await UserWallet.deleteMany({ userId: { $in: made.users } });
    await User.deleteMany({ _id: { $in: made.users } });
    await mongoose.disconnect();
  }
  const failed = results.filter((x) => x[0] === 'FAIL');
  console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
  process.exit(failed.length ? 1 : 0);
}
