"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Route guard nhóm công khai: đã đăng nhập → redirect "/".
 * Lớp 1 (proxy) chỉ chặn được request từ server (F5, link ngoài);
 * layout này chặn điều hướng client-side — proxy không chạy khi đó.
 *
 * Dùng useAuth() thay vì useMe(): AuthProvider đã phục hồi session qua
 * /auth/me ở root, `status` là nguồn duy nhất — không cần gọi /me lần 2.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [status, router]);

  // Luôn render children — Next 16 (cacheComponents) cần page segment được
  // render trong pass prerender; chặn children khi authenticated sẽ drop
  // segment khỏi instant-navigation validation. Flash 1 frame là chấp nhận được.
  return <>{children}</>;
}
