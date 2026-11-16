import { Router } from 'express';
import { healthController } from './health.controller';

export const healthRouter = Router();

// Mounted at /api/health in app.ts.
healthRouter.get('/', healthController);
