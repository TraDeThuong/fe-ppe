import "client-only";

import { env } from "@/config/env";

/**
 * Trạng thái luồng OAuth lưu ở sessionStorage (mỗi tab 1 luồng riêng).
 * `state` do client sinh trước khi gọi GET /auth/google/url, Google echo lại
 * ở query callback — trang /auth/callback so khớp để chống CSRF (login CSRF).
 */

/** Đường dẫn callback Google OAuth — backend dùng đúng URI này để validate allowlist */
export const GOOGLE_OAUTH_REDIRECT_PATH = "/auth/callback";

const OAUTH_STATE_STORAGE_KEY = "ppe.oauth.state";

/**
 * TempToken nhánh requires2FA (login thường + Google login) — chia sẻ với
 * trang /2fa (đề phòng reload trong 5 phút hiệu lực của tempToken).
 */
export const TEMP_TOKEN_STORAGE_KEY = "ppe.tempToken";

/** Redirect URI gửi kèm khi xin URL Google và khi đổi authorization code */
export function getGoogleRedirectUri(): string {
  return `${env.appUrl}${GOOGLE_OAUTH_REDIRECT_PATH}`;
}

/** Sinh state ngẫu nhiên cho 1 lần khởi tạo OAuth */
export function generateOAuthState(): string {
  return crypto.randomUUID();
}

export function saveOAuthState(state: string): void {
  sessionStorage.setItem(OAUTH_STATE_STORAGE_KEY, state);
}

export function clearOAuthState(): void {
  sessionStorage.removeItem(OAUTH_STATE_STORAGE_KEY);
}

/**
 * So khớp state Google trả về với state đã lưu (chống CSRF).
 * Luôn xóa state sau khi dùng — mỗi state chỉ hợp lệ đúng 1 lần.
 */
export function consumeOAuthState(received: string | null): boolean {
  const expected = sessionStorage.getItem(OAUTH_STATE_STORAGE_KEY);
  clearOAuthState();
  return Boolean(expected && received && expected === received);
}
