import { createServer } from 'node:http';
import { createApp } from './src/app.js';
import { connectDatabase } from './src/config/database.js';
import { env } from './src/config/env.js';
import { User } from './src/modules/taxi/user/models/User.js';
import { restoreScheduledDispatches } from './src/modules/taxi/services/dispatchService.js';
import { configureTaxiSocketServer } from './src/modules/taxi/socket/index.js';

// Settings that are convenient while developing but let anyone log in as anyone
// on a live server. Printed loudly so a production deploy cannot miss them.
const warnAboutUnsafeAuthConfig = () => {
  const isTruthy = (value) => ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
  const warnings = [];

  if (env.nodeEnv !== 'production') {
    warnings.push(`NODE_ENV is "${env.nodeEnv}": login OTPs are returned in API responses (debugOtp).`);
  }
  if (isTruthy(env.sms?.useDefaultOtp)) {
    warnings.push('USE_DEFAULT_OTP is on: SMS is skipped and every phone number accepts STATIC_OTP_CODE.');
  }

  warnings.forEach((warning) => console.warn(`[SECURITY] ${warning} Do not run a live server like this.`));
};

const bootstrap = async () => {
  warnAboutUnsafeAuthConfig();
  await connectDatabase();

  const app = createApp();
  const httpServer = createServer(app);
  configureTaxiSocketServer(httpServer);
  await restoreScheduledDispatches();

  httpServer.listen(env.port, () => {
    console.log(`Taxi backend listening on port ${env.port}`);
  });
};

bootstrap().catch((error) => {
  console.error('Failed to start taxi backend', error);
  process.exit(1);
});
