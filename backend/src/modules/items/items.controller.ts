// HTTP in/out for /api/items: validate the request, call the service as the signed-in reader, send the answer.
// No error handling here: thrown errors become JSON in middleware/error-handler.ts. requireAuth runs first (see the routes).

import type { Request, Response } from 'express';
import type { ItemResponse } from '@frontpage/shared';
import { requireDatabase } from '../../db';
import { currentUser } from '../../middleware/require-auth';
import { markAllRead, setItemsRead, undoMarkAllRead } from './items.read-state';
import { countItems, getItem, listItems } from './items.service';
import { parseItemId, parseItemListQuery, parseMarkAllRead, parseMarkItemsRead, parseReadUndo } from './items.validation';

// GET /api/items?feed=|category=&unread=&order=&limit=&cursor=: one page of the reader's items and the next page's cursor.
export async function listItemsController(req: Request, res: Response) {
    const query = parseItemListQuery(req.query);
    const page = await listItems(requireDatabase(), currentUser(res).id, query);

    res.json(page);
}

// GET /api/items/counts: item and unread counts per feed, per category and in total.
export async function countItemsController(_req: Request, res: Response) {
    const counts = await countItems(requireDatabase(), currentUser(res).id);

    res.json(counts);
}

// GET /api/items/:id: one item with its full content, for the reader view.
export async function getItemController(req: Request<{ id: string }>, res: Response) {
    const item = await getItem(requireDatabase(), currentUser(res).id, parseItemId(req.params.id));

    res.json({ item } satisfies ItemResponse);
}

// PUT /api/items/read { itemIds, isRead }: marks up to 100 items read or unread, then sends fresh counts.
export async function markItemsReadController(req: Request, res: Response) {
    const request = parseMarkItemsRead(req.body);
    const result = await setItemsRead(requireDatabase(), currentUser(res).id, request);

    res.json(result);
}

// POST /api/items/mark-all-read { feed? | category?, asOf? }: marks a scope read and sends what it changed, for undo.
export async function markAllReadController(req: Request, res: Response) {
    const command = parseMarkAllRead(req.body);
    const result = await markAllRead(requireDatabase(), currentUser(res).id, command);

    res.json(result);
}

// POST /api/items/mark-all-read/undo: the `undo` from mark-all, sent back unchanged.
export async function undoMarkAllReadController(req: Request, res: Response) {
    const undo = parseReadUndo(req.body);
    const result = await undoMarkAllRead(requireDatabase(), currentUser(res).id, undo);

    res.json(result);
}
