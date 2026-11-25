// Resolves URLs taken from untrusted feeds: makes them absolute and keeps only safe protocols,
// so javascript:, data:, file: and broken URLs never reach the client.

export const WEB_PROTOCOLS: ReadonlySet<string> = new Set(['http:', 'https:']);
// Links inside article HTML may also be email links.
export const LINK_PROTOCOLS: ReadonlySet<string> = new Set([...WEB_PROTOCOLS, 'mailto:']);

const URL_MAX = 2_048;

// Resolves a possibly relative URL against `base`; null if it's blank, longer than URL_MAX, invalid, or not one of `protocols`.
export function resolveUrl(value: string | null | undefined, base?: string, protocols: ReadonlySet<string> = WEB_PROTOCOLS): string | null {
    const trimmed = value?.trim();

    if (!trimmed || trimmed.length > URL_MAX)
        return null;

    try {
        const url = new URL(trimmed, base);

        return protocols.has(url.protocol) ? url.href : null;
    } catch {
        return null;
    }
}

// The feed's own image, else the site's /favicon.ico (unchecked: it may not exist); null when it has neither.
export function feedIconUrl(imageUrl: string | null, siteUrl: string | null): string | null {
    return imageUrl ?? resolveUrl('/favicon.ico', siteUrl ?? undefined);
}
