/**
 * Seed script: create the SOW mini bus route — 20 seats, 3 departures a day,
 * ~75 KM fixed route. Idempotent: re-running updates the same service.
 *
 * Edit the ROUTE block below with the real cities, stops, times and fare, then:
 *   node scripts/seedMiniBusRoute.js
 *
 * Everything here is also editable from Admin → Bus Service → Fleet Manager;
 * this script just gets a correctly shaped route in place to book against.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BusService } from '../src/modules/taxi/admin/models/BusService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGO_URI = process.env.MONGODB_URI;
const MONGO_DB = process.env.MONGODB_DB_NAME || 'appzeto_taxi';

if (!MONGO_URI) {
  console.error('MONGODB_URI is not set in .env');
  process.exit(1);
}

// ── Edit this block ───────────────────────────────────────────────────────────
const ROUTE = {
  operatorName: 'Yatra Mini Bus',
  busName: 'Mini Bus 20 Seater',
  registrationNumber: 'MP09XX0000',
  seatPrice: 250,
  adminCommissionPercentage: 10,
  originCity: 'Indore',
  destinationCity: 'Ujjain',
  distanceKm: '75',
  durationHours: '2',
  // SOW: three runs a day.
  schedules: [
    { label: 'Morning', departureTime: '07:00', arrivalTime: '09:00' },
    { label: 'Afternoon', departureTime: '13:00', arrivalTime: '15:00' },
    { label: 'Evening', departureTime: '18:00', arrivalTime: '20:00' },
  ],
  // Stops belong to the bus service, not to an individual schedule, so they carry no
  // clock time -- pinning one would contradict two of the three daily runs. Departure
  // and arrival come from the selected schedule.
  stops: [
    { city: 'Indore', pointName: 'Sarwate Bus Stand', stopType: 'pickup' },
    { city: 'Ujjain', pointName: 'Dewas Gate', stopType: 'drop' },
  ],
};

// SOW: 20 bookable seats. 2+2 across 5 rows, aisle down the middle.
const ROWS = 5;
const LEFT_SEATS = 2;
const RIGHT_SEATS = 2;
// ──────────────────────────────────────────────────────────────────────────────

const buildDeck = () => {
  const rowLetters = 'ABCDEFGHIJ';

  return Array.from({ length: ROWS }, (_, rowIndex) => {
    const rowLetter = rowLetters[rowIndex];
    const seatCell = (seatNumber) => ({
      kind: 'seat',
      id: `L-${rowLetter}${seatNumber}`,
      label: `${rowLetter}${seatNumber}`,
      variant: 'seat',
      status: 'available',
    });

    return [
      ...Array.from({ length: LEFT_SEATS }, (_, i) => seatCell(i + 1)),
      { kind: 'aisle', id: `L-${rowLetter}-aisle`, label: '', variant: 'aisle', status: 'available' },
      ...Array.from({ length: RIGHT_SEATS }, (_, i) => seatCell(LEFT_SEATS + i + 1)),
    ];
  });
};

const buildSchedules = () =>
  ROUTE.schedules.map((schedule, index) => ({
    id: `sch-${index + 1}`,
    label: schedule.label,
    departureTime: schedule.departureTime,
    arrivalTime: schedule.arrivalTime,
    // Must match BUS_DAY_LABELS casing in userController, or the route never matches a date.
    activeDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    status: 'active',
  }));

(async () => {
  try {
    await mongoose.connect(MONGO_URI, { dbName: MONGO_DB });
    console.log(`Connected to MongoDB (${MONGO_DB})`);

    const lowerDeck = buildDeck();
    const seatCount = lowerDeck.flat().filter((cell) => cell.kind === 'seat').length;

    const payload = {
      operatorName: ROUTE.operatorName,
      busName: ROUTE.busName,
      registrationNumber: ROUTE.registrationNumber,
      seatPrice: ROUTE.seatPrice,
      // resolveBusSeatPrice prefers variantPricing and only falls back to seatPrice
      // when the variant is null/undefined -- a 0 here would price every seat at 0.
      variantPricing: { seat: ROUTE.seatPrice },
      adminCommissionPercentage: ROUTE.adminCommissionPercentage,
      fareCurrency: 'INR',
      capacity: seatCount,
      status: 'active',
      blueprint: {
        templateKey: 'seater_2_2',
        layoutConfig: {
          lower: { enabled: true, rows: ROWS, leftSeats: LEFT_SEATS, rightSeats: RIGHT_SEATS, seatType: 'seat' },
          upper: { enabled: false },
        },
        lowerDeck,
        upperDeck: [],
      },
      route: {
        routeName: `${ROUTE.originCity} - ${ROUTE.destinationCity}`,
        originCity: ROUTE.originCity,
        destinationCity: ROUTE.destinationCity,
        distanceKm: ROUTE.distanceKm,
        durationHours: ROUTE.durationHours,
        stops: ROUTE.stops.map((stop, index) => ({ id: `stop-${index + 1}`, ...stop })),
      },
      schedules: buildSchedules(),
    };

    const existing = await BusService.findOne({
      operatorName: ROUTE.operatorName,
      busName: ROUTE.busName,
    });

    if (existing) {
      await BusService.updateOne({ _id: existing._id }, { $set: payload });
      console.log(`Updated existing mini bus service (${seatCount} seats, ${payload.schedules.length} daily runs).`);
    } else {
      await BusService.create(payload);
      console.log(`Created mini bus service (${seatCount} seats, ${payload.schedules.length} daily runs).`);
    }

    console.log(`Route: ${payload.route.routeName} · ${ROUTE.distanceKm} KM · Rs ${ROUTE.seatPrice}/seat`);
    console.log('Reminder: enable Bus Service in Admin → Settings → Customization for it to appear in the app.');
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
