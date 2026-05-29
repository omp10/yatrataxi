import { Router } from 'express';
import { agentRouter } from './agentRoutes.js';

export const agentModuleRouter = Router();

agentModuleRouter.use('/agents', agentRouter);
