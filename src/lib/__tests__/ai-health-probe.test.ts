import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { NextRequest } from "next/server";
import { GET } from "../../../app/api/system/health-probe/route";
import { __resetProbeAuthCache } from "../system-probe-auth";

const originalFetch = globalThis.fetch;
const originalAiBase = process.env.AI_ENGINE_URL;
const model = { name: "best", path: "models/best.pt", size_mb: 18.3, is_default: false };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json" },
});
const authHeaders = { authorization: "Bearer test-access-token" };
const probe = async (target = "ai") =>
  (
    await GET(
      new NextRequest(
        `http://localhost:3000/api/system/health-probe?target=${target}`,
        { headers: authHeaders },
      ),
    )
  ).json();

const originalApiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
type MeStub = { status?: number; role?: string; permissions?: string[]; isActive?: boolean };
let meStub: MeStub = { role: "SAFETY_OFFICER", permissions: ["SYSTEM_CONFIG_READ"] };
let authCalls: { url: string; headers: Record<string, string> }[] = [];
let probeFetch: typeof fetch = originalFetch;

// Mọi lệnh gọi /auth/me đi vào stub xác thực; phần còn lại đi vào fetch của từng ca test.
const routedFetch: typeof fetch = async (url, options) => {
  if (String(url).endsWith("/auth/me")) {
    authCalls.push({ url: String(url), headers: (options?.headers ?? {}) as Record<string, string> });
    if (meStub.status && meStub.status !== 200) return json({ success: false, code: "X" }, meStub.status);
    return json({ success: true, data: { id: "u1", role: meStub.role, permissions: meStub.permissions ?? [], isActive: meStub.isActive ?? true } });
  }
  return probeFetch(url, options);
};

beforeEach(() => {
  process.env.AI_ENGINE_URL = "http://ai.internal:8000/";
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://gateway.internal/api/v1/";
  meStub = { role: "SAFETY_OFFICER", permissions: ["SYSTEM_CONFIG_READ"] };
  authCalls = [];
  __resetProbeAuthCache();
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    get: () => routedFetch,
    set: (fn: typeof fetch) => { probeFetch = fn; },
  });
});
afterEach(() => {
  Object.defineProperty(globalThis, "fetch", { configurable: true, writable: true, value: originalFetch });
  probeFetch = originalFetch;
  if (originalApiBase === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
  else process.env.NEXT_PUBLIC_API_BASE_URL = originalApiBase;
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

  it("rejects unauthenticated probe requests with 401", async () => {
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      return json({ status: "ok" });
    };
    const unauthRes = await GET(
      new NextRequest("http://localhost:3000/api/system/health-probe?target=ai"),
    );
    assert.equal(unauthRes.status, 401);
    const body = await unauthRes.json();
    assert.equal(body.ok, false);
    assert.equal(calls, 0);

    const cookieAuthRes = await GET(
      new NextRequest("http://localhost:3000/api/system/health-probe?target=ai", {
        headers: { cookie: "accessToken=session-cookie-token" },
      }),
    );
    assert.equal(cookieAuthRes.status, 200);
    assert.equal(calls, 1);
  });

  it("does not use the AI fallback for MinIO or accept arbitrary targets", async () => {
    let calls = 0;
    globalThis.fetch = async () => { calls++; return json({}, 404); };
    assert.equal((await probe("minio")).ok, false);
    assert.equal(calls, 1);
    const invalid = await GET(
      new NextRequest("http://localhost:3000/api/system/health-probe?target=arbitrary", {
        headers: authHeaders,
      }),
    );
    assert.equal(invalid.status, 400);
    assert.equal(calls, 1);
  });
  it("verifies the caller against GET /auth/me, forwarding only auth credentials", async () => {
    globalThis.fetch = async () => json({ status: "ok" });
    const res = await GET(
      new NextRequest("http://localhost:3000/api/system/health-probe?target=traefik", {
        headers: { cookie: "accessToken=abc; theme=dark; other=1", authorization: "Bearer xyz" },
      }),
    );
    assert.equal(res.status, 200);
    assert.equal(authCalls.length, 1);
    assert.equal(authCalls[0].url, "http://gateway.internal/api/v1/auth/me");
    assert.equal(authCalls[0].headers.cookie, "accessToken=abc");
    assert.equal(authCalls[0].headers.authorization, "Bearer xyz");
  });

  it("returns 401 without probing when the backend rejects the token", async () => {
    meStub = { status: 401 };
    let calls = 0;
    globalThis.fetch = async () => { calls++; return json({ status: "ok" }); };
    const res = await GET(new NextRequest("http://localhost:3000/api/system/health-probe?target=ai", { headers: { authorization: "Bearer forged" } }));
    assert.equal(res.status, 401);
    assert.equal(calls, 0);
  });

  it("returns 403 when the user lacks SYSTEM_CONFIG_READ", async () => {
    meStub = { role: "WORKER", permissions: ["PPE_INCIDENT_READ"] };
    let calls = 0;
    globalThis.fetch = async () => { calls++; return json({ status: "ok" }); };
    const res = await GET(new NextRequest("http://localhost:3000/api/system/health-probe?target=ai", { headers: authHeaders }));
    assert.equal(res.status, 403);
    assert.match((await res.json()).reason, /SYSTEM_CONFIG_READ/);
    assert.equal(calls, 0);
  });

  it("rejects deactivated accounts even with the permission", async () => {
    meStub = { role: "ADMIN", permissions: ["SYSTEM_CONFIG_READ"], isActive: false };
    const res = await GET(new NextRequest("http://localhost:3000/api/system/health-probe?target=ai", { headers: authHeaders }));
    assert.equal(res.status, 403);
  });

  for (const role of ["ADMIN", "SUPER_ADMIN"]) {
    it(`lets ${role} through without an explicit permission (same rule as useCan)`, async () => {
      meStub = { role, permissions: [] };
      globalThis.fetch = async () => json({ status: "ok" });
      const res = await GET(new NextRequest("http://localhost:3000/api/system/health-probe?target=minio", { headers: authHeaders }));
      assert.equal(res.status, 200);
    });
  }

  it("fails closed with 503 when the identity service is unreachable", async () => {
    let calls = 0;
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      get: () => async (url: string) => {
        if (String(url).endsWith("/auth/me")) throw Object.assign(new Error("fetch failed"), { cause: { code: "ECONNREFUSED" } });
        calls++;
        return json({ status: "ok" });
      },
      set: () => {},
    });
    const res = await GET(new NextRequest("http://localhost:3000/api/system/health-probe?target=ai", { headers: authHeaders }));
    assert.equal(res.status, 503);
    assert.equal(calls, 0);
  });

  it("reuses one /auth/me result for the three parallel probes of a refresh", async () => {
    globalThis.fetch = async () => json({ status: "ok" });
    for (const target of ["ai", "minio", "traefik"]) {
      const res = await GET(new NextRequest(`http://localhost:3000/api/system/health-probe?target=${target}`, { headers: authHeaders }));
      assert.equal(res.status, 200);
    }
    assert.equal(authCalls.length, 1);
  });
});
