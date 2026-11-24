// /api/items: the articles of a signed-in reader's feeds. Every route needs a session.
// /counts must be registered before /:id, or Express would read "counts" as an item id.

import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth';
import { countItemsController, getItemController, listItemsController } from './items.controller';

export const itemsRouter = Router();

itemsRouter.use(requireAuth);
itemsRouter.get('/', listItemsController);
itemsRouter.get('/counts', countItemsController);
itemsRouter.get('/:id', getItemController);
