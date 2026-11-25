// Turns parsed RSS/Atom into one NormalizedFeed shape: fills missing fields, normalizes dates, sanitizes HTML.
// Sizes are capped; MAX_ITEMS matters most, as the parser slows down with items² (20k items took ~2 minutes).

import { createHash } from 'node:crypto';
import { parseFeed } from '@rowanmanning/feed-parser';
import type { FeedFormat, NormalizedFeed, NormalizedItem } from '@frontpage/shared';
import { UnprocessableEntityError } from '../../errors';
import { parseFeedDate } from './dates';
import { errorMessage, hasCode } from '../error-code';
import { isRdf, limitItems, looksTruncated, rejectNonFeeds } from './raw-xml';
import { htmlToText, sanitizeFeedHtml, truncate } from './sanitize';
import { resolveUrl } from './urls';

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

// Everything non-fatal found while reading a feed; buildWarnings turns each into a message.
type FeedProblems = {
    itemLimitHit: boolean;
    missingDates: number;
    duplicates: number;
    dropped: number;
    noItems: boolean;
    truncated: boolean;
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

// Content counts as the full article (not a teaser) when its text is at least 20% longer than the description's.
const FULL_CONTENT_RATIO = 1.2;

const PUBLISHED_TAGS = ['pubdate', 'published', 'issued', 'created', 'date', 'updated', 'modified'];
const UPDATED_TAGS = ['updated', 'modified', 'date'];

// Throws `not_a_feed` for empty responses, web pages and other XML, and `parse_error` if nothing can be read.
export function normalizeFeed(xml: string, options: NormalizeOptions): NormalizedFeed {
    const now = options.now ?? Date.now();
    const feedXml = xml.replace(BYTE_ORDER_MARK, '');

    rejectNonFeeds(feedXml);

    const limited = limitItems(feedXml, MAX_ITEMS);
    const feed = parseXml(limited.xml);

    const feedUrl = options.url;
    const siteUrl = resolveUrl(feed.url, feedUrl) ?? new URL('/', feedUrl).href;
    const siteHostname = new URL(siteUrl).hostname.replace(/^www\./, '');
    const feedAuthor = joinAuthors(feed.authors.map((author) => htmlToText(author.name)));

    const collected = collectItems(feed.items, { siteUrl, feedAuthor, now });
    const items = collected.items.sort(byNewestFirst);
    const newestItemDate = items[0]?.publishedAt ?? null;

    return {
        url: feedUrl,
        requestedUrl: options.requestedUrl ?? feedUrl,
        format: detectFormat(feed, feedXml),
        title: truncate(htmlToText(feed.title), TITLE_MAX) || siteHostname,
        description: htmlToText(feed.description, DESCRIPTION_MAX) || null,
        siteUrl,
        imageUrl: resolveUrl(feed.image?.url, siteUrl),
        language: feed.language?.trim() || null,
        updatedAt: firstDate([feed.updated, feed.published], now) ?? newestItemDate,
        items,
        warnings: buildWarnings({
            itemLimitHit: limited.limited,
            missingDates: collected.missingDates,
            duplicates: collected.duplicates,
            dropped: collected.dropped,
            noItems: feed.items.length === 0,
            truncated: looksTruncated(feedXml),
        }),
    };
}

// Runs the feed parser; throws `not_a_feed` for XML that isn't RSS or Atom, and `parse_error` for anything else it can't read.
function parseXml(xml: string): ParsedFeed {
    try {
        return parseFeed(xml);
    } catch (err) {
        if (hasCode(err, 'INVALID_FEED'))
            throw new UnprocessableEntityError('not_a_feed', 'No RSS or Atom feed was found at this URL');

        throw new UnprocessableEntityError('parse_error', `The feed could not be parsed: ${errorMessage(err)}`);
    }
}

// Normalizes every item in feed order, skipping ones that fail and repeats of an id already seen, and counting both.
function collectItems(rawItems: ParsedItem[], context: ItemContext): CollectedItems {
    const seenIds = new Set<string>();
    const collected: CollectedItems = { items: [], missingDates: 0, duplicates: 0, dropped: 0 };

    for (const [index, raw] of rawItems.entries()) {
        let item: NormalizedItem;

        try {
            item = normalizeItem(raw, context, index);
        } catch {
            collected.dropped++;
            continue;
        }

        if (seenIds.has(item.id)) {
            collected.duplicates++;
            continue;
        }

        seenIds.add(item.id);

        if (!item.publishedAt)
            collected.missingDates++;

        collected.items.push(item);
    }

    return collected;
}

// Gaps get fallbacks: title from the summary, author from the feed, thumbnail from the first image, id from a hash.
function normalizeItem(item: ParsedItem, context: ItemContext, index: number): NormalizedItem {
    const url = resolveUrl(item.url, context.siteUrl);
    const linkBase = url ?? context.siteUrl;

    const descriptionText = htmlToText(item.description);
    const contentText = htmlToText(item.content);
    const summary = truncate(descriptionText || contentText, SUMMARY_MAX);
    const contentHtml = sanitizeFeedHtml(item.content, linkBase) || sanitizeFeedHtml(item.description, linkBase);

    const title = truncate(htmlToText(item.title), TITLE_MAX) || truncate(summary, FALLBACK_TITLE_MAX) || 'Untitled';
    const publishedAt = firstDate(rawText(item, PUBLISHED_TAGS), context.now);
    const authorNames = item.authors.map((author) => (htmlToText(author.name) || htmlToText(author.email)).replace(/^by\s+/i, ''));
    const categoryNames = item.categories.map((category) => truncate(htmlToText(category.label || category.term), CATEGORY_MAX));

    // Thumbnail: the item's own image, else its first media image, else the first <img> in its (already sanitized) content.
    const firstContentImage = contentHtml.match(/<img\b[^>]*\bsrc="([^"]+)"/i)?.[1];
    const imageUrl =
        resolveUrl(item.image?.url, linkBase) ??
        resolveUrl(item.mediaImages[0]?.url, linkBase) ??
        resolveUrl(item.mediaImages[0]?.image, linkBase) ??
        resolveUrl(firstContentImage, linkBase);

    const hasFullContent = contentText.length > 0 && contentText.length > descriptionText.length * FULL_CONTENT_RATIO;
    const fallbackIdKey = `${title}|${publishedAt ?? ''}|${index}`;

    return {
        id: itemId(item.id?.trim() || url, fallbackIdKey),
        title,
        url,
        author: joinAuthors(authorNames) ?? context.feedAuthor,
        publishedAt,
        updatedAt: firstDate(rawText(item, UPDATED_TAGS), context.now) ?? publishedAt,
        summary,
        contentHtml,
        hasFullContent,
        imageUrl,
        categories: [...new Set(categoryNames.filter(Boolean))].slice(0, CATEGORIES_MAX),
    };
}

