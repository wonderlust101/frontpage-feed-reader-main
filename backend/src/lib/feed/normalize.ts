// Turns parsed RSS/Atom into one NormalizedFeed shape: fills missing fields, normalizes dates, sanitizes HTML.
// Sizes are capped; MAX_ITEMS matters most, as the parser slows down with items² (20k items took ~2 minutes).

import { createHash } from 'node:crypto';
import { parseFeed } from '@rowanmanning/feed-parser';
import type { FeedFormat, NormalizedFeed, NormalizedItem } from '@frontpage/shared';
import { FeedError } from './errors';
import { parseFeedDate } from './dates';
import { htmlToText, sanitizeFeedHtml, truncate } from './sanitize';

type ParsedFeed = ReturnType<typeof parseFeed>;
type ParsedItem = ParsedFeed['items'][number];

const BYTE_ORDER_MARK = /^\uFEFF/;
export const MAX_ITEMS = 500;

export const SUMMARY_MAX = 300;
const FALLBACK_TITLE_MAX = 80;
const TITLE_MAX = 300;
const AUTHOR_MAX = 200;
const DESCRIPTION_MAX = 1_000;
const CATEGORIES_MAX = 20;
const CATEGORY_MAX = 100;
const ID_MAX = 512;
const URL_MAX = 2_048;

export type NormalizeOptions = {
    url: string;
    requestedUrl?: string;
    now?: number;
};

const PUBLISHED_TAGS = ['pubdate', 'published', 'issued', 'created', 'date', 'updated', 'modified'];
const UPDATED_TAGS = ['updated', 'modified', 'date'];

// A stable "urn:frontpage:…" id from any text (same input, same id); used when an item has no usable or short-enough guid or link.
const hashedId = (input: string) => `urn:frontpage:${createHash('sha256').update(input).digest('hex').slice(0, 32)}`;

// The text of every child element with one of these tag names, in tag order, e.g. ['pubdate', 'date'] → all <pubDate>s, then all <dc:date>s.
function rawText(item: ParsedItem, tags: string[]): string[] {
    const out: string[] = [];

    for (const tag of tags) {
        for (const el of item.element.findElementsWithName(tag)) {
            out.push(el.textContent);
        }
    }

    return out;
}

// Tries each candidate with parseFeedDate and returns the first valid one as an ISO string, or null.
function firstDate(candidates: Array<string | Date | null | undefined>, now: number): string | null {
    for (const c of candidates) {
        const iso = c instanceof Date ? parseFeedDate(c.toISOString(), now) : parseFeedDate(c, now);
        if (iso) {
            return iso;
        }
    }

    return null;
}

// Resolves a possibly relative URL against `base`; null unless it's http(s) and at most URL_MAX characters long.
function safeUrl(value: string | null | undefined, base?: string): string | null {
    if (!value || value.length > URL_MAX) {
        return null;
    }

    try {
        const url = new URL(value.trim(), base);
        return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
    } catch {
        return null;
    }
}

// Keeps only the first `max` items (RSS) or entries (Atom) and re-closes the document so it stays valid XML; `limited` says if anything was cut.
// A quick text scan before parsing, because the parser slows down badly on huge feeds.
export function limitItems(xml: string, max: number): { xml: string; limited: boolean } {
    const closingTag = /<\/(item|entry)\s*>/gi;
    let lastKeptItem: RegExpExecArray | null = null;

    for (let i = 0; i < max; i++) {
        lastKeptItem = closingTag.exec(xml);

        if (!lastKeptItem) {
            return { xml, limited: false };
        }
    }

    const keptXml = xml.slice(0, closingTag.lastIndex);
    const hasMoreItems = /<(item|entry)[\s>]/i.test(xml.slice(closingTag.lastIndex));
    if (!lastKeptItem || !hasMoreItems) {
        return { xml, limited: false };
    }

    const isAtom = lastKeptItem[1]!.toLowerCase() === 'entry';
    const isRdf = /<rdf:RDF[\s>]/i.test(xml.slice(0, 4096));
    const closingRootTag = isAtom ? '</feed>' : isRdf ? '</rdf:RDF>' : '</channel></rss>';
    return { xml: `${keptXml}\n${closingRootTag}\n`, limited: true };
}

