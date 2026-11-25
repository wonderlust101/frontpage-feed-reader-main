// /api/items: the articles of a signed-in reader's feeds. Every route needs a session.
// Fixed paths (/counts, /read, …) must be registered before /:id, or Express would read them as an item id.

import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth';
import {
    countItemsController,
    getItemController,
    listItemsController,
    markAllReadController,
    markItemsReadController,
    undoMarkAllReadController,
} from './items.controller';

export const itemsRouter = Router();

itemsRouter.use(requireAuth);
itemsRouter.get('/', listItemsController);
itemsRouter.get('/counts', countItemsController);
itemsRouter.put('/read', markItemsReadController);
itemsRouter.post('/mark-all-read', markAllReadController);
itemsRouter.post('/mark-all-read/undo', undoMarkAllReadController);
itemsRouter.get('/:id', getItemController);
