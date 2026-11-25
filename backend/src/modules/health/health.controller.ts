import type { Request, Response } from 'express';
import type { HealthResponse } from '@frontpage/shared';
import { checkDatabase } from '../../db';

// GET /api/health is public, so a database error is logged here and never sent: it can name hosts and roles.
export async function healthController(_req: Request, res: Response) {
    const database = await checkDatabase();

    if (database.error)
        console.error('Health check: database error:', database.error);

    const body: HealthResponse = { api: 'ok', database: database.status };

    res.json(body);
}
