// Categories: a reader's own folders for feeds. Every query is scoped by the reader's id, so another reader's category
// is simply "not found" (404), the same answer as for one that doesn't exist.

import { and, eq } from 'drizzle-orm';
import type { Database } from '../../db';
import { NotFoundError } from '../../middleware/errors';
import { categories } from './categories.schema';

// Throws `category_not_found` (404) unless the category exists and belongs to the reader.
export async function assertOwnCategory(db: Database, userId: string, categoryId: string): Promise<void> {
    const [category] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)));
    if (!category)
        throw new NotFoundError('category_not_found', 'Category not found');
}
