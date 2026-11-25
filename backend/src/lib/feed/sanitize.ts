// Makes untrusted feed HTML safe to render: allowlisted tags, attributes and URL schemes, and sandboxed
// embeds that can't navigate our page. Also turns HTML into plain text for titles and summaries.

import sanitize from 'sanitize-html';
import { decode } from 'html-entities';
import { parseSrcset, stringifySrcset } from 'srcset';
import { LINK_PROTOCOLS, resolveUrl } from './urls';

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

const EMBED_HOSTS = ['www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com', 'player.vimeo.com', 'codepen.io', 'codesandbox.io'];

const IFRAME_SANDBOX = 'allow-scripts allow-same-origin allow-popups allow-presentation';

// Tags whose text is never content (code, styles, form options…): dropped along with the tag.
const NON_TEXT_TAGS = ['script', 'style', 'textarea', 'option', 'noscript', 'template', 'title', 'head'];

const ALLOWED_ATTRIBUTES: sanitize.IOptions['allowedAttributes'] = {
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
};

// The link schemes urls.ts accepts, without the trailing colon sanitize-html leaves off.
const ALLOWED_SCHEMES = [...LINK_PROTOCOLS].map((protocol) => protocol.replace(/:$/, ''));

// The attributes of each tag that hold URLs: made absolute against the item's link, and removed if unsafe.
const URL_ATTRIBUTES: Record<string, string[]> = {
    a: ['href'],
    img: ['src', 'srcset'],
    source: ['src', 'srcset'],
    video: ['src', 'poster'],
    audio: ['src'],
    track: ['src'],
};

// Attributes set whatever the feed sent: links open in a new tab without leaking our page, images load lazily, embeds are sandboxed.
const FORCED_ATTRIBUTES: Record<string, sanitize.Attributes> = {
    a: { rel: 'noopener noreferrer nofollow', target: '_blank' },
    img: { loading: 'lazy' },
    iframe: { sandbox: IFRAME_SANDBOX, loading: 'lazy', referrerpolicy: 'strict-origin-when-cross-origin' },
};

// Makes feed HTML safe to render: keeps semantic tags, removes scripts, styles, event handlers and unsafe URLs, and makes links absolute.
export function sanitizeFeedHtml(html: string | null | undefined, baseUrl?: string): string {
    if (!html)
        return '';

    return sanitize(html, {
        allowedTags: ALLOWED_TAGS,
        allowedAttributes: ALLOWED_ATTRIBUTES,
        allowedClasses: { code: [/^language-/], pre: [/^language-/] },
        allowedSchemes: ALLOWED_SCHEMES,
        allowedIframeHostnames: EMBED_HOSTS,
        allowProtocolRelative: true,
        disallowedTagsMode: 'discard',
        nonTextTags: NON_TEXT_TAGS,
        transformTags: tagTransforms(baseUrl),
        exclusiveFilter: (frame) => (frame.tag === 'img' || frame.tag === 'iframe') && !frame.attribs.src,
    })
        .replace(/<(p|div|span)>\s*<\/\1>/g, '')
        .trim();
}

// Turns HTML into plain text: removes tags and script/style contents, decodes entities like &amp;, collapses spaces, and cuts to `max`.
export function htmlToText(html: string | null | undefined, max?: number): string {
    if (!html)
        return '';

    // Block-level boundaries become spaces so "<p>a</p><p>b</p>" reads "a b", not "ab".
    const spaced = html.replace(/<(?:br|hr)\b[^>]*>|<\/(?:p|div|li|h[1-6]|blockquote|tr|td|th|dd|dt|pre|figure)>/gi, '$& ');

    const stripped = sanitize(spaced, {
        allowedTags: [],
        allowedAttributes: {},
        // Captions are dropped too: in a title or summary they'd read as part of the sentence.
        nonTextTags: [...NON_TEXT_TAGS, 'figcaption'],
    });

    // Decode twice to fix double-encoded entities like "&amp;amp;" that some feeds emit.
    const decoded = decode(decode(stripped));
    const text = decoded
        .replace(/\s+/g, ' ')
        .replace(/\s+([.,;:!?)])/g, '$1')
        .trim();

    return max ? truncate(text, max) : text;
}

// Shortens text to at most `max` characters at a word boundary, adding "…", without splitting an emoji in half.
export function truncate(text: string, max: number): string {
    if (text.length <= max)
        return text;

    // Emoji and other astral characters are two UTF-16 units; don't keep only the first half.
    const cut = text.slice(0, max - 1).replace(/[\uD800-\uDBFF]$/, '');
    const space = cut.lastIndexOf(' ');

    return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s.,;:!?-]+$/, '')}…`;
}

// One transform per tag listed in URL_ATTRIBUTES or FORCED_ATTRIBUTES: resolve its URLs, then apply its forced attributes.
function tagTransforms(baseUrl: string | undefined): Record<string, sanitize.Transformer> {
    const tags = new Set([...Object.keys(URL_ATTRIBUTES), ...Object.keys(FORCED_ATTRIBUTES)]);

    return Object.fromEntries(
        [...tags].map((tag) => [
            tag,
            (tagName: string, attribs: sanitize.Attributes) => ({
                tagName,
                attribs: { ...withResolvedUrls(attribs, URL_ATTRIBUTES[tag] ?? [], baseUrl), ...FORCED_ATTRIBUTES[tag] },
            }),
        ]),
    );
}

// A copy of a tag's attributes with its URL attributes (href, src, srcset, poster) resolved; unsafe or invalid ones are removed.
function withResolvedUrls(attribs: sanitize.Attributes, names: string[], baseUrl?: string): sanitize.Attributes {
    const result = { ...attribs };

    for (const name of names) {
        const value = result[name];

        if (value === undefined)
            continue;

        const resolved = name === 'srcset' ? resolveSrcset(value, baseUrl) : resolveUrl(value, baseUrl, LINK_PROTOCOLS);

        if (resolved) {
            result[name] = resolved;
        } else {
            delete result[name];
        }
    }

    return result;
}

// Resolves every URL in a srcset and drops unsafe ones (null if none are left); a package parses it, as URLs may contain commas.
function resolveSrcset(value: string, baseUrl?: string): string | null {
    const candidates = parseSrcset(value).flatMap((candidate) => {
        const url = resolveUrl(candidate.url, baseUrl, LINK_PROTOCOLS);

        return url ? [{ ...candidate, url }] : [];
    });

    return candidates.length > 0 ? stringifySrcset(candidates) : null;
}
