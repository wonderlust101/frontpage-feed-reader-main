import type { Request, Response } from 'express';
import type { HealthResponse } from '@frontpage/shared';
import { checkDatabase } from '../../db';

/** GET /api/health — API liveness plus database status. */
export async function healthController(_req: Request, res: Response) {
    const database = await checkDatabase();
    const body: HealthResponse = {
        api: 'ok',
        database: database.status,
        ...(database.error && { error: database.error }),
    };
    res.json(body);
}
