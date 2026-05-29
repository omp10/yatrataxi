import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { ServiceLocation } from '../src/modules/taxi/admin/models/ServiceLocation.js';
import { Driver } from '../src/modules/taxi/driver/models/Driver.js';
import { Agent } from '../src/modules/taxi/agent/models/Agent.js';
import { Zone } from '../src/modules/taxi/driver/models/Zone.js';
import { hashPassword } from '../src/modules/taxi/services/passwordService.js';

const PHONE = '7223077890';
const DEFAULT_COORDINATES = [75.8577, 22.7196];
const SEEDED_BY = 'Backend/scripts/seedDriverAgent7223077890.js';

const connect = async () => {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri, {
    autoIndex: env.nodeEnv !== 'production',
    dbName: env.mongoDbName,
  });
};

const ensureServiceLocation = async () => {
  const existing = await ServiceLocation.findOne({
    $or: [
      { legacy_id: 'static-indore' },
      { service_location_name: 'Indore' },
      { name: 'Indore' },
    ],
  });

  if (existing) return existing;

  return ServiceLocation.create({
    name: 'Indore',
    legacy_id: 'static-indore',
    company_key: 'static',
    service_location_name: 'Indore',
    address: 'Indore, Madhya Pradesh, India',
    country: 'India',
    currency_name: 'Indian Rupee',
    currency_symbol: 'Rs',
    currency_code: 'INR',
    timezone: 'Asia/Kolkata',
    unit: 'km',
    latitude: DEFAULT_COORDINATES[1],
    longitude: DEFAULT_COORDINATES[0],
    location: {
      type: 'Point',
      coordinates: DEFAULT_COORDINATES,
    },
    status: 'active',
    active: true,
  });
};

const ensureZone = async (serviceLocationId) => {
  const existing = await Zone.findOne({
    $or: [
      { name: 'Static Seed Zone' },
      { service_location_id: serviceLocationId },
    ],
  });

  if (existing) return existing;

  const [lng, lat] = DEFAULT_COORDINATES;
  const offset = 0.05;

  return Zone.create({
    name: 'Static Seed Zone',
    service_location_id: serviceLocationId,
    unit: 'km',
    active: true,
    status: 'active',
    boundary_mode: 'polygon',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [lng - offset, lat - offset],
        [lng + offset, lat - offset],
        [lng + offset, lat + offset],
        [lng - offset, lat + offset],
        [lng - offset, lat - offset],
      ]],
    },
  });
};

const main = async () => {
  await connect();
  console.log('CONNECTED TO DATABASE');

  const serviceLocation = await ensureServiceLocation();
  const zone = await ensureZone(serviceLocation._id);
  const completedAt = new Date();

  // 1. Seed Driver 7223077890
  const driverPasswordHash = await hashPassword(`driver-${PHONE}`);
  const driver = await Driver.findOneAndUpdate(
    { phone: PHONE },
    {
      $set: {
        name: 'Seed Driver 7223077890',
        phone: PHONE,
        email: `driver.${PHONE}@Yatra Desk.local`,
        gender: 'male',
        password: driverPasswordHash,
        service_location_id: serviceLocation._id,
        vehicleType: 'car',
        vehicleIconType: 'car',
        vehicleMake: 'Maruti Suzuki',
        vehicleModel: 'WagonR',
        registerFor: 'taxi',
        serviceCategories: ['taxi'],
        vehicleNumber: 'MP09SD7223',
        vehicleColor: 'White',
        city: 'Indore',
        approve: true,
        status: 'approved',
        isOnline: false,
        isOnRide: false,
        zoneId: zone._id,
        location: {
          type: 'Point',
          coordinates: DEFAULT_COORDINATES,
        },
        referralCode: 'DRV7223SEED',
        documents: {},
        onboarding: {
          registrationId: `seed-driver-${PHONE}`,
          role: 'driver',
          otpMode: 'seeded',
          otpVerifiedAt: completedAt,
          submittedAt: completedAt,
          completedAt,
          seededBy: SEEDED_BY,
          completed: true,
        },
      },
      $unset: {
        deletedAt: 1,
        deletion_reason: 1,
      },
    },
    {
      returnDocument: 'after',
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    }
  );

  console.log('Seeded Driver:', {
    id: driver._id,
    phone: driver.phone,
    approve: driver.approve,
    status: driver.status,
  });

  // 2. Seed Agent 7223077890
  const agentPasswordHash = await hashPassword(`agent-${PHONE}`);
  const agent = await Agent.findOneAndUpdate(
    { phone: PHONE },
    {
      $set: {
        phone: PHONE,
        countryCode: '+91',
        password: agentPasswordHash,
        name: 'Seed Agent 7223077890',
        email: `agent.${PHONE}@Yatra Desk.local`,
        active: true,
        status: 'active',
        kycStatus: 'verified',
        referralCode: 'AGT7223',
        onboarding: {
          submittedAt: completedAt,
          reviewedAt: completedAt,
          reviewNote: 'Seeded approved agent',
        },
      },
    },
    {
      returnDocument: 'after',
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    }
  );

  console.log('Seeded Agent:', {
    id: agent._id,
    phone: agent.phone,
    active: agent.active,
    status: agent.status,
    kycStatus: agent.kycStatus,
  });

  console.log('Done seeding successfully!');
};

main()
  .catch((error) => {
    console.error('[seedDriverAgent7223077890] failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
    console.log('DISCONNECTED FROM DATABASE');
  });
