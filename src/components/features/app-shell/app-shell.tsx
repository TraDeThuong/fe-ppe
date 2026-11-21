"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { hasRouteAccess, isFullMaintenanceMode } from "@/config/navigation";
import { MaintenanceAdminBanner } from "@/components/features/maintenance";
import { useMaintenanceStatus } from "@/hooks/maintenance";
import { SidebarBadgesProvider } from "@/hooks/app-shell";
import { NavigationProgressBar } from "@/components/ui/navigation-progress-bar";
import { AppSidebar } from "./app-sidebar";
import { AppHeader } from "./app-header";
import { ForbiddenView } from "./forbidden-view";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { data: maintenanceStatus } = useMaintenanceStatus();

  const isBypassed = Boolean(
    user?.role === "ADMIN" ||
      user?.permissions?.includes("MAINTENANCE_MANAGE") ||
      user?.permissions?.includes("MAINTENANCE_BYPASS"),
  );
  const isMaintenanceActive = Boolean(maintenanceStatus?.enabled);
  const isFullMaintenance = isFullMaintenanceMode(maintenanceStatus);
  const canManageMaintenance = hasRouteAccess(
    "/maintenance",
    user?.permissions ?? [],
    user?.role,
  );
  const maintenanceLocked = isFullMaintenance && canManageMaintenance;
  const isMaintenanceRoute =
    pathname === "/maintenance" || pathname.startsWith("/maintenance/");

  useEffect(() => {
    if (maintenanceLocked && !isMaintenanceRoute) {
      router.replace("/maintenance");
    }
  }, [maintenanceLocked, isMaintenanceRoute, router]);

  const forbidden = !hasRouteAccess(
    pathname,
    user?.permissions ?? [],
    user?.role,
  );

  return (
    <SidebarBadgesProvider>
      <div className="flex h-[100dvh] overflow-hidden bg-background">
        {/* Top navigation progress bar */}
        <Suspense fallback={null}>
          <NavigationProgressBar />
        </Suspense>

        {/* Desktop sidebar */}
        <div className="hidden md:flex">
          <AppSidebar maintenanceLocked={maintenanceLocked} />
        </div>

        {/* Desktop vertical transition */}
        <div
          aria-hidden="true"
          className="
            relative z-20 hidden h-full w-4 shrink-0
            border-l border-white/95
            bg-gradient-to-r from-[var(--shadow-dark)]/50
            via-[var(--shadow-dark)]/15 to-transparent
            shadow-[inset_2px_0_5px_-1px_rgba(0,0,0,0.08)]
            dark:border-white/20
            md:flex lg:w-5
          "
        />

        {/* Main content */}
        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          {isMaintenanceActive && isBypassed && <MaintenanceAdminBanner />}
          <AppHeader maintenanceLocked={maintenanceLocked} />

          <main
            data-page-scroll
            className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden bg-background p-3 sm:p-6 lg:p-8"
          >
            {maintenanceLocked && !isMaintenanceRoute ? null : forbidden ? (
              <ForbiddenView />
            ) : (
              children
            )}
          </main>
        </div>
      </div>
    </SidebarBadgesProvider>
  );
}
