import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { GET, POST } from "../../../app/api/ai-test/studio/[...path]/route";

const path = ["jobs", "fixture-job", "video"];
const url = new URL("https://ppe.example/api/ai-test/studio/jobs/fixture-job/video?t=1");
const context = { params: Promise.resolve({ path }) };

test("the Sandbox proxy requires credentials and an explicit upstream", async (t) => {
  t.mock.method(globalThis, "fetch", () => assert.fail("should not call upstream"));
  const saved = process.env.AI_SANDBOX_URL;
  delete process.env.AI_SANDBOX_URL;
  t.after(() => {
    if (saved === undefined) delete process.env.AI_SANDBOX_URL;
    else process.env.AI_SANDBOX_URL = saved;
  });

  assert.equal((await GET(new NextRequest(url), context)).status, 401);
  const request = new NextRequest(url, { headers: { cookie: "accessToken=fixture" } });
  assert.equal((await GET(request, context)).status, 503);
});

test("development uses the Sandbox published by Docker Compose", async (t) => {
  const savedUrl = process.env.AI_SANDBOX_URL;
  const savedMode = process.env.NODE_ENV;
  delete process.env.AI_SANDBOX_URL;
  Object.assign(process.env, { NODE_ENV: "development" });
  t.after(() => {
    if (savedUrl !== undefined) process.env.AI_SANDBOX_URL = savedUrl;
    if (savedMode === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else Object.assign(process.env, { NODE_ENV: savedMode });
  });

  t.mock.method(globalThis, "fetch", async (target: URL) => {
    assert.equal(target.href, "http://127.0.0.1:8010/studio/api/jobs/fixture-job/video?t=1");
    return new Response("data");
  });

  const request = new NextRequest(url, { headers: { cookie: "accessToken=fixture" } });
  assert.equal((await GET(request, context)).status, 200);
});

test("the Sandbox proxy preserves range delivery and only sends the access cookie", async (t) => {
  const saved = process.env.AI_SANDBOX_URL;
  process.env.AI_SANDBOX_URL = "http://sandbox.internal:8010";
  t.after(() => {
    if (saved === undefined) delete process.env.AI_SANDBOX_URL;
    else process.env.AI_SANDBOX_URL = saved;
  });

  t.mock.method(globalThis, "fetch", async (target: URL, init: RequestInit) => {
    assert.equal(target.href, "http://sandbox.internal:8010/studio/api/jobs/fixture-job/video?t=1");
    const headers = new Headers(init.headers);
    assert.equal(headers.get("cookie"), "accessToken=fixture");
    assert.equal(headers.get("range"), "bytes=0-3");
    return new Response("data", {
      status: 206,
      headers: { "content-range": "bytes 0-3/10", "content-type": "video/mp4", "content-length": "4" },
    });
  });

  const request = new NextRequest(url, {
    headers: { cookie: "accessToken=fixture; refreshToken=other", range: "bytes=0-3" },
  });
  const response = await GET(request, context);
  assert.equal(response.status, 206);
  assert.equal(response.headers.get("content-range"), "bytes 0-3/10");
  assert.equal(response.headers.get("content-length"), "4");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(await response.text(), "data");
});

test("the Sandbox proxy forwards the upstream authorization decision", async (t) => {
  const saved = process.env.AI_SANDBOX_URL;
  process.env.AI_SANDBOX_URL = "http://sandbox.internal:8010";
  t.after(() => {
    if (saved === undefined) delete process.env.AI_SANDBOX_URL;
    else process.env.AI_SANDBOX_URL = saved;
  });
  t.mock.method(globalThis, "fetch", async () => Response.json({ detail: "Forbidden" }, { status: 403 }));
  const request = new NextRequest("https://ppe.example/api/ai-test/studio/live/start", {
    method: "POST",
    headers: { cookie: "accessToken=fixture" },
    body: "{}",
  });
  const response = await POST(request, { params: Promise.resolve({ path: ["live", "start"] }) });
  assert.equal(response.status, 403);
});
