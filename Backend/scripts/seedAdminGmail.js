import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { Admin } from '../src/modules/taxi/admin/models/Admin.js';
import { hashPassword } from '../src/modules/taxi/services/passwordService.js';

const EMAIL = 'admin@gmail.com';
const PASSWORD = '123456';

const connect = async () => {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri, {
    autoIndex: env.nodeEnv !== 'production',
    dbName: env.mongoDbName,
  });
};

const main = async () => {
  await connect();
  console.log('CONNECTED TO DATABASE');

  const hashedPassword = await hashPassword(PASSWORD);
  const now = new Date();

  const admin = await Admin.findOneAndUpdate(
    { email: EMAIL },
    {
      $set: {
        name: 'Super Admin',
        email: EMAIL,
        phone: '9999999999',
        role: 'superadmin',
        admin_type: 'superadmin',
        permissions: ['*'],
        active: true,
        status: 'active',
        password: hashedPassword,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    {
      returnDocument: 'after',
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    }
  );

  console.log('Seeded Admin:', {
    id: admin._id,
    email: admin.email,
    role: admin.role,
    active: admin.active,
  });

  console.log('Successfully seeded admin@gmail.com with password 123456!');
};

main()
  .catch((error) => {
    console.error('[seedAdminGmail] failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
    console.log('DISCONNECTED FROM DATABASE');
  });
