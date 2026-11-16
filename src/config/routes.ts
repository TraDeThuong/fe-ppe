/**
 * Danh sách tiền tố route dùng chung giữa Route Guard Lớp 1 (proxy.ts)
 * và Route Guard Lớp 2 (AuthLayoutClient) nhằm đảm bảo Single Source of Truth.
 *
 * LƯU Ý NEXT.JS: `config.matcher` trong `proxy.ts` bắt buộc dùng chuỗi literal tĩnh
 * để SWC static analyzer đọc được — mọi thay đổi ở đây cần cập nhật đồng bộ
 * `config.matcher` trong `proxy.ts` (được kiểm tra tự động bởi `proxy.test.ts`).
 */
export const PROTECTED_AUTH_PREFIXES = [
  "/dashboard",
  "/change-password",
  "/settings",
  "/incidents",
  "/cameras",
  "/users",
  "/roles",
  "/sites",
  "/notifications",
  "/reports",
  "/ai-metrics",
  "/audit-logs",
  "/maintenance",
  "/system",
  "/scheduled-tasks",
] as const;

// /2fa nằm trong nhóm (public): giữa luồng 2FA user CHƯA có session cookie
// (tempToken ở sessionStorage) — nếu coi là protected, proxy sẽ đá về /login.
// Người ĐÃ đăng nhập vào /2fa thì redirect về / là hành vi đúng.
export const PUBLIC_AUTH_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/2fa",
  "/auth",
] as const;

export function matchesRoutePrefix(
  pathname: string,
  prefixes: readonly string[],
): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

