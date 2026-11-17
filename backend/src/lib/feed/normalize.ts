// Turns parsed RSS/Atom into one NormalizedFeed shape: fills missing fields, normalizes dates,
// sanitizes HTML, and caps sizes so a huge or hostile feed can't slow the server.
import { createHash } from 'node:crypto';
import { parseFeed } from '@rowanmanning/feed-parser';
import type { FeedFormat, NormalizedFeed, NormalizedItem } from '@frontpage/shared';
import { FeedError } from './errors';
import { parseFeedDate } from './dates';
import { htmlToText, sanitizeFeedHtml, truncate } from './sanitize';

// Shapes of the parser library's output, so our helpers can accept its feed and items.
type ParsedFeed = ReturnType<typeof parseFeed>;
type ParsedItem = ParsedFeed['items'][number];

// Max items read per feed: the parser slows down sharply on big feeds (20k items took ~2 minutes).
export const MAX_ITEMS = 500;

// Field length limits, so one feed can't bloat API responses or the database.
export const SUMMARY_MAX = 300;
const FALLBACK_TITLE_MAX = 80; // a title made from the summary when an item has none
const TITLE_MAX = 300;
const AUTHOR_MAX = 200;
const DESCRIPTION_MAX = 1_000;
const CATEGORIES_MAX = 20;
const CATEGORY_MAX = 100;
const ID_MAX = 512; // longer ids are replaced by a hash
const URL_MAX = 2_048;

export type NormalizeOptions = {
    /** Final URL after redirects; relative links are resolved against it. */
    url: string;
    /** The URL the user asked for, before redirects. Defaults to `url`. */
    requestedUrl?: string;
    /** "Now" for rejecting future dates; tests pass a fixed time. */
    now?: number;
};

// Date tags in order of preference (RSS 2.0 pubDate, RSS 1.0 dc:date, Atom published/updated).
// Read from the raw XML and parsed by parseFeedDate, not the library's new Date(), so one set of rules applies.
const PUBLISHED_TAGS = ['pubdate', 'published', 'issued', 'created', 'date', 'updated', 'modified'];
// Tags for when an item last changed; without one, updatedAt falls back to publishedAt.
const UPDATED_TAGS = ['updated', 'modified', 'date'];

/** Text of every element with one of these tag names, in tag order (e.g. all <pubDate> values). */
function rawText(item: ParsedItem, tags: string[]): string[] {
    const out: string[] = [];

    for (const tag of tags) {
        for (const el of item.element.findElementsWithName(tag)) {
            out.push(el.textContent);
        }
    }

    return out;
}

/** The first candidate that parses as a valid date, as an ISO string, or null if none do. */
function firstDate(candidates: Array<string | Date | null | undefined>, now: number): string | null {
    for (const c of candidates) {
        const iso = c instanceof Date ? parseFeedDate(c.toISOString(), now) : parseFeedDate(c, now);
        if (iso) {
            return iso;
        }
    }

    return null;
}

/** Resolves a URL against `base`; keeps it only if it is http(s) and not absurdly long. */
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

/** Stable short id from any string: the same input always gives the same id. */
const hashedId = (input: string) => `urn:frontpage:${createHash('sha256').update(input).digest('hex').slice(0, 32)}`;

/** Keeps the first `max` items and closes the document again: a cheap scan before the slow parser runs. */
export function limitItems(xml: string, max: number): { xml: string; limited: boolean } {
    // Find the closing tag of item number `max`.
    const closingTag = /<\/(item|entry)\s*>/gi;
    let last: RegExpExecArray | null = null;
    for (let i = 0; i < max; i++) {
        last = closingTag.exec(xml);
        if (!last) {
            return { xml, limited: false };
        }
    }
    // Nothing after it means the feed is already within the limit.
    const rest = xml.slice(closingTag.lastIndex);
    if (!last || !/<(item|entry)[\s>]/i.test(rest)) {
        return { xml, limited: false };
    }

    // Cut there and close the root element so the XML stays valid.
    const isAtom = last[1]!.toLowerCase() === 'entry';
    const isRdf = /<rdf:RDF[\s>]/i.test(xml.slice(0, 4096));
    const close = isAtom ? '</feed>' : isRdf ? '</rdf:RDF>' : '</channel></rss>';
    return { xml: `${xml.slice(0, closingTag.lastIndex)}\n${close}\n`, limited: true };
}

/** True when the URL served a normal web page instead of a feed. */
function looksLikeHtmlPage(xml: string): boolean {
    const head = xml.slice(0, 2048).toLowerCase();
    return /<!doctype html|<html[\s>]/.test(head) && !/<(rss|feed|rdf:rdf)[\s>]/.test(head);
}

/** Which feed standard the document uses: Atom, RSS 1.0 (RDF) or RSS 2.0. */
function detectFormat(feed: ParsedFeed, xml: string): FeedFormat {
    if (feed.meta.type === 'atom') {
        return 'atom';
    }
    if (feed.meta.version?.startsWith('1') || /<rdf:rdf[\s>]/i.test(xml.slice(0, 4096))) {
        return 'rss1';
    }
    return 'rss2';
}

/** The src of the first <img> in already-sanitized HTML, used as a thumbnail. */
function firstImageInHtml(html: string): string | null {
    return html.match(/<img\b[^>]*\bsrc="([^"]+)"/i)?.[1] ?? null;
}

