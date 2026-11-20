import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { NextRequest } from "next/server";
import { GET as getLiveSessions } from "../../../app/api/live/sessions/route";
import { GET as getLiveVideos } from "../../../app/api/live/videos/route";
import { GET as getAiModels } from "../../../app/api/ai-test/models/route";

const originalFetch = globalThis.fetch;
const originalAiBase = process.env.AI_ENGINE_URL;

beforeEach(() => {
  process.env.AI_ENGINE_URL = "http://ai.internal:8000/";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalAiBase === undefined) {
    delete process.env.AI_ENGINE_URL;
  } else {
    process.env.AI_ENGINE_URL = originalAiBase;
  }
});

describe("AI Engine GET proxy routes", () => {
  it("forwards auth headers and X-Live-Max-Sessions for /api/live/sessions", async () => {
    let capturedUrl = "";
    let capturedAuth: string | null = null;
    let capturedCookie: string | null = null;

    globalThis.fetch = (async (url, init) => {
      capturedUrl = String(url);
      const headers = new Headers(init?.headers);
      capturedAuth = headers.get("authorization");
      capturedCookie = headers.get("cookie");
      return new Response(JSON.stringify([{ camera_id: "CAM-01", status: "running" }]), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "X-Live-Max-Sessions": "16",
        },
      });
    }) as typeof fetch;

    const req = new NextRequest("http://localhost:3000/api/live/sessions", {
      headers: {
        authorization: "Bearer jwt-token",
        cookie: "accessToken=jwt-token",
      },
    });
    const res = await getLiveSessions(req);

    assert.equal(capturedUrl, "http://ai.internal:8000/api/live/sessions");
    assert.equal(capturedAuth, "Bearer jwt-token");
    assert.equal(capturedCookie, "accessToken=jwt-token");
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("x-live-max-sessions"), "16");
    assert.deepEqual(await res.json(), [{ camera_id: "CAM-01", status: "running" }]);
  });

  it("passes through upstream 401 status without masking as 500", async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ detail: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      })) as typeof fetch;

    const res = await getLiveSessions(
      new NextRequest("http://localhost:3000/api/live/sessions"),
    );
    assert.equal(res.status, 401);
    assert.deepEqual(await res.json(), { detail: "Unauthorized" });
  });

  it("returns 503 JSON with detail instead of 500 when AI Engine refuses connection", async () => {
    globalThis.fetch = (async () => {
      throw Object.assign(new Error("fetch failed"), {
        cause: { code: "ECONNREFUSED", message: "connect ECONNREFUSED 127.0.0.1:8000" },
      });
    }) as typeof fetch;

    for (const [handler, url] of [
      [getLiveSessions, "http://localhost:3000/api/live/sessions"],
      [getLiveVideos, "http://localhost:3000/api/live/videos"],
      [getAiModels, "http://localhost:3000/api/ai-test/models"],
    ] as const) {
      const res = await handler(new NextRequest(url));
      assert.equal(res.status, 503);
      const body = (await res.json()) as { detail?: string };
      assert.match(body.detail ?? "", /ECONNREFUSED/);
    }
  });

  it("maps upstream timeout to 503 JSON", async () => {
    globalThis.fetch = (async () => {
      throw new DOMException("Aborted", "AbortError");
    }) as typeof fetch;

    const res = await getLiveSessions(
      new NextRequest("http://localhost:3000/api/live/sessions"),
    );
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { detail: "AI Engine request timed out" });
  });
});
