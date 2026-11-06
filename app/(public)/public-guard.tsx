"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

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
      router.replace("/");
    }
  }, [status, pathname, router]);

  return <>{children}</>;
}

