/**
 * Chỉ gắn cờ `Secure` khi trang đang chạy trên HTTPS để bảo vệ cookie ở production
 * mà không làm hỏng luồng phát triển cục bộ trên `http://localhost`.
 */
export function shouldUseSecureCookie(): boolean {
  return typeof window !== "undefined" && window.location?.protocol === "https:";
}

/**
 * Đọc cookie phía client theo tên; trả về `null` trên môi trường SSR hoặc khi không tồn tại.
 */
export function getClientCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Ghi cookie phía client kèm `path=/; SameSite=Lax` và tự động gắn `; Secure` khi chạy HTTPS.
 */
export function setClientCookie(name: string, value: string, maxAgeSeconds?: number): void {
  if (typeof document === "undefined") return;
  const maxAgeStr = maxAgeSeconds !== undefined ? `; max-age=${maxAgeSeconds}` : "";
  const secureStr = shouldUseSecureCookie() ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Lax${maxAgeStr}${secureStr}`;
}

/**
 * Xóa cookie phía client bằng `max-age=0` với cùng thuộc tính `SameSite=Lax` và `Secure` (nếu HTTPS).
 */
export function deleteClientCookie(name: string): void {
  setClientCookie(name, "", 0);
}

