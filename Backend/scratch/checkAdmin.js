import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { Admin } from '../src/modules/taxi/admin/models/Admin.js';
import { comparePassword } from '../src/modules/taxi/services/passwordService.js';

const EMAIL = 'admin@gmail.com';
const PASSWORD = '123456';

const main = async () => {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri, {
    dbName: env.mongoDbName,
  });

  const admin = await Admin.findOne({ email: EMAIL }).select('+password');
  console.log('ADMIN IN DB:', JSON.stringify(admin, null, 2));

  if (admin) {
    const isMatch = await comparePassword(PASSWORD, admin.password);
    console.log(`Password '123456' matches: ${isMatch}`);
  }

  await mongoose.disconnect();
};

main().catch(console.error);
