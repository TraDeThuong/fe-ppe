import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { NextRequest } from "next/server";
import { GET } from "../../../app/api/system/health-probe/route";

const originalFetch = globalThis.fetch;
const originalAiBase = process.env.AI_ENGINE_URL;
const model = { name: "best", path: "models/best.pt", size_mb: 18.3, is_default: false };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json" },
});
const probe = async (target = "ai") => (await GET(new NextRequest(`http://localhost:3000/api/system/health-probe?target=${target}`))).json();

beforeEach(() => { process.env.AI_ENGINE_URL = "http://ai.internal:8000/"; });
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalAiBase === undefined) delete process.env.AI_ENGINE_URL;
  else process.env.AI_ENGINE_URL = originalAiBase;
});

describe("AI health compatibility in the frontend proxy", () => {
  it("keeps using /health for servers that implement it", async () => {
    const urls: string[] = [];
    globalThis.fetch = async (url) => { urls.push(String(url)); return json({ status: "ok", uptime: 123 }); };
    const result = await probe();
    assert.equal(result.ok, true);
    assert.equal(result.uptime, 123);
    assert.equal(result.verifiedVia, undefined);
    assert.deepEqual(urls, ["http://ai.internal:8000/health"]);
  });

  it("verifies the existing models API only after a missing /health, with one shared timeout", async () => {
    const calls: { url: string; signal: AbortSignal | null | undefined }[] = [];
    globalThis.fetch = async (url, options) => {
      assert.equal(options?.method, "GET");
      assert.equal(options?.cache, "no-store");
      calls.push({ url: String(url), signal: options?.signal });
      return String(url).endsWith("/health") ? json({ detail: "Not Found" }, 404) : json([model]);
    };
    const result = await probe();
    assert.equal(result.ok, true);
    assert.equal(result.statusCode, 200);
    assert.equal(result.verifiedVia, "ai-models-api");
    assert.equal(result.uptime, undefined); // The models endpoint does not provide uptime.
    assert.deepEqual(calls.map((call) => call.url), ["http://ai.internal:8000/health", "http://ai.internal:8000/api/models"]);
    assert.ok(calls[0].signal);
    assert.equal(calls[0].signal, calls[1].signal);
  });

  it("accepts an empty model list as API availability, without claiming inference readiness", async () => {
    globalThis.fetch = async (url) => String(url).endsWith("/health") ? json({}, 404) : json([]);
    assert.equal((await probe()).verifiedVia, "ai-models-api");
  });

  for (const status of [401, 403, 500, 503]) {
    it(`does not hide a primary HTTP ${status} behind a successful models endpoint`, async () => {
      let calls = 0;
      globalThis.fetch = async () => { calls++; return json({}, status); };
      const result = await probe();
      assert.equal(result.ok, false);
      assert.equal(result.statusCode, status);
      assert.equal(result.failureKind, "HTTP_ERROR");
      assert.equal(calls, 1);
    });
  }

  for (const body of ["html", {}, [{ name: "wrong application" }], [{ ...model, size_mb: -1 }]]) {
    it(`rejects an unrelated or malformed successful models response: ${JSON.stringify(body)}`, async () => {
      globalThis.fetch = async (url) => String(url).endsWith("/health") ? json({}, 404)
        : body === "html" ? new Response("<html>Other app</html>") : json(body);
      const result = await probe();
      assert.equal(result.ok, false);
      assert.equal(result.failureKind, "PAYLOAD_UNHEALTHY");
    });
  }

  it("reports the fallback endpoint's error rather than a healthy result", async () => {
    globalThis.fetch = async (url) => json({}, String(url).endsWith("/health") ? 404 : 503);
    const result = await probe();
    assert.equal(result.ok, false);
    assert.equal(result.statusCode, 503);
    assert.match(result.reason, /api\/models/);
  });

  it("does not fall back after a connection failure", async () => {
    let calls = 0;
    globalThis.fetch = async () => { calls++; throw Object.assign(new Error("fetch failed"), { cause: { code: "ECONNREFUSED" } }); };
    const result = await probe();
    assert.equal(result.ok, false);
    assert.equal(result.failureKind, "CONNECTION_REFUSED");
    assert.equal(calls, 1);
  });

  it("limits both requests to the existing two-second probe budget", async () => {
    globalThis.fetch = async (url, options) => {
      if (String(url).endsWith("/health")) return json({}, 404);
      return new Promise<Response>((_, reject) => {
        options!.signal!.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
      });
    };
    const result = await probe();
    assert.equal(result.ok, false);
    assert.equal(result.failureKind, "TIMEOUT");
  });

  it("does not use the AI fallback for MinIO or accept arbitrary targets", async () => {
    let calls = 0;
    globalThis.fetch = async () => { calls++; return json({}, 404); };
    assert.equal((await probe("minio")).ok, false);
    assert.equal(calls, 1);
    const invalid = await GET(new NextRequest("http://localhost:3000/api/system/health-probe?target=arbitrary"));
    assert.equal(invalid.status, 400);
    assert.equal(calls, 1);
  });
});
