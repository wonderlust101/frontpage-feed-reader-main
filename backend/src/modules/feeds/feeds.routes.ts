import { Router } from 'express';
import { fetchFeedController } from './feeds.controller';

export const feedsRouter = Router();

feedsRouter.get('/', fetchFeedController);
