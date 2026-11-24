// HTTP in/out for /api/items: validate the request, call the service as the signed-in reader, send the answer.
// No error handling here: thrown errors become JSON in middleware/error-handler.ts. requireAuth runs first (see the routes).

import type { Request, Response } from 'express';
import type { ItemCountsResponse, ItemListResponse, ItemResponse } from '@frontpage/shared';
import { requireDatabase } from '../../db';
import { currentUser } from '../../middleware/require-auth';
import { countItems, getItem, listItems } from './items.service';
import { parseItemId, parseItemListQuery } from './items.validation';

// GET /api/items?feed=|category=&unread=&order=&limit=&cursor=: one page of the reader's items and the next page's cursor.
export async function listItemsController(req: Request, res: Response) {
    const query = parseItemListQuery(req.query);
    const page = await listItems(requireDatabase(), currentUser(res).id, query);

    res.json(page satisfies ItemListResponse);
}

// GET /api/items/counts: item and unread counts per feed, per category and in total.
export async function countItemsController(_req: Request, res: Response) {
    const counts = await countItems(requireDatabase(), currentUser(res).id);

    res.json(counts satisfies ItemCountsResponse);
}

// GET /api/items/:id: one item with its full content, for the reader view.
export async function getItemController(req: Request<{ id: string }>, res: Response) {
    const item = await getItem(requireDatabase(), currentUser(res).id, parseItemId(req.params.id));

    res.json({ item } satisfies ItemResponse);
}