/** Turns one parsed item into a NormalizedItem, filling in anything the feed left out. */
function normalizeItem(
    item: ParsedItem,
    ctx: { siteUrl: string; feedAuthor: string | null; now: number; index: number },
): NormalizedItem {
    // Relative links in the content resolve against the item's own URL, or the site when it has none.
    const url = safeUrl(item.url, ctx.siteUrl);
    const base = url ?? ctx.siteUrl;

    const descriptionHtml = sanitizeFeedHtml(item.description, base);
    const contentHtmlRaw = sanitizeFeedHtml(item.content, base);
    const descriptionText = htmlToText(item.description);
    const contentText = htmlToText(item.content);

    // Full content when the feed carries a body clearly longer than its excerpt.
    const hasFullContent = contentText.length > 0 && contentText.length > descriptionText.length * 1.2;
    const contentHtml = contentHtmlRaw || descriptionHtml;
    const summary = truncate(descriptionText || contentText, SUMMARY_MAX);

    // Title: the feed's own → the start of the summary → "Untitled".
    const title =
        truncate(htmlToText(item.title), TITLE_MAX) ||
        (summary ? truncate(summary, FALLBACK_TITLE_MAX) : '') ||
        'Untitled';

    const publishedAt = firstDate(rawText(item, PUBLISHED_TAGS), ctx.now);
    const updatedAt = firstDate(rawText(item, UPDATED_TAGS), ctx.now) ?? publishedAt;

    // "by Jane Doe" → "Jane Doe"; items without an author use the feed's author.
    const authors = item.authors.map((a) => (htmlToText(a.name) || htmlToText(a.email)).replace(/^by\s+/i, ''));
    const author = truncate(authors.filter(Boolean).join(', '), AUTHOR_MAX) || ctx.feedAuthor;

    // Thumbnail: the item's image → a media:content image → the first <img> in the body.
    const imageUrl =
        safeUrl(item.image?.url, base) ??
        safeUrl(item.mediaImages[0]?.url, base) ??
        safeUrl(item.mediaImages[0]?.image, base) ??
        safeUrl(firstImageInHtml(contentHtml), base);

    // Unique category names, capped in length and count.
    const categoryNames = item.categories.map((c) => truncate(htmlToText(c.label || c.term), CATEGORY_MAX));
    const categories = [...new Set(categoryNames.filter(Boolean))].slice(0, CATEGORIES_MAX);

    // guid → link → hash of title/date/position. Overlong ids are hashed so they stay usable as keys.
    const natural = item.id?.trim() || url;
    const id = natural
        ? natural.length <= ID_MAX
            ? natural
            : hashedId(natural)
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

/**
 * Parses RSS 2.0, RSS 1.0 or Atom into a NormalizedFeed.
 * Throws `not_a_feed` for web pages and other XML, `parse_error` when nothing can be read.
 */
export function normalizeFeed(xml: string, opts: NormalizeOptions): NormalizedFeed {
    const now = opts.now ?? Date.now();
    const text = xml.replace(/^\uFEFF/, ''); // drop the invisible byte-order mark some servers send
    const warnings: string[] = [];

    // Reject empty responses and web pages before spending time parsing them.
    if (!text.trim()) {
        throw new FeedError('not_a_feed', 'The response was empty');
    }
    if (looksLikeHtmlPage(text)) {
        throw new FeedError('not_a_feed', 'This URL points to a web page, not an RSS or Atom feed');
    }

    const limited = limitItems(text, MAX_ITEMS);
    if (limited.limited) {
        warnings.push(`The feed has more than ${MAX_ITEMS} items; only the first ${MAX_ITEMS} were read`);
    }

    let feed: ParsedFeed;
    try {
        feed = parseFeed(limited.xml);
    } catch (err) {
        // INVALID_FEED: no <rss>, <feed> or <rdf:RDF> root was found at all.
        if ((err as { code?: string })?.code === 'INVALID_FEED') {
            throw new FeedError('not_a_feed', 'No RSS or Atom feed was found at this URL');
        }
        throw new FeedError('parse_error', `The feed could not be parsed: ${(err as Error)?.message ?? err}`);
    }

    const format = detectFormat(feed, text);
    const feedUrl = opts.url;
    const siteUrl = safeUrl(feed.url, feedUrl) ?? new URL('/', feedUrl).href; // fallback: the feed's own domain
    const feedAuthor =
        truncate(
            feed.authors
                .map((a) => htmlToText(a.name))
                .filter(Boolean)
                .join(', '),
            AUTHOR_MAX,
        ) || null;

    // Normalize each item, skipping ones that fail and ids already seen (duplicates).
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

    // Non-fatal problems become warnings instead of failing the whole feed.
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
    if (looksTruncated(text)) {
        warnings.push('The feed XML is malformed; it was parsed partially');
    }

    // A feed with no title is named after its site's domain; updatedAt falls back to the newest item.
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

/** Cheap check for a document that never closes its root element. */
function looksTruncated(xml: string): boolean {
    // Ignore trailing comments/processing instructions (e.g. cache stats some CMSs append).
    const tail = xml
        .slice(-4096)
        .replace(/<!--[\s\S]*?-->|<\?[\s\S]*?\?>/g, '')
        .trimEnd()
        .toLowerCase();
    return !/<\/(rss|feed|rdf:rdf)>\s*$/.test(tail);
}
