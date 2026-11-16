// Feed dates are notoriously messy. Try the standard formats first, then progressively
// repair common non-standard ones. Returns an ISO string or null; never invents a date.

const TZ_OFFSETS: Record<string, string> = {
    UT: '+0000',
    UTC: '+0000',
    GMT: '+0000',
    Z: '+0000',
    EST: '-0500',
    EDT: '-0400',
    CST: '-0600',
    CDT: '-0500',
    MST: '-0700',
    MDT: '-0600',
    PST: '-0800',
    PDT: '-0700',
    AKST: '-0900',
    AKDT: '-0800',
    HST: '-1000',
    BST: '+0100',
    IST: '+0530',
    CET: '+0100',
    CEST: '+0200',
    EET: '+0200',
    EEST: '+0300',
    WET: '+0000',
    WEST: '+0100',
    JST: '+0900',
    KST: '+0900',
    AEST: '+1000',
    AEDT: '+1100',
    NZST: '+1200',
    NZDT: '+1300',
};

const MONTHS: Record<string, number> = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
};

const MIN_TIME = Date.UTC(1995, 0, 1);
const FUTURE_SLACK_MS = 24 * 60 * 60 * 1000;

function sane(time: number, now: number): boolean {
    return Number.isFinite(time) && time >= MIN_TIME && time <= now + FUTURE_SLACK_MS;
}

function offsetMinutes(tz: string | undefined): number | null {
    if (!tz) return 0; // No zone given: treat as UTC rather than server-local time.
    const upper = tz.toUpperCase();
    const named = TZ_OFFSETS[upper];
    const raw = named ?? upper.replace(/^(GMT|UTC|UT)(?=[+-])/, '');
    const m = raw.match(/^([+-])(\d{1,2}):?(\d{2})?$/);
    if (!m) return null;
    const sign = m[1] === '-' ? -1 : 1;
    return sign * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

function fullYear(y: number): number {
    if (y >= 100) return y;
    return y < 70 ? 2000 + y : 1900 + y;
}

function build(
    year: number,
    month: number,
    day: number,
    h: number,
    mi: number,
    s: number,
    tz: string | undefined,
): number {
    const offset = offsetMinutes(tz);
    if (offset === null) return Number.NaN;
    if (month < 0 || month > 11 || day < 1 || day > 31 || h > 24 || mi > 59 || s > 60) return Number.NaN;
    return Date.UTC(fullYear(year), month, day, h, mi, s) - offset * 60_000;
}

const TIME = String.raw`(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?\s*(am|pm)?`;
const ZONE = String.raw`(Z|[A-Za-z]{1,5}(?:[+-]\d{1,2}:?\d{2})?|[+-]\d{1,2}:?\d{2})?`;

function hour(h: string, ampm: string | undefined): number {
    let n = Number(h);
    if (ampm?.toLowerCase() === 'pm' && n < 12) n += 12;
    if (ampm?.toLowerCase() === 'am' && n === 12) n = 0;
    return n;
}

/** "Mon, 02 Jan 2006 15:04:05 MST" with any day name (or none), 2- or 4-digit year, optional seconds. */
const RFC822_LIKE = new RegExp(
    String.raw`^(?:[A-Za-z]+\.?,?\s+)?(\d{1,2})(?:st|nd|rd|th)?[\s-]+([A-Za-z]{3,})\.?,?[\s-]+(\d{2,4})(?:,?\s+(?:at\s+)?${TIME})?\s*${ZONE}$`,
);
/** "January 2, 2006 3:04 PM EST" (month first). */
const MONTH_FIRST = new RegExp(
    String.raw`^(?:[A-Za-z]+\.?,?\s+)?([A-Za-z]{3,})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})(?:,?\s+(?:at\s+)?${TIME})?\s*${ZONE}$`,
);
/** "2006-01-02 15:04:05", "2006/01/02T15:04", "2006-01-02 15:04:05 +0100", "2006-01-02". */
const ISO_LIKE = new RegExp(String.raw`^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s]+${TIME})?\s*${ZONE}$`);

function parseLoose(input: string): number {
    let m = input.match(RFC822_LIKE);
    if (m) {
        const month = MONTHS[m[2]!.slice(0, 3).toLowerCase()];
        if (month === undefined) return Number.NaN;
        return build(
            Number(m[3]),
            month,
            Number(m[1]),
            m[4] ? hour(m[4], m[7]) : 0,
            Number(m[5] ?? 0),
            Number(m[6] ?? 0),
            m[8],
        );
    }
    m = input.match(MONTH_FIRST);
    if (m) {
        const month = MONTHS[m[1]!.slice(0, 3).toLowerCase()];
        if (month === undefined) return Number.NaN;
        return build(
            Number(m[3]),
            month,
            Number(m[2]),
            m[4] ? hour(m[4], m[7]) : 0,
            Number(m[5] ?? 0),
            Number(m[6] ?? 0),
            m[8],
        );
    }
    m = input.match(ISO_LIKE);
    if (m) {
        return build(
            Number(m[1]),
            Number(m[2]) - 1,
            Number(m[3]),
            m[4] ? hour(m[4], m[7]) : 0,
            Number(m[5] ?? 0),
            Number(m[6] ?? 0),
            m[8],
        );
    }
    return Number.NaN;
}

/** Strict ISO 8601 / RFC 3339 with an explicit zone or date-only, which every engine parses identically. */
const STRICT_ISO = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2}))?$/i;
/** RFC 822/2822 with a numeric or GMT/UT zone. */
const STRICT_RFC =
    /^(?:[A-Za-z]{3},\s*)?\d{1,2}\s+[A-Za-z]{3}\s+\d{4}\s+\d{2}:\d{2}(?::\d{2})?\s+(?:[+-]\d{4}|GMT|UTC?)$/;

/**
 * Parses a feed date in any common format into an ISO 8601 string.
 * Returns null for empty, unparseable, pre-1995 or more-than-a-day-in-the-future dates.
 */
export function parseFeedDate(value: string | null | undefined, now: number = Date.now()): string | null {
    const input = value?.replace(/\s+/g, ' ').trim();
    if (!input) return null;

    let time = Number.NaN;

    if (/^\d{9,13}$/.test(input)) {
        // Unix epoch, seconds or milliseconds.
        const n = Number(input);
        time = input.length > 11 ? n : n * 1000;
    } else if (STRICT_ISO.test(input) || STRICT_RFC.test(input)) {
        time = Date.parse(input);
    } else {
        time = parseLoose(input);
        // Last resort: let the JS engine have a go, but only if the string carries a zone,
        // since engines disagree about whether zone-less strings are local or UTC.
        if (!Number.isFinite(time) && /(?:Z|[+-]\d{2}:?\d{2}|GMT|UTC)\b/i.test(input)) {
            time = Date.parse(input);
        }
    }

    return sane(time, now) ? new Date(time).toISOString() : null;
}