// True when the response is a normal web page (it starts like HTML and has no <rss> or <feed>),
function looksLikeHtmlPage(xml: string): boolean {
    const head = xml.slice(0, 2048).toLowerCase();
    return /<!doctype html|<html[\s>]/.test(head) && !/<(rss|feed|rdf:rdf)[\s>]/.test(head);
}

// Which feed standard the document uses: 'atom', 'rss1' (the older RDF-based RSS 1.0) or 'rss2'.
function detectFormat(feed: ParsedFeed, xml: string): FeedFormat {
    if (feed.meta.type === 'atom') {
        return 'atom';
    }

    if (feed.meta.version?.startsWith('1') || /<rdf:rdf[\s>]/i.test(xml.slice(0, 4096))) {
        return 'rss1';
    }

    return 'rss2';
}

// The src of the first <img> in already-sanitized HTML, or null; used as a fallback thumbnail.
function firstImageInHtml(html: string): string | null {
    return html.match(/<img\b[^>]*\bsrc="([^"]+)"/i)?.[1] ?? null;
}

// Turns one parsed item into a NormalizedItem: sanitizes its HTML, builds a plain-text summary, parses dates and cuts long fields.
// Gaps get fallbacks: title from the summary, author from the feed, thumbnail from the first image, id from a hash.
function normalizeItem(
    item: ParsedItem,
    ctx: { siteUrl: string; feedAuthor: string | null; now: number; index: number },
): NormalizedItem {
    const url = safeUrl(item.url, ctx.siteUrl);
    const linkBase = url ?? ctx.siteUrl;

    const descriptionHtml = sanitizeFeedHtml(item.description, linkBase);
    const contentHtmlRaw = sanitizeFeedHtml(item.content, linkBase);
    const descriptionText = htmlToText(item.description);
    const contentText = htmlToText(item.content);

    const hasFullContent = contentText.length > 0 && contentText.length > descriptionText.length * 1.2;
    const contentHtml = contentHtmlRaw || descriptionHtml;
    const summary = truncate(descriptionText || contentText, SUMMARY_MAX);

    const title =
        truncate(htmlToText(item.title), TITLE_MAX) ||
        (summary ? truncate(summary, FALLBACK_TITLE_MAX) : '') ||
        'Untitled';

    const publishedAt = firstDate(rawText(item, PUBLISHED_TAGS), ctx.now);
    const updatedAt = firstDate(rawText(item, UPDATED_TAGS), ctx.now) ?? publishedAt;

    const authors = item.authors.map((a) => (htmlToText(a.name) || htmlToText(a.email)).replace(/^by\s+/i, ''));
    const author = truncate(authors.filter(Boolean).join(', '), AUTHOR_MAX) || ctx.feedAuthor;

    const imageUrl =
        safeUrl(item.image?.url, linkBase) ??
        safeUrl(item.mediaImages[0]?.url, linkBase) ??
        safeUrl(item.mediaImages[0]?.image, linkBase) ??
        safeUrl(firstImageInHtml(contentHtml), linkBase);

    const categoryNames = item.categories.map((c) => truncate(htmlToText(c.label || c.term), CATEGORY_MAX));
    const categories = [...new Set(categoryNames.filter(Boolean))].slice(0, CATEGORIES_MAX);

    const feedProvidedId = item.id?.trim() || url;
    const id = feedProvidedId
        ? feedProvidedId.length <= ID_MAX
            ? feedProvidedId
            : hashedId(feedProvidedId)
        : hashedId(`${title}|${publishedAt ?? ''}|${ctx.index}`);

    return {
        id,
        title,
        url,
        author,
        publishedAt,
        updatedAt,
        summary,
        contentHtml,
        hasFullContent,
        imageUrl,
        categories,
    };
}

