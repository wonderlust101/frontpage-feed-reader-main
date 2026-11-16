type Label = ConstructorParameters<typeof TextDecoder>[0];

const ALIASES: Record<string, string> = {
    // Browsers (and the WHATWG Encoding spec) treat Latin-1 as Windows-1252; real feeds rely on it.
    'iso-8859-1': 'windows-1252',
    latin1: 'windows-1252',
    'us-ascii': 'windows-1252',
    ascii: 'windows-1252',
    utf8: 'utf-8',
};

function normalizeCharset(name: string | null | undefined): string | null {
    const cleaned = name
        ?.trim()
        .replace(/^["']|["']$/g, '')
        .toLowerCase();
    if (!cleaned) return null;
    const label = ALIASES[cleaned] ?? cleaned;
    try {
        new TextDecoder(label as Label);
        return label;
    } catch {
        return null;
    }
}

function sniffBom(bytes: Uint8Array): string | null {
    if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return 'utf-8';
    if (bytes[0] === 0xfe && bytes[1] === 0xff) return 'utf-16be';
    if (bytes[0] === 0xff && bytes[1] === 0xfe) return 'utf-16le';
    return null;
}

function charsetFromContentType(contentType: string | null | undefined): string | null {
    return normalizeCharset(contentType?.match(/charset\s*=\s*([^;\s]+)/i)?.[1]);
}

function charsetFromProlog(bytes: Uint8Array): string | null {
    // The prolog is ASCII, so a Latin-1 view of the first bytes is enough to read it.
    const head = new TextDecoder('windows-1252').decode(bytes.subarray(0, 512));
    return normalizeCharset(head.match(/^\s*<\?xml[^>]*\bencoding\s*=\s*["']([^"']+)["']/i)?.[1]);
}

/** Picks the charset (BOM → Content-Type → XML prolog → UTF-8). */
export function detectCharset(bytes: Uint8Array, contentType?: string | null): string {
    return sniffBom(bytes) ?? charsetFromContentType(contentType) ?? charsetFromProlog(bytes) ?? 'utf-8';
}

/** Decodes raw feed bytes into a string, stripping any BOM. */
export function decodeFeed(bytes: Uint8Array, contentType?: string | null): string {
    const charset = detectCharset(bytes, contentType);
    return new TextDecoder(charset as Label).decode(bytes);
}
