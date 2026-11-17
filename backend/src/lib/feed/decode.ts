import { decodeBuffer, getEncoding, type SnifferOptions } from 'encoding-sniffer';

// HTTP bodies are bytes, and XML (unlike JSON) may use any encoding, so `res.text()` (always UTF-8)
// isn't enough. encoding-sniffer applies the HTML/XML standard's sniffing order, the same one
// browsers use: BOM → Content-Type charset → <?xml encoding="…"?> → UTF-8.

/** The sniffer takes a bare charset label, so pull `charset=…` out of the Content-Type header. */
function snifferOptions(contentType: string | null | undefined): SnifferOptions {
    const charset = contentType?.match(/charset\s*=\s*["']?([^;\s"']+)/i)?.[1];
    return { transportLayerEncodingLabel: charset, defaultEncoding: 'UTF-8' };
}

/** Views the bytes as a Buffer without copying them. */
const asBuffer = (bytes: Uint8Array) => Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);

/** The encoding the feed will be decoded with, e.g. "UTF-8" or "windows-1252". */
export function detectCharset(bytes: Uint8Array, contentType?: string | null): string {
    return getEncoding(bytes, snifferOptions(contentType));
}

/** Decodes raw feed bytes into a string, stripping any BOM. */
export function decodeFeed(bytes: Uint8Array, contentType?: string | null): string {
    return decodeBuffer(asBuffer(bytes), snifferOptions(contentType));
}
