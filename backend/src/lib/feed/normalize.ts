import { parseFeed } from '@rowanmanning/feed-parser';
import type { FeedFormat, NormalizedFeed, NormalizedItem } from '@frontpage/shared';
import { FeedError } from './errors';
import { parseFeedDate } from './dates';
import { cleanText, htmlToText, sanitizeFeedHtml, truncate } from './sanitize';

type ParsedFeed = ReturnType<typeof parseFeed>;
type ParsedItem = ParsedFeed['items'][number];

export const SUMMARY_MAX = 300;
const FALLBACK_TITLE_MAX = 80;

export type NormalizeOptions = {
    /** The final URL the feed was fetched from; used for fallbacks and resolving relative links. */
    url: string;
    /** The URL originally requested, before redirects. Defaults to `url`. */
    requestedUrl?: string;
    now?: number;
};

// Item date elements, in order of preference. Dates are read from the raw XML and parsed by
// parseFeedDate alone (not the library's `new Date()`), so one set of rules decides every date.
// RSS 2.0: pubDate · RSS 1.0: dc:date · Atom: published/updated (+ legacy issued/created/modified).
const PUBLISHED_TAGS = ['pubdate', 'published', 'issued', 'created', 'date', 'updated', 'modified'];
const UPDATED_TAGS = ['updated', 'modified', 'date'];

function rawText(item: ParsedItem, tags: string[]): string[] {
    const out: string[] = [];
    for (const tag of tags) {
        for (const el of item.element.findElementsWithName(tag)) out.push(el.textContent);
    }
    return out;
}

function firstDate(candidates: Array<string | Date | null | undefined>, now: number): string | null {
    for (const c of candidates) {
        const iso = c instanceof Date ? parseFeedDate(c.toISOString(), now) : parseFeedDate(c, now);
        if (iso) return iso;
    }
    return null;
}

function safeUrl(value: string | null | undefined, base?: string): string | null {
    if (!value) return null;
    try {
        const url = new URL(value.trim(), base);
        return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
    } catch {
        return null;
    }
}

/** Small stable hash (FNV-1a, 32-bit) for synthesizing ids. */
function hash(input: string): string {
    let h = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
}

function looksLikeHtmlPage(xml: string): boolean {
    const head = xml.slice(0, 2048).toLowerCase();
    return /<!doctype html|<html[\s>]/.test(head) && !/<(rss|feed|rdf:rdf)[\s>]/.test(head);
}

function detectFormat(feed: ParsedFeed, xml: string): FeedFormat {
    if (feed.meta.type === 'atom') return 'atom';
    if (feed.meta.version?.startsWith('1') || /<rdf:rdf[\s>]/i.test(xml.slice(0, 4096))) return 'rss1';
    return 'rss2';
}

function firstImageInHtml(html: string): string | null {
    return html.match(/<img\b[^>]*\bsrc="([^"]+)"/i)?.[1] ?? null;
}

function normalizeItem(
    item: ParsedItem,
    ctx: { siteUrl: string; feedAuthor: string | null; now: number; index: number },
): NormalizedItem {
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

    const title = cleanText(item.title) || (summary ? truncate(summary, FALLBACK_TITLE_MAX) : '') || 'Untitled';

    const publishedAt = firstDate(rawText(item, PUBLISHED_TAGS), ctx.now);
    const updatedAt = firstDate(rawText(item, UPDATED_TAGS), ctx.now) ?? publishedAt;

    const author =
        item.authors
            .map((a) => (cleanText(a.name) || cleanText(a.email)).replace(/^by\s+/i, ''))
            .filter(Boolean)
            .join(', ') || ctx.feedAuthor;

    const imageUrl =
        safeUrl(item.image?.url, base) ??
        safeUrl(item.mediaImages[0]?.url, base) ??
        safeUrl(item.mediaImages[0]?.image, base) ??
        safeUrl(firstImageInHtml(contentHtml), base);

    const categories = [
        ...new Set(item.categories.map((c) => cleanText(c.label || c.term)).filter((c): c is string => Boolean(c))),
    ];

    const guid = item.id?.trim();
    const id = guid || url || `urn:frontpage:${hash(`${title}|${publishedAt ?? ''}|${ctx.index}`)}`;

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
 * Parses an RSS 2.0, RSS 1.0 (RDF) or Atom document and normalizes it into a `NormalizedFeed`,
 * filling missing fields, normalizing dates and sanitizing HTML.
 * Throws `not_a_feed` for HTML pages and non-feed XML, `parse_error` when nothing can be recovered.
 */
export function normalizeFeed(xml: string, opts: NormalizeOptions): NormalizedFeed {
    const now = opts.now ?? Date.now();
    const text = xml.replace(/^﻿/, '');
    const warnings: string[] = [];

    if (!text.trim()) throw new FeedError('not_a_feed', 'The response was empty');
    if (looksLikeHtmlPage(text)) {
        throw new FeedError('not_a_feed', 'This URL points to a web page, not an RSS or Atom feed');
    }

    let feed: ParsedFeed;
    try {
        feed = parseFeed(text);
    } catch (err) {
        if ((err as { code?: string })?.code === 'INVALID_FEED') {
            throw new FeedError('not_a_feed', 'No RSS or Atom feed was found at this URL');
        }
        throw new FeedError('parse_error', `The feed could not be parsed: ${(err as Error)?.message ?? err}`);
    }

    const format = detectFormat(feed, text);
    const feedUrl = opts.url;
    const siteUrl = safeUrl(feed.url, feedUrl) ?? new URL('/', feedUrl).href;
    const feedAuthor =
        feed.authors
            .map((a) => cleanText(a.name))
            .filter(Boolean)
            .join(', ') || null;

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
        if (!item.publishedAt) missingDates++;
        items.push(item);
    });

    // Newest first; undated items keep their feed order at the end.
    items.sort((a, b) => {
        if (a.publishedAt && b.publishedAt) return b.publishedAt.localeCompare(a.publishedAt);
        if (a.publishedAt) return -1;
        if (b.publishedAt) return 1;
        return 0;
    });

    if (missingDates) warnings.push(`${missingDates} item(s) have no usable date`);
    if (duplicates) warnings.push(`${duplicates} duplicate item(s) were removed`);
    if (dropped) warnings.push(`${dropped} item(s) could not be read and were skipped`);
    if (feed.items.length === 0) warnings.push('The feed has no items');
    if (looksTruncated(text)) warnings.push('The feed XML is malformed; it was parsed partially');

    const hostname = new URL(siteUrl).hostname.replace(/^www\./, '');
    const latestItem = items.find((i) => i.publishedAt)?.publishedAt ?? null;

    return {
        url: feedUrl,
        requestedUrl: opts.requestedUrl ?? feedUrl,
        format,
        title: cleanText(feed.title) || hostname,
        description: htmlToText(feed.description) || null,
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
