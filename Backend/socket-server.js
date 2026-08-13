import { createServer } from 'node:http';
import { connectDatabase } from './src/config/database.js';
import { env } from './src/config/env.js';
import { configureTaxiSocketServer } from './src/modules/taxi/socket/index.js';

const bootstrap = async () => {
  await connectDatabase();

  const httpServer = createServer();
  
  configureTaxiSocketServer(httpServer);

  httpServer.listen(env.socketPort, () => {
    console.log(`Taxi socket server listening on port ${env.socketPort}`);
  });
};

bootstrap().catch((error) => {
  console.error('Failed to start taxi socket server', error);
  process.exit(1);
});
