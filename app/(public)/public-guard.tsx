"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AUTH_SESSION_EXPIRED_EVENT } from "@/lib/axios";
import { eventBus } from "@/lib/event-bus";
import { ensureSessionCookieSynced } from "@/lib/session-manager";

/** Ngưỡng phát hiện proxy bounce loop (/login -> / -> /dashboard -> /login) */
const BOUNCE_WINDOW_MS = 2500;
const BOUNCE_STORAGE_KEY = "ppe_public_guard_redirect_at";

function readLastRedirectAt(): number {
  try {
    const raw = window.sessionStorage.getItem(BOUNCE_STORAGE_KEY);
    const parsed = raw ? Number(raw) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

function writeLastRedirectAt(ts: number): void {
  try {
    if (ts > 0) {
      window.sessionStorage.setItem(BOUNCE_STORAGE_KEY, String(ts));
    } else {
      window.sessionStorage.removeItem(BOUNCE_STORAGE_KEY);
    }
  } catch {
    // Bỏ qua nếu sessionStorage không khả dụng
  }
}

/**
 * Route guard nhóm công khai: đã đăng nhập → redirect "/".
 * Lớp 1 (proxy) chỉ chặn được request từ server (F5, link ngoài);
 * guard này chặn điều hướng client-side — proxy không chạy khi đó.
 *
 * Ngoại lệ: /verify-email/deactivate — user đang đăng nhập bấm link xác nhận
 * vô hiệu hóa tài khoản trong email, trang phải chạy được (đồng bộ proxy.ts).
 * Ngoại lệ: /auth/callback — callback OAuth dùng chung cho cả đăng nhập bằng
 * Google (chưa đăng nhập) và liên kết Google (đang đăng nhập từ settings).
 */
export function PublicGuard({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (
      status === "authenticated" &&
      !pathname.startsWith("/verify-email/deactivate") &&
      !pathname.startsWith("/auth/callback")
    ) {
      const now = Date.now();
      const lastRedirectAt = readLastRedirectAt();
      // Circuit-breaker: nếu vừa redirect khỏi /login mà lại bị proxy.ts trả ngược về /login
      // trong vòng 2.5s (do mất cookie httpOnly accessToken/refreshToken ở server),
      // hủy phiên client ngay thay vì lặp vô hạn /login -> / -> /dashboard -> /login.
      if (lastRedirectAt > 0 && now - lastRedirectAt < BOUNCE_WINDOW_MS) {
        writeLastRedirectAt(0);
        eventBus.emit(AUTH_SESSION_EXPIRED_EVENT);
        return;
      }
      writeLastRedirectAt(now);
      ensureSessionCookieSynced();
      router.replace("/");
    }
  }, [status, pathname, router]);

  return <>{children}</>;
}

