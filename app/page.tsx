"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/providers/locale-provider";

/**
 * Trang gốc chỉ là điểm trung chuyển: đã đăng nhập → /dashboard,
 * chưa đăng nhập → /login.
 * Redirect qua effect thay vì redirect() server-side — redirect() ném
 * NEXT_REDIRECT trong pass prerender khiến Next 16 không validate được
 * segment "/" (instant-navigation), tương tự cảnh báo Bước 3.
 */
export default function Home() {
  const { status } = useAuth();
  const { t } = useLocale();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    } else if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-muted-foreground">{t("guard.skeleton")}</p>
    </div>
  );
}
