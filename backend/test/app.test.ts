import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { HealthResponse } from "../src/types";
import { startTestServer } from "./helpers";

let server: Awaited<ReturnType<typeof startTestServer>>;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe("GET /api/health", () => {
  test("reports the API as ok and the database as skipped when not configured", async () => {
    const res = await fetch(`${server.url}/api/health`);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect((await res.json()) as HealthResponse).toEqual({ api: "ok", database: "skipped" });
  });
});

describe("CORS", () => {
  test("allows the configured frontend origin", async () => {
    const res = await fetch(`${server.url}/api/health`, {
      headers: { Origin: "http://localhost:3000" },
    });
    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
  });

  test("does not allow other origins", async () => {
    const res = await fetch(`${server.url}/api/health`, {
      headers: { Origin: "https://evil.example" },
    });
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });
});

describe("error handling", () => {
  test("unknown routes return a JSON 404", async () => {
    const res = await fetch(`${server.url}/api/does-not-exist`);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });

  test("malformed JSON bodies return a JSON 400", async () => {
    const res = await fetch(`${server.url}/api/health`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ not json",
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toHaveProperty("error");
  });
});
