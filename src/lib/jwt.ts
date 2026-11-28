/**
 * Đọc payload JWT phía client (KHÔNG verify chữ ký — chỉ dùng cho hiển thị /
 * suy luận trạng thái UI; quyền thật luôn do BE kiểm tra).
 */
export function decodeJwtPayload<T extends object = Record<string, unknown>>(
  token: string | null | undefined,
): T | null {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const payload: unknown = JSON.parse(atob(padded));
    return payload && typeof payload === "object" ? (payload as T) : null;
  } catch {
    return null;
  }
}

/** Thời điểm hết hạn (ms epoch) theo claim `exp`; null nếu không đọc được */
export function getJwtExpiryMs(token: string | null | undefined): number | null {
  const payload = decodeJwtPayload<{ exp?: unknown }>(token);
  if (!payload || typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) {
    return null;
  }
  return payload.exp * 1000;
}
