// Feed dates in practice: RSS uses RFC 822 (`Wed, 02 Oct 2024 15:00:00 GMT`), Atom uses ISO 8601
// (`2024-10-02T15:00:00Z`). Those two, plus the variants RFC 822 itself allows and ISO dates
// without a zone, cover every date in the curated feeds. Anything else returns null: we never
// guess or invent a date. Temporal does the calendar math, so impossible dates (Feb 31) are rejected.

/** Zone names RFC 822 defines, plus UTC. Ambiguous abbreviations (IST, CST in China…) are deliberately absent. */
const ZONES: Record<string, string> = {
    UT: '+00:00',
    UTC: '+00:00',
    GMT: '+00:00',
    Z: '+00:00',
    EST: '-05:00',
    EDT: '-04:00',
    CST: '-06:00',
    CDT: '-05:00',
    MST: '-07:00',
    MDT: '-06:00',
    PST: '-08:00',
    PDT: '-07:00',
};

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const FULL_MONTHS = [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december',
];

/** 1–12 for an exact month name or abbreviation ("Oct", "October", "Sept"), otherwise undefined. */
function monthNumber(name: string): number | undefined {
    const lower = name.toLowerCase().replace(/\.$/, '');
    const index = lower === 'sept' ? 8 : Math.max(MONTHS.indexOf(lower), FULL_MONTHS.indexOf(lower));
    return index >= 0 ? index + 1 : undefined;
}

/** "+0530" / "+05:30" / "GMT" / "PDT" → "+05:30"; a missing zone means UTC; unknown names → undefined. */
function normalizeZone(zone: string | undefined): string | undefined {
    if (!zone) return '+00:00';
    const named = ZONES[zone.toUpperCase()];
    if (named) return named;
    const m = zone.match(/^([+-])(\d{2}):?(\d{2})$/);
    return m ? `${m[1]}${m[2]}:${m[3]}` : undefined;
}

type DateParts = { year: number; month: number; day: number; hour: number; minute: number; second: number; ms: number };

/** Turns calendar parts + an offset into epoch ms. Throws (caught by the caller) on impossible dates. */
function toEpochMs(parts: DateParts, offset: string): number {
    const { ms, ...rest } = parts;
    return Temporal.PlainDateTime.from({ ...rest, millisecond: ms }, { overflow: 'reject' })
        .toZonedDateTime(offset)
        .toInstant().epochMilliseconds;
}

/** ISO 8601 / RFC 3339: `2024-10-02T15:00:00.123Z`, `2024-10-02 15:00:00`, `2024-10-02`. */
const ISO =
    /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})(?:[T ](?<hour>\d{2}):(?<minute>\d{2})(?::(?<second>\d{2})(?:\.(?<fraction>\d+))?)?)?\s*(?<zone>Z|[+-]\d{2}:?\d{2})?$/i;

/** RFC 822/2822: `Wed, 02 Oct 2024 15:00:00 GMT`, with the variants it allows (no day name, 1-digit day, no seconds, 2-digit year). */
const RFC822 =
    /^(?:[a-z]+,?\s*)?(?<day>\d{1,2})\s+(?<month>[a-z]+\.?)\s+(?<year>\d{2}|\d{4})\s+(?<hour>\d{2}):(?<minute>\d{2})(?::(?<second>\d{2}))?\s*(?<zone>[a-z]+|[+-]\d{4})?$/i;

function parseParts(input: string): { parts: DateParts; zone: string | undefined } | undefined {
    const iso = input.match(ISO)?.groups;
    if (iso) {
        return {
            parts: {
                year: Number(iso.year),
                month: Number(iso.month),
                day: Number(iso.day),
                hour: Number(iso.hour ?? 0),
                minute: Number(iso.minute ?? 0),
                second: Number(iso.second ?? 0),
                ms: Number((iso.fraction ?? '0').padEnd(3, '0').slice(0, 3)),
            },
            zone: iso.zone,
        };
    }
    const rfc = input.match(RFC822)?.groups;
    const month = rfc && monthNumber(rfc.month!);
    if (rfc && month) {
        const year = Number(rfc.year);
        return {
            parts: {
                year: year < 100 ? (year < 70 ? 2000 : 1900) + year : year,
                month,
                day: Number(rfc.day),
                hour: Number(rfc.hour),
                minute: Number(rfc.minute),
                second: Number(rfc.second ?? 0),
                ms: 0,
            },
            zone: rfc.zone,
        };
    }
    return undefined;
}

const MIN_TIME = Date.UTC(1995, 0, 1);
const FUTURE_SLACK_MS = 24 * 60 * 60 * 1000;

/**
 * Parses an RSS/Atom date into an ISO 8601 UTC string.
 * Returns null for empty, unrecognized or impossible dates, unknown zones, dates before 1995 and
 * dates more than a day in the future.
 */
export function parseFeedDate(value: string | null | undefined, now: number = Date.now()): string | null {
    const input = value?.replace(/\s+/g, ' ').trim();
    const parsed = input ? parseParts(input) : undefined;
    const offset = parsed && normalizeZone(parsed.zone);
    if (!parsed || !offset) return null;

    let time: number;
    try {
        time = toEpochMs(parsed.parts, offset);
    } catch {
        return null; // impossible calendar date, e.g. Feb 31 or 25:00
    }
    return time >= MIN_TIME && time <= now + FUTURE_SLACK_MS ? new Date(time).toISOString() : null;
}
