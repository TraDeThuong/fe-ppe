"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/providers/locale-provider";
import { RealtimeProvider } from "@/providers/realtime-provider";
import { PrefetchProvider } from "@/providers/prefetch-provider";
import { SiteProvider } from "@/contexts/SiteContext";
import { AppShell } from "@/components/features/app-shell/app-shell";
import { MaintenanceScreen } from "@/components/features/maintenance";
import { useMaintenanceStatus } from "@/hooks/maintenance";
import { Button } from "@ui/button";
import {
  isFullMaintenanceMode,
  isMaintenanceBypassed,
} from "@/config/navigation";
import { matchesRoutePrefix, PROTECTED_AUTH_PREFIXES } from "@/config/routes";

/**
 * Tách hook usePathname() vào component con bọc trong <Suspense fallback={null}>
 * để vừa phản ứng chính xác khi SPA chuyển route, vừa tương thích Next.js 16 cacheComponents prerender.
 */
function AuthRouteGuardEffect({
  status,
  mustChange,
}: {
  status: string;
  mustChange: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname() || "";

  useEffect(() => {
    const currentPath =
      pathname ||
      (typeof window !== "undefined" ? window.location.pathname : "");
    const search = typeof window !== "undefined" ? window.location.search : "";
    const isProtected = matchesRoutePrefix(currentPath, PROTECTED_AUTH_PREFIXES);

    if (status === "unauthenticated" && isProtected) {
      router.replace(`/login?next=${encodeURIComponent(`${currentPath}${search}`)}`);
      return;
    }
    if (
      status === "authenticated" &&
      mustChange &&
      currentPath !== "/change-password"
    ) {
      router.replace("/change-password");
    }
  }, [status, mustChange, pathname, router]);

  return null;
}

/**
 * Route guard LỚP 2 (client, chính xác) & scoped auth providers.
 * Tách khỏi app/(auth)/layout.tsx để layout là Server Component chuẩn.
 */
export function AuthLayoutClient({ children }: { children: React.ReactNode }) {
  const { status, user, logout } = useAuth();
  const { t } = useLocale();

  const mustChange = Boolean(user?.mustChangePassword);

  const {
    data: maintenanceStatus,
    refetch: refetchMaintenance,
    isFetching: isRefetchingMaintenance,
  } = useMaintenanceStatus({
    enabled: Boolean(user),
  });

  const isBypassed = isMaintenanceBypassed(user);
  // Chỉ khóa toàn màn hình khi hệ thống ở chế độ bảo trì toàn diện (MAINTENANCE),
  // KHÔNG khóa user thường khi đang ở chế độ READ_ONLY (BE vẫn cho phép xem dữ liệu GET).
  const isFullMaintenance = isFullMaintenanceMode(maintenanceStatus);

  const routeGuard = (
    <Suspense fallback={null}>
      <AuthRouteGuardEffect status={status} mustChange={mustChange} />
    </Suspense>
  );

  // Quan trọng: KHÔNG chặn render children khi loading/unauthenticated —
  // Next 16 (cacheComponents) cần page segment render trong pass prerender,
  // nếu layout chặn thì page bị drop khỏi instant-navigation validation.
  // Trang con tự hiển thị skeleton theo status; redirect ở effect dưới.
  if (!user) {
    return (
      <>
        {routeGuard}
        {children}
      </>
    );
  }

  if (!user.isActive) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6">
        <div className="w-full max-w-md rounded-2xl bg-card p-5 sm:p-8 text-center shadow-[8px_8px_16px_var(--shadow-dark),-8px_-8px_16px_var(--shadow-light)]">
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

  // Chặn người dùng thường khi hệ thống đang bật chế độ bảo trì toàn diện (MAINTENANCE)
  if (isFullMaintenance && !isBypassed) {
    return (
      <MaintenanceScreen
        config={maintenanceStatus}
        onRetry={() => void refetchMaintenance()}
        isRetrying={isRefetchingMaintenance}
      />
    );
  }

  // mustChangePassword → ép người dùng đổi mật khẩu trước khi vào AppShell
  if (mustChange) {
    return (
      <>
        {routeGuard}
        <Suspense
          fallback={
            <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
              <p>{t("guard.skeleton")}</p>
            </div>
          }
        >
          <MustChangePasswordGate skeletonText={t("guard.skeleton")}>
            {children}
          </MustChangePasswordGate>
        </Suspense>
      </>
    );
  }

  return (
    <RealtimeProvider>
      <SiteProvider>
        <PrefetchProvider>
          {routeGuard}
          <AppShell>{children}</AppShell>
        </PrefetchProvider>
      </SiteProvider>
    </RealtimeProvider>
  );
}

function MustChangePasswordGate({
  children,
  skeletonText,
}: {
  children: React.ReactNode;
  skeletonText: string;
}) {
  const pathname = usePathname() || "";
  if (pathname !== "/change-password") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <p>{skeletonText}</p>
      </div>
    );
  }
  return <>{children}</>;
}
