import { NextRequest, NextResponse } from "next/server";

type ProbeTargetKey = "ai" | "traefik" | "minio";
type FailureKind = "CONNECTION_REFUSED" | "TIMEOUT" | "HTTP_ERROR" | "PAYLOAD_UNHEALTHY" | "UNKNOWN";

function resolveProbeUrl(target: ProbeTargetKey): string {
  const aiBase = (
    process.env.AI_ENGINE_URL || "http://127.0.0.1:8000"
  ).replace(/\/+$/, "");

  switch (target) {
    case "ai":
      return `${aiBase}/health`;
    case "traefik":
      return process.env.TRAEFIK_PING_URL || "http://127.0.0.1:8080/ping";
    case "minio":
      return (
        process.env.MINIO_HEALTH_URL ||
        "http://127.0.0.1:9000/minio/health/live"
      );
  }
}

function classifyFetchError(error: unknown): {
  failureKind: FailureKind;
  reason: string;
} {
  if (error && typeof error === "object") {
    const err = error as {
      name?: string;
      code?: string;
      message?: string;
      cause?: { code?: string; message?: string };
    };
    const code = err.cause?.code || err.code || "";
    if (err.name === "AbortError" || code === "ABORT_ERR") {
      return { failureKind: "TIMEOUT", reason: "Timeout (> 2s)" };
    }
    if (
      code === "ECONNREFUSED" ||
      code === "EHOSTUNREACH" ||
      code === "ENOTFOUND"
    ) {
      return {
        failureKind: "CONNECTION_REFUSED",
        reason: `Connection refused (${code})`,
      };
    }
    return {
      failureKind: "UNKNOWN",
      reason: err.cause?.message || err.message || "Probe failed",
    };
  }
  return { failureKind: "UNKNOWN", reason: "Probe failed" };
}

export async function GET(req: NextRequest) {
  const hasAuthCookie = Boolean(
    req.cookies.get("accessToken")?.value ||
      req.cookies.get("refreshToken")?.value,
  );
  const hasAuthHeader = Boolean(req.headers.get("authorization")?.trim());
  if (!hasAuthCookie && !hasAuthHeader) {
    return NextResponse.json(
      { ok: false, reason: "Unauthorized" },
      { status: 401 },
    );
  }

  const targetParam = req.nextUrl.searchParams.get("target");
  if (
    targetParam !== "ai" &&
    targetParam !== "traefik" &&
    targetParam !== "minio"
  ) {
    return NextResponse.json(
      { ok: false, reason: "Invalid probe target" },
      { status: 400 },
    );
  }

  const targetUrl = resolveProbeUrl(targetParam);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);
  const start = Date.now();

  try {
    const response = await fetch(targetUrl, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    const latencyMs = Math.max(1, Date.now() - start);

    // The local AI Test UI exposes /api/models but has no /health endpoint.
    // Check its existing read-only API only when /health is absent, never to hide a 5xx.
    if (targetParam === "ai" && response.status === 404) {
      const modelsResponse = await fetch(`${targetUrl.slice(0, -"/health".length)}/api/models`, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });
      if (!modelsResponse.ok) {
        return NextResponse.json({
          ok: false,
          statusCode: modelsResponse.status,
          latencyMs: Math.max(1, Date.now() - start),
          failureKind: "HTTP_ERROR" satisfies FailureKind,
          reason: `HTTP ${modelsResponse.status} (/api/models; /health unavailable)`,
        });
      }
      let models: unknown;
      try {
        models = await modelsResponse.json();
      } catch (error) {
        if (controller.signal.aborted) throw error;
        models = null;
      }
      const validModels = Array.isArray(models) && models.every((model: unknown) => {
        if (!model || typeof model !== "object") return false;
        const item = model as Record<string, unknown>;
        return typeof item.name === "string" && item.name.length > 0 &&
          typeof item.path === "string" && item.path.startsWith("models/") &&
          typeof item.size_mb === "number" && Number.isFinite(item.size_mb) && item.size_mb >= 0 &&
          typeof item.is_default === "boolean";
      });
      if (!validModels) {
        return NextResponse.json({
          ok: false,
          statusCode: modelsResponse.status,
          latencyMs: Math.max(1, Date.now() - start),
          failureKind: "PAYLOAD_UNHEALTHY" satisfies FailureKind,
          reason: "Invalid AI models API response (/api/models)",
        });
      }
      return NextResponse.json({
        ok: true,
        statusCode: modelsResponse.status,
        latencyMs: Math.max(1, Date.now() - start),
        verifiedVia: "ai-models-api",
      });
    }

    if (!response.ok) {
      return NextResponse.json({
        ok: false,
        statusCode: response.status,
        latencyMs,
        failureKind: "HTTP_ERROR" as FailureKind,
        reason: `HTTP ${response.status}`,
      });
    }

    let uptime: number | undefined;
    try {
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const body = (await response.json()) as { uptime?: unknown };
        if (typeof body?.uptime === "number") {
          uptime = body.uptime;
        }
      }
    } catch {
      // Non-JSON responses (e.g. Traefik "OK" or MinIO empty 200) are still healthy.
    }

    return NextResponse.json({
      ok: true,
      statusCode: response.status,
      latencyMs,
      ...(typeof uptime === "number" ? { uptime } : {}),
    });
  } catch (error) {
    const latencyMs = Math.max(1, Date.now() - start);
    const classified = classifyFetchError(error);
    return NextResponse.json({
      ok: false,
      statusCode: null,
      latencyMs,
      failureKind: classified.failureKind,
      reason: classified.reason,
    });
  } finally {
    clearTimeout(timer);
  }
}
