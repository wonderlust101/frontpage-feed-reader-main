// Splits text around every case-insensitive match of a query, so the search palette can mark what matched.

type MatchPart = {
    text: string;
    isMatch: boolean;
};

// Example: ("Container queries", "con") → [{Con, match}, {tainer queries}]; an empty query gives one unmatched part.
export function matchParts(text: string, query: string): MatchPart[] {
    const needle = query.trim().toLowerCase();

    if (!needle)
        return [{ text, isMatch: false }];

    const parts: MatchPart[] = [];
    const haystack = text.toLowerCase();
    let start = 0;
    let found = haystack.indexOf(needle);

    while (found !== -1) {
        if (found > start)
            parts.push({ text: text.slice(start, found), isMatch: false });

        parts.push({ text: text.slice(found, found + needle.length), isMatch: true });
        start = found + needle.length;
        found = haystack.indexOf(needle, start);
    }

    if (start < text.length)
        parts.push({ text: text.slice(start), isMatch: false });

    return parts;
}
