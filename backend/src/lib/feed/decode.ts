// Turns raw feed bytes into text. XML may use any encoding (res.text() always assumes UTF-8), so it's
// detected the way browsers do it: BOM → Content-Type charset → <?xml encoding="…"?> → UTF-8.

import { decodeBuffer, getEncoding, type SnifferOptions } from 'encoding-sniffer';

// The charset parameter of a Content-Type header: `text/xml; charset="ISO-8859-1"` → ISO-8859-1.
const CHARSET_PARAM = /charset\s*=\s*["']?([^;\s"']+)/i;

// Turns feed bytes into a string using the detected encoding, without a BOM.
export function decodeFeed(bytes: Uint8Array, contentType?: string | null): string {
    return decodeBuffer(asBuffer(bytes), snifferOptions(contentType));
}

// The encoding a feed will be decoded with, e.g. "UTF-8" or "windows-1252" (same rules as decodeFeed; handy for tests and debugging).
export function detectCharset(bytes: Uint8Array, contentType?: string | null): string {
    return getEncoding(bytes, snifferOptions(contentType));
}

// Wraps the bytes as a Node Buffer (what encoding-sniffer expects) without copying them.
function asBuffer(bytes: Uint8Array) {
    return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

// Options for encoding-sniffer: trust the Content-Type charset if there is one, otherwise let it check the bytes.
function snifferOptions(contentType: string | null | undefined): SnifferOptions {
    const charset = contentType?.match(CHARSET_PARAM)?.[1];
    return { transportLayerEncodingLabel: charset, defaultEncoding: 'UTF-8' };
}
