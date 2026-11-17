// Makes untrusted feed HTML safe to render (allowlisted tags, attributes and URL schemes),
// and turns HTML into plain text for titles and summaries.
import sanitize from 'sanitize-html';
import { decode } from 'html-entities';
import { parseSrcset, stringifySrcset } from 'srcset';

// Semantic HTML only. Anything not listed (script, style, form, svg, object, …) is removed.
const ALLOWED_TAGS = [
    // Structure
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
    // Text
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
    // Inline
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
    // Media
    'figure',
    'figcaption',
    'picture',
    'source',
    'img',
    'video',
    'audio',
    'track',
    'iframe',
    // Tables
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

/** iframes are only kept for these video/code-demo hosts, and always sandboxed (see IFRAME_SANDBOX). */
const EMBED_HOSTS = [
    'www.youtube.com',
    'youtube.com',
    'www.youtube-nocookie.com',
    'player.vimeo.com',
    'codepen.io',
    'codesandbox.io',
];

/** Embeds may run their own scripts and open new tabs, but never navigate our page or submit forms. */
const IFRAME_SANDBOX = 'allow-scripts allow-same-origin allow-popups allow-presentation';

/** The only URL schemes kept in links and media. Everything else is dropped. */
const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

/**
 * Resolves a URL against the page and keeps it only if it is http(s) or mailto; anything else → undefined.
 * new URL() parses like a browser does, so tricks like "java\nscript:" are caught too.
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
        return undefined; // not a URL, or a relative URL with no base to resolve it against
    }
}

/**
 * Resolves every URL in a srcset ("a.png 1x, b.png 2x"), dropping unsafe ones.
 * Uses the `srcset` package because URLs may contain commas (".../w_400,c_fill/cat.jpg 400w").
 */
function resolveSrcset(value: string, base?: string): string | undefined {
    const candidates = parseSrcset(value).flatMap((candidate) => {
        const url = resolveUrl(candidate.url, base);
        return url ? [{ ...candidate, url }] : [];
    });

    return candidates.length > 0 ? stringifySrcset(candidates) : undefined;
}

/** Copies a tag's attributes with its URL attributes resolved; unsafe or invalid ones are removed. */
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

/** Sanitizes untrusted feed HTML and resolves relative links and images against `baseUrl`. */
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

/** Converts (possibly unsafe) HTML to plain text, decoding entities and collapsing whitespace. */
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

/** Truncates at a word boundary, adding an ellipsis. Result length is ≤ max. Never splits an emoji in half. */
export function truncate(text: string, max: number): string {
    if (text.length <= max) {
        return text;
    }
    // Emoji and other astral characters are two UTF-16 units; don't keep only the first half.
    const cut = text.slice(0, max - 1).replace(/[\uD800-\uDBFF]$/, '');
    const space = cut.lastIndexOf(' ');
    return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s.,;:!?-]+$/, '')}…`;
}
