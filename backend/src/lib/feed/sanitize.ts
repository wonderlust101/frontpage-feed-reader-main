// Makes untrusted feed HTML safe to render: allowlisted tags, attributes and URL schemes, and sandboxed
// embeds that can't navigate our page. Also turns HTML into plain text for titles and summaries.

import sanitize from 'sanitize-html';
import { decode } from 'html-entities';
import { parseSrcset, stringifySrcset } from 'srcset';

const ALLOWED_TAGS = [
    'p',
    'br',
    'hr',
    'div',
    'span',
    'section',
    'article',
    'aside',
    'details',
    'summary',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'a',
    'ul',
    'ol',
    'li',
    'dl',
    'dt',
    'dd',
    'blockquote',
    'q',
    'cite',
    'abbr',
    'time',
    'em',
    'strong',
    'b',
    'i',
    'u',
    's',
    'del',
    'ins',
    'mark',
    'small',
    'sub',
    'sup',
    'pre',
    'code',
    'kbd',
    'samp',
    'var',
    'figure',
    'figcaption',
    'picture',
    'source',
    'img',
    'video',
    'audio',
    'track',
    'iframe',
    'table',
    'caption',
    'thead',
    'tbody',
    'tfoot',
    'tr',
    'th',
    'td',
    'colgroup',
    'col',
];

const EMBED_HOSTS = [
    'www.youtube.com',
    'youtube.com',
    'www.youtube-nocookie.com',
    'player.vimeo.com',
    'codepen.io',
    'codesandbox.io',
];

const IFRAME_SANDBOX = 'allow-scripts allow-same-origin allow-popups allow-presentation';

const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

/**
 * Resolves a URL against the page it came from; undefined unless it's http(s) or mailto, so
 * javascript:, data:, file: and invalid URLs are dropped. new URL() reads tricky input like a browser does.
 */
function resolveUrl(value: string, base?: string): string | undefined {
    const trimmed = value.trim();
    if (!trimmed) {
        return undefined;
    }

    try {
        const url = new URL(trimmed, base);
        return SAFE_PROTOCOLS.has(url.protocol) ? url.href : undefined;
    } catch {
        return undefined;
    }
}

/**
 * Resolves every URL in a srcset ("a.png 1x, b.png 2x") and drops unsafe ones; undefined if none are left.
 * Uses the `srcset` package because URLs may contain commas (".../w_400,c_fill/cat.jpg 400w").
 */
function resolveSrcset(value: string, base?: string): string | undefined {
    const candidates = parseSrcset(value).flatMap((candidate) => {
        const url = resolveUrl(candidate.url, base);
        return url ? [{ ...candidate, url }] : [];
    });

    return candidates.length > 0 ? stringifySrcset(candidates) : undefined;
}

/**
 * A copy of a tag's attributes with the named URL attributes (href, src, srcset, poster) resolved.
 * An unsafe or invalid URL attribute is removed, never kept as it was.
 */
function withResolvedUrls(attribs: sanitize.Attributes, names: string[], base?: string): sanitize.Attributes {
    const result = { ...attribs };

    for (const name of names.filter((n) => n in result)) {
        const resolve = name === 'srcset' ? resolveSrcset : resolveUrl;
        const resolved = resolve(result[name]!, base);

        if (resolved) {
            result[name] = resolved;
        } else {
            delete result[name];
        }
    }

    return result;
}

/**
 * Makes untrusted feed HTML safe to render: keeps semantic tags, removes scripts, styles, event
 * handlers and unsafe URLs, sandboxes embeds, and makes relative links and images absolute using `baseUrl`.
 */
