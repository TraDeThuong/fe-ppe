import { NextRequest, NextResponse } from "next/server";

const DEFAULT_AI_PROXY_TIMEOUT_MS = 5000;

/** Resolves a target path against AI_ENGINE_URL (defaults to local :8000). */
export function resolveAiEngineUrl(path: string): string {
  const aiBase = (
    process.env.AI_ENGINE_URL || "http://127.0.0.1:8000"
  ).replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${aiBase}${normalizedPath}`;
}

/** Copies auth, cookie, and content-type headers from the incoming NextRequest. */
export function buildAiUpstreamHeaders(req: NextRequest): Headers {
  const headers = new Headers();
  for (const name of ["authorization", "cookie", "content-type"] as const) {
    const val = req.headers.get(name);
    if (val) {
      headers.set(name, val);
    }
  }
  return headers;
}

function formatProxyFailureMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const err = error as {
      name?: string;
      code?: string;
      message?: string;
      cause?: { code?: string; message?: string };
    };
    const code = err.cause?.code || err.code;
    if (err.name === "AbortError" || code === "ABORT_ERR") {
      return "AI Engine request timed out";
    }
    const detail = err.cause?.message || err.message;
    if (code && detail) {
      return `AI Engine connection failed (${code}): ${detail}`;
    }
    if (detail) {
      return `AI Engine connection failed: ${detail}`;
    }
  }
  return "AI Engine connection failed";
}

/**
 * Proxies a GET request to the AI Engine and converts transport failures into
 * structured 503 JSON responses instead of letting Next.js rewrites emit 500.
 */
export async function proxyAiGet(
  req: NextRequest,
  upstreamPath: string,
  forwardHeaders: readonly string[] = [],
): Promise<NextResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_AI_PROXY_TIMEOUT_MS);

  try {
    const upstream = await fetch(resolveAiEngineUrl(upstreamPath), {
      method: "GET",
      headers: buildAiUpstreamHeaders(req),
      cache: "no-store",
      signal: controller.signal,
    });

    const headers = new Headers({
      "content-type": upstream.headers.get("content-type") || "application/json",
    });
    for (const headerName of forwardHeaders) {
      const value = upstream.headers.get(headerName);
      if (value !== null) {
        headers.set(headerName, value);
      }
    }

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    return NextResponse.json(
      { detail: formatProxyFailureMessage(error) },
      { status: 503 },
    );
  } finally {
    clearTimeout(timer);
  }
}
