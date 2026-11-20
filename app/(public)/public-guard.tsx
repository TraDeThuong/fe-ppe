"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AUTH_SESSION_EXPIRED_EVENT } from "@/lib/axios";
import { eventBus } from "@/lib/event-bus";
import { ensureSessionCookieSynced } from "@/lib/session-manager";

/** Ngưỡng phát hiện proxy bounce loop (/login -> / -> /dashboard -> /login) */
const BOUNCE_WINDOW_MS = 2500;

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
  const lastRedirectAtRef = useRef<number>(0);

  useEffect(() => {
    if (
      status === "authenticated" &&
      !pathname.startsWith("/verify-email/deactivate") &&
      !pathname.startsWith("/auth/callback")
    ) {
      const now = Date.now();
      // Circuit-breaker: nếu vừa redirect khỏi /login mà lại bị proxy.ts trả ngược về /login
      // trong vòng 2.5s (do mất cookie httpOnly accessToken/refreshToken ở server),
      // hủy phiên client ngay thay vì lặp vô hạn /login -> / -> /dashboard -> /login.
      if (now - lastRedirectAtRef.current < BOUNCE_WINDOW_MS) {
        lastRedirectAtRef.current = 0;
        eventBus.emit(AUTH_SESSION_EXPIRED_EVENT);
        return;
      }
      lastRedirectAtRef.current = now;
      ensureSessionCookieSynced();
      router.replace("/");
    }
  }, [status, pathname, router]);

  return <>{children}</>;
}