export function sanitizeFeedHtml(html: string | null | undefined, baseUrl?: string): string {
    if (!html) {
        return '';
    }
    return sanitize(html, {
        allowedTags: ALLOWED_TAGS,
        allowedAttributes: {
            a: ['href', 'title', 'name', 'rel', 'target'],
            img: ['src', 'srcset', 'sizes', 'alt', 'title', 'width', 'height', 'loading'],
            source: ['src', 'srcset', 'sizes', 'type', 'media'],
            video: ['src', 'poster', 'controls', 'width', 'height'],
            audio: ['src', 'controls'],
            track: ['src', 'kind', 'srclang', 'label'],
            iframe: ['src', 'width', 'height', 'title', 'allowfullscreen', 'sandbox', 'loading', 'referrerpolicy'],
            abbr: ['title'],
            time: ['datetime'],
            td: ['colspan', 'rowspan'],
            th: ['colspan', 'rowspan', 'scope'],
            ol: ['start', 'reversed', 'type'],
            code: ['class'],
            pre: ['class'],
            '*': ['lang', 'dir'],
        },
        allowedClasses: { code: [/^language-/], pre: [/^language-/] },
        allowedSchemes: ['http', 'https', 'mailto'],
        allowedIframeHostnames: EMBED_HOSTS,
        allowProtocolRelative: true,
        disallowedTagsMode: 'discard',
        nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript', 'template', 'title', 'head'],
        transformTags: {
            a: (tagName, attribs) => ({
                tagName,
                attribs: {
                    ...withResolvedUrls(attribs, ['href'], baseUrl),
                    rel: 'noopener noreferrer nofollow',
                    target: '_blank',
                },
            }),
            img: (tagName, attribs) => ({
                tagName,
                attribs: { ...withResolvedUrls(attribs, ['src', 'srcset'], baseUrl), loading: 'lazy' },
            }),
            source: (tagName, attribs) => ({ tagName, attribs: withResolvedUrls(attribs, ['src', 'srcset'], baseUrl) }),
            video: (tagName, attribs) => ({ tagName, attribs: withResolvedUrls(attribs, ['src', 'poster'], baseUrl) }),
            audio: (tagName, attribs) => ({ tagName, attribs: withResolvedUrls(attribs, ['src'], baseUrl) }),
            track: (tagName, attribs) => ({ tagName, attribs: withResolvedUrls(attribs, ['src'], baseUrl) }),
            iframe: (tagName, attribs) => ({
                tagName,
                attribs: {
                    ...attribs,
                    sandbox: IFRAME_SANDBOX,
                    loading: 'lazy',
                    referrerpolicy: 'strict-origin-when-cross-origin',
                },
            }),
        },
        exclusiveFilter: (frame) => (frame.tag === 'img' || frame.tag === 'iframe') && !frame.attribs.src,
    })
        .replace(/<(p|div|span)>\s*<\/\1>/g, '')
        .trim();
}

/**
 * Turns HTML into plain text for titles and summaries: removes tags (and script/style contents),
 * decodes entities like &amp;, collapses whitespace, and cuts to `max` characters if given.
 */
export function htmlToText(html: string | null | undefined, max?: number): string {
    if (!html) {
        return '';
    }

    // Block-level boundaries become spaces so "<p>a</p><p>b</p>" reads "a b", not "ab".
    const spaced = html.replace(
        /<(?:br|hr)\b[^>]*>|<\/(?:p|div|li|h[1-6]|blockquote|tr|td|th|dd|dt|pre|figure)>/gi,
        '$& ',
    );

    const stripped = sanitize(spaced, {
        allowedTags: [],
        allowedAttributes: {},
        nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript', 'template', 'title', 'head', 'figcaption'],
    });

    // Decode twice to fix double-encoded entities like "&amp;amp;" that some feeds emit.
    let text = decode(decode(stripped));
    text = text
        .replace(/\s+/g, ' ')
        .replace(/\s+([.,;:!?)])/g, '$1')
        .trim();

    return max ? truncate(text, max) : text;
}

/**
 * Shortens text to at most `max` characters, cutting at a word boundary and adding "…".
 * Never splits an emoji in half.
 */
export function truncate(text: string, max: number): string {
    if (text.length <= max) {
        return text;
    }

    // Emoji and other astral characters are two UTF-16 units; don't keep only the first half.
    const cut = text.slice(0, max - 1).replace(/[\uD800-\uDBFF]$/, '');
    const space = cut.lastIndexOf(' ');

    return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s.,;:!?-]+$/, '')}…`;
}
