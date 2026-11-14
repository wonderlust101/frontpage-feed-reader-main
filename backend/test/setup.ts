// `bun test` auto-loads backend/.env; override anything that would make tests
// depend on your local setup. Runs before the app (and env.ts) is imported.
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "";
process.env.DATABASE_URL_UNPOOLED = "";
process.env.WEB_ORIGIN = "http://localhost:3000";
