import { Router } from 'express';
import { authController } from './auth.controller';

export const authRouter = Router();

// Better Auth matches on the full URL, so the route keeps the whole path and app.ts mounts this router without a prefix (a prefix would be stripped).
authRouter.all('/api/auth/*splat', authController);
