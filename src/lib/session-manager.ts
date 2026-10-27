import "client-only";

export const REMEMBER_ME_KEY = "ppe_remember_me";
export const REMEMBERED_EMAIL_KEY = "ppe_remembered_email";
export const SESSION_ACTIVE_KEY = "ppe_session_active";
export const LAST_ACTIVE_KEY = "ppe_last_active_time";

/** Thời gian grace period (30s) khi chuyển tab hoặc mở tab mới trong cùng phiên làm việc */
const INACTIVITY_TIMEOUT_MS = 30 * 1000;

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setCookie(name: string, value: string, maxAgeSeconds?: number) {
  if (typeof document === "undefined") return;
  const maxAgeStr = maxAgeSeconds !== undefined ? `; max-age=${maxAgeSeconds}` : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Lax${maxAgeStr}`;
}

export function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

/**
 * Kiểm tra xem người dùng có chọn ghi nhớ đăng nhập không.
 */
export function isRememberMe(): boolean {
  if (typeof window === "undefined") return false;
  return (
    localStorage.getItem(REMEMBER_ME_KEY) === "true" ||
    getCookie(REMEMBER_ME_KEY) === "1"
  );
}

/**
 * Lấy email đã được ghi nhớ (nếu người dùng từng tick ghi nhớ đăng nhập).
 */
export function getRememberedEmail(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REMEMBERED_EMAIL_KEY);
}

/**
 * Thiết lập trạng thái lưu phiên đăng nhập:
 * - rememberMe = true: Lưu cờ persistent trong localStorage và cookie 7 ngày. Lần sau vào không cần nhập lại mật khẩu.
 * - rememberMe = false: Chỉ lưu trong session (sessionStorage và session cookie). Khi đóng trình duyệt/hết phiên, lần sau phải vào /login đăng nhập lại.
 */
export function setLoginPersistence(rememberMe: boolean, email?: string) {
  if (typeof window === "undefined") return;

  if (rememberMe) {
    localStorage.setItem(REMEMBER_ME_KEY, "true");
    if (email) {
      localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
    }
    // Cookie persistent 7 ngày (đồng bộ với thời hạn refresh token)
    setCookie(REMEMBER_ME_KEY, "1", 7 * 24 * 60 * 60);
    deleteCookie(SESSION_ACTIVE_KEY);
    sessionStorage.removeItem(SESSION_ACTIVE_KEY);
  } else {
    localStorage.removeItem(REMEMBER_ME_KEY);
    localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    deleteCookie(REMEMBER_ME_KEY);

    // Phiên làm việc tạm thời: session storage + session cookie (tự xóa khi đóng browser)
    sessionStorage.setItem(SESSION_ACTIVE_KEY, "true");
    setCookie(SESSION_ACTIVE_KEY, "1");
    localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
  }
}

/**
 * Xóa toàn bộ trạng thái lưu phiên khi người dùng chủ động đăng xuất.
 */
export function clearLoginPersistence() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(REMEMBER_ME_KEY);
  localStorage.removeItem(LAST_ACTIVE_KEY);
  sessionStorage.removeItem(SESSION_ACTIVE_KEY);
  deleteCookie(REMEMBER_ME_KEY);
  deleteCookie(SESSION_ACTIVE_KEY);
}

/**
 * Cập nhật timestamp hoạt động để giữ phiên tạm thời khi người dùng đang thao tác.
 */
export function recordActivity() {
  if (typeof window === "undefined") return;
  if (!isRememberMe()) {
    localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
  }
}

/**
 * Xác định xem có nên tự động phục hồi phiên đăng nhập khi tải lại trang hoặc mở trang mới:
 * 1. Nếu rememberMe = true -> luôn phục hồi ("như logic hiện tại").
 * 2. Nếu rememberMe = false:
 *    - Nếu tab hiện tại đang có sessionStorage (F5 / điều hướng nội bộ) -> phục hồi.
 *    - Nếu session cookie còn và vừa có hoạt động trong 30s (mở thêm tab mới trong cùng phiên) -> phục hồi.
 *    - Ngược lại (mở lại sau khi đóng browser/hết phiên) -> KHÔNG phục hồi, yêu cầu vào /login.
 */
export function shouldRestoreSession(): boolean {
  if (typeof window === "undefined") return true;

  if (isRememberMe()) {
    return true;
  }

  const sessionActiveInTab = sessionStorage.getItem(SESSION_ACTIVE_KEY) === "true";
  if (sessionActiveInTab) {
    recordActivity();
    return true;
  }

  const sessionCookiePresent = getCookie(SESSION_ACTIVE_KEY) === "1";
  const lastActiveStr = localStorage.getItem(LAST_ACTIVE_KEY);
  const lastActive = lastActiveStr ? Number(lastActiveStr) : 0;
  const isRecent = Date.now() - lastActive < INACTIVITY_TIMEOUT_MS;

  if (sessionCookiePresent && isRecent) {
    sessionStorage.setItem(SESSION_ACTIVE_KEY, "true");
    recordActivity();
    return true;
  }

  return false;
}