// Sort order for items: newest first; undated items go last and keep their feed order (the sort is stable).
function byNewestFirst(a: NormalizedItem, b: NormalizedItem): number {
    if (a.publishedAt && b.publishedAt)
        return b.publishedAt.localeCompare(a.publishedAt);

    if (a.publishedAt)
        return -1;

    if (b.publishedAt)
        return 1;

    return 0;
}

// Which feed standard the document uses: 'atom', 'rss1' (the older RDF-based RSS 1.0) or 'rss2'.
function detectFormat(feed: ParsedFeed, xml: string): FeedFormat {
    if (feed.meta.type === 'atom')
        return 'atom';

    if (feed.meta.version?.startsWith('1') || isRdf(xml))
        return 'rss1';

    return 'rss2';
}

function buildWarnings(found: FeedProblems): string[] {
    const warnings: string[] = [];

    if (found.itemLimitHit)
        warnings.push(`The feed has more than ${MAX_ITEMS} items; only the first ${MAX_ITEMS} were read`);

    if (found.missingDates)
        warnings.push(`${found.missingDates} item(s) have no usable date`);

    if (found.duplicates)
        warnings.push(`${found.duplicates} duplicate item(s) were removed`);

    if (found.dropped)
        warnings.push(`${found.dropped} item(s) could not be read and were skipped`);

    if (found.noItems)
        warnings.push('The feed has no items');

    if (found.truncated)
        warnings.push('The feed XML is malformed; it was parsed partially');

    return warnings;
}

// The feed's own id (guid, else link) when short enough; otherwise a stable hash of it, or of `fallbackKey`.
function itemId(ownId: string | null | undefined, fallbackKey: string): string {
    if (!ownId)
        return hashedId(fallbackKey);

    return ownId.length <= ID_MAX ? ownId : hashedId(ownId);
}

// Joins author names with ", " (blanks skipped) and cuts to AUTHOR_MAX; null when there are none.
function joinAuthors(names: string[]): string | null {
    return truncate(names.filter(Boolean).join(', '), AUTHOR_MAX) || null;
}

function firstDate(candidates: Array<string | Date | null | undefined>, now: number): string | null {
    for (const candidate of candidates) {
        const iso = candidate instanceof Date ? parseFeedDate(candidate.toISOString(), now) : parseFeedDate(candidate, now);

        if (iso)
            return iso;
    }

    return null;
}

// The text of every child element with one of these tag names, in tag order, e.g. ['pubdate', 'date'] → all <pubDate>s, then all <dc:date>s.
function rawText(item: ParsedItem, tags: string[]): string[] {
    const out: string[] = [];

    for (const tag of tags) {
        for (const element of item.element.findElementsWithName(tag))
            out.push(element.textContent);
    }

    return out;
}

// A stable "urn:frontpage:…" id from any text (same input, same id); used when an item has no usable or short-enough guid or link.
function hashedId(input: string) {
    return `urn:frontpage:${createHash('sha256').update(input).digest('hex').slice(0, 32)}`;
}