// Parses RSS 2.0, RSS 1.0 or Atom into one NormalizedFeed (items newest first, duplicates removed, non-fatal problems in `warnings`).
// Throws `not_a_feed` for empty responses, web pages and other XML, and `parse_error` if nothing can be read.
export function normalizeFeed(xml: string, opts: NormalizeOptions): NormalizedFeed {
    const now = opts.now ?? Date.now();
    const feedXml = xml.replace(BYTE_ORDER_MARK, '');
    const warnings: string[] = [];

    if (!feedXml.trim()) {
        throw new FeedError('not_a_feed', 'The response was empty');
    }
    if (looksLikeHtmlPage(feedXml)) {
        throw new FeedError('not_a_feed', 'This URL points to a web page, not an RSS or Atom feed');
    }

    const limited = limitItems(feedXml, MAX_ITEMS);
    if (limited.limited) {
        warnings.push(`The feed has more than ${MAX_ITEMS} items; only the first ${MAX_ITEMS} were read`);
    }

    let feed: ParsedFeed;
    try {
        feed = parseFeed(limited.xml);
    } catch (err) {
        if ((err as { code?: string })?.code === 'INVALID_FEED') {
            throw new FeedError('not_a_feed', 'No RSS or Atom feed was found at this URL');
        }
        throw new FeedError('parse_error', `The feed could not be parsed: ${(err as Error)?.message ?? err}`);
    }

    const format = detectFormat(feed, feedXml);
    const feedUrl = opts.url;
    const siteUrl = safeUrl(feed.url, feedUrl) ?? new URL('/', feedUrl).href;
    const feedAuthor =
        truncate(
            feed.authors
                .map((a) => htmlToText(a.name))
                .filter(Boolean)
                .join(', '),
            AUTHOR_MAX,
        ) || null;

    const seen = new Set<string>();
    const items: NormalizedItem[] = [];
    let missingDates = 0;
    let duplicates = 0;
    let dropped = 0;

    feed.items.forEach((raw, index) => {
        let item: NormalizedItem;
        try {
            item = normalizeItem(raw, { siteUrl, feedAuthor, now, index });
        } catch {
            dropped++;
            return;
        }
        if (seen.has(item.id)) {
            duplicates++;
            return;
        }
        seen.add(item.id);
        if (!item.publishedAt) {
            missingDates++;
        }
        items.push(item);
    });

    // Newest first; undated items keep their feed order at the end.
    items.sort((a, b) => {
        if (a.publishedAt && b.publishedAt) {
            return b.publishedAt.localeCompare(a.publishedAt);
        }
        if (a.publishedAt) {
            return -1;
        }
        if (b.publishedAt) {
            return 1;
        }
        return 0;
    });

    if (missingDates) {
        warnings.push(`${missingDates} item(s) have no usable date`);
    }
    if (duplicates) {
        warnings.push(`${duplicates} duplicate item(s) were removed`);
    }
    if (dropped) {
        warnings.push(`${dropped} item(s) could not be read and were skipped`);
    }
    if (feed.items.length === 0) {
        warnings.push('The feed has no items');
    }
    if (looksTruncated(feedXml)) {
        warnings.push('The feed XML is malformed; it was parsed partially');
    }

    const hostname = new URL(siteUrl).hostname.replace(/^www\./, '');
    const latestItem = items.find((i) => i.publishedAt)?.publishedAt ?? null;

    return {
        url: feedUrl,
        requestedUrl: opts.requestedUrl ?? feedUrl,
        format,
        title: truncate(htmlToText(feed.title), TITLE_MAX) || hostname,
        description: htmlToText(feed.description, DESCRIPTION_MAX) || null,
        siteUrl,
        imageUrl: safeUrl(feed.image?.url, siteUrl),
        language: feed.language?.trim() || null,
        updatedAt: firstDate([feed.updated, feed.published], now) ?? latestItem,
        items,
        warnings,
    };
}

// True when the XML never closes its root element (</rss>, </feed> or </rdf:RDF>), i.e. the feed was cut off and only partly parsed.
function looksTruncated(xml: string): boolean {
    // Ignore trailing comments/processing instructions (e.g. cache stats some CMSs append).
    const tail = xml
        .slice(-4096)
        .replace(/<!--[\s\S]*?-->|<\?[\s\S]*?\?>/g, '')
        .trimEnd()
        .toLowerCase();
    return !/<\/(rss|feed|rdf:rdf)>\s*$/.test(tail);
}
