import { Router } from 'express';
import { fetchFeedController } from './feeds.controller';

export const fetchRouter = Router();

// Mounted at /api/fetch in app.ts.
fetchRouter.get('/', fetchFeedController); // ?url=… (+ optional If-None-Match / If-Modified-Since)
