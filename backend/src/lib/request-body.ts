import { BadRequestError } from '../errors';

// Throws `bad_request` for anything but a plain object (no body, an array, a string, null).
export function requireJsonObject(body: unknown): Record<string, unknown> {
    if (typeof body !== 'object' || body === null || Array.isArray(body))
        throw new BadRequestError('bad_request', 'The request body must be a JSON object');

    return body as Record<string, unknown>;
}
