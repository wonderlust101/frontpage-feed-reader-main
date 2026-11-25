// A missing or repeated ?url= is passed on as undefined, which parseFeedUrl rejects as `invalid_url`.
export function parseFetchUrl(query: Record<string, unknown>): string | undefined {
    return typeof query.url === 'string' ? query.url : undefined;
}
