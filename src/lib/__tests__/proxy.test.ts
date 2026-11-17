import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { NextRequest } from "next/server";
import {
  PROTECTED_AUTH_PREFIXES,
  PUBLIC_AUTH_PREFIXES,
} from "@/config/routes";
import { config as proxyConfig, proxy } from "../../../proxy";

describe("proxy route guard (Layer 1)", () => {
  it("covers every route directory under app/(auth)/ in both PROTECTED_AUTH_PREFIXES and config.matcher", () => {
    const authDir = path.resolve(process.cwd(), "app/(auth)");
    const routeDirs = fs
      .readdirSync(authDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("["))
      .map((entry) => `/${entry.name}`)
      .sort();

    assert.equal(routeDirs.length, 17);
    for (const prefix of routeDirs) {
      assert.ok(
        (PROTECTED_AUTH_PREFIXES as readonly string[]).includes(prefix),
        `Missing ${prefix} in PROTECTED_AUTH_PREFIXES`,
      );
      assert.ok(
        proxyConfig.matcher.includes(`${prefix}/:path*`),
        `Missing ${prefix}/:path* in proxy config.matcher`,
      );
    }

    for (const publicPrefix of PUBLIC_AUTH_PREFIXES) {
      assert.ok(
        proxyConfig.matcher.includes(`${publicPrefix}/:path*`),
        `Missing ${publicPrefix}/:path* in proxy config.matcher`,
      );
    }
  });

  it("redirects unauthenticated requests across all 17 protected routes and nested paths to /login?next=...", () => {
    const testPaths = [
      ...PROTECTED_AUTH_PREFIXES,
      "/incidents/inc-123",
      "/cameras/cam-01",
      "/users/usr-99",
      "/roles/admin",
      "/sites/site-a",
      "/ai-metrics/test",
      "/settings/security",
    ];

    for (const pathname of testPaths) {
      const req = new NextRequest(`http://localhost:3000${pathname}`);
      const res = proxy(req);
      assert.equal(res.status, 307, `Expected 307 redirect for ${pathname}`);
      assert.equal(
        res.headers.get("location"),
        `http://localhost:3000/login?next=${encodeURIComponent(pathname)}`,
      );
    }
  });

  it("rejects raw token cookies when both ppe_remember_me and ppe_session_active are missing", () => {
    const req = new NextRequest("http://localhost:3000/incidents", {
      headers: { cookie: "accessToken=stale-jwt" },
    });
    const res = proxy(req);
    assert.equal(res.status, 307);
    assert.equal(
      res.headers.get("location"),
      "http://localhost:3000/login?next=%2Fincidents",
    );
  });

  it("allows authenticated session through protected routes and preserves public exceptions", () => {
    const sessionHeader = {
      cookie: "accessToken=valid-jwt; ppe_session_active=1",
    };

    const allowed = proxy(
      new NextRequest("http://localhost:3000/incidents", {
        headers: sessionHeader,
      }),
    );
    assert.equal(allowed.status, 200);

    const loginRedirect = proxy(
      new NextRequest("http://localhost:3000/login", {
        headers: sessionHeader,
      }),
    );
    assert.equal(loginRedirect.status, 307);
    assert.equal(loginRedirect.headers.get("location"), "http://localhost:3000/");

    for (const exceptionPath of ["/verify-email/deactivate", "/auth/callback"]) {
      const exceptionRes = proxy(
        new NextRequest(`http://localhost:3000${exceptionPath}`, {
          headers: sessionHeader,
        }),
      );
      assert.equal(exceptionRes.status, 200);
    }
  });
});

