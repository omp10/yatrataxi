import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { ServiceLocation } from '../src/modules/taxi/admin/models/ServiceLocation.js';
import { Owner } from '../src/modules/taxi/admin/models/Owner.js';
import { ServiceStore } from '../src/modules/taxi/admin/models/ServiceStore.js';
import { ServiceCenterStaff } from '../src/modules/taxi/admin/models/ServiceCenterStaff.js';
import { Driver } from '../src/modules/taxi/driver/models/Driver.js';
import { BusDriver } from '../src/modules/taxi/driver/models/BusDriver.js';
import { Zone } from '../src/modules/taxi/driver/models/Zone.js';
import { Agent } from '../src/modules/taxi/agent/models/Agent.js';
import { User } from '../src/modules/taxi/user/models/User.js';
import { VenuePartner } from '../src/modules/taxi/entertainment/models/VenuePartner.js';
import { hashPassword } from '../src/modules/taxi/services/passwordService.js';
import { REVIEW_PHONE as PHONE } from '../src/modules/taxi/services/reviewAccount.js';

// Seeds one account per login role on the Play Store review phone (OTP 0000).
// Idempotent: safe to re-run.
const COORDS = [75.8577, 22.7196];
const upsertOpts = { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true };

const ensureLocation = async () =>
  (await ServiceLocation.findOne({ $or: [{ legacy_id: 'static-indore' }, { service_location_name: 'Indore' }, { name: 'Indore' }] })) ||
  ServiceLocation.create({
    name: 'Indore', legacy_id: 'static-indore', company_key: 'static', service_location_name: 'Indore',
    address: 'Indore, Madhya Pradesh, India', country: 'India', currency_name: 'Indian Rupee',
    currency_symbol: 'Rs', currency_code: 'INR', timezone: 'Asia/Kolkata', unit: 'km',
    latitude: COORDS[1], longitude: COORDS[0], location: { type: 'Point', coordinates: COORDS },
    status: 'active', active: true,
  });

const ensureZone = async (locationId) => {
  const existing = await Zone.findOne({ $or: [{ name: 'Static Seed Zone' }, { service_location_id: locationId }] });
  if (existing) return existing;
  const [lng, lat] = COORDS;
  const o = 0.05;
  return Zone.create({
    name: 'Static Seed Zone', service_location_id: locationId, unit: 'km', active: true, status: 'active',
    boundary_mode: 'polygon',
    geometry: { type: 'Polygon', coordinates: [[[lng - o, lat - o], [lng + o, lat - o], [lng + o, lat + o], [lng - o, lat + o], [lng - o, lat - o]]] },
  });
};

const main = async () => {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri, { autoIndex: env.nodeEnv !== 'production', dbName: env.mongoDbName });

  const location = await ensureLocation();
  const zone = await ensureZone(location._id);
  const now = new Date();
  const email = (role) => `${role}${PHONE.slice(-4)}@gmail.com`;
  const done = [];

  await User.findOneAndUpdate({ phone: PHONE }, { $set: { name: 'Rohit Sharma', phone: PHONE, email: email('user') }, $unset: { deletedAt: 1 } }, upsertOpts);
  done.push('user');

  await Agent.findOneAndUpdate({ phone: PHONE }, {
    $set: {
      phone: PHONE, countryCode: '+91', password: await hashPassword(`agent-${PHONE}`), name: 'Amit Verma',
      email: email('agent'), active: true, status: 'active', kycStatus: 'verified', referralCode: 'AGTREVIEW',
      onboarding: { submittedAt: now, reviewedAt: now, reviewNote: 'Review account' },
    },
  }, { ...upsertOpts, runValidators: true });
  done.push('agent');

  await Driver.findOneAndUpdate({ phone: PHONE }, {
    $set: {
      name: 'Rajesh Kumar', phone: PHONE, email: email('driver'), gender: 'male',
      password: await hashPassword(`driver-${PHONE}`), service_location_id: location._id,
      vehicleType: 'car', vehicleIconType: 'car', vehicleMake: 'Maruti Suzuki', vehicleModel: 'WagonR',
      registerFor: 'taxi', serviceCategories: ['taxi'], vehicleNumber: 'MP09RV3148', vehicleColor: 'White',
      city: 'Indore', approve: true, status: 'approved', isOnline: false, isOnRide: false, zoneId: zone._id,
      location: { type: 'Point', coordinates: COORDS }, referralCode: 'DRVREVIEW', documents: {},
      onboarding: { registrationId: `review-driver-${PHONE}`, role: 'driver', otpMode: 'seeded', otpVerifiedAt: now, submittedAt: now, completedAt: now, completed: true },
    },
    $unset: { deletedAt: 1, deletion_reason: 1 },
  }, { ...upsertOpts, runValidators: true });
  done.push('driver');

  await Owner.findOneAndUpdate({ mobile: PHONE }, {
    $set: { company_name: 'Sharma Travels', name: 'Suresh Sharma', mobile: PHONE, email: email('owner'), approve: true, active: true, status: 'approved', service_location_id: location._id },
    $unset: { deletedAt: 1, deletion_reason: 1 },
  }, upsertOpts);
  done.push('owner');

  const store = await ServiceStore.findOneAndUpdate({ owner_phone: PHONE }, {
    $set: {
      name: 'Shree Auto Care', zone_id: zone._id, service_location_id: location._id, address: 'Indore, Madhya Pradesh',
      owner_name: 'Mahesh Patel', owner_phone: PHONE, latitude: COORDS[1], longitude: COORDS[0],
      location: { type: 'Point', coordinates: COORDS }, status: 'active', active: true,
    },
  }, upsertOpts);
  done.push('service_center');

  await ServiceCenterStaff.findOneAndUpdate({ phone: PHONE }, {
    $set: { serviceCenterId: store._id, name: 'Deepak Yadav', phone: PHONE, active: true, status: 'active' },
  }, upsertOpts);
  done.push('service_center_staff');

  await BusDriver.findOneAndUpdate({ phone: PHONE }, {
    $set: { name: 'Ramesh Chouhan', phone: PHONE, email: email('busdriver'), approve: true, active: true, status: 'approved' },
  }, upsertOpts);
  done.push('bus_driver');

  await VenuePartner.findOneAndUpdate({ phone: PHONE }, {
    $set: { name: 'Anil Joshi', businessName: 'Joshi Entertainment Park', phone: PHONE, email: email('venue'), city: 'Indore', status: 'active', active: true },
  }, upsertOpts);
  done.push('venue_partner');

  console.log(`Seeded ${PHONE} for: ${done.join(', ')}`);
};

main()
  .catch((e) => { console.error('[seedReviewAccounts] failed', e); process.exitCode = 1; })
  .finally(() => mongoose.disconnect().catch(() => {}));
