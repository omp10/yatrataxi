import { Router } from 'express';
import { chatModuleRouter } from '../chat/routes/index.js';
import { adminModuleRouter } from '../admin/routes/index.js';
import { agentModuleRouter } from '../agent/routes/index.js';
import { driverModuleRouter } from '../driver/routes/index.js';
import { supportModuleRouter } from '../support/routes/index.js';
import { userModuleRouter } from '../user/routes/index.js';
import { commonRouter } from '../common/routes/commonRoutes.js';
import { entertainmentModuleRouter } from '../entertainment/routes/index.js';

export const taxiRouter = Router();

taxiRouter.use(entertainmentModuleRouter);
taxiRouter.use(chatModuleRouter);
taxiRouter.use(adminModuleRouter);
taxiRouter.use(agentModuleRouter);
taxiRouter.use(userModuleRouter);
taxiRouter.use(driverModuleRouter);
taxiRouter.use(supportModuleRouter);
taxiRouter.use(commonRouter);
