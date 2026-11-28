/**
 * Kiểm tra & giữ tham số `?next=` qua các bước đăng nhập nhiều chặng
 * (login → /2fa, login → Google → /auth/callback → /2fa).
 *
 * Chống open redirect: chỉ chấp nhận path nội bộ cùng origin. Chặn cả các
 * dạng trình duyệt tự hiểu là URL tuyệt đối: "//evil.com", "/\evil.com",
 * "/\t/evil.com" (ký tự điều khiển bị trình duyệt bỏ qua khi phân tích URL).
 */

const PENDING_NEXT_STORAGE_KEY = "ppe.auth.next";

export function sanitizeNextPath(raw: string | null | undefined, origin?: string): string {
  if (!raw) return "/";
  if (!raw.startsWith("/")) return "/";
  // Backslash bị trình duyệt chuẩn hóa thành "/" → "/\evil.com" == "//evil.com".
  // Ký tự điều khiển (tab, xuống dòng…) bị bỏ qua khi parse → "/\t/evil.com".
  // eslint-disable-next-line no-control-regex
  if (raw.startsWith("//") || /[\\\u0000-\u001F\u007F]/.test(raw)) return "/";

  const base =
    origin ?? (typeof window !== "undefined" ? window.location.origin : undefined);
  if (!base) return "/";

  try {
    const url = new URL(raw, base);
    if (url.origin !== new URL(base).origin) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

/** `next` hợp lệ đang có trên URL hiện tại (mặc định "/") */
export function readSafeNextFromUrl(): string {
  if (typeof window === "undefined") return "/";
  return sanitizeNextPath(new URLSearchParams(window.location.search).get("next"));
}

/** Lưu `next` trước khi rời trang /login (sang /2fa hoặc Google) — mỗi tab 1 luồng */
export function savePendingNext(next: string): void {
  try {
    if (next && next !== "/") {
      sessionStorage.setItem(PENDING_NEXT_STORAGE_KEY, next);
    } else {
      sessionStorage.removeItem(PENDING_NEXT_STORAGE_KEY);
    }
  } catch {
    // sessionStorage không khả dụng (private mode…) → mất next, về "/"
  }
}

/** Lấy & xóa `next` đã lưu — luôn kiểm tra lại vì sessionStorage sửa được từ devtools */
export function consumePendingNext(): string {
  try {
    const stored = sessionStorage.getItem(PENDING_NEXT_STORAGE_KEY);
    sessionStorage.removeItem(PENDING_NEXT_STORAGE_KEY);
    return sanitizeNextPath(stored);
  } catch {
    return "/";
  }
}

export function clearPendingNext(): void {
  try {
    sessionStorage.removeItem(PENDING_NEXT_STORAGE_KEY);
  } catch {
    // bỏ qua
  }
}

/**
 * Xóa các tham số bí mật (token, code, state…) khỏi thanh địa chỉ ngay sau khi
 * đọc — tránh lưu vào lịch sử trình duyệt và lộ qua header Referer.
 * Dùng history.replaceState thay vì router để không kích hoạt render lại route.
 */
export function stripQueryParams(keys: readonly string[]): void {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    let changed = false;
    for (const key of keys) {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        changed = true;
      }
    }
    if (!changed) return;
    const search = url.searchParams.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${search ? `?${search}` : ""}${url.hash}`,
    );
  } catch {
    // bỏ qua — không ảnh hưởng luồng chính
  }
}
