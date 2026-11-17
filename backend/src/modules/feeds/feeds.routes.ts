import { Router } from 'express';
import { fetchFeedController } from './feeds.controller';

export const fetchRouter = Router();

fetchRouter.get('/', fetchFeedController);
