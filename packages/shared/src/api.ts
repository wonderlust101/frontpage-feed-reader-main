// API response shapes: the contract between backend and frontend.
// Both sides import these from "@frontpage/shared", so there is nothing to keep in sync by hand.

export type DbStatus = 'connected' | 'skipped' | 'error';

export type HealthResponse = {
    api: 'ok';
    database: DbStatus;
    error?: string;
};
