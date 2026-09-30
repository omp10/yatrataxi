import { connectDatabase } from '../src/config/database.js';
import { Owner } from '../src/modules/taxi/admin/models/Owner.js';
import { Driver } from '../src/modules/taxi/driver/models/Driver.js';
import { signAccessToken } from '../src/modules/taxi/services/tokenService.js';

async function main() {
  console.log('=== TESTING OWNER ADD DRIVER API FLOW ===\n');
  await connectDatabase();

  // Find or create an approved owner
  let owner = await Owner.findOne({ approve: true }).lean();
  if (!owner) {
    owner = await Owner.create({
      owner_name: 'Test Fleet Owner',
      mobile: '9888877777',
      email: 'testfleetowner@example.com',
      password: 'password123',
      approve: true,
      status: 'active',
      active: true,
    });
    console.log('✔ Created test fleet owner');
  } else {
    console.log('✔ Found approved fleet owner:', owner.owner_name, owner.mobile);
  }

  const token = signAccessToken({ sub: String(owner._id), role: 'owner' });

  // Test phone for new fleet driver
  const testPhone = '9988001122';
  await Driver.deleteOne({ phone: testPhone });

  const testPayload = {
    name: 'Fleet Driver Test',
    phone: testPhone,
    mobile: testPhone,
    email: 'fleetdrivertest@example.com',
    address: '123 Fleet St, Indore',
    city: 'Indore',
    salary: 25000,
  };

  console.log('Submitting Add Driver request with salary: 25000...');
  const res = await fetch('http://localhost:5000/api/v1/drivers/fleet/drivers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(testPayload),
  });

  const data = await res.json();
  console.log('Response Status:', res.status);
  console.log('Response Body:', data);

  if (!res.ok || !data.success) {
    throw new Error(`Failed to add fleet driver: ${data.message || res.statusText}`);
  }

  console.log('✔ Driver created successfully via API!');

  // Verify in MongoDB
  const createdDriver = await Driver.findOne({ phone: testPhone }).lean();
  if (!createdDriver) {
    throw new Error('Created driver not found in MongoDB!');
  }

  console.log('✔ Driver record verified in database:');
  console.log('   - ID:', createdDriver._id);
  console.log('   - Name:', createdDriver.name);
  console.log('   - Phone:', createdDriver.phone);
  console.log('   - Salary:', createdDriver.salary);
  console.log('   - Owner ID:', createdDriver.owner_id);

  if (createdDriver.salary !== 25000) {
    throw new Error(`Salary mismatch! Expected 25000, got ${createdDriver.salary}`);
  }

  console.log('✔ Salary verification passed with exact value ₹25,000!');

  // Cleanup
  await Driver.deleteOne({ _id: createdDriver._id });
  console.log('✔ Test driver cleanup completed.');
  console.log('\n=== OWNER ADD DRIVER BUG FIX VERIFIED 100% ===');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
