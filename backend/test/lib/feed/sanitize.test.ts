import { describe, expect, test } from 'bun:test';
import { htmlToText, sanitizeFeedHtml, truncate } from '../../../src/lib/feed';

const BASE = 'https://blog.example/posts/hello';

describe('sanitizeFeedHtml', () => {
    test.each([
        ['<script> blocks', '<p>ok</p><script>alert(1)</script>', /<script|alert/],
        ['<style> blocks', '<style>body{display:none}</style><p>ok</p>', /<style|display/],
        ['event handlers', '<p onclick="alert(1)">ok</p><img src="/a.png" onerror="alert(1)">', /onclick|onerror/],
        ['javascript: links', '<a href="javascript:alert(1)">x</a>', /javascript:/i],
        ['entity-obfuscated javascript: links', '<a href="JaVaScRiPt&#58;alert(1)">x</a>', /javascript/i],
        ['data: links', '<a href="data:text/html,<script>alert(1)</script>">x</a>', /data:/],
        ['svg payloads', '<svg onload="alert(1)"><circle r="1"/></svg>', /<svg|onload/],
        ['forms', '<form action="https://evil.example"><input name="password"></form>', /<form|<input/],
        ['object/embed', '<object data="x.swf"></object><embed src="x.swf">', /<object|<embed/],
        ['iframes from unknown hosts', '<iframe src="https://evil.example/frame"></iframe>', /<iframe/],
        ['inline styles', '<p style="position:fixed">ok</p>', /style=/],
        ['unknown schemes', '<a href="ms-msdt:/id PCWDiagnostic">x</a>', /ms-msdt/],
        ['file: links', '<a href="file:///etc/passwd">x</a>', /file:/],
        ['javascript: split by a newline', '<a href="java&#10;script:alert(1)">x</a>', /script:/],
        ['javascript: in a video poster', '<video src="v.mp4" poster="javascript:alert(1)"></video>', /poster|javascript/],
        ['unsafe srcset candidates', '<img src="a.png" srcset="javascript:alert(1) 1x, b.png 2x">', /javascript/],
    ])('removes %s', (_label, html, forbidden) => {
        expect(sanitizeFeedHtml(html, BASE)).not.toMatch(forbidden);
    });

    test('keeps semantic structure', () => {
        const html =
            '<h2>Title</h2><p>Some <em>em</em> and <strong>strong</strong>.</p><ul><li>one</li></ul>' +
            '<blockquote>quote</blockquote><pre><code class="language-ts">let a = 1;</code></pre>' +
            '<figure><img src="https://cdn.example/a.png" alt="A"><figcaption>Cap</figcaption></figure>' +
            '<table><tr><td>cell</td></tr></table>';
        const out = sanitizeFeedHtml(html, BASE);
        for (const tag of ['<h2>', '<em>', '<strong>', '<ul>', '<li>', '<blockquote>', '<figcaption>', '<td>']) {
            expect(out).toContain(tag);
        }
        expect(out).toContain('<code class="language-ts">');
        expect(out).toContain('alt="A"');
    });

    test('keeps YouTube embeds, sandboxed so they cannot navigate our page', () => {
        const out = sanitizeFeedHtml('<iframe src="https://www.youtube.com/embed/abc"></iframe>', BASE);
        expect(out).toContain('src="https://www.youtube.com/embed/abc"');
        expect(out).toContain('sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"');
        expect(out).not.toContain('allow-top-navigation');
    });

    test('a feed cannot loosen the iframe sandbox', () => {
        const out = sanitizeFeedHtml('<iframe src="https://www.youtube.com/embed/abc" sandbox="allow-top-navigation allow-forms"></iframe>', BASE);
        expect(out).not.toContain('allow-top-navigation');
        expect(out).not.toContain('allow-forms');
    });

    test('drops data: images', () => {
        expect(sanitizeFeedHtml('<img src="data:image/svg+xml;base64,PHN2Zz4=">', BASE)).toBe('');
    });

    test('resolves relative links, images and srcsets against the base URL', () => {
        const out = sanitizeFeedHtml('<a href="../about">a</a><img src="img/a.png" srcset="img/a.png 1x, /img/a@2x.png 2x">', BASE);
        expect(out).toContain('href="https://blog.example/about"');
        expect(out).toContain('src="https://blog.example/posts/img/a.png"');
        expect(out).toContain('srcset="https://blog.example/posts/img/a.png 1x, https://blog.example/img/a@2x.png 2x"');
    });

    test('keeps commas inside srcset URLs (Cloudinary / Substack style)', () => {
        const cdn = 'https://res.cloudinary.com/demo/image/upload';
        const out = sanitizeFeedHtml(`<img src="a.png" srcset="${cdn}/w_400,c_fill/cat.jpg 400w, ${cdn}/w_800,c_fill/cat.jpg 800w">`, BASE);
        expect(out).toContain(`srcset="${cdn}/w_400,c_fill/cat.jpg 400w, ${cdn}/w_800,c_fill/cat.jpg 800w"`);
    });

    test('drops empty links instead of turning them into a link to the page itself', () => {
        expect(sanitizeFeedHtml('<a href="">x</a><a href="   ">y</a>', BASE)).not.toContain('href');
    });

    test('drops links that are not valid URLs', () => {
        expect(sanitizeFeedHtml('<a href="http://[bad">x</a>', BASE)).not.toContain('href');
    });

    test('drops relative links when there is no base URL to resolve them against', () => {
        expect(sanitizeFeedHtml('<a href="/about">x</a>')).not.toContain('href');
    });

    test('adds safe rel/target to links', () => {
        expect(sanitizeFeedHtml('<a href="https://x.example">x</a>')).toBe(
            '<a href="https://x.example/" rel="noopener noreferrer nofollow" target="_blank">x</a>',
        );
    });

    test('returns an empty string for empty input', () => {
        expect(sanitizeFeedHtml(null)).toBe('');
        expect(sanitizeFeedHtml('')).toBe('');
    });
});

describe('htmlToText', () => {
    test('strips tags and scripts, keeping words apart across blocks', () => {
        expect(htmlToText('<p>Hello</p><p>world<script>alert(1)</script></p>')).toBe('Hello world');
    });

    test('decodes entities, including double-encoded ones', () => {
        expect(htmlToText('Tom &amp;amp; Jerry &#8217;s &lt;b&gt;')).toBe('Tom & Jerry ’s <b>');
    });

    test('truncates at a word boundary', () => {
        const text = htmlToText('<p>one two three four five six seven</p>', 20);
        expect(text.length).toBeLessThanOrEqual(20);
        expect(text).toBe('one two three four…');
    });
});

describe('truncate', () => {
    test('leaves short text alone', () => {
        expect(truncate('short', 10)).toBe('short');
    });

    test('never splits an emoji in half', () => {
        const out = truncate('ab😀😀😀😀😀😀', 4);
        expect(out).toBe('ab…');
        expect(out).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/);
    });
});
