/**
 * Entertainment ticketing regression suite. Starts the API in-process on a local
 * database and replaces the Razorpay client with an in-memory gateway, so orders,
 * payments, signature checks and refunds can be exercised without real money.
 *
 *   MONGODB_URI=mongodb://127.0.0.1:27018/?replicaSet=rs0 MONGODB_DB_NAME=appzeto_taxi_qa \
 *   node scripts/e2eEntertainment.mjs
 */
import crypto from 'node:crypto';
import dotenv from 'dotenv';
dotenv.config({ path: new URL('../.env', import.meta.url) });

if (!/^mongodb:\/\/(127\.0\.0\.1|localhost)[:/]/.test(String(process.env.MONGODB_URI || ''))) {
  console.error('Refusing to run: MONGODB_URI must point at a local database.');
  process.exit(1);
}

const { default: mongoose } = await import('mongoose');
const { createApp } = await import('../src/app.js');
const { signAccessToken } = await import('../src/modules/taxi/services/tokenService.js');
const { hashPassword } = await import('../src/modules/taxi/services/passwordService.js');
const { User } = await import('../src/modules/taxi/user/models/User.js');
const { Agent } = await import('../src/modules/taxi/agent/models/Agent.js');
const { AgentWallet } = await import('../src/modules/taxi/agent/models/AgentWallet.js');
const { Admin } = await import('../src/modules/taxi/admin/models/Admin.js');
const { AdminBusinessSetting } = await import('../src/modules/taxi/admin/models/AdminBusinessSetting.js');
const { PaymentCapture } = await import('../src/modules/taxi/common/models/PaymentCapture.js');
const { VenueCategory } = await import('../src/modules/taxi/entertainment/models/VenueCategory.js');
const { VenuePartner } = await import('../src/modules/taxi/entertainment/models/VenuePartner.js');
const { Venue } = await import('../src/modules/taxi/entertainment/models/Venue.js');
const { VenueSlotInventory } = await import('../src/modules/taxi/entertainment/models/VenueSlotInventory.js');
const { EntertainmentBooking } = await import('../src/modules/taxi/entertainment/models/EntertainmentBooking.js');
const { VenuePartnerWalletTransaction } = await import('../src/modules/taxi/entertainment/models/VenuePartnerWalletTransaction.js');
const { VenuePartnerWithdrawalRequest } = await import('../src/modules/taxi/entertainment/models/VenuePartnerWithdrawalRequest.js');
const { razorpayGateway } = await import('../src/modules/taxi/entertainment/services/razorpayClient.js');
const { todayIst, expireStaleHolds } = await import('../src/modules/taxi/entertainment/services/entertainmentService.js');

// ───── in-memory Razorpay
const SECRET = 'test_secret_e2e';
const orders = new Map();
const refunds = [];
razorpayGateway.getCredentials = async () => ({ keyId: 'rzp_test_e2e', keySecret: SECRET });
razorpayGateway.request = async ({ method, path, body }) => {
  if (method === 'POST' && path === '/orders') {
    const order = { id: `order_${crypto.randomBytes(6).toString('hex')}`, amount: body.amount, currency: 'INR', notes: body.notes };
    orders.set(order.id, order);
    return order;
  }
  if (method === 'GET' && path.startsWith('/orders/')) return orders.get(decodeURIComponent(path.slice(8)));
  if (method === 'POST' && /\/payments\/.+\/refund/.test(path)) {
    const refund = { id: `rfnd_${refunds.length + 1}`, status: 'processed', amount: body.amount };
    refunds.push(refund);
    return refund;
  }
  throw new Error(`unexpected gateway call ${method} ${path}`);
};
const pay = (orderId) => {
  const paymentId = `pay_${crypto.randomBytes(6).toString('hex')}`;
  const signature = crypto.createHmac('sha256', SECRET).update(`${orderId}|${paymentId}`).digest('hex');
  return { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature };
};

const results = [];
const check = (cond, name, info = '') => {
  results.push([cond ? 'PASS' : 'FAIL', name]);
  console.log(`  ${cond ? 'ok  ' : 'FAIL'}  ${name}${cond ? '' : ` :: ${String(info).slice(0, 300)}`}`);
};
const near = (a, b) => Math.abs(Number(a) - Number(b)) < 0.011;

