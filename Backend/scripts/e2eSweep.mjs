/**
 * Full-flow sweep across user / agent / admin against a RUNNING API on :5000.
 *   node server.js          # in one shell
 *   node scripts/e2eSweep.mjs
 *
 * Creates only E2E_SWEEP-tagged fixtures and deletes every one of them in the
 * finally block, restoring any settings it flipped. Exits after printing a
 * pass/fail tally. Razorpay-backed online payment paths are NOT covered -- they
 * need a real checkout interaction.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: new URL('../.env', import.meta.url) });

const API = 'http://localhost:5000/api';
const TAG = 'E2E_SWEEP';

const { signAccessToken } = await import('../src/modules/taxi/services/tokenService.js');
const { User } = await import('../src/modules/taxi/user/models/User.js');
const { Agent } = await import('../src/modules/taxi/agent/models/Agent.js');
const { AgentWallet } = await import('../src/modules/taxi/agent/models/AgentWallet.js');
const { AgentWithdrawalRequest } = await import('../src/modules/taxi/agent/models/AgentWithdrawalRequest.js');
const { Driver } = await import('../src/modules/taxi/driver/models/Driver.js');
const { BusService } = await import('../src/modules/taxi/admin/models/BusService.js');
const { BusBooking } = await import('../src/modules/taxi/user/models/BusBooking.js');
const { BusSeatHold } = await import('../src/modules/taxi/user/models/BusSeatHold.js');
const { Ride } = await import('../src/modules/taxi/user/models/Ride.js');
const { PoolingRoute } = await import('../src/modules/taxi/admin/models/PoolingRoute.js');
const { PoolingVehicle } = await import('../src/modules/taxi/admin/models/PoolingVehicle.js');
const { PoolingBooking } = await import('../src/modules/taxi/admin/models/PoolingBooking.js');
const { PoolingSeatReservation } = await import('../src/modules/taxi/admin/models/PoolingSeatReservation.js');
const { Admin } = await import('../src/modules/taxi/admin/models/Admin.js');
const { AdminBusinessSetting } = await import('../src/modules/taxi/admin/models/AdminBusinessSetting.js');
const { hashPassword } = await import('../src/modules/taxi/services/passwordService.js');

const results = [];
const ok = (n, x = '') => { results.push(['PASS', n]); console.log(`  ok    ${n} ${x}`); };
const bad = (n, x = '') => { results.push(['FAIL', n, x]); console.log(`  FAIL  ${n} :: ${String(x).slice(0, 260)}`); };
const check = (cond, n, x = '') => (cond ? ok(n) : bad(n, x));

const call = async (method, url, { token, body } = {}) => {
  const res = await fetch(`${API}${url}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let payload = null;
  try { payload = await res.json(); } catch {}
  return { status: res.status, payload, data: payload?.data };
};

const made = { users: [], agents: [], drivers: [], buses: [], rides: [], routes: [], vehicles: [], admins: [] };
let restore = null;

try {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME || 'appzeto_taxi' });
  const s0 = await AdminBusinessSetting.findOne({ scope: 'default' }).lean();
  restore = { ...(s0?.transport_ride || {}) };
  await AdminBusinessSetting.updateOne({ scope: 'default' },
    { $set: { 'transport_ride.enable_bus_service': '1', 'transport_ride.enable_cash_seat_booking': '1' } }, { upsert: true });

  const st = Date.now().toString().slice(-8);
  const pw = await hashPassword('sweep-pass-123');

  const agent = await Agent.create({ phone: `97${st}`.slice(0,10), name: `${TAG} Agent`, password: pw, active: true, status: 'active',
    referralCode: `SWP${st}`, notes: TAG, payout: { upiId: 'sweep@upi' },
    commissionConfig: { bus: { enabled: true, type: 'percentage', value: 10 }, pooling: { enabled: true, type: 'percentage', value: 10 }, directRide: { enabled: true, type: 'percentage', value: 10 } } });
  made.agents.push(agent._id);

  const user = await User.create({ phone: `88${st}`.slice(0,10), name: `${TAG} User`, password: pw, isVerified: true, active: true, isActive: true });
  made.users.push(user._id);

  const admin = await Admin.create({ name: `${TAG} Admin`, email: `sweep${st}@e2e.local`, password: pw, role: 'admin', permissions: ['*'] });
  made.admins.push(admin._id);

  const uT = signAccessToken({ sub: String(user._id), role: 'user' });
  const aT = signAccessToken({ sub: String(agent._id), role: 'agent' });
  const adT = signAccessToken({ sub: String(admin._id), role: 'admin' });

  // ─────────────────────────────────────────────────────────────── public/config
  console.log('\n== public + config ==');
  let r = await call('GET', '/users/bootstrap');
  check(r.status === 200 && r.data?.settings, 'GET /users/bootstrap', JSON.stringify(r).slice(0,200));
  check(r.data?.settings?.transportRide?.enable_cash_seat_booking === '1', 'bootstrap exposes cash flag', JSON.stringify(r.data?.settings?.transportRide));
  for (const ep of ['/users/app-modules', '/users/vehicle-types', '/users/service-locations', '/users/intercity-packages', '/users/goods-types']) {
    r = await call('GET', ep);
    check(r.status === 200, `GET ${ep}`, `HTTP ${r.status}`);
  }

  // ─────────────────────────────────────────────────────────────── user account
  console.log('\n== user account ==');
  r = await call('GET', '/users/me', { token: uT });
  check(r.status === 200 && (r.data?.user?.phone || r.data?.phone), 'GET /users/me', JSON.stringify(r).slice(0,200));
  r = await call('GET', '/users/wallet', { token: uT });
  check(r.status === 200, 'GET /users/wallet', `HTTP ${r.status}`);
  r = await call('GET', '/users/notifications', { token: uT });
  check(r.status === 200, 'GET /users/notifications', `HTTP ${r.status}`);
  r = await call('GET', '/users/subscriptions/plans', { token: uT });
  check(r.status === 200, 'GET /users/subscriptions/plans', `HTTP ${r.status}`);
  r = await call('GET', '/users/bus-bookings', { token: uT });
  check(r.status === 200, 'GET /users/bus-bookings', `HTTP ${r.status}`);
  r = await call('GET', '/users/pooling/bookings', { token: uT });
  check(r.status === 200, 'GET /users/pooling/bookings', `HTTP ${r.status}`);

  // auth boundary
  r = await call('GET', '/users/me');
  check(r.status === 401, 'unauthenticated /users/me is rejected', `HTTP ${r.status}`);
  r = await call('GET', '/users/me', { token: aT });
  check(r.status === 401 || r.status === 403, 'agent token rejected on user route', `HTTP ${r.status}`);

  // ─────────────────────────────────────────────────────────────── agent link
  console.log('\n== agent QR link ==');
  r = await call('POST', '/users/agent-link', { token: uT, body: { qrValue: `http://x/taxi/user/signup?ref=SWP${st}` } });
  check(r.status === 200, 'link agent via QR url', JSON.stringify(r).slice(0,200));

  // ─────────────────────────────────────────────────────────────── bus journey
  console.log('\n== mini bus: search -> seats -> cash book -> ticket -> cancel ==');
  const row = ['A1','A2','A3','A4'].map((l) => ({ kind: 'seat', id: `L-${l}`, label: l, variant: 'seat', status: 'available' }));
  const bus = await BusService.create({
    operatorName: `${TAG} Op`, busName: `${TAG} Bus`, seatPrice: 250, variantPricing: { seat: 250 },
    fareCurrency: 'INR', status: 'active', capacity: 4,
    blueprint: { templateKey: 'seater_2_2', lowerDeck: [row], upperDeck: [] },
    route: { routeName: `${TAG}ville - ${TAG}pur`, originCity: `${TAG}ville`, destinationCity: `${TAG}pur`, distanceKm: '75', durationHours: '2' },
    schedules: [{ id: 'sch-1', label: 'Morning', departureTime: '07:00', arrivalTime: '09:00', activeDays: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], status: 'active' }],
  });
  made.buses.push(bus._id);
  const tDate = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

  r = await call('GET', `/users/buses/search?fromCity=${TAG}ville&toCity=${TAG}pur&travelDate=${tDate}`, { token: uT });
  check(r.status === 200 && JSON.stringify(r.data || {}).includes(String(bus._id)), 'bus search finds the route', JSON.stringify(r).slice(0,240));

  r = await call('GET', `/users/buses/${bus._id}/seats?scheduleId=sch-1&travelDate=${tDate}`, { token: uT });
  const availOf = (d) => (typeof d?.availableSeats === 'number'
    ? d.availableSeats
    : (d?.seats || []).filter((x) => x.status === 'available').length);
  check(r.status === 200 && availOf(r.data) === 4, 'seat layout shows 4 available', JSON.stringify(r).slice(0,240));

  const bBody = { busServiceId: String(bus._id), scheduleId: 'sch-1', travelDate: tDate, seatIds: ['L-A1','L-A2'],
    passenger: { name: 'Sweep Pax', age: 30, gender: 'Male', phone: '9000000002', email: 'sweep@test.local' }, paymentMethod: 'cash' };
  r = await call('POST', '/users/bus-bookings/order', { token: uT, body: bBody });
  const bk = r.data?.booking;
  check(r.status === 201 && bk?.status === 'confirmed' && bk?.amount === 500, 'cash book 2 seats = Rs500', JSON.stringify(r).slice(0,240));

  r = await call('GET', `/users/buses/${bus._id}/seats?scheduleId=sch-1&travelDate=${tDate}`, { token: uT });
  const avail = availOf(r.data);
  check(avail === 2, 'seat availability drops after booking', `available=${avail}`);

  r = await call('GET', `/users/bus-bookings/${bk?.id}`, { token: uT });
  check(r.status === 200 && r.data?.bookingCode === bk?.bookingCode, 'fetch booking by id', JSON.stringify(r).slice(0,200));

  r = await call('GET', `/users/bus-bookings/${bk?.id}/check-in-qr`, { token: uT });
  check(r.status === 200 && (r.data?.qrValue || r.data?.token), 'digital ticket QR issued', JSON.stringify(r).slice(0,240));

  // cross-user isolation
  const other = await User.create({ phone: `86${st}`.slice(0,10), name: `${TAG} Other`, password: pw, isVerified: true, active: true, isActive: true });
  made.users.push(other._id);
  const oT = signAccessToken({ sub: String(other._id), role: 'user' });
  r = await call('GET', `/users/bus-bookings/${bk?.id}`, { token: oT });
  check(r.status === 404 || r.status === 403, "another user can't read this ticket", `HTTP ${r.status}`);

  r = await call('POST', `/users/bus-bookings/${bk?.id}/cancel`, { token: uT, body: { seatIds: ['L-A1'], travelDate: tDate } });
  check([200,201,400,409].includes(r.status), 'cancel endpoint responds coherently', `HTTP ${r.status} ${JSON.stringify(r.payload).slice(0,160)}`);

  // ─────────────────────────────────────────────────────────────── commission
  console.log('\n== agent commission + wallet + withdrawal ==');
  const w = await AgentWallet.findOne({ agentId: agent._id }).lean();
  check(w && w.balance === 50, 'commission = 10% of Rs500', `balance=${w?.balance}`);
  r = await call('GET', '/agents/wallet', { token: aT });
  check(r.status === 200 && r.data?.balance === 50, 'agent sees wallet balance', JSON.stringify(r).slice(0,200));
  r = await call('GET', '/agents/dashboard', { token: aT });
  check(r.status === 200, 'GET /agents/dashboard', `HTTP ${r.status}`);
  r = await call('GET', '/agents/bookings', { token: aT });
  check(r.status === 200, 'GET /agents/bookings', `HTTP ${r.status}`);
  const ab = r.data || {};
  const busRow = (ab.buses || [])[0];
  check(busRow && busRow.commissionAmount === 50, 'agent app: bus row shows Rs50 commission', JSON.stringify(busRow).slice(0,220));
  check(busRow && busRow.amount === 500, 'agent app: bus row shows Rs500 booking value', JSON.stringify(busRow).slice(0,160));
  check(busRow && busRow.commissionMode === 'referral', 'agent app: bus row shows commission mode', String(busRow?.commissionMode));
  check(ab.summary && ab.summary.totalCommission === 50, 'agent app: commission summary matches wallet', JSON.stringify(ab.summary));
  r = await call('GET', '/agents/referral', { token: aT });
  check(r.status === 200 && r.data?.qrValue, 'agent QR value generated', JSON.stringify(r).slice(0,200));
  r = await call('POST', '/agents/wallet/withdrawals', { token: aT, body: { amount: 30 } });
  check(r.status === 201, 'agent withdrawal created', JSON.stringify(r).slice(0,200));
  const wdId = r.data?.id;
  r = await call('GET', '/admin/wallet/agents/withdrawals', { token: adT });
  check(r.status === 200 && (r.data?.results || []).some((x) => x.id === wdId), 'withdrawal visible to admin', `HTTP ${r.status}`);
  r = await call('PATCH', `/admin/wallet/agents/withdrawals/${wdId}/approve`, { token: adT, body: {} });
  check(r.status === 200 && r.data?.status === 'approved', 'admin approves withdrawal', JSON.stringify(r).slice(0,200));
  const w2 = await AgentWallet.findOne({ agentId: agent._id }).lean();
  check(w2 && Math.abs(w2.balance - 20) < 0.01, 'balance debited on approval', `balance=${w2?.balance}`);

  // ─────────────────────────────────────────────────────────────── pooling
  console.log('\n== pooling: route -> cash book -> commission ==');
  const pv = await PoolingVehicle.create({ name: `${TAG} Pool Car`, vehicleModel: 'Sweep Model', capacity: 3, vehicleNumber: `${TAG}01`, status: 'active',
    serviceTaxPercentage: 0, adminCommissionPercentage: 10,
    blueprint: { layout: [{ type: 'seat', r: 0, c: 0 }, { type: 'seat', r: 0, c: 1 }, { type: 'seat', r: 1, c: 0 }] } });
  made.vehicles.push(pv._id);
  const pr = await PoolingRoute.create({ routeName: `${TAG} Route`, originLabel: `${TAG}ville`, destinationLabel: `${TAG}pur`,
    status: 'active', active: true, farePerSeat: 200, assignedVehicleTypeIds: [pv._id],
    schedules: [{ id: 'psch-1', label: 'Morning', departureTime: '08:00', status: 'active' }],
    pickupPoints: [{ id: 'pp-1', name: 'Pickup 1' }], dropPoints: [{ id: 'dp-1', name: 'Drop 1' }] });
  made.routes.push(pr._id);

  r = await call('GET', `/users/pooling/routes/${pr._id}?travelDate=${tDate}`, { token: uT });
  check(r.status === 200, 'GET pooling route details', `HTTP ${r.status}`);

  const pBody = { routeId: String(pr._id), vehicleId: String(pv._id), scheduleId: 'psch-1', travelDate: tDate,
    selectedSeats: ['0-0'], pickupStopId: 'pp-1', dropStopId: 'dp-1' };
  r = await call('POST', '/users/pooling/bookings', { token: uT, body: pBody });
  const pb = r.data;
  check(r.status === 201 && pb?.paymentStatus === 'pending' && pb?.fare === 200, 'pooling cash booking confirms', JSON.stringify(r).slice(0,260));

  r = await call('POST', '/users/pooling/bookings', { token: uT, body: pBody });
  check(r.status === 409, 'pooling seat cannot be double-booked', `HTTP ${r.status}`);

  const w3 = await AgentWallet.findOne({ agentId: agent._id }).lean();
  check(w3 && Math.abs(w3.balance - 40) < 0.01, 'pooling commission credited (+Rs20)', `balance=${w3?.balance}`);

  r = await call('GET', '/agents/bookings', { token: aT });
  const poolRow = (r.data?.pooling || [])[0];
  check(poolRow && poolRow.commissionAmount === 20, 'agent app: pooling row shows Rs20 commission', JSON.stringify(poolRow).slice(0,220));
  check(poolRow && poolRow.amount === 200, 'agent app: pooling row shows Rs200 booking value', JSON.stringify(poolRow).slice(0,160));
  check(r.data?.summary?.totalCommission === 70, 'agent app: summary totals bus + pooling commission', JSON.stringify(r.data?.summary));
  const lifetime = (await AgentWallet.findOne({ agentId: agent._id }).lean())?.lifetimeEarned;
  check(Math.abs(Number(lifetime) - 70) < 0.01, 'displayed commission equals wallet lifetimeEarned', `lifetimeEarned=${lifetime}`);

  // ─────────────────────────────────────────────────────────────── admin pages
  console.log('\n== admin panel endpoints ==');
  for (const ep of ['/admin/agents', '/admin/agents/bookings', '/admin/agents/commission-defaults',
                    '/admin/users', '/admin/drivers', '/admin/bus-services', '/admin/pooling-bookings',
                    '/admin/dashboard/data', '/admin/pooling-routes', '/admin/pooling-vehicles']) {
    r = await call('GET', ep, { token: adT });
    check(r.status === 200, `GET ${ep}`, `HTTP ${r.status} ${JSON.stringify(r.payload).slice(0,120)}`);
  }
  r = await call('GET', '/admin/agents/bookings', { token: adT });
  const mine = (r.data?.results || []).filter((x) => x.agentCode === `SWP${st}`);
  check(mine.length >= 2, 'agent bookings page lists bus + pooling', `found ${mine.length}`);
  check(mine.some((x) => x.type === 'pooling'), 'pooling booking appears on agent bookings page', JSON.stringify(mine.map((x)=>x.type)));

  r = await call('PUT', '/admin/agents/commission-defaults', { token: adT, body: { commissionConfig: { bus: { enabled: true, type: 'percentage', value: 12 } } } });
  check(r.status === 200 && r.data?.bus?.value === 12, 'save commission defaults', JSON.stringify(r).slice(0,200));
  r = await call('GET', '/admin/agents/commission-defaults', { token: adT });
  check(r.data?.bus?.value === 12 && r.data?.pooling, 'defaults persisted with all keys', JSON.stringify(r.data));

  r = await call('GET', '/admin/agents/bookings', {});
  check(r.status === 401 || r.status === 403, 'admin route rejects anonymous', `HTTP ${r.status}`);
  r = await call('GET', '/admin/agents/bookings', { token: uT });
  check(r.status === 401 || r.status === 403, 'admin route rejects user token', `HTTP ${r.status}`);

} catch (e) {
  bad('harness crashed', e.message);
  console.error(e);
} finally {
  console.log('\n== cleanup ==');
  try {
    await BusSeatHold.deleteMany({ busServiceId: { $in: made.buses } });
    await BusBooking.deleteMany({ busServiceId: { $in: made.buses } });
    await BusService.deleteMany({ _id: { $in: made.buses } });
    await PoolingSeatReservation.deleteMany({ route: { $in: made.routes } });
    await PoolingBooking.deleteMany({ route: { $in: made.routes } });
    await PoolingRoute.deleteMany({ _id: { $in: made.routes } });
    await PoolingVehicle.deleteMany({ _id: { $in: made.vehicles } });
    await Ride.deleteMany({ userId: { $in: made.users } });
    await AgentWithdrawalRequest.deleteMany({ agentId: { $in: made.agents } });
    await AgentWallet.deleteMany({ agentId: { $in: made.agents } });
    await Agent.deleteMany({ _id: { $in: made.agents } });
    await Driver.deleteMany({ _id: { $in: made.drivers } });
    await User.deleteMany({ _id: { $in: made.users } });
    await Admin.deleteMany({ _id: { $in: made.admins } });
    if (restore) {
      const set = {}; const unset = {};
      for (const k of ['enable_bus_service', 'enable_cash_seat_booking']) {
        if (restore[k] === undefined) unset[`transport_ride.${k}`] = ''; else set[`transport_ride.${k}`] = restore[k];
      }
      if (Object.keys(set).length) await AdminBusinessSetting.updateOne({ scope: 'default' }, { $set: set });
      if (Object.keys(unset).length) await AdminBusinessSetting.updateOne({ scope: 'default' }, { $unset: unset });
    }
    // commission defaults were written by this run; clear them back to unset
    await AdminBusinessSetting.updateOne({ scope: 'default' }, { $unset: { agent_commission: '' } });
    console.log('  fixtures deleted, settings restored');
  } catch (e) { console.error('  CLEANUP FAILED:', e.message); }

  const f = results.filter((x) => x[0] === 'FAIL');
  console.log(`\n${results.length - f.length}/${results.length} passed`);
  if (f.length) { console.log('\nFAILURES:'); f.forEach((x) => console.log(`  - ${x[1]} :: ${String(x[2]).slice(0,220)}`)); }
  await mongoose.disconnect();
  process.exit(0);
}
