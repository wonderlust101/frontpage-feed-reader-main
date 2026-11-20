// Turns parsed RSS/Atom into one NormalizedFeed shape: fills missing fields, normalizes dates, sanitizes HTML.
// Sizes are capped; MAX_ITEMS matters most, as the parser slows down with items² (20k items took ~2 minutes).

import { createHash } from 'node:crypto';
import { parseFeed } from '@rowanmanning/feed-parser';
import type { FeedFormat, NormalizedFeed, NormalizedItem } from '@frontpage/shared';
import { UnprocessableEntityError } from '../../middleware/errors';
import { parseFeedDate } from './dates';
import { htmlToText, sanitizeFeedHtml, truncate } from './sanitize';

type ParsedFeed = ReturnType<typeof parseFeed>;

type ParsedItem = ParsedFeed['items'][number];

export type NormalizeOptions = {
    url: string;
    requestedUrl?: string;
    now?: number;
};

// What every item needs from its feed: where relative links point, whose name to use if it has no author, and the clock.
type ItemContext = {
    siteUrl: string;
    feedAuthor: string | null;
    now: number;
};

// The items worth keeping, plus how many were skipped and why (each count becomes a warning).
type CollectedItems = {
    items: NormalizedItem[];
    missingDates: number;
    duplicates: number;
    dropped: number;
};

const BYTE_ORDER_MARK = /^﻿/;
export const MAX_ITEMS = 500;

const SUMMARY_MAX = 300;
const FALLBACK_TITLE_MAX = 80;
const TITLE_MAX = 300;
const AUTHOR_MAX = 200;
const DESCRIPTION_MAX = 1_000;
const CATEGORIES_MAX = 20;
const CATEGORY_MAX = 100;
const ID_MAX = 512;
const URL_MAX = 2_048;

// Content counts as the full article (not a teaser) when its text is at least 20% longer than the description's.
const FULL_CONTENT_RATIO = 1.2;
// How far into the document to look for the root element (<rdf:RDF>); it's always near the top.
const HEAD_CHARS = 4096;

const PUBLISHED_TAGS = ['pubdate', 'published', 'issued', 'created', 'date', 'updated', 'modified'];
const UPDATED_TAGS = ['updated', 'modified', 'date'];

// Parses RSS 2.0, RSS 1.0 or Atom into one NormalizedFeed (items newest first, duplicates removed, non-fatal problems in `warnings`).
// Throws `not_a_feed` for empty responses, web pages and other XML, and `parse_error` if nothing can be read.
export function normalizeFeed(xml: string, opts: NormalizeOptions): NormalizedFeed {
    const now = opts.now ?? Date.now();
    const feedXml = xml.replace(BYTE_ORDER_MARK, '');
    rejectNonFeeds(feedXml);

    const limited = limitItems(feedXml, MAX_ITEMS);
    const feed = parseXml(limited.xml);

    const feedUrl = opts.url;
    const siteUrl = safeUrl(feed.url, feedUrl) ?? new URL('/', feedUrl).href;
    const siteHostname = new URL(siteUrl).hostname.replace(/^www\./, '');
    const feedAuthor = joinAuthors(feed.authors.map((a) => htmlToText(a.name)));

    const collected = collectItems(feed.items, { siteUrl, feedAuthor, now });
    const items = collected.items.sort(byNewestFirst);
    const newestItemDate = items[0]?.publishedAt ?? null;

    return {
        url: feedUrl,
        requestedUrl: opts.requestedUrl ?? feedUrl,
        format: detectFormat(feed, feedXml),
        title: truncate(htmlToText(feed.title), TITLE_MAX) || siteHostname,
        description: htmlToText(feed.description, DESCRIPTION_MAX) || null,
        siteUrl,
        imageUrl: safeUrl(feed.image?.url, siteUrl),
        language: feed.language?.trim() || null,
        updatedAt: firstDate([feed.updated, feed.published], now) ?? newestItemDate,
        items,
        warnings: buildWarnings({
            ...collected,
            itemLimitHit: limited.limited,
            noItems: feed.items.length === 0,
            truncated: looksTruncated(feedXml),
        }),
    };
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
    const closingRootTag = isAtom ? '</feed>' : isRdf(xml) ? '</rdf:RDF>' : '</channel></rss>';
    return { xml: `${keptXml}\n${closingRootTag}\n`, limited: true };
}

// Throws `not_a_feed` for an empty response or a normal web page, before spending time on parsing.
function rejectNonFeeds(xml: string) {
    if (!xml.trim()) {
        throw new UnprocessableEntityError('not_a_feed', 'The response was empty');
    }
    if (looksLikeHtmlPage(xml)) {
        throw new UnprocessableEntityError('not_a_feed', 'This URL points to a web page, not an RSS or Atom feed');
    }
}

// Runs the feed parser; throws `not_a_feed` for XML that isn't RSS or Atom, and `parse_error` for anything else it can't read.
function parseXml(xml: string): ParsedFeed {
    try {
        return parseFeed(xml);
    } catch (err) {
        if ((err as { code?: string })?.code === 'INVALID_FEED') {
            throw new UnprocessableEntityError('not_a_feed', 'No RSS or Atom feed was found at this URL');
        }
        throw new UnprocessableEntityError('parse_error', `The feed could not be parsed: ${(err as Error)?.message ?? err}`);
    }
}

