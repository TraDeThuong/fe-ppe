"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/providers/locale-provider";
import { RealtimeProvider } from "@/providers/realtime-provider";
import { PrefetchProvider } from "@/providers/prefetch-provider";
import { SiteProvider } from "@/contexts/SiteContext";
import { AppShell } from "@/components/features/app-shell/app-shell";
import { Button } from "@ui/button";

/**
 * Route guard LỚP 2 (client, chính xác): session đã được AuthProvider
 * phục hồi qua /auth/me. Không redirect trong context — guard ở đây.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { status, user, logout } = useAuth();
  const { t } = useLocale();
  const router = useRouter();

  const mustChange = Boolean(user?.mustChangePassword);

  useEffect(() => {
    const pathname = window.location.pathname;
    if (status === "unauthenticated") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (
      status === "authenticated" &&
      mustChange &&
      pathname !== "/change-password"
    ) {
      router.replace("/change-password");
    }
  }, [status, mustChange, router]);

  // Quan trọng: KHÔNG chặn render children khi loading/unauthenticated —
  // Next 16 (cacheComponents) cần page segment render trong pass prerender,
  // nếu layout chặn thì page bị drop khỏi instant-navigation validation.
  // Trang con tự hiển thị skeleton theo status; redirect ở effect dưới.
  if (!user) {
    return <>{children}</>;
  }

  if (!user.isActive) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md rounded-2xl bg-card p-8 text-center shadow-[8px_8px_16px_var(--shadow-dark),-8px_-8px_16px_var(--shadow-light)]">
          <h1 className="text-lg font-semibold text-foreground">
            {t("guard.inactiveTitle")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("guard.inactiveBody")}
          </p>
          <Button
            variant="outline"
            className="mt-6"
            onClick={() => void logout()}
          >
            {t("common.logout")}
          </Button>
        </div>
      </div>
    );
  }

  // mustChangePassword → chờ effect redirect ở trên
  if (
    mustChange &&
    typeof window !== "undefined" &&
    window.location.pathname !== "/change-password"
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <p>{t("guard.skeleton")}</p>
      </div>
    );
  }

  return (
    <RealtimeProvider>
      <SiteProvider>
        <PrefetchProvider>
          <AppShell>{children}</AppShell>
        </PrefetchProvider>
      </SiteProvider>
    </RealtimeProvider>
  );
}
