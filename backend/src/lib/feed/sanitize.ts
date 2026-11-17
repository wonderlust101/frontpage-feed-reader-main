import sanitize from 'sanitize-html';
import { decode } from 'html-entities';

// Semantic HTML only. Anything not listed (script, style, form, svg, object, …) is removed.
const ALLOWED_TAGS = [
    ...'p br hr div span section article aside details summary'.split(' '), // structure
    ...'h1 h2 h3 h4 h5 h6 a ul ol li dl dt dd blockquote q cite abbr time'.split(' '), // text
    ...'em strong b i u s del ins mark small sub sup pre code kbd samp var'.split(' '), // inline
    ...'figure figcaption picture source img video audio track iframe'.split(' '), // media
    ...'table caption thead tbody tfoot tr th td colgroup col'.split(' '), // tables
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

/**
 * What an embed may do: run its own player scripts and open links in a new tab. Not granted:
 * navigating our page (allow-top-navigation), forms, or downloads.
 */
const IFRAME_SANDBOX = 'allow-scripts allow-same-origin allow-popups allow-presentation';

function absolute(value: string | undefined, base: string | undefined): string | undefined {
    if (!value) return value;
    const trimmed = value.trim();
    if (/^(?:javascript|vbscript|data):/i.test(trimmed.replace(/[\s\u0000-\u001f]/g, ''))) return undefined;
    if (!base) return trimmed;
    try {
        return new URL(trimmed, base).href;
    } catch {
        return trimmed;
    }
}

function absoluteSrcset(value: string | undefined, base: string | undefined): string | undefined {
    if (!value) return value;
    return value
        .split(',')
        .map((part) => {
            const [url, ...rest] = part.trim().split(/\s+/);
            const abs = absolute(url, base);
            return abs ? [abs, ...rest].join(' ') : '';
        })
        .filter(Boolean)
        .join(', ');
}

/**
 * Sanitizes untrusted feed HTML: keeps semantic structure, drops scripts, styles, event handlers
 * and dangerous URLs, resolves relative links and images against `baseUrl`.
 */
export function sanitizeFeedHtml(html: string | null | undefined, baseUrl?: string): string {
    if (!html) return '';
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
            a: (tagName, attribs) => {
                const href = absolute(attribs.href, baseUrl);
                return {
                    tagName,
                    attribs: {
                        ...attribs,
                        ...(href ? { href } : {}),
                        rel: 'noopener noreferrer nofollow',
                        target: '_blank',
                    },
                };
            },
            img: (tagName, attribs) => ({
                tagName,
                attribs: {
                    ...attribs,
                    ...(attribs.src && { src: absolute(attribs.src, baseUrl) ?? '' }),
                    ...(attribs.srcset && { srcset: absoluteSrcset(attribs.srcset, baseUrl) ?? '' }),
                    loading: 'lazy',
                },
            }),
            source: (tagName, attribs) => ({
                tagName,
                attribs: {
                    ...attribs,
                    ...(attribs.src && { src: absolute(attribs.src, baseUrl) ?? '' }),
                    ...(attribs.srcset && { srcset: absoluteSrcset(attribs.srcset, baseUrl) ?? '' }),
                },
            }),
            iframe: (tagName, attribs) => ({
                tagName,
                attribs: {
                    ...attribs,
                    sandbox: IFRAME_SANDBOX,
                    loading: 'lazy',
                    referrerpolicy: 'strict-origin-when-cross-origin',
                },
            }),
            video: (tagName, attribs) => ({
                tagName,
                attribs: {
                    ...attribs,
                    ...(attribs.src && { src: absolute(attribs.src, baseUrl) ?? '' }),
                    ...(attribs.poster && { poster: absolute(attribs.poster, baseUrl) ?? '' }),
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
    if (!html) return '';
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
    if (text.length <= max) return text;
    // Emoji and other astral characters are two UTF-16 units; don't keep only the first half.
    const cut = text.slice(0, max - 1).replace(/[\uD800-\uDBFF]$/, '');
    const space = cut.lastIndexOf(' ');
    return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s.,;:!?-]+$/, '')}…`;
}

/** Plain-text cleanup for titles/names: strips tags, decodes entities, collapses whitespace. */
export function cleanText(value: string | null | undefined): string {
    return htmlToText(value);
}
