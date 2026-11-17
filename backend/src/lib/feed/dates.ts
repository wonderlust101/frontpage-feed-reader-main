// Feed dates in practice: RSS uses RFC 822 (`Wed, 02 Oct 2024 15:00:00 GMT`), Atom uses ISO 8601
// (`2024-10-02T15:00:00Z`). Those two, plus the variants RFC 822 itself allows and ISO dates
// without a zone, cover every date in the curated feeds. Anything else returns null: we never
// guess or invent a date. Temporal does the calendar math, so impossible dates (Feb 31) are rejected.

/** Builds one regex from commented pieces, so each part of the format can be read on its own line. */
const pattern = (...parts: RegExp[]) => new RegExp(`^${parts.map((p) => p.source).join('')}$`, 'i');

/** ISO 8601 / RFC 3339: `2024-10-02T15:00:00.123Z`, `2024-10-02 15:00:00`, `2024-10-02`. */
const ISO = pattern(
    /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/, // 2024-10-02
    /(?:[T ](?<hour>\d{2}):(?<minute>\d{2})(?::(?<second>\d{2})(?:\.(?<fraction>\d+))?)?)?/, // T15:00:00.123 (optional; seconds optional)
    /\s*(?<zone>Z|[+-]\d{2}:?\d{2})?/, // Z / +02:00 (optional)
);

/** RFC 822 / 2822: `Wed, 02 Oct 2024 15:00:00 GMT`, plus the variants the RFC allows. */
const RFC822 = pattern(
    /(?:[a-z]+,?\s*)?/, // Wed, (optional day name)
    /(?<day>\d{1,2})\s+/, // 2 / 02
    /(?<month>[a-z]+\.?)\s+/, // Oct / October
    /(?<year>\d{2}|\d{4})\s+/, // 24 / 2024
    /(?<hour>\d{2}):(?<minute>\d{2})(?::(?<second>\d{2}))?/, // 15:00:00 (seconds optional)
    /\s*(?<zone>[a-z]+|[+-]\d{4})?/, // GMT / PDT / +0000 (optional)
);

const MONTHS = 'january february march april may june july august september october november december'.split(' ');

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

const MIN_TIME = Date.UTC(1995, 0, 1);
const FUTURE_SLACK_MS = 24 * 60 * 60 * 1000;

/** "10" → 10; "Oct", "Sept", "October" → 10/9/10. Needs at least 3 letters of a real month name ("Octopus" fails). */
function toMonth(value: string): number | undefined {
    if (/^\d+$/.test(value)) return Number(value);
    const name = value.toLowerCase().replace(/\.$/, '');
    const index = MONTHS.findIndex((month) => name.length >= 3 && month.startsWith(name));
    return index >= 0 ? index + 1 : undefined;
}

/** "24" → 2024, "99" → 1999; four-digit years pass through. */
function toFullYear(value: string): number {
    const year = Number(value);
    if (year >= 100) return year;
    return year < 70 ? 2000 + year : 1900 + year;
}

/** "+0530" / "+05:30" / "GMT" / "PDT" → "+05:30". No zone means UTC; an unknown name → undefined. */
function toOffset(zone: string | undefined): string | undefined {
    if (!zone) return '+00:00';
    const named = ZONES[zone.toUpperCase()];
    if (named) return named;
    const numeric = zone.match(/^([+-])(\d{2}):?(\d{2})$/);
    return numeric ? `${numeric[1]}${numeric[2]}:${numeric[3]}` : undefined;
}

/** Calendar parts + offset → epoch ms, or null if the date can't exist (Feb 31, 25:00…). */
function toEpochMs(parts: Temporal.PlainDateTimeLike, offset: string): number | null {
    try {
        const local = Temporal.PlainDateTime.from(parts, { overflow: 'reject' });
        return local.toZonedDateTime(offset).toInstant().epochMilliseconds;
    } catch {
        return null;
    }
}

/**
 * Parses an RSS/Atom date into an ISO 8601 UTC string.
 * Returns null for empty, unrecognized or impossible dates, unknown zones, dates before 1995 and
 * dates more than a day in the future.
 */
export function parseFeedDate(value: string | null | undefined, now: number = Date.now()): string | null {
    const input = value?.replace(/\s+/g, ' ').trim() ?? '';
    const groups = input.match(ISO)?.groups ?? input.match(RFC822)?.groups;
    if (!groups) return null;

    const month = toMonth(groups.month!);
    const offset = toOffset(groups.zone);
    if (!month || !offset) return null;

    const time = toEpochMs(
        {
            year: toFullYear(groups.year!),
            month,
            day: Number(groups.day),
            hour: Number(groups.hour ?? 0),
            minute: Number(groups.minute ?? 0),
            second: Number(groups.second ?? 0),
            millisecond: Number((groups.fraction ?? '').padEnd(3, '0').slice(0, 3)),
        },
        offset,
    );
    if (time === null || time < MIN_TIME || time > now + FUTURE_SLACK_MS) return null;
    return new Date(time).toISOString();
}
