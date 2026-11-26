import type { NextRequest } from "next/server";

type StudioRouteContext = { params: Promise<{ path: string[] }> };

const studioResources = new Set(["models", "upload", "jobs", "live"]);

async function proxyStudio(request: NextRequest, { params }: StudioRouteContext) {
  const { path } = await params;
  if (!studioResources.has(path[0]) || path.some((part) => !/^[\w.-]+$/.test(part) || part === "." || part === "..")) {
    return new Response(null, { status: 404 });
  }

  const cookies = request.cookies.get("accessToken");
  const authorization = request.headers.get("authorization");
  if (!cookies?.value && !authorization) {
    return Response.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const method = request.method;
  const hasBody = method !== "GET" && method !== "HEAD";
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  const crossOrigin = fetchSite
    ? fetchSite === "cross-site" || fetchSite === "same-site"
    : Boolean(origin && origin !== request.nextUrl.origin);
  if (hasBody && crossOrigin) {
    return Response.json({ detail: "Forbidden" }, { status: 403 });
  }

  const unavailable = () => Response.json(
    { detail: "AI Sandbox is unavailable" },
    { status: 503 },
  );

  try {
    const configuredUrl = process.env.AI_SANDBOX_URL;
    const defaultUrl = process.env.NODE_ENV === "development" ? "http://127.0.0.1:8010" : "";
    const base = new URL(configuredUrl ?? defaultUrl);
    if (!["http:", "https:"].includes(base.protocol) || base.username || base.password) {
      return unavailable();
    }
    const upstreamUrl = new URL(`/studio/api/${path.map(encodeURIComponent).join("/")}`, base);
    upstreamUrl.search = request.nextUrl.search;
    const headers = new Headers({ "accept-encoding": "identity" });
    if (cookies?.value) headers.set("cookie", `accessToken=${cookies.value}`);
    for (const name of ["authorization", "content-type", "range", "if-range"] as const) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    const init: RequestInit & { duplex?: "half" } = {
      method,
      headers,
      cache: "no-store",
      redirect: "manual",
      signal: request.signal,
    };
    if (hasBody && request.body) {
      init.body = request.body;
      init.duplex = "half";
    }
    const upstream = await fetch(upstreamUrl, init);
    if (upstream.status >= 300 && upstream.status < 400) return unavailable();
    const responseHeaders = new Headers({ "cache-control": "private, no-store" });
    for (const name of [
      "content-type", "content-range", "accept-ranges", "last-modified", "etag", "x-live-max-sessions",
    ] as const) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    const encoding = upstream.headers.get("content-encoding");
    const length = upstream.headers.get("content-length");
    if (length && (!encoding || encoding === "identity")) responseHeaders.set("content-length", length);
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return unavailable();
  }
}

export {
  proxyStudio as GET,
  proxyStudio as HEAD,
  proxyStudio as POST,
  proxyStudio as PATCH,
};
