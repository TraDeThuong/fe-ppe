"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Route guard nhóm công khai: đã đăng nhập → redirect "/".
 * Lớp 1 (proxy) chỉ chặn được request từ server (F5, link ngoài);
 * layout này chặn điều hướng client-side — proxy không chạy khi đó.
 *
 * Ngoại lệ: /verify-email/deactivate — user đang đăng nhập bấm link xác nhận
 * vô hiệu hóa tài khoản trong email, trang phải chạy được (đồng bộ proxy.ts).
 * Ngoại lệ: /auth/callback — callback OAuth dùng chung cho cả đăng nhập bằng
 * Google (chưa đăng nhập) và liên kết Google (đang đăng nhập từ settings).
 *
 * Dùng useAuth() thay vì useMe(): AuthProvider đã phục hồi session qua
 * /auth/me ở root, `status` là nguồn duy nhất — không cần gọi /me lần 2.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
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

  // Luôn render children — Next 16 (cacheComponents) cần page segment được
  // render trong pass prerender; chặn children khi authenticated sẽ drop
  // segment khỏi instant-navigation validation. Flash 1 frame là chấp nhận được.
  return <>{children}</>;
}
