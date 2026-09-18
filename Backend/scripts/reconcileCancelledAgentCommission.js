import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { BusBooking } from '../src/modules/taxi/user/models/BusBooking.js';
import { PoolingBooking } from '../src/modules/taxi/admin/models/PoolingBooking.js';
import { revertAgentCommission } from '../src/modules/taxi/agent/services/agentCommissionService.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.');

  const cancelledBuses = await BusBooking.find({
    status: 'cancelled',
    'agentMeta.bookedByAgentId': { $exists: true, $ne: null },
    'agentMeta.commissionReversed': { $ne: true },
    'agentMeta.commissionAmount': { $gt: 0 },
  });

  console.log(`Found ${cancelledBuses.length} cancelled bus bookings to reconcile.`);

  for (const booking of cancelledBuses) {
    const commission = Number(booking.agentMeta?.commissionAmount || 0);
    console.log(`Reconciling bus booking ${booking.bookingCode} (commission: Rs ${commission})...`);

    const result = await revertAgentCommission({
      agentId: booking.agentMeta.bookedByAgentId,
      bookingType: 'bus',
      commissionMode: booking.agentMeta.commissionMode || 'direct',
      amount: commission,
      referenceKey: `agent:bus:reversal:${String(booking._id)}:reconciliation`,
      title: `Commission reversed for cancelled bus booking ${booking.bookingCode}`,
      metadata: {
        bookingId: String(booking._id),
        bookingCode: booking.bookingCode,
        isReconciliation: true,
      },
    });

    booking.agentMeta.commissionReversed = true;
    booking.agentMeta.commissionReversedAt = new Date();
    booking.agentMeta.commissionAmount = 0;
    await booking.save();

    console.log(`Reconciled ${booking.bookingCode}:`, result?.wallet?.balance);
  }

  const cancelledPooling = await PoolingBooking.find({
    bookingStatus: 'cancelled',
    'agentMeta.bookedByAgentId': { $exists: true, $ne: null },
    'agentMeta.commissionReversed': { $ne: true },
    'agentMeta.commissionAmount': { $gt: 0 },
  });

  console.log(`Found ${cancelledPooling.length} cancelled pooling bookings to reconcile.`);

  for (const booking of cancelledPooling) {
    const commission = Number(booking.agentMeta?.commissionAmount || 0);
    console.log(`Reconciling pooling booking ${booking.bookingId} (commission: Rs ${commission})...`);

    const result = await revertAgentCommission({
      agentId: booking.agentMeta.bookedByAgentId,
      bookingType: 'pooling',
      commissionMode: booking.agentMeta.commissionMode || 'direct',
      amount: commission,
      referenceKey: `agent:pooling:reversal:${String(booking._id)}:reconciliation`,
      title: `Commission reversed for cancelled pooling booking ${booking.bookingId}`,
      metadata: {
        bookingId: String(booking._id),
        bookingCode: booking.bookingId,
        isReconciliation: true,
      },
    });

    booking.agentMeta.commissionReversed = true;
    booking.agentMeta.commissionReversedAt = new Date();
    booking.agentMeta.commissionAmount = 0;
    await booking.save();

    console.log(`Reconciled ${booking.bookingId}:`, result?.wallet?.balance);
  }

  console.log('Reconciliation completed successfully.');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Reconciliation error:', err);
  process.exit(1);
});
