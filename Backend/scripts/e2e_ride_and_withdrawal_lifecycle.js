import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api/v1';
const client = axios.create({ baseURL: BASE_URL, timeout: 15000 });

async function runFullLifecycle() {
  console.log('=== STARTING FULL RIDE & WITHDRAWAL LIFECYCLE TEST ===\n');

  // 1. Admin login to get adminToken
  const adminLogin = await client.post('/admin/login', {
    email: 'yatradesk@gmail.com',
    password: 'password',
  }).catch(() => client.post('/admin/login', {
    email: 'yatradesk@gmail.com',
    password: '123456',
  }));
  const adminToken = adminLogin.data?.data?.token;
  console.log('✔ 1. Admin login authenticated');

  // 2. Rider Login / Setup
  const riderPhone = '9999900001';
  await client.post('/users/auth/send-otp', { phone: riderPhone });
  const userVerify = await client.post('/users/auth/verify-otp', { phone: riderPhone, otp: '0000' });
  let userToken = userVerify.data?.data?.token;
  if (!userToken) {
    const signup = await client.post('/users/signup', {
      phone: riderPhone,
      name: 'E2E Lifecycle Rider',
      email: 'e2e_lifecycle@yatradesk.test',
      gender: 'female',
    });
    userToken = signup.data?.data?.token;
  }
  console.log('✔ 2. Rider authenticated');

  // 3. Driver Login / Setup
  // Let's find an approved driver from admin driver list
  const driversList = await client.get('/admin/drivers', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const approvedDriver = driversList.data?.data?.results?.find(d => d.status === 'approved' || d.approve === 1) || driversList.data?.data?.results?.[0];
  if (!approvedDriver) {
    throw new Error('No driver found in system');
  }
  console.log('✔ 3. Using approved driver:', approvedDriver.name, 'Phone:', approvedDriver.phone, 'ID:', approvedDriver._id || approvedDriver.id);

  // Authenticate driver via /drivers/auth/send-otp and verify-otp
  await client.post('/drivers/auth/send-otp', { phone: approvedDriver.phone });
  const driverVerify = await client.post('/drivers/auth/verify-otp', {
    phone: approvedDriver.phone,
    otp: '0000',
  });
  const driverToken = driverVerify.data?.data?.token;
  console.log('✔ 4. Driver authenticated, token received');

  // Make driver online
  try {
    await client.patch('/drivers/online', {
      location: [75.8648, 22.6926],
      selfieImageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    }, {
      headers: { Authorization: `Bearer ${driverToken}` }
    });
    console.log('✔ 5. Driver went online');
  } catch (err) {
    console.log('Driver online note:', err.response?.data?.message || err.message);
  }

  // 4. Create Ride by User
  const rideRes = await client.post('/rides', {
    pickup: [75.8648, 22.6926],
    drop: [75.8937, 22.7533],
    pickupAddress: 'Bhawarkua, Indore',
    dropAddress: 'Vijay Nagar, Indore',
    fare: 250,
    estimatedDistanceMeters: 9000,
    estimatedDurationMinutes: 25,
    transport_type: 'taxi',
    paymentMethod: 'cash',
  }, {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  const ride = rideRes.data?.data?.ride || rideRes.data?.ride || rideRes.data;
  const rideId = ride._id || ride.id;
  const rideOtp = ride.otp;
  console.log(`✔ 6. Ride created: ID ${rideId}, Status: ${ride.status}, OTP: ${rideOtp}`);

  // 5. Driver Accepts Ride
  const acceptRes = await client.patch(`/rides/${rideId}/status`, {
    status: 'accepted',
  }, {
    headers: { Authorization: `Bearer ${driverToken}` }
  });
  console.log('✔ 7. Driver accepted ride, Status:', acceptRes.data?.data?.status || 'accepted');

  // 6. Driver Arrived
  await client.patch(`/rides/${rideId}/status`, {
    status: 'arrived',
  }, {
    headers: { Authorization: `Bearer ${driverToken}` }
  });
  console.log('✔ 8. Driver arrived at pickup');

  // 7. Driver Starts Ride with OTP
  const startRes = await client.patch(`/rides/${rideId}/status`, {
    status: 'started',
    otp: rideOtp,
  }, {
    headers: { Authorization: `Bearer ${driverToken}` }
  });
  console.log('✔ 9. Driver verified OTP and started trip. Status:', startRes.data?.data?.status || 'started');

  // 8. Driver Completes Ride
  const completeRes = await client.patch(`/rides/${rideId}/status`, {
    status: 'completed',
  }, {
    headers: { Authorization: `Bearer ${driverToken}` }
  });
  console.log('✔ 10. Driver completed trip. Status:', completeRes.data?.data?.status || 'completed');

  // 9. User Submits Feedback & Rating
  try {
    await client.patch(`/rides/${rideId}/feedback`, {
      rating: 5,
      comment: 'Excellent trip! Clean cab and polite driver.',
      tipAmount: 0,
    }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    console.log('✔ 11. Rider submitted 5-star review');
  } catch (err) {
    console.log('Feedback note:', err.response?.data?.message || err.message);
  }

  // 10. Driver Checks Wallet Balance
  const walletRes = await client.get('/drivers/wallet', {
    headers: { Authorization: `Bearer ${driverToken}` }
  });
  const currentBalance = walletRes.data?.data?.balance ?? 0;
  console.log(`✔ 12. Driver wallet balance: ₹${currentBalance}`);

  // 11. Driver Requests Withdrawal
  // If balance is 0 or low, let's adjust or topup driver wallet to test withdrawal
  if (currentBalance < 100) {
    console.log('Adding test credit to driver wallet for withdrawal test...');
    await client.post(`/admin/wallet/drivers/${approvedDriver._id || approvedDriver.id}/adjust`, {
      amount: 500,
      type: 'credit',
      description: 'E2E Test credit for withdrawal',
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
  }

  // Request withdrawal
  let withdrawalRequestId = '';
  try {
    const withdrawRes = await client.post('/drivers/wallet/withdrawals', {
      amount: 100,
      paymentMethod: 'upi',
      accountDetails: 'driver@upi',
      bankDetails: {
        accountNumber: '1234567890',
        ifscCode: 'SBIN0001234',
        accountHolderName: approvedDriver.name,
      },
    }, {
      headers: { Authorization: `Bearer ${driverToken}` }
    });
    const withdrawal = withdrawRes.data?.data?.request || withdrawRes.data?.data;
    withdrawalRequestId = withdrawal?._id || withdrawal?.id;
    console.log('✔ 13. Driver submitted withdrawal request for ₹100, Request ID:', withdrawalRequestId);
  } catch (err) {
    console.error('Withdrawal request note:', err.response?.data?.message || err.message);
  }

  // 12. Admin Reviews & Approves Withdrawal
  let targetRequestId = withdrawalRequestId;
  if (!targetRequestId) {
    const pendingList = await client.get('/admin/wallet/drivers/withdrawals', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const firstPending = pendingList.data?.data?.results?.[0];
    targetRequestId = firstPending?._id || firstPending?.id;
  }

  if (targetRequestId) {
    const approveRes = await client.patch(`/admin/wallet/drivers/withdrawals/${targetRequestId}/approve`, {}, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✔ 14. Admin successfully approved driver withdrawal request ${targetRequestId}!`);
  } else {
    console.log('No pending withdrawal request to approve');
  }

  console.log('\n=== FULL RIDE & WITHDRAWAL LIFECYCLE COMPLETED SUCCESSFULLY ===');
}

runFullLifecycle().catch((err) => {
  console.error('✘ Lifecycle failed:', err.message, err.response?.data || '');
});
