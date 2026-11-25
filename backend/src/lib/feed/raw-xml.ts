// Quick text scans of a feed's raw XML, run before or beside the (slow) parser.

import { UnprocessableEntityError } from '../../errors';

// How far into the document to look for the root element; it's always near the top.
const HEAD_CHARS = 4096;

// An HTML page announces itself in its first few lines.
const HTML_SNIFF_CHARS = 2048;

// How much of the end to check for the closing root tag.
const TAIL_CHARS = 4096;

// A text scan before parsing, because the parser slows down badly on huge feeds; re-closes the document so it stays valid.
export function limitItems(xml: string, max: number): { xml: string; limited: boolean } {
    const closingTag = /<\/(item|entry)\s*>/gi;
    let lastKeptItem: RegExpExecArray | null = null;

    for (let keptCount = 0; keptCount < max; keptCount++) {
        lastKeptItem = closingTag.exec(xml);

        if (!lastKeptItem)
            return { xml, limited: false };
    }

    const keptXml = xml.slice(0, closingTag.lastIndex);
    const hasMoreItems = /<(item|entry)[\s>]/i.test(xml.slice(closingTag.lastIndex));

    if (!lastKeptItem || !hasMoreItems)
        return { xml, limited: false };

    const isAtom = lastKeptItem[1]?.toLowerCase() === 'entry';

    return { xml: `${keptXml}\n${closingRootTag(xml, isAtom)}\n`, limited: true };
}

// Runs before parsing, so an empty response or a web page fails fast.
export function rejectNonFeeds(xml: string) {
    if (!xml.trim())
        throw new UnprocessableEntityError('not_a_feed', 'The response was empty');

    if (looksLikeHtmlPage(xml))
        throw new UnprocessableEntityError('not_a_feed', 'This URL points to a web page, not an RSS or Atom feed');
}

// RSS 1.0's root element is <rdf:RDF>.
export function isRdf(xml: string): boolean {
    return /<rdf:rdf[\s>]/i.test(xml.slice(0, HEAD_CHARS));
}

// True when the XML never closes its root element (</rss>, </feed> or </rdf:RDF>), i.e. the feed was cut off and only partly parsed.
export function looksTruncated(xml: string): boolean {
    // Ignore trailing comments/processing instructions (e.g. cache stats some CMSs append).
    const tail = xml
        .slice(-TAIL_CHARS)
        .replace(/<!--[\s\S]*?-->|<\?[\s\S]*?\?>/g, '')
        .trimEnd()
        .toLowerCase();

    return !/<\/(rss|feed|rdf:rdf)>\s*$/.test(tail);
}

function closingRootTag(xml: string, isAtom: boolean): string {
    if (isAtom)
        return '</feed>';

    if (isRdf(xml))
        return '</rdf:RDF>';

    return '</channel></rss>';
}

// It starts like HTML and has no <rss>, <feed> or <rdf:RDF> near the top.
function looksLikeHtmlPage(xml: string): boolean {
    const head = xml.slice(0, HTML_SNIFF_CHARS).toLowerCase();

    return /<!doctype html|<html[\s>]/.test(head) && !/<(rss|feed|rdf:rdf)[\s>]/.test(head);
}
