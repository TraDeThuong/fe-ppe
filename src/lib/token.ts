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

export const tokenStore = {
  getAccessToken: () => accessToken,
  getRefreshToken: () => refreshToken,
  /** Gọi NGAY khi login/refresh thành công, trước khi retry bất kỳ request nào */
  setTokens: (access: string, refresh: string) => {
    accessToken = access;
    refreshToken = refresh;
  },
  clear: () => {
    accessToken = null;
    refreshToken = null;
  },
};
