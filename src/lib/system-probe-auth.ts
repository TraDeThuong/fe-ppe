import type { NextRequest } from "next/server";

// ── Xác thực người gọi ────────────────────────────────────────────────
// Route này chạy trên server Next và gọi tới các cổng nội bộ (AI, Traefik, MinIO),
// nên chỉ "có cookie" là chưa đủ: phải hỏi identity-service xem token còn hợp lệ
// và người gọi có quyền xem cấu hình hệ thống hay không (cùng quy tắc với useCan + trang /system).
const PROBE_PERMISSION = "SYSTEM_CONFIG_READ";
const PRIVILEGED_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);
const AUTH_TIMEOUT_MS = 1500;
const AUTH_CACHE_TTL_MS = 30_000;
const AUTH_CACHE_MAX = 200;

export type ProbeAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 403 | 503; reason: string };

// Bảng điều khiển gọi 3 probe song song mỗi lần làm mới; nhớ kết quả /auth/me trong
// thời gian ngắn theo token để không bắn 3 request xác thực cho cùng một phiên.
// Chỉ nhớ kết quả chắc chắn (hợp lệ/thiếu quyền), không nhớ lỗi mạng.
const authCache = new Map<string, { result: ProbeAuthResult; expiresAt: number }>();

function resolveIdentityBaseUrl(): string {
  return (
    process.env.IDENTITY_INTERNAL_URL ||
    process.env.API_INTERNAL_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://127.0.0.1:80/api/v1"
  ).replace(/\/+$/, "");
}

async function cacheKeyFor(credential: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(credential),
  );
  return Buffer.from(digest).toString("hex");
}

function rememberAuth(key: string, result: ProbeAuthResult) {
  if (authCache.size >= AUTH_CACHE_MAX) {
    const now = Date.now();
    for (const [k, v] of authCache) if (v.expiresAt <= now) authCache.delete(k);
    if (authCache.size >= AUTH_CACHE_MAX) authCache.clear();
  }
  authCache.set(key, { result, expiresAt: Date.now() + AUTH_CACHE_TTL_MS });
}

/** Chỉ dùng cho test: xóa bộ nhớ đệm xác thực giữa các ca. */
export function __resetProbeAuthCache() {
  authCache.clear();
}

export async function verifyProbeCaller(req: NextRequest): Promise<ProbeAuthResult> {
  const accessCookie = req.cookies.get("accessToken")?.value?.trim();
  const authHeader = req.headers.get("authorization")?.trim();
  if (!accessCookie && !authHeader) {
    return { ok: false, status: 401, reason: "Unauthorized" };
  }

  // Chỉ chuyển tiếp đúng thông tin xác thực, không đẩy toàn bộ cookie của trình duyệt.
  const headers: Record<string, string> = { accept: "application/json" };
  if (accessCookie) headers.cookie = `accessToken=${accessCookie}`;
  if (authHeader) headers.authorization = authHeader;

  const key = await cacheKeyFor(`${accessCookie ?? ""}|${authHeader ?? ""}`);
  const cached = authCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.result;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);
  try {
    const response = await fetch(`${resolveIdentityBaseUrl()}/auth/me`, {
      method: "GET",
      cache: "no-store",
      headers,
      signal: controller.signal,
    });
    if (response.status === 401) {
      const result: ProbeAuthResult = { ok: false, status: 401, reason: "Unauthorized" };
      rememberAuth(key, result);
      return result;
    }
    if (!response.ok) {
      return { ok: false, status: 503, reason: `Auth check failed (HTTP ${response.status})` };
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return { ok: false, status: 503, reason: "Auth check failed (invalid response)" };
    }
    // BE bọc phản hồi dạng { success, data }; vẫn chấp nhận MeDto trần.
    const envelope = body as { success?: unknown; data?: unknown } | null;
    const me = (
      envelope && typeof envelope === "object" && "success" in envelope
        ? envelope.success === true ? envelope.data : null
        : envelope
    ) as { role?: unknown; permissions?: unknown; isActive?: unknown } | null;
    if (!me || typeof me !== "object") {
      return { ok: false, status: 503, reason: "Auth check failed (invalid response)" };
    }

    const role = typeof me.role === "string" ? me.role : "";
    const permissions = Array.isArray(me.permissions) ? me.permissions : [];
    const allowed =
      me.isActive !== false &&
      (PRIVILEGED_ROLES.has(role) || permissions.includes(PROBE_PERMISSION));
    const result: ProbeAuthResult = allowed
      ? { ok: true }
      : { ok: false, status: 403, reason: `Forbidden (requires ${PROBE_PERMISSION})` };
    rememberAuth(key, result);
    return result;
  } catch (error) {
    const timedOut = (error as { name?: string })?.name === "AbortError";
    return {
      ok: false,
      status: 503,
      reason: timedOut ? "Auth check timed out" : "Auth service unreachable",
    };
  } finally {
    clearTimeout(timer);
  }
}
