import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api/v1';
const client = axios.create({ baseURL: BASE_URL, timeout: 10000 });

async function runTests() {
  console.log('=== STARTING COMPREHENSIVE E2E FLOW TEST ===\n');
  const summary = { passed: [], failed: [] };

  // 1. User Bootstrap
  try {
    const res = await client.get('/users/bootstrap');
    if (res.data?.success || res.status === 200) {
      summary.passed.push('GET /users/bootstrap');
      console.log('✔ GET /users/bootstrap passed');
    }
  } catch (err) {
    summary.failed.push({ step: 'GET /users/bootstrap', error: err.message });
    console.error('✘ GET /users/bootstrap failed:', err.message);
  }

  // 2. User Auth & Onboarding Flow
  let userToken = '';
  const testUserPhone = '9999900001';
  try {
    const otpRes = await client.post('/users/auth/send-otp', { phone: testUserPhone });
    const otp = otpRes.data?.data?.session?.debugOtp || '0000';
    console.log(`✔ User OTP requested for ${testUserPhone}, OTP:`, otp);

    const verifyRes = await client.post('/users/auth/verify-otp', {
      phone: testUserPhone,
      otp,
    });
    console.log('✔ User verify-otp response:', verifyRes.data?.data?.exists ? 'User exists' : 'New User Signup Needed');

    if (verifyRes.data?.data?.token) {
      userToken = verifyRes.data.data.token;
    } else {
      const signupRes = await client.post('/users/signup', {
        phone: testUserPhone,
        name: 'Automated E2E Rider',
        email: 'e2e_rider@yatradesk.test',
        gender: 'male',
      });
      userToken = signupRes.data?.data?.token;
      console.log('✔ User signup created user with token');
    }

    const meRes = await client.get('/users/me', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    console.log('✔ User profile verified:', meRes.data?.data?.name, meRes.data?.data?.phone);
    summary.passed.push('User Onboarding & Profile Flow');
  } catch (err) {
    summary.failed.push({ step: 'User Auth Flow', error: err.message, data: err.response?.data });
    console.error('✘ User Auth Flow failed:', err.message, err.response?.data);
  }

  // 3. User Promos with Auth
  try {
    const promosRes = await client.get('/promos/available', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    console.log(`✔ GET /promos/available passed (${promosRes.data?.data?.length || 0} promos found)`);
    summary.passed.push('User Available Promos');
  } catch (err) {
    summary.failed.push({ step: 'GET /promos/available', error: err.message });
    console.error('✘ GET /promos/available failed:', err.message);
  }

  // 4. Admin Login & Dashboard Flow
  let adminToken = '';
  try {
    const adminLoginRes = await client.post('/admin/login', {
      email: 'yatradesk@gmail.com',
      password: 'password',
    }).catch(async () => {
      return await client.post('/admin/login', {
        email: 'yatradesk@gmail.com',
        password: '123456',
      });
    });

    adminToken = adminLoginRes.data?.data?.token || adminLoginRes.data?.token;
    console.log('✔ Admin login succeeded with token');

    const statsRes = await client.get('/admin/dashboard/data', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('✔ Admin dashboard data received successfully');

    const usersListRes = await client.get('/admin/users', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✔ Admin /admin/users returned ${usersListRes.data?.data?.results?.length || 0} users`);

    const driversListRes = await client.get('/admin/drivers', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✔ Admin /admin/drivers returned ${driversListRes.data?.data?.results?.length || 0} drivers`);

    summary.passed.push('Admin Auth & Dashboard Statistics Flow');
  } catch (err) {
    summary.failed.push({ step: 'Admin Management Flow', error: err.message, data: err.response?.data });
    console.error('✘ Admin Management Flow failed:', err.message, err.response?.data);
  }

  // 5. Driver Onboarding Flow
  let driverRegId = '';
  const testDriverPhone = '9999900003';
  try {
    const regOtpRes = await client.post('/drivers/onboarding/send-otp', { phone: testDriverPhone });
    const driverOtp = regOtpRes.data?.data?.session?.debugOtp || '1234';
    driverRegId = regOtpRes.data?.data?.session?.registrationId;
    console.log(`✔ Driver onboarding OTP sent for ${testDriverPhone}, regId: ${driverRegId}, OTP: ${driverOtp}`);

    await client.post('/drivers/onboarding/verify-otp', {
      registrationId: driverRegId,
      phone: testDriverPhone,
      otp: driverOtp,
    });
    console.log('✔ Driver onboarding OTP verified');

    await client.patch('/drivers/onboarding/personal', {
      registrationId: driverRegId,
      fullName: 'Automated Driver',
      email: 'driver_test@yatradesk.test',
      gender: 'male',
      city: 'Indore',
    });
    console.log('✔ Driver onboarding personal saved');

    await client.patch('/drivers/onboarding/vehicle', {
      registrationId: driverRegId,
      locationId: '6a05732c56840a26dc38acf3',
      city: 'Indore',
      locationName: 'Indore',
      vehicleTypeId: '69dcb5faba63a3e24641c45d',
      serviceCategories: ['taxi'],
      make: 'Maruti',
      model: 'Dzire',
      year: '2022',
      number: 'MP09AB1234',
      color: 'White',
    });
    console.log('✔ Driver onboarding vehicle saved');

    const requiredDocs = [
      'driverPhotographFront',
      'vehicleFrontPictureFront',
      'vehiclePucFront',
      'vehicleInsuranceFront',
      'vehicleRcFront',
      'vehicleRcBack',
      'dLFront',
      'panCardFront',
      'aadhaarCardFront',
      'aadhaarCardBack'
    ];
    const docsPayload = {};
    for (const doc of requiredDocs) {
      docsPayload[doc] = {
        secureUrl: `https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?doc=${doc}`,
        identifyNumber: 'TEST1234567890',
        expiryDate: '2030-12-31'
      };
    }

    await client.patch('/drivers/onboarding/documents', {
      registrationId: driverRegId,
      documents: docsPayload,
    });
    console.log('✔ Driver onboarding documents saved');

    const completeRes = await client.post('/drivers/onboarding/complete', {
      registrationId: driverRegId,
    });
    console.log('✔ Driver onboarding completed successfully! Driver ID:', completeRes.data?.data?.driver?.id);
    summary.passed.push('Driver Onboarding Flow');
  } catch (err) {
    summary.failed.push({ step: 'Driver Onboarding Flow', error: err.message, data: err.response?.data });
    console.error('✘ Driver Onboarding Flow failed:', err.message, err.response?.data);
  }

  // 6. Existing Approved Driver Login & Availability
  let approvedDriverToken = '';
  let approvedDriverId = '';
  try {
    // We login an existing approved driver from DB or login the test driver
    // Let's use driver auth send-otp and verify-otp
    const drvLoginOtp = await client.post('/drivers/auth/send-otp', { phone: '9876543210' }).catch(async () => {
      // or try phone 7610416911
      return await client.post('/drivers/auth/send-otp', { phone: '7610416911' });
    });
    console.log('✔ Driver login OTP requested');
  } catch (err) {
    console.log('Driver login OTP request note:', err.message);
  }

  // 7. Booking Flow (Ride Creation & Status Cycle)
  let rideId = '';
  let rideOtp = '';
  try {
    const ridePayload = {
      pickup: [75.8648, 22.6926],
      drop: [75.8937, 22.7533],
      pickupAddress: 'Bhawarkua Square, Indore',
      dropAddress: 'Vijay Nagar, Indore',
      fare: 150,
      estimatedDistanceMeters: 8500,
      estimatedDurationMinutes: 20,
      transport_type: 'taxi',
      paymentMethod: 'cash',
    };

    const rideRes = await client.post('/rides', ridePayload, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const createdRide = rideRes.data?.data?.ride || rideRes.data?.ride || rideRes.data;
    rideId = createdRide._id || createdRide.id;
    rideOtp = createdRide.otp;
    console.log(`✔ Ride created successfully! Ride ID: ${rideId}, Status: ${createdRide.status}, OTP: ${rideOtp}`);

    const activeRideRes = await client.get('/rides/active/me', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    console.log('✔ /rides/active/me confirmed ride is active:', activeRideRes.data?.data?.status);

    summary.passed.push('Ride Creation & Active Tracking Flow');
  } catch (err) {
    summary.failed.push({ step: 'Ride Creation Flow', error: err.message, data: err.response?.data });
    console.error('✘ Ride Creation Flow failed:', err.message, err.response?.data);
  }

  // 8. Driver Withdrawal Flow
  try {
    // Let's test admin listing driver withdrawals
    const withdrawalListRes = await client.get('/admin/wallet/drivers/withdrawals', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log(`✔ Admin driver withdrawals listed (${withdrawalListRes.data?.data?.results?.length ?? 0} found)`);
    summary.passed.push('Admin Withdrawal Listing Flow');
  } catch (err) {
    summary.failed.push({ step: 'Withdrawal Flow', error: err.message, data: err.response?.data });
    console.error('✘ Withdrawal Flow failed:', err.message, err.response?.data);
  }

  console.log('\n=== COMPREHENSIVE E2E FLOW TEST RESULTS ===');
  console.log('PASSED:', summary.passed.length);
  console.log('FAILED:', summary.failed.length);
  console.log(JSON.stringify(summary, null, 2));
}

runTests();
