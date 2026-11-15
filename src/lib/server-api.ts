import { cookies } from "next/headers";
import { QueryClient } from "@tanstack/react-query";
import { env } from "@/config/env";
import type { PaginationMeta } from "@/types";

export function createServerQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        retry: false,
      },
    },
  });
}

interface ServerAuthContext {
  accessToken: string;
  cookieHeader: string;
}

async function getServerAuthContext(): Promise<ServerAuthContext | null> {
  if (typeof window !== "undefined") return null;

  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;
  if (!accessToken) return null;

  const hasSessionFlag = Boolean(
    cookieStore.get("ppe_remember_me")?.value ||
      cookieStore.get("ppe_session_active")?.value,
  );
  if (!hasSessionFlag) return null;

  return {
    accessToken,
    cookieHeader: cookieStore.toString(),
  };
}

function buildServerUrl(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): string {
  const baseUrl = (process.env.SERVER_API_BASE_URL || env.apiBaseUrl).replace(
    /\/+$/,
    "",
  );
  const normalizedPath =
    baseUrl.endsWith("/api/v1") && path.startsWith("/api/v1")
      ? path.replace(/^\/api\/v1/, "") || "/"
      : path;
  const fullPath = normalizedPath.startsWith("/")
    ? `${baseUrl}${normalizedPath}`
    : `${baseUrl}/${normalizedPath}`;

  if (!params) return fullPath;

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `${fullPath}?${qs}` : fullPath;
}

/**
 * Read-only server GET helper cho RSC prefetch.
 * Fail-soft trả về `null` khi chưa có session, token hết hạn (401), hoặc backend unreachable,
 * tuyệt đối không gọi /auth/refresh trên server để tránh đụng refresh token rotation single-flight ở client.
 */
export async function serverApiGet<T = unknown>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T | null> {
  try {
    const auth = await getServerAuthContext();
    if (!auth) return null;

    const url = buildServerUrl(path, params);
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Cookie: auth.cookieHeader,
        Authorization: `Bearer ${auth.accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function serverUnwrapData<T>(body: unknown): T | null {
  if (!body || typeof body !== "object") return null;
  const raw = body as Record<string, unknown>;
  if ("success" in raw) {
    if (!raw.success) return null;
    return (raw.data !== undefined ? raw.data : raw) as T;
  }
  if ("data" in raw) {
    return (raw.data as T) ?? null;
  }
  return body as T;
}

export function serverUnwrapPaginated<T>(
  body: unknown,
): { items: T[]; meta?: PaginationMeta } | null {
  if (!body) return null;
  if (Array.isArray(body)) return { items: body as T[] };
  if (typeof body !== "object") return null;

  const raw = body as Record<string, any>;
  if ("success" in raw && !raw.success) return null;

  const items = Array.isArray(raw.data)
    ? (raw.data as T[])
    : Array.isArray(raw.items)
      ? (raw.items as T[])
      : Array.isArray(raw.data?.data)
        ? (raw.data.data as T[])
        : [];
  const meta = (raw.meta ?? raw.data?.meta) as PaginationMeta | undefined;
  return { items, meta };
}

export function readSearchParam(
  raw: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const val = raw[key];
  if (typeof val === "string") return val || undefined;
  if (Array.isArray(val) && typeof val[0] === "string") return val[0] || undefined;
  return undefined;
}
