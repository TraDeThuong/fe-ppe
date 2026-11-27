"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  hasRouteAccess,
  isAdminRole,
  isFullMaintenanceMode,
  isMaintenanceBypassed,
} from "@/config/navigation";
import { MaintenanceAdminBanner } from "@/components/features/maintenance";
import { useMaintenanceStatus } from "@/hooks/maintenance";
import { SidebarBadgesProvider } from "@/hooks/app-shell";
import { NavigationProgressBar } from "@/components/ui/navigation-progress-bar";
import { AppSidebar } from "./app-sidebar";
import { AppHeader } from "./app-header";
import { ForbiddenView } from "./forbidden-view";
import { MobileTabBar } from "./mobile-tab-bar";
import { MobileChromeProvider } from "./mobile-chrome-context";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { data: maintenanceStatus } = useMaintenanceStatus();

  const isBypassed = isMaintenanceBypassed(user);
  const isMaintenanceActive = Boolean(maintenanceStatus?.enabled);
  const isFullMaintenance = isFullMaintenanceMode(maintenanceStatus);
  const canManageMaintenance = Boolean(
    isAdminRole(user?.role) || user?.permissions?.includes("MAINTENANCE_MANAGE"),
  );
  const maintenanceLocked = isFullMaintenance && canManageMaintenance;
  const isReadOnlyMode = isMaintenanceActive && maintenanceStatus?.status === "READ_ONLY";
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
    <MobileChromeProvider>
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
          {((isMaintenanceActive && isBypassed) || isReadOnlyMode) && (
            <MaintenanceAdminBanner />
          )}
          <AppHeader maintenanceLocked={maintenanceLocked} />

          <main
            data-page-scroll
            className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden bg-background px-3 pb-8 pt-3 sm:p-6 lg:p-8"
          >
            {maintenanceLocked && !isMaintenanceRoute ? null : forbidden ? (
              <ForbiddenView />
            ) : (
              children
            )}
          </main>

          {/* Mobile (< 768px): thanh tab ở đáy thay menu ☰ */}
          <MobileTabBar maintenanceLocked={maintenanceLocked} />
        </div>
      </div>
    </MobileChromeProvider>
    </SidebarBadgesProvider>
  );
}