// Normalizes every item in feed order, skipping ones that fail and repeats of an id already seen, and counting both.
function collectItems(rawItems: ParsedItem[], ctx: ItemContext): CollectedItems {
    const seenIds = new Set<string>();
    const collected: CollectedItems = { items: [], missingDates: 0, duplicates: 0, dropped: 0 };

    for (const [index, raw] of rawItems.entries()) {
        let item: NormalizedItem;
        try {
            item = normalizeItem(raw, ctx, index);
        } catch {
            collected.dropped++;
            continue;
        }

        if (seenIds.has(item.id)) {
            collected.duplicates++;
            continue;
        }

        seenIds.add(item.id);
        if (!item.publishedAt) {
            collected.missingDates++;
        }
        collected.items.push(item);
    }

    return collected;
}

// Sort order for items: newest first; undated items go last and keep their feed order (the sort is stable).
function byNewestFirst(a: NormalizedItem, b: NormalizedItem): number {
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
}

// The non-fatal problems found while reading the feed, as messages for the client.
function buildWarnings(found: Omit<CollectedItems, 'items'> & { itemLimitHit: boolean; noItems: boolean; truncated: boolean }): string[] {
    const warnings: string[] = [];

    if (found.itemLimitHit) {
        warnings.push(`The feed has more than ${MAX_ITEMS} items; only the first ${MAX_ITEMS} were read`);
    }
    if (found.missingDates) {
        warnings.push(`${found.missingDates} item(s) have no usable date`);
    }
    if (found.duplicates) {
        warnings.push(`${found.duplicates} duplicate item(s) were removed`);
    }
    if (found.dropped) {
        warnings.push(`${found.dropped} item(s) could not be read and were skipped`);
    }
    if (found.noItems) {
        warnings.push('The feed has no items');
    }
    if (found.truncated) {
        warnings.push('The feed XML is malformed; it was parsed partially');
    }

    return warnings;
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

    if (feed.meta.version?.startsWith('1') || isRdf(xml)) {
        return 'rss1';
    }

    return 'rss2';
}

// True when the root element is <rdf:RDF>, i.e. RSS 1.0.
function isRdf(xml: string): boolean {
    return /<rdf:rdf[\s>]/i.test(xml.slice(0, HEAD_CHARS));
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

// Turns one parsed item into a NormalizedItem: sanitizes its HTML, builds a plain-text summary, parses dates and cuts long fields.
// Gaps get fallbacks: title from the summary, author from the feed, thumbnail from the first image, id from a hash.
function normalizeItem(item: ParsedItem, ctx: ItemContext, index: number): NormalizedItem {
    const url = safeUrl(item.url, ctx.siteUrl);
    const linkBase = url ?? ctx.siteUrl;

    const descriptionText = htmlToText(item.description);
    const contentText = htmlToText(item.content);
    const summary = truncate(descriptionText || contentText, SUMMARY_MAX);
    const contentHtml = sanitizeFeedHtml(item.content, linkBase) || sanitizeFeedHtml(item.description, linkBase);

    const title = truncate(htmlToText(item.title), TITLE_MAX) || truncate(summary, FALLBACK_TITLE_MAX) || 'Untitled';
    const publishedAt = firstDate(rawText(item, PUBLISHED_TAGS), ctx.now);
    const authorNames = item.authors.map((a) => (htmlToText(a.name) || htmlToText(a.email)).replace(/^by\s+/i, ''));
    const categoryNames = item.categories.map((c) => truncate(htmlToText(c.label || c.term), CATEGORY_MAX));

    // Thumbnail: the item's own image, else its first media image, else the first <img> in its (already sanitized) content.
    const firstContentImage = contentHtml.match(/<img\b[^>]*\bsrc="([^"]+)"/i)?.[1];
    const imageUrl =
        safeUrl(item.image?.url, linkBase) ??
        safeUrl(item.mediaImages[0]?.url, linkBase) ??
        safeUrl(item.mediaImages[0]?.image, linkBase) ??
        safeUrl(firstContentImage, linkBase);

    return {
        id: itemId(item.id?.trim() || url, `${title}|${publishedAt ?? ''}|${index}`),
        title,
        url,
        author: joinAuthors(authorNames) ?? ctx.feedAuthor,
        publishedAt,
        updatedAt: firstDate(rawText(item, UPDATED_TAGS), ctx.now) ?? publishedAt,
        summary,
        contentHtml,
        hasFullContent: contentText.length > 0 && contentText.length > descriptionText.length * FULL_CONTENT_RATIO,
        imageUrl,
        categories: [...new Set(categoryNames.filter(Boolean))].slice(0, CATEGORIES_MAX),
    };
}

// The feed's own id for an item (guid, else link) when it's short enough; otherwise a stable hash of it,
// or, for items with neither, a hash of `fallbackKey` (title, date and position).
function itemId(ownId: string | null | undefined, fallbackKey: string): string {
    if (!ownId) {
        return hashedId(fallbackKey);
    }

    return ownId.length <= ID_MAX ? ownId : hashedId(ownId);
}

// Joins author names with ", " (blanks skipped) and cuts to AUTHOR_MAX; null when there are none.
function joinAuthors(names: string[]): string | null {
    return truncate(names.filter(Boolean).join(', '), AUTHOR_MAX) || null;
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

// A stable "urn:frontpage:…" id from any text (same input, same id); used when an item has no usable or short-enough guid or link.
function hashedId(input: string) {
    return `urn:frontpage:${createHash('sha256').update(input).digest('hex').slice(0, 32)}`;
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