await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME });
const server = createApp().listen(0);
const API = `http://127.0.0.1:${server.address().port}/api/v1`;
const call = async (method, url, { token, body } = {}) => {
  const res = await fetch(`${API}${url}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await res.json().catch(() => ({}));
  return { status: res.status, data: payload?.data, message: payload?.message };
};

const st = Date.now().toString().slice(-6);
const made = { users: [], agents: [], admins: [], partners: [], categories: [] };
const settingsBefore = await AdminBusinessSetting.findOne({ scope: 'default' }).select('entertainment').lean();
const addDays = (d, n) => new Date(new Date(`${d}T00:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);
const today = todayIst();
const weekday = (() => { for (let i = 3; i < 12; i += 1) { const d = addDays(today, i); if (![0, 6].includes(new Date(`${d}T00:00:00Z`).getUTCDay())) return d; } return addDays(today, 3); })();
const saturday = (() => { for (let i = 2; i < 10; i += 1) { const d = addDays(today, i); if (new Date(`${d}T00:00:00Z`).getUTCDay() === 6) return d; } return null; })();

try {
  const pw = await hashPassword('e2e-ent-123');
  const admin = await Admin.create({ name: 'E2E Ent Admin', email: `ent${st}@e2e.local`, password: pw, role: 'admin', permissions: ['*'] });
  made.admins.push(admin._id);
  const adminT = signAccessToken({ sub: String(admin._id), role: 'admin' });
  const limitedAdmin = await Admin.create({ name: 'E2E Limited', email: `entl${st}@e2e.local`, password: pw, role: 'admin', admin_type: 'subadmin', permissions: ['users.view'] });
  made.admins.push(limitedAdmin._id);
  const user = await User.create({ phone: `61${st}01`, name: 'E2E Ent User', password: pw, isVerified: true, active: true, isActive: true });
  const user2 = await User.create({ phone: `61${st}02`, name: 'E2E Ent User2', password: pw, isVerified: true, active: true, isActive: true });
  made.users.push(user._id, user2._id);
  const userT = signAccessToken({ sub: String(user._id), role: 'user' });
  const user2T = signAccessToken({ sub: String(user2._id), role: 'user' });

  console.log('\n== admin setup ==');
  let r = await call('GET', '/admin/entertainment/overview', { token: signAccessToken({ sub: String(limitedAdmin._id), role: 'admin' }) });
  check(r.status === 403, 'admin without Entertainment permission is blocked', r.status);
  r = await call('GET', '/admin/entertainment/overview', { token: userT });
  check([401, 403].includes(r.status), 'user token cannot use admin entertainment API', r.status);
  r = await call('POST', '/admin/entertainment/categories', { token: adminT, body: { name: `E2E Waterpark ${st}` } });
  const categoryId = r.data?.id;
  made.categories.push(categoryId);
  check(r.status === 201 && categoryId, 'admin creates category', `${r.status} ${r.message}`);
  r = await call('POST', '/admin/entertainment/partners', { token: adminT, body: { name: 'E2E Partner', businessName: 'Splash World', phone: `62${st}01`, commissionPercent: 15 } });
  const partnerId = r.data?.id;
  made.partners.push(partnerId);
  check(r.status === 201 && r.data?.commissionPercent === 15, 'admin creates partner with 15% commission', `${r.status} ${r.message}`);
  r = await call('POST', '/admin/entertainment/partners', { token: adminT, body: { name: 'Dup', phone: `62${st}01` } });
  check(r.status === 409, 'duplicate partner phone rejected', r.status);
  r = await call('POST', '/admin/entertainment/partners', { token: adminT, body: { name: 'Other Partner', phone: `62${st}02`, commissionPercent: 10 } });
  const otherPartnerId = r.data?.id;
  made.partners.push(otherPartnerId);

  await call('PUT', '/admin/entertainment/settings', {
    token: adminT,
    body: { holdMinutes: 15, refundRules: [{ label: '24h+ before', hoursBeforeVisit: 24, refundType: 'percentage', refundValue: 100 }, { label: '2-24h before', hoursBeforeVisit: 2, refundType: 'percentage', refundValue: 50 }] },
  });
  r = await call('GET', '/admin/entertainment/settings', { token: adminT });
  check(r.data?.refundRules?.length === 2 && r.data.refundRules[0].hoursBeforeVisit === 24, 'admin refund rules saved', JSON.stringify(r.data));

  console.log('\n== partner login (delivery app) ==');
  r = await call('POST', '/drivers/auth/send-otp', { body: { phone: `62${st}01`, role: 'venue_partner' } });
  const otp = r.data?.session?.debugOtp || process.env.STATIC_OTP_CODE;
  check(r.status === 201 || r.status === 200, 'partner requests login OTP', `${r.status} ${r.message}`);
  r = await call('POST', '/drivers/auth/verify-otp', { body: { phone: `62${st}01`, otp } });
  const partnerT = r.data?.token;
  check(Boolean(partnerT) && r.data?.driver?.businessName === 'Splash World', 'partner logs in with OTP', `${r.status} ${r.message}`);
  r = await call('GET', '/drivers/me', { token: partnerT });
  check(r.status === 200 && r.data?.role === 'venue_partner', 'app shell recognises partner role', `${r.status} ${JSON.stringify(r.data)}`);
  const otherPartnerT = signAccessToken({ sub: String(otherPartnerId), role: 'venue_partner' });

  console.log('\n== partner creates venue, admin approves ==');
  const venueBody = {
    name: `E2E Splash ${st}`, categoryId, city: 'Nashik', address: 'Gangapur Road', description: 'Rides and pools',
    ticketTypes: [
      { id: 'adult', name: 'Adult', price: 1000, weekendPrice: 1200 },
      { id: 'child', name: 'Child', price: 500 },
    ],
    timeSlots: [
      { id: 'morning', label: 'Morning', startTime: '10:00', endTime: '13:00', capacity: 6 },
      { id: 'evening', label: 'Evening', startTime: '15:00', endTime: '19:00', capacity: 100 },
    ],
    closedDates: [addDays(today, 5)],
  };
  r = await call('POST', '/drivers/venue/venues', { token: partnerT, body: { ...venueBody, ticketTypes: [{ name: 'Free', price: 0 }] } });
  check(r.status === 400, 'zero-priced ticket rejected', `${r.status} ${r.message}`);
  r = await call('POST', '/drivers/venue/venues', { token: partnerT, body: { ...venueBody, commissionPercent: 0, status: 'active' } });
  const venueId = r.data?.id;
  check(r.status === 201 && r.data?.status === 'pending' && r.data?.commissionPercent == null, 'new venue pending; partner cannot set status/commission', JSON.stringify(r.data).slice(0, 200));
  r = await call('GET', '/users/entertainment/venues', {});
  check(!(r.data || []).some((v) => v.id === venueId), 'pending venue hidden from customers');
  r = await call('GET', `/drivers/venue/venues/${venueId}`, { token: otherPartnerT });
  check(r.status === 404, "other partner can't see this venue", r.status);
  r = await call('PATCH', `/admin/entertainment/venues/${venueId}`, { token: adminT, body: { status: 'active' } });
  check(r.status === 200 && r.data?.status === 'active', 'admin approves venue', `${r.status} ${r.message}`);
  r = await call('GET', '/users/entertainment/venues', {});
  check((r.data || []).some((v) => v.id === venueId && v.minPrice === 500), 'approved venue listed with "from" price', JSON.stringify((r.data || []).find((v) => v.id === venueId)));

  console.log('\n== availability + server pricing ==');
  r = await call('GET', `/users/entertainment/venues/${venueId}?visitDate=${weekday}`, {});
  check(r.status === 200 && r.data?.slots?.find((s) => s.id === 'morning')?.remaining === 6, 'slot availability shown', JSON.stringify(r.data?.slots));
  r = await call('GET', `/users/entertainment/venues/${venueId}?visitDate=${addDays(today, 5)}`, {});
  check(r.data?.slots?.every((s) => !s.available && s.reason === 'closed'), 'closed date not bookable', JSON.stringify(r.data?.slots));
  r = await call('POST', '/users/entertainment/bookings/order', { token: userT, body: { venueId, visitDate: addDays(today, 5), slotId: 'evening', items: [{ ticketTypeId: 'adult', quantity: 1 }] } });
  check(r.status === 400, 'cannot book a closed date', `${r.status} ${r.message}`);
  r = await call('POST', '/users/entertainment/bookings/order', { token: userT, body: { venueId, visitDate: addDays(today, 60), slotId: 'evening', items: [{ ticketTypeId: 'adult', quantity: 1 }] } });
  check(r.status === 400, 'cannot book beyond booking window', `${r.status} ${r.message}`);
  r = await call('POST', '/users/entertainment/bookings/order', {
    token: userT,
    body: { venueId, visitDate: weekday, slotId: 'evening', amount: 1, items: [{ ticketTypeId: 'adult', quantity: 2, price: 1 }, { ticketTypeId: 'child', quantity: 1 }] },
  });
  const b1 = r.data?.booking;
  check(r.status === 201 && b1?.amount === 2500 && b1?.status === 'pending', 'weekday price 2x1000 + 1x500 = Rs2500 (client prices ignored)', `${r.status} ${r.message} ${b1?.amount}`);
  check(orders.get(r.data?.razorpayOrder?.id)?.amount === 250000, 'gateway order created for Rs2500');
  if (saturday) {
    r = await call('POST', '/users/entertainment/bookings/order', { token: user2T, body: { venueId, visitDate: saturday, slotId: 'evening', items: [{ ticketTypeId: 'adult', quantity: 1 }] } });
    check(r.data?.booking?.amount === 1200, 'Saturday uses weekend price Rs1200', r.data?.booking?.amount);
  }

  console.log('\n== payment verification ==');
  const order1 = r.data && b1 ? (await EntertainmentBooking.findById(b1.id).lean()).payment.orderId : null;
  r = await call('POST', '/users/entertainment/bookings/verify', { token: userT, body: { ...pay(order1), razorpay_signature: 'forged' } });
  check(r.status === 400, 'forged signature rejected', `${r.status} ${r.message}`);
  r = await call('POST', '/users/entertainment/bookings/verify', { token: user2T, body: pay(order1) });
  check(r.status === 404, "another user can't confirm my booking", r.status);
  const payment1 = pay(order1);
  const [v1, v2] = await Promise.all([
    call('POST', '/users/entertainment/bookings/verify', { token: userT, body: payment1 }),
    call('POST', '/users/entertainment/bookings/verify', { token: userT, body: payment1 }),
  ]);
  check(v1.status === 200 && v2.status === 200 && v1.data?.status === 'confirmed', 'payment confirms booking (double submit safe)', `${v1.status}/${v2.status} ${v1.message}`);
  let partner = await VenuePartner.findById(partnerId).lean();
  check(near(partner.wallet.balance, 2125), 'partner credited Rs2125 (2500 - 15%) exactly once', partner.wallet.balance);
  const savedB1 = await EntertainmentBooking.findById(b1.id).lean();
  check(near(savedB1.commissionAmount, 375) && near(savedB1.partnerEarning, 2125), 'admin commission Rs375 recorded', JSON.stringify({ c: savedB1.commissionAmount, p: savedB1.partnerEarning }));

  console.log('\n== capacity cannot be oversold ==');
  const attempts = await Promise.all(Array.from({ length: 6 }, (_, i) => call('POST', '/users/entertainment/bookings/order', {
    token: i % 2 ? userT : user2T,
    body: { venueId, visitDate: weekday, slotId: 'morning', items: [{ ticketTypeId: 'adult', quantity: 2 }] },
  })));
  const accepted = attempts.filter((a) => a.status === 201).length;
  const inventory = await VenueSlotInventory.findOne({ venueId, visitDate: weekday, slotId: 'morning' }).lean();
  check(accepted === 3 && inventory.reserved === 6, '6 seats: 3 of 6 concurrent 2-ticket orders accepted', `accepted=${accepted} reserved=${inventory?.reserved}`);
  check(attempts.some((a) => a.status === 409), 'sold-out slot returns a clear error', attempts.map((a) => a.status).join(','));

  console.log('\n== unpaid holds expire and free seats ==');
  await EntertainmentBooking.updateMany({ venueId, slotId: 'morning', status: 'pending' }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
  await expireStaleHolds();
  const freed = await VenueSlotInventory.findOne({ venueId, visitDate: weekday, slotId: 'morning' }).lean();
  check(freed.reserved === 0, 'expired holds give seats back', freed.reserved);
  const lateBooking = await EntertainmentBooking.findOne({ venueId, slotId: 'morning', status: 'expired' }).lean();
  r = await call('POST', '/users/entertainment/bookings/verify', { token: lateBooking.userId.equals(user._id) ? userT : user2T, body: pay(lateBooking.payment.orderId) });
  check(r.status === 200 && r.data?.status === 'confirmed', 'late payment re-takes free seats and confirms', `${r.status} ${r.message}`);
  const openDate = [1, 2, 3].map((n) => addDays(weekday, n)).find((d) => d !== addDays(today, 5));
  await Venue.updateOne({ _id: venueId }, { $set: { 'timeSlots.0.capacity': 2 } });
  const blocker = await call('POST', '/users/entertainment/bookings/order', { token: user2T, body: { venueId, visitDate: openDate, slotId: 'morning', items: [{ ticketTypeId: 'adult', quantity: 2 }] } });
  await EntertainmentBooking.updateOne({ _id: blocker.data.booking.id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
  await expireStaleHolds();
  const taker = await call('POST', '/users/entertainment/bookings/order', { token: userT, body: { venueId, visitDate: openDate, slotId: 'morning', items: [{ ticketTypeId: 'adult', quantity: 2 }] } });
  const refundsBefore = refunds.length;
  r = await call('POST', '/users/entertainment/bookings/verify', { token: user2T, body: pay((await EntertainmentBooking.findById(blocker.data.booking.id).lean()).payment.orderId) });
  check(r.status === 409 && refunds.length === refundsBefore + 1, 'late payment for a sold-out slot is refunded in full', `${r.status} ${r.message}`);
  await Venue.updateOne({ _id: venueId }, { $set: { 'timeSlots.0.capacity': 6 } });
  if (taker.data?.booking?.id) await EntertainmentBooking.updateOne({ _id: taker.data.booking.id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
  await expireStaleHolds();

  console.log('\n== QR ticket + gate check-in ==');
  r = await call('GET', `/users/entertainment/bookings/${b1.id}`, { token: userT });
  const qrValue = r.data?.ticket?.qrValue;
  check(r.status === 200 && qrValue && r.data.ticket.qrDataUrl?.startsWith('data:image/png'), 'customer gets QR ticket', `${r.status} ${r.message}`);
  r = await call('GET', `/users/entertainment/bookings/${b1.id}`, { token: user2T });
  check(r.status === 404, "another user can't open my ticket", r.status);
  r = await call('POST', '/drivers/venue/check-in', { token: partnerT, body: { qrValue } });
  check(r.status === 409 && /not today/.test(r.message || ''), 'ticket for another day is refused at the gate', `${r.status} ${r.message}`);
  await EntertainmentBooking.updateOne({ _id: b1.id }, { $set: { visitDate: today } });
  r = await call('POST', '/drivers/venue/check-in', { token: otherPartnerT, body: { qrValue } });
  check(r.status === 404, "another partner can't scan this ticket", r.status);
  r = await call('POST', '/drivers/venue/check-in', { token: partnerT, body: { qrValue: 'not-a-ticket' } });
  check(r.status === 400, 'garbage QR rejected', r.status);
  r = await call('POST', '/drivers/venue/check-in', { token: partnerT, body: { qrValue } });
  check(r.status === 200 && r.data?.booking?.checkIn?.status === 'checked_in' && !r.data.alreadyCheckedIn, 'partner checks the ticket in', `${r.status} ${r.message}`);
  r = await call('POST', '/drivers/venue/check-in', { token: partnerT, body: { qrValue: savedB1.bookingCode } });
  check(r.status === 200 && r.data?.alreadyCheckedIn === true, 'second scan flagged as already used (booking code entry works)', JSON.stringify(r.data?.alreadyCheckedIn));
  r = await call('POST', `/users/entertainment/bookings/${b1.id}/cancel`, { token: userT, body: {} });
  check(r.status === 409, 'used tickets cannot be cancelled', `${r.status} ${r.message}`);
  r = await call('POST', `/users/entertainment/bookings/${b1.id}/review`, { token: userT, body: { rating: 5, comment: 'Great' } });
  check(r.status === 200, 'visitor rates after the visit', `${r.status} ${r.message}`);
  check((await Venue.findById(venueId).lean()).rating === 5, 'venue rating updated');

  console.log('\n== cancellation + admin refund rules ==');
  const placeAndPay = async (token, body) => {
    const o = await call('POST', '/users/entertainment/bookings/order', { token, body });
    const orderId = (await EntertainmentBooking.findById(o.data.booking.id).lean()).payment.orderId;
    const v = await call('POST', '/users/entertainment/bookings/verify', { token, body: pay(orderId) });
    return v.data;
  };
  const b2 = await placeAndPay(userT, { venueId, visitDate: weekday, slotId: 'evening', items: [{ ticketTypeId: 'adult', quantity: 1 }] });
  partner = await VenuePartner.findById(partnerId).lean();
  const balanceBeforeCancel = partner.wallet.balance;
  r = await call('GET', `/users/entertainment/bookings/${b2.id}`, { token: userT });
  check(r.data?.cancellationQuote?.refundAmount === 1000, 'quote: 100% refund 24h+ before', JSON.stringify(r.data?.cancellationQuote));
  const [c1, c2] = await Promise.all([
    call('POST', `/users/entertainment/bookings/${b2.id}/cancel`, { token: userT, body: {} }),
    call('POST', `/users/entertainment/bookings/${b2.id}/cancel`, { token: userT, body: {} }),
  ]);
  const cancelled = await EntertainmentBooking.findById(b2.id).lean();
  check(cancelled.status === 'cancelled' && cancelled.cancellation.refundAmount === 1000, 'cancelled with Rs1000 refund', `${c1.status}/${c2.status}`);
  check(refunds.filter((x) => x.amount === 100000).length >= 1 && [c1, c2].filter((x) => x.status === 200).length >= 1, 'gateway refund issued once', JSON.stringify(refunds.slice(-2)));
  partner = await VenuePartner.findById(partnerId).lean();
  check(near(partner.wallet.balance, balanceBeforeCancel - 850), 'partner share (Rs850) reversed', `${balanceBeforeCancel} -> ${partner.wallet.balance}`);

  const b3 = await placeAndPay(userT, { venueId, visitDate: weekday, slotId: 'evening', items: [{ ticketTypeId: 'adult', quantity: 2 }] });
  const soon = new Date(Date.now() + 5 * 3600000 + 5.5 * 3600000);
  await EntertainmentBooking.updateOne({ _id: b3.id }, { $set: { visitDate: soon.toISOString().slice(0, 10), slotStartTime: soon.toISOString().slice(11, 16) } });
  const before3 = (await VenuePartner.findById(partnerId).lean()).wallet.balance;
  r = await call('POST', `/users/entertainment/bookings/${b3.id}/cancel`, { token: userT, body: {} });
  check(r.status === 200 && r.data?.cancellation?.refundAmount === 1000, '5h before visit: 50% refund (Rs1000 of Rs2000)', `${r.status} ${r.message} ${JSON.stringify(r.data?.cancellation)}`);
  const after3 = (await VenuePartner.findById(partnerId).lean()).wallet.balance;
  check(near(before3 - after3, 850), 'partner keeps its share of the cancellation charge', `${before3} -> ${after3}`);

  const b4 = await placeAndPay(userT, { venueId, visitDate: weekday, slotId: 'evening', items: [{ ticketTypeId: 'child', quantity: 1 }] });
  const late = new Date(Date.now() + 1 * 3600000 + 5.5 * 3600000);
  await EntertainmentBooking.updateOne({ _id: b4.id }, { $set: { visitDate: late.toISOString().slice(0, 10), slotStartTime: late.toISOString().slice(11, 16) } });
  r = await call('POST', `/users/entertainment/bookings/${b4.id}/cancel`, { token: userT, body: {} });
  check(r.status === 409, 'too late to cancel (under 2h)', `${r.status} ${r.message}`);
  r = await call('POST', `/admin/entertainment/bookings/${b4.id}/cancel`, { token: adminT, body: { reason: 'Venue closed' } });
  check(r.status === 200 && r.data?.cancellation?.refundAmount === 500, 'admin can cancel with full refund', `${r.status} ${r.message}`);

  console.log('\n== agents sell tickets ==');
  const agent = await Agent.create({ phone: `63${st}01`, name: 'E2E Ent Agent', password: pw, active: true, status: 'active', referralCode: `EA${st}`,
    commissionConfig: { entertainment: { enabled: true, type: 'percentage', value: 5 } } });
  made.agents.push(agent._id);
  const agentT = signAccessToken({ sub: String(agent._id), role: 'agent' });
  r = await call('GET', '/agents/entertainment/venues', { token: agentT });
  check((r.data || []).some((v) => v.id === venueId), 'agent sees bookable venues');
  r = await call('POST', '/agents/entertainment/bookings/order', { token: agentT, body: { venueId, visitDate: weekday, slotId: 'evening', items: [{ ticketTypeId: 'adult', quantity: 2 }], customer: { name: 'Walk In', phone: `64${st}01` } } });
  check(r.status === 201 && r.data?.booking?.amount === 2000, 'agent creates Rs2000 order for a customer', `${r.status} ${r.message}`);
  const agentOrder = (await EntertainmentBooking.findById(r.data.booking.id).lean());
  made.users.push(agentOrder.userId);
  r = await call('POST', '/agents/entertainment/bookings/verify', { token: agentT, body: pay(agentOrder.payment.orderId) });
  let agentWallet = await AgentWallet.findOne({ agentId: agent._id }).lean();
  check(r.status === 200 && near(agentWallet?.balance, 100), 'agent earns 5% (Rs100) on confirmation', `${r.status} ${r.message} ${agentWallet?.balance}`);
  r = await call('GET', `/agents/entertainment/bookings/${agentOrder._id}`, { token: agentT });
  check(r.status === 200 && r.data?.ticket?.qrValue, 'agent can show the customer QR');
  const customerT = signAccessToken({ sub: String(agentOrder.userId), role: 'user' });
  r = await call('GET', `/users/entertainment/bookings/${agentOrder._id}`, { token: customerT });
  check(r.status === 200 && r.data?.ticket?.qrValue, 'ticket also appears in the customer app');
  r = await call('POST', `/users/entertainment/bookings/${agentOrder._id}/cancel`, { token: customerT, body: {} });
  agentWallet = await AgentWallet.findOne({ agentId: agent._id }).lean();
  check(r.status === 200 && near(agentWallet.balance, 0), 'agent commission reversed on full refund', `${r.status} ${agentWallet?.balance}`);
  const referred = await User.create({ phone: `61${st}03`, name: 'E2E Referred', password: pw, isVerified: true, active: true, isActive: true, referredByAgent: agent._id });
  made.users.push(referred._id);
  await placeAndPay(signAccessToken({ sub: String(referred._id), role: 'user' }), { venueId, visitDate: weekday, slotId: 'evening', items: [{ ticketTypeId: 'child', quantity: 2 }] });
  agentWallet = await AgentWallet.findOne({ agentId: agent._id }).lean();
  check(near(agentWallet.balance, 50), "referred customer's own booking pays the agent 5% (Rs50)", agentWallet.balance);
  r = await call('GET', '/agents/dashboard', { token: agentT });
  const entChannels = r.data?.commission?.channels || {};
  check(
    r.status === 200
      && near(entChannels.referralEntertainment?.commission, 50) && entChannels.referralEntertainment?.bookings === 1
      && near(entChannels.directEntertainment?.commission, 0) && entChannels.directEntertainment?.bookings === 0
      && near(r.data?.commission?.totalCommission, 50),
    'agent dashboard counts entertainment commission net of refunds',
    `${r.status} ${JSON.stringify({ d: entChannels.directEntertainment, ref: entChannels.referralEntertainment, total: r.data?.commission?.totalCommission })}`,
  );

  console.log('\n== partner dashboard, wallet, payouts ==');
  r = await call('GET', '/drivers/venue/dashboard', { token: partnerT });
  check(r.status === 200 && r.data?.totals?.bookings >= 3 && r.data?.daily?.length === 30, 'partner dashboard loads with totals and 30-day chart', `${r.status} ${r.message} ${JSON.stringify(r.data?.totals)}`);
  r = await call('GET', '/drivers/venue/bookings', { token: partnerT });
  check(r.status === 200 && r.data?.results?.some((b) => b.customer?.phone), 'partner sees who bought tickets', `${r.status}`);
  partner = await VenuePartner.findById(partnerId).lean();
  r = await call('POST', '/drivers/venue/wallet/withdrawals', { token: partnerT, body: { amount: 100 } });
  check(r.status === 400 && /bank account or UPI/.test(r.message || ''), 'payout needs bank/UPI details first', `${r.status} ${r.message}`);
  await call('PATCH', '/drivers/venue/me/payout', { token: partnerT, body: { payout: { upiId: 'splash@upi' } } });
  r = await call('POST', '/drivers/venue/wallet/withdrawals', { token: partnerT, body: { amount: partner.wallet.balance + 1 } });
  check(r.status === 400, 'cannot withdraw more than the balance', `${r.status} ${r.message}`);
  r = await call('POST', '/drivers/venue/wallet/withdrawals', { token: partnerT, body: { amount: 1000 } });
  const wdId = r.data?.id;
  check(r.status === 201, 'partner requests Rs1000 payout', `${r.status} ${r.message}`);
  const beforePayout = (await VenuePartner.findById(partnerId).lean()).wallet.balance;
  const [a1, a2] = await Promise.all([
    call('PATCH', `/admin/entertainment/withdrawals/${wdId}/approve`, { token: adminT, body: {} }),
    call('PATCH', `/admin/entertainment/withdrawals/${wdId}/approve`, { token: adminT, body: {} }),
  ]);
  const afterPayout = (await VenuePartner.findById(partnerId).lean()).wallet.balance;
  check(near(beforePayout - afterPayout, 1000) && [a1.status, a2.status].sort().join() === '200,409', 'payout approved and debited once', `${a1.status}/${a2.status} ${beforePayout}->${afterPayout}`);
  r = await call('GET', '/drivers/venue/wallet', { token: partnerT });
  check(r.data?.transactions?.some((t) => t.type === 'withdrawal'), 'wallet history shows the payout');

  console.log('== GST on tickets ==');
  r = await call('PUT', '/admin/entertainment/settings', { token: adminT, body: { holdMinutes: 15, gstPercent: 18, gstin: '27AAPFU0939F1ZV', refundRules: [{ label: '24h+ before', hoursBeforeVisit: 24, refundType: 'percentage', refundValue: 100 }, { label: '2-24h before', hoursBeforeVisit: 2, refundType: 'percentage', refundValue: 50 }] } });
  check(r.status === 200 && r.data?.gstPercent === 18, 'admin sets 18% GST', `${r.status} ${r.message}`);
  r = await call('PUT', '/admin/entertainment/settings', { token: adminT, body: { gstPercent: 150, refundRules: [] } });
  check(r.status === 400, 'GST above 100% rejected', r.status);
  r = await call('PUT', '/admin/entertainment/settings', { token: adminT, body: { gstPercent: 18, gstin: 'BADGSTIN', refundRules: [] } });
  check(r.status === 400, 'invalid GSTIN rejected', r.status);
  r = await call('GET', `/users/entertainment/venues/${venueId}?visitDate=${weekday}`, { token: userT });
  check(r.data?.gstPercent === 18, 'customer venue page carries the GST rate', r.data?.gstPercent);

  // 2 adult @1000 weekday = 2000 subtotal; GST 360; total 2360; commission 15% of 2000 = 300; partner 1700
  const gstBalanceBefore = (await VenuePartner.findById(partnerId).lean()).wallet.balance;
  r = await call('POST', '/users/entertainment/bookings/order', { token: userT, body: { venueId, visitDate: weekday, slotId: 'evening', items: [{ ticketTypeId: 'adult', quantity: 2 }] } });
  const g1 = r.data?.booking;
  check(r.status === 201 && g1?.subtotal === 2000 && g1?.gstAmount === 360 && g1?.amount === 2360 && g1?.gstPercent === 18, 'order = Rs2000 + 18% GST Rs360 = Rs2360', JSON.stringify(g1));
  check(orders.get(r.data?.razorpayOrder?.id)?.amount === 236000, 'customer is charged the GST-inclusive Rs2360 at the gateway');
  const gstOrderId = (await EntertainmentBooking.findById(g1.id).lean()).payment.orderId;
  r = await call('POST', '/users/entertainment/bookings/verify', { token: userT, body: pay(gstOrderId) });
  const gstBooking = await EntertainmentBooking.findById(g1.id).lean();
  const gstBalanceAfter = (await VenuePartner.findById(partnerId).lean()).wallet.balance;
  check(r.status === 200 && near(gstBooking.commissionAmount, 300) && near(gstBooking.partnerEarning, 1700), 'commission 15% is on Rs2000 (not on GST): Rs300 / partner Rs1700', JSON.stringify({ c: gstBooking.commissionAmount, p: gstBooking.partnerEarning }));
  check(near(gstBalanceAfter - gstBalanceBefore, 1700), 'partner wallet gets Rs1700; GST never reaches the partner', `${gstBalanceBefore} -> ${gstBalanceAfter}`);
  check(near(gstBooking.amount - gstBooking.commissionAmount - gstBooking.partnerEarning, 360), 'platform keeps GST Rs360 on top of its commission', JSON.stringify(gstBooking));
  r = await call('GET', `/users/entertainment/bookings/${g1.id}`, { token: userT });
  check(r.data?.subtotal === 2000 && r.data?.gstAmount === 360 && r.data?.cancellationQuote?.refundAmount === 2360, 'customer sees the breakdown; 24h+ refund returns tickets and GST (Rs2360)', JSON.stringify({ s: r.data?.subtotal, g: r.data?.gstAmount, q: r.data?.cancellationQuote }));
  r = await call('POST', `/users/entertainment/bookings/${g1.id}/cancel`, { token: userT, body: {} });
  const gstBalanceCancelled = (await VenuePartner.findById(partnerId).lean()).wallet.balance;
  check(r.status === 200 && r.data?.cancellation?.refundAmount === 2360 && near(gstBalanceCancelled, gstBalanceBefore), 'full refund Rs2360; partner Rs1700 reversed', `${r.status} ${JSON.stringify(r.data?.cancellation)} ${gstBalanceCancelled}`);
  const agentBefore = (await AgentWallet.findOne({ agentId: agent._id }).lean()).balance;
  r = await call('POST', '/agents/entertainment/bookings/order', { token: agentT, body: { venueId, visitDate: weekday, slotId: 'evening', items: [{ ticketTypeId: 'child', quantity: 2 }], customer: { name: 'Walk GST', phone: `65${st}01` } } });
  check(r.status === 201 && r.data?.booking?.amount === 1180 && r.data?.booking?.subtotal === 1000, 'agent order Rs1000 + Rs180 GST', JSON.stringify(r.data?.booking));
  const gstAgentOrder = await EntertainmentBooking.findById(r.data.booking.id).lean();
  made.users.push(gstAgentOrder.userId);
  await call('POST', '/agents/entertainment/bookings/verify', { token: agentT, body: pay(gstAgentOrder.payment.orderId) });
  const agentAfter = (await AgentWallet.findOne({ agentId: agent._id }).lean()).balance;
  check(near(agentAfter - agentBefore, 50), 'agent commission 5% is on Rs1000 ticket value = Rs50 (GST excluded)', `${agentBefore} -> ${agentAfter}`);
  r = await call('GET', `/admin/entertainment/bookings?partnerId=${partnerId}`, { token: adminT });
  check(r.status === 200 && r.data?.summary?.gst > 0, 'admin summary reports GST collected', JSON.stringify(r.data?.summary));
  r = await call('GET', '/drivers/venue/dashboard', { token: partnerT });
  const dashSales = r.data?.totals?.sales;
  const subSum = (await EntertainmentBooking.aggregate([{ $match: { partnerId: new mongoose.Types.ObjectId(partnerId), status: 'confirmed' } }, { $group: { _id: null, s: { $sum: { $ifNull: ['$subtotal', '$amount'] } } } }]))[0]?.s;
  check(near(dashSales, subSum), 'partner dashboard sales exclude GST', `${dashSales} vs ${subSum}`);
  await call('PUT', '/admin/entertainment/settings', { token: adminT, body: { holdMinutes: 15, gstPercent: 0, refundRules: [{ label: '24h+ before', hoursBeforeVisit: 24, refundType: 'percentage', refundValue: 100 }] } });

  console.log('\n== admin reporting ==');
  r = await call('GET', `/admin/entertainment/bookings?partnerId=${partnerId}`, { token: adminT });
  const confirmedSum = (await EntertainmentBooking.aggregate([{ $match: { partnerId: new mongoose.Types.ObjectId(partnerId), status: 'confirmed' } }, { $group: { _id: null, s: { $sum: '$amount' } } }]))[0]?.s;
  check(r.status === 200 && near(r.data?.summary?.sales, confirmedSum), 'admin booking summary matches confirmed sales', `${r.data?.summary?.sales} vs ${confirmedSum}`);
  r = await call('GET', '/admin/entertainment/overview', { token: adminT });
  check(r.status === 200 && r.data?.partners >= 2, 'admin overview loads');
} catch (error) {
  check(false, 'suite crashed', error?.stack || error);
} finally {
  const venueIds = (await Venue.find({ partnerId: { $in: made.partners } }).select('_id').lean()).map((v) => v._id);
  const bookingIds = (await EntertainmentBooking.find({ venueId: { $in: venueIds } }).select('_id').lean()).map((b) => String(b._id));
  await EntertainmentBooking.deleteMany({ venueId: { $in: venueIds } });
  await VenueSlotInventory.deleteMany({ venueId: { $in: venueIds } });
  await Venue.deleteMany({ _id: { $in: venueIds } });
  await VenuePartnerWalletTransaction.deleteMany({ partnerId: { $in: made.partners } });
  await VenuePartnerWithdrawalRequest.deleteMany({ partnerId: { $in: made.partners } });
  await VenuePartner.deleteMany({ _id: { $in: made.partners } });
  await VenueCategory.deleteMany({ _id: { $in: made.categories } });
  await PaymentCapture.deleteMany({ ownerId: { $in: bookingIds } });
  await AgentWallet.deleteMany({ agentId: { $in: made.agents } });
  await Agent.deleteMany({ _id: { $in: made.agents } });
  await Admin.deleteMany({ _id: { $in: made.admins } });
  await User.deleteMany({ _id: { $in: made.users } });
  await AdminBusinessSetting.updateOne({ scope: 'default' }, { $set: { entertainment: settingsBefore?.entertainment || {} } });
  server.close();
  await mongoose.disconnect();
  const failed = results.filter((x) => x[0] === 'FAIL');
  console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
  process.exit(failed.length ? 1 : 0);
}
