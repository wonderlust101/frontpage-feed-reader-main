import type { Request, Response } from 'express';
import type { HealthResponse } from '@frontpage/shared';
import { checkDatabase } from '../../db';

// GET /api/health: reports that the API is up and whether the database is connected, skipped (not configured) or failing.
export async function healthController(_req: Request, res: Response) {
    const database = await checkDatabase();
    const body: HealthResponse = {
        api: 'ok',
        database: database.status,
        ...(database.error && { error: database.error }),
    };
    res.json(body);
}
