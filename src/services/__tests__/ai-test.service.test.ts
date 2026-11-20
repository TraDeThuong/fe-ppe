import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { tokenStore } from "@/lib/token";
import {
  aiTestService,
  AiServiceHttpError,
  isAiEndpointNotFoundError,
} from "../ai-test.service";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  tokenStore.clear();
});

describe("aiTestService (Production 24/7 & Auth integration)", () => {
  it("attaches Bearer token, sends credentials, and reads X-Live-Max-Sessions header", async () => {
    tokenStore.setTokens("test-access-token", "test-refresh-token");

    let capturedAuth: string | null = null;
    let capturedCreds: RequestCredentials | undefined;

    globalThis.fetch = (async (_input, init) => {
      capturedCreds = init?.credentials;
      const headers = new Headers(init?.headers);
      capturedAuth = headers.get("Authorization");
      return new Response(
        JSON.stringify([{ camera_id: "CAM-01", status: "running", managed: true }]),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
            "X-Live-Max-Sessions": "24",
          },
        },
      );
    }) as typeof fetch;

    const result = await aiTestService.listLiveSessionsWithMeta();
    assert.equal(capturedAuth, "Bearer test-access-token");
    assert.equal(capturedCreds, "include");
    assert.equal(result.maxSessions, 24);
    assert.equal(result.sessions.length, 1);
    assert.equal(result.sessions[0].managed, true);
  });

  it("classifies 404 responses via AiServiceHttpError for production vs sandbox detection", async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ detail: "Not Found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      })) as typeof fetch;

    await assert.rejects(
      () => aiTestService.listJobs(),
      (err: unknown) =>
        err instanceof AiServiceHttpError &&
        err.status === 404 &&
        isAiEndpointNotFoundError(err),
    );
  });

  it("fetches runtime config and triggers 24/7 live sync", async () => {
    const calls: string[] = [];
    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      calls.push(`${init?.method ?? "GET"} ${url}`);
      if (url.endsWith("/api/live/config")) {
        return new Response(
          JSON.stringify({
            max_sessions: 16,
            active_sessions: 3,
            dispatch_enabled: true,
            auto_sync_enabled: true,
            sync_interval_s: 15,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({
          status: "synced",
          last_synced_count: 3,
          max_sessions: 16,
          skipped_over_limit: [],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as typeof fetch;

    const cfg = await aiTestService.getLiveRuntimeConfig();
    assert.equal(cfg.max_sessions, 16);
    assert.equal(cfg.auto_sync_enabled, true);

    const syncRes = await aiTestService.triggerLiveSync();
    assert.equal(syncRes.status, "synced");
    assert.equal(syncRes.last_synced_count, 3);
    assert.deepEqual(calls, ["GET /api/live/config", "POST /api/live/sync"]);
  });

  it("treats { supported: false } from /api/live/config proxy as 404 endpoint-not-found without browser network 404", async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ supported: false }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })) as typeof fetch;

    await assert.rejects(
      () => aiTestService.getLiveRuntimeConfig(),
      (err: unknown) =>
        err instanceof AiServiceHttpError &&
        err.status === 404 &&
        isAiEndpointNotFoundError(err),
    );
  });
});

