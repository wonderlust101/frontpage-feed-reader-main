import { Router } from 'express';
import { authController } from './auth.controller';

export const authRouter = Router();

// Better Auth matches on the full URL, so this router is mounted with app.all('/api/auth/*splat') rather than app.use (which strips the prefix).
authRouter.all('/api/auth/*splat', authController);
