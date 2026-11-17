import { describe, expect, test } from 'bun:test';
import { decodeFeed, detectCharset } from '../../../src/lib/feed';
import { readFixture } from '../../helpers/fixtures';

// The UTF-8 bytes of a string, for building test input.
const enc = (s: string) => new TextEncoder().encode(s);

describe('detectCharset', () => {
    test('prefers a BOM over everything else', () => {
        expect(detectCharset(readFixture('odd/bom-utf8.xml'), 'text/xml; charset=iso-8859-1')).toBe('UTF-8');
    });

    test('uses the Content-Type charset before the XML prolog', () => {
        expect(
            detectCharset(enc('<?xml version="1.0" encoding="utf-8"?><rss/>'), 'text/xml; charset="ISO-8859-1"'),
        ).toBe('windows-1252');
    });

    test('falls back to the XML prolog, then UTF-8', () => {
        expect(detectCharset(enc('<?xml version="1.0" encoding="Windows-1252"?><rss/>'))).toBe('windows-1252');
        expect(detectCharset(enc('<rss/>'))).toBe('UTF-8');
    });

    test('reads the header charset whether quoted or not', () => {
        expect(detectCharset(enc('<rss/>'), "text/xml; charset='ISO-8859-1'")).toBe('windows-1252');
        expect(detectCharset(enc('<rss/>'), 'text/xml;charset=iso-8859-1')).toBe('windows-1252');
    });

    test('ignores unknown charset labels', () => {
        expect(detectCharset(enc('<rss/>'), 'text/xml; charset=klingon')).toBe('UTF-8');
    });
});

describe('decodeFeed', () => {
    test('decodes Windows-1252 smart quotes and the euro sign', () => {
        const xml = decodeFeed(readFixture('odd/windows-1252.xml'));
        expect(xml).toContain('“Smart” Quotes — Café');
        expect(xml).toContain('It’s naïve – €5');
    });

    test('decodes Latin-1 declared only in the HTTP header', () => {
        const xml = decodeFeed(
            readFixture('odd/iso-8859-1-header-only.xml'),
            'application/rss+xml; charset=ISO-8859-1',
        );
        expect(xml).toContain('Grüße aus München');
    });

    test('strips the UTF-8 BOM', () => {
        const xml = decodeFeed(readFixture('odd/bom-utf8.xml'));
        expect(xml.startsWith('<?xml')).toBe(true);
        expect(xml).toContain('😀');
    });

    test('decodes UTF-16 XML that has no BOM', () => {
        // UTF-16LE "<?xml" is 3C 00 3F 00 …: recognizable from the byte pattern alone.
        const xml = '<?xml version="1.0" encoding="UTF-16"?><rss><channel><title>Ünïcödé</title></channel></rss>';
        const bytes = new Uint8Array([...xml].flatMap((ch) => [ch.charCodeAt(0) & 0xff, ch.charCodeAt(0) >> 8]));
        expect(decodeFeed(bytes)).toBe(xml);
    });
});
