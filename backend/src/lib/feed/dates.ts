// Parses feed dates (RFC 822 for RSS, ISO 8601 for Atom) into ISO 8601 UTC strings.
// Unknown formats and ambiguous zone names (IST, BST, AST…) return null: we never guess a date.

// Joins regex pieces into one case-insensitive regex that must match the whole string.
// Lets each part of a date format sit on its own line with an example next to it.
const pattern = (...parts: RegExp[]) => new RegExp(`^${parts.map((p) => p.source).join('')}$`, 'i');

const ISO = pattern(
    /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/, // 2024-10-02
    /(?:[T ](?<hour>\d{2}):(?<minute>\d{2})(?::(?<second>\d{2})(?:\.(?<fraction>\d+))?)?)?/, // T15:00:00.123 (optional; seconds optional)
    /\s*(?<zone>Z|[+-]\d{2}(?::?\d{2})?)?/, // Z / +02:00 / +05 (optional)
);

const RFC822 = pattern(
    /(?:[a-z]+,?\s*)?/, // Wed, (optional day name)
    /(?<day>\d{1,2})\s+/, // 2 / 02
    /(?<month>[a-z]+\.?)\s+/, // Oct / October
    /(?<year>\d{2}|\d{4})\s+/, // 24 / 2024
    /(?<hour>\d{2}):(?<minute>\d{2})(?::(?<second>\d{2}))?/, // 15:00:00 (seconds optional)
    /\s*(?<zone>[a-z]*[+-]\d{1,2}(?::?\d{2})?|[a-z]+)?/, // GMT / CET / +0000 / GMT+0530 (optional)
);

const MONTHS = [
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

// prettier-ignore
const ZONES: Record<string, number> = {
    UT: 0, UTC: 0, GMT: 0, Z: 0,
    EST: -5, EDT: -4, CST: -6, CDT: -5, MST: -7, MDT: -6, PST: -8, PDT: -7,
    AKST: -9, AKDT: -8, HST: -10, NST: -3.5, NDT: -2.5,
    BRT: -3, ART: -3,
    WET: 0, WEST: 1, CET: 1, CEST: 2, EET: 2, EEST: 3, MSK: 3,
    WAT: 1, CAT: 2, SAST: 2, EAT: 3,
    PKT: 5, NPT: 5.75, WIB: 7, HKT: 8, SGT: 8, JST: 9, KST: 9,
    AWST: 8, ACST: 9.5, ACDT: 10.5, AEST: 10, AEDT: 11, NZST: 12, NZDT: 13,
};

type DateParts = {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    millisecond: number;
};

const MAX_OFFSET_HOURS = 14;
const MIN_TIME = Date.UTC(1995, 0, 1);
const FUTURE_SLACK_MS = 24 * 60 * 60 * 1000;

// Month number (1–12) from "10", "Oct", "Sept" or "October"; undefined for anything else.
// Names need at least 3 letters and must be the start of a real month, so "Octopus" fails.
function toMonth(value: string): number | undefined {
    if (/^\d+$/.test(value)) {
        return Number(value);
    }

    const name = value.toLowerCase().replace(/\.$/, '');
    const index = MONTHS.findIndex((month) => name.length >= 3 && month.startsWith(name));

    return index >= 0 ? index + 1 : undefined;
}

// Expands two-digit years the usual way ("24" → 2024, "99" → 1999); four-digit years pass through.
function toFullYear(value: string): number {
    const year = Number(value);
    if (year >= 100) {
        return year;
    }

    return year < 70 ? 2000 + year : 1900 + year;
}

// Offset from UTC in minutes: "GMT" → 0, "PDT" → -420, "+0530", "+05:30", "+05" or "GMT+0530" → 330.
// No zone at all means UTC (0). Returns undefined for unknown or ambiguous names ("IST") and for
// offsets that can't exist ("+2500").
function toOffsetMinutes(zone: string | undefined): number | undefined {
    if (!zone) {
        return 0;
    }

    const named = ZONES[zone.toUpperCase()];
    if (named !== undefined) {
        return named * 60;
    }

    const numeric = zone.match(/^(?:GMT|UTC|UT)?([+-])(\d{1,2})(?::?(\d{2}))?$/i);
    if (!numeric) {
        return undefined;
    }

    const hours = Number(numeric[2]);
    const extraMinutes = Number(numeric[3] ?? 0);
    if (hours > MAX_OFFSET_HOURS || extraMinutes > 59) {
        return undefined;
    }

    const minutes = hours * 60 + extraMinutes;
    return numeric[1] === '-' ? -minutes : minutes;
}

// Converts date parts written in a given time zone into a UTC timestamp (milliseconds since 1970).
// Returns null for dates that can't exist, like Feb 31 or 25:00.
function toEpochMs(p: DateParts, offsetMinutes: number): number | null {
    const utc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, p.millisecond);
    const d = new Date(utc);

    // Date.UTC silently turns impossible dates like Feb 31 into Mar 2, so check every part is unchanged.
    const validDateCheck =
        d.getUTCFullYear() === p.year &&
        d.getUTCMonth() === p.month - 1 &&
        d.getUTCDate() === p.day &&
        d.getUTCHours() === p.hour &&
        d.getUTCMinutes() === p.minute &&
        d.getUTCSeconds() === p.second;

    return validDateCheck ? utc - offsetMinutes * 60_000 : null;
}

// Turns a feed date ("Wed, 02 Oct 2024 15:00:00 GMT" or "2024-10-02T15:00:00Z") into an ISO 8601
// UTC string such as "2024-10-02T15:00:00.000Z". Returns null rather than guessing: for unknown formats or
// zones, impossible dates, dates before 1995, or more than a day in the future (`now` is for tests).
export function parseFeedDate(value: string | null | undefined, now: number = Date.now()): string | null {
    const input = value?.replace(/\s+/g, ' ').trim() ?? '';
    const groups = input.match(ISO)?.groups ?? input.match(RFC822)?.groups;

    if (!groups) {
        return null;
    }

    const month = toMonth(groups.month!);
    const offset = toOffsetMinutes(groups.zone);

    if (!month || offset === undefined) {
        return null;
    }

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

    if (time === null || time < MIN_TIME || time > now + FUTURE_SLACK_MS) {
        return null;
    }

    return new Date(time).toISOString();
}
