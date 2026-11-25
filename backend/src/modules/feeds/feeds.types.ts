// Backend-only until an endpoint returns them. In IngestResult the item counts are 0 on a 304, and `mergedFeedId` is
// the duplicate feed a permanent redirect merged away.

export type IngestOptions = {
    now?: Date;
};

export type IngestResult = {
    feedId: string;
    url: string;
    notModified: boolean;
    inserted: number;
    updated: number;
    unchanged: number;
    movedFrom: string | null;
    mergedFeedId: string | null;
    warnings: string[];
};
