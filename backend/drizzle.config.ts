import { defineConfig } from "drizzle-kit";

// Migrations should use the direct (unpooled) connection; fall back to the pooled one.
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL is not set — add it to apps/api/.env");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
});
