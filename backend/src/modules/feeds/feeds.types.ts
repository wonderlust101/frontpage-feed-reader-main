// Backend-only types for feed ingestion (feeds.ingest.ts); they move to @frontpage/shared once an endpoint returns them.
// In IngestResult, the item counts are all 0 on a 304; `movedFrom` is the old URL when a permanent redirect changed it,
// and `mergedFeedId` is the duplicate feed that move merged away and deleted.

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
