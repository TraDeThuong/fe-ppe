import "client-only";

/**
 * Token sống trong memory vì cookie httpOnly không đọc được từ JS.
 * refreshToken ở đây LUÔN là bản mới nhất sau mỗi lần rotation —
 * gửi lại bản cũ sẽ khiến backend revoke TOÀN BỘ session của user.
 *
 * Sau reload trang, memory trống nhưng cookie vẫn hoạt động;
 * AuthContext gọi GET /auth/me để phục hồi phiên.
 */
let accessToken: string | null = null;
let refreshToken: string | null = null;
let tokenGeneration = 0;

/**
 * Giải mã payload của accessToken đang lưu trong bộ nhớ để kiểm tra nhanh siteIds
 * (giúp phát hiện trường hợp user vừa được Admin phân công thêm công trường ở DB
 * nhưng JWT accessToken cũ hạn 8h vẫn chứa siteIds cũ).
 */
export function getAccessTokenSiteIds(): string[] | null {
  if (!accessToken) return null;
  try {
    const parts = accessToken.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const payload = JSON.parse(atob(padded)) as {
      siteIds?: unknown;
      siteId?: unknown;
    };
    if (Array.isArray(payload.siteIds)) {
      return payload.siteIds.filter((id): id is string => typeof id === "string");
    }
    if (typeof payload.siteId === "string" && payload.siteId) {
      return [payload.siteId];
    }
    return [];
  } catch {
    return null;
  }
}

export const tokenStore = {
  getAccessToken: () => accessToken,
  getRefreshToken: () => refreshToken,
  getTokenGeneration: () => tokenGeneration,
  /** Gọi NGAY khi login/refresh thành công, trước khi retry bất kỳ request nào */
  setTokens: (access: string, refresh: string) => {
    accessToken = access;
    refreshToken = refresh;
    tokenGeneration += 1;
  },
  clear: () => {
    accessToken = null;
    refreshToken = null;
    tokenGeneration += 1;
  },
};
