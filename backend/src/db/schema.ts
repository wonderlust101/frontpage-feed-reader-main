// Schema registry: every module's Drizzle tables, re-exported in one place.
// drizzle-kit (drizzle.config.ts) and the typed db client (db/index.ts) both read this file,
// so export each new src/modules/<feature>/<feature>.schema.ts here.
export * from "../modules/feeds/feeds.schema";
