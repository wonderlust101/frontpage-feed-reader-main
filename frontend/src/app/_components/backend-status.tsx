import { connection } from 'next/server';
import { getHealth } from '@/lib/api';

const DB_LABEL = {
    connected: 'connected',
    skipped: 'not configured (skipped)',
    error: 'error',
} as const;

// Rendered on each request, not cached.
export async function BackendStatus() {
    await connection();
    const health = await getHealth();

    return (
        <p className="text-ui text-ink-2" role="status">
            {health ? `API: online · Database: ${DB_LABEL[health.database]}` : 'API: offline'}
        </p>
    );
}
