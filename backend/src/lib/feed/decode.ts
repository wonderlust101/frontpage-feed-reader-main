// Turns raw feed bytes into text. XML may use any encoding (res.text() always assumes UTF-8), so it's
// detected the way browsers do it: BOM → Content-Type charset → <?xml encoding="…"?> → UTF-8.

import { decodeBuffer, getEncoding, type SnifferOptions } from 'encoding-sniffer';

// Options for encoding-sniffer: the bare charset from the Content-Type header (e.g. "ISO-8859-1"), or none so it checks the bytes.
function snifferOptions(contentType: string | null | undefined): SnifferOptions {
    const charset = contentType?.match(/charset\s*=\s*["']?([^;\s"']+)/i)?.[1];
    return { transportLayerEncodingLabel: charset, defaultEncoding: 'UTF-8' };
}

// Wraps the bytes as a Node Buffer (what encoding-sniffer expects) without copying them.
const asBuffer = (bytes: Uint8Array) => Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);

// The encoding a feed will be decoded with, e.g. "UTF-8" or "windows-1252" (same rules as decodeFeed; handy for tests and debugging).
export function detectCharset(bytes: Uint8Array, contentType?: string | null): string {
    return getEncoding(bytes, snifferOptions(contentType));
}

// Turns feed bytes into a string using the detected encoding (BOM → Content-Type → <?xml encoding> → UTF-8), without a BOM.
export function decodeFeed(bytes: Uint8Array, contentType?: string | null): string {
    return decodeBuffer(asBuffer(bytes), snifferOptions(contentType));
}
