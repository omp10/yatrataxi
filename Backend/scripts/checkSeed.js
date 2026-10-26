import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { Driver } from '../src/modules/taxi/driver/models/Driver.js';
import { Agent } from '../src/modules/taxi/agent/models/Agent.js';

const PHONE = '7223077890';

const main = async () => {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri, {
    dbName: env.mongoDbName,
  });

  const driver = await Driver.findOne({ phone: PHONE });
  const agent = await Agent.findOne({ phone: PHONE });

  console.log('DRIVER IN DB:', JSON.stringify(driver, null, 2));
  console.log('AGENT IN DB:', JSON.stringify(agent, null, 2));

  await mongoose.disconnect();
};

main().catch(console.error);
