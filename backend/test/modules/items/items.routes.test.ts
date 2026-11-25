// /api/items over HTTP. Tests run without a database, so nobody can be signed in: every route must answer 401 before
// reading the query or the id. Signed-in behaviour (scopes, paging, ownership) is in items.service.test.ts.

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { itemsRouter } from '../../../src/modules/items/items.routes';
import { startTestServer } from '../../helpers/test-server';
import { SAMPLE_UUID } from '../../helpers/factories';

const UNAUTHORIZED = { error: { code: 'unauthorized', message: 'Sign in to continue', retryable: false } };

let server: Awaited<ReturnType<typeof startTestServer>>;

beforeAll(async () => {
    server = await startTestServer();
});

afterAll(async () => {
    await server.close();
});

// GETs /api/items + `path`, signed out.
function get(path: string) {
    return fetch(`${server.url}/api/items${path}`);
}

describe('/api/items signed out', () => {
    test.each(['', '/counts', `/${SAMPLE_UUID}`])('GET /api/items%s → 401 unauthorized', async (path) => {
        const res = await get(path);

        expect(res.status).toBe(401);
        expect(await res.json()).toEqual(UNAUTHORIZED);
    });

    test('auth runs before validation: bad parameters or a bad id are still 401, not 400 or 404', async () => {
        expect((await get('?feed=x&category=y&limit=0&cursor=%25')).status).toBe(401);
        expect((await get('?limit=1&limit=2')).status).toBe(401);
        expect((await get('?feed=not-a-uuid')).status).toBe(401);
        expect((await get('/not-a-uuid')).status).toBe(401);
    });
});

describe('itemsRouter', () => {
    test('registers /counts before /:id, so "counts" is never read as an item id', () => {
        const paths = itemsRouter.stack.flatMap((layer) => (layer.route ? [layer.route.path] : []));

        expect(paths).toEqual(['/', '/counts', '/:id']);
    });
});
