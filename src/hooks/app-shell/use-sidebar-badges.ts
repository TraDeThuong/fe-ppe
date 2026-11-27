"use client";

import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useSite } from "@/contexts/SiteContext";
import { useLocale } from "@/providers/locale-provider";
import { useIncidentStatusCounts } from "@/hooks/incidents";
import { useUnreadCount } from "@/hooks/notifications";
import { useCameraStatusCounts } from "@/hooks/cameras";
import { useReportHistory } from "@/hooks/reporting";
import { useAuditLogs } from "@/hooks/audit";
import { useMaintenanceStatus } from "@/hooks/maintenance";
import { useCronJobs } from "@/hooks/cron";
import {
  computeSidebarBadges,
  type SidebarBadgesMap,
} from "@/lib/sidebar-badges";
import {
  getNavLastSeenAt,
  markNavAsSeen,
} from "@/lib/sidebar-seen-store";

const SidebarBadgesContext = createContext<SidebarBadgesMap | null>(null);

function useComputeSidebarBadges(): SidebarBadgesMap {
  const { user, status } = useAuth();
  const { siteId } = useSite();
  const { t } = useLocale();
  const pathname = usePathname();

  const isAuthenticated = status === "authenticated" && Boolean(user);
  const permissions = useMemo(
    () => user?.permissions ?? [],
    [user?.permissions],
  );
  const can = (permission: string) =>
    isAuthenticated && permissions.includes(permission);

  const canIncidents = can("PPE_INCIDENT_READ");
  const canNotifications = can("NOTIFICATION_READ");
  const canCameras = can("PPE_CAMERA_READ");
  const canReports = can("PPE_REPORTING_READ");
  const canAudit = can("AUDIT_LOG_READ");
  const canMaintenance = can("MAINTENANCE_MANAGE");
  const canCron = can("CRON_JOB_READ");

  const [seenTick, setSeenTick] = useState(0);
  const [reportsLastSeenAt, setReportsLastSeenAt] = useState<number | null>(
    null,
  );
  const [auditLastSeenAt, setAuditLastSeenAt] = useState<number | null>(null);

  // Hydrate & cập nhật mốc "đã xem" khi người dùng truy cập /reports hoặc /audit-logs
  useEffect(() => {
    if (!user?.id) {
      setReportsLastSeenAt(null);
      setAuditLastSeenAt(null);
      return;
    }

    if (pathname === "/reports" || pathname.startsWith("/reports/")) {
      const ts = markNavAsSeen(user.id, "reports");
      setReportsLastSeenAt(ts);
    } else {
      setReportsLastSeenAt(getNavLastSeenAt(user.id, "reports"));
    }

    if (pathname === "/audit-logs" || pathname.startsWith("/audit-logs/")) {
      const ts = markNavAsSeen(user.id, "auditLogs");
      setAuditLastSeenAt(ts);
    } else {
      setAuditLastSeenAt(getNavLastSeenAt(user.id, "auditLogs"));
    }

    setSeenTick((v) => v + 1);
  }, [pathname, user?.id]);

  const incidentCountsQuery = useIncidentStatusCounts(siteId, {
    enabled: canIncidents,
  });

  const unreadNotificationsQuery = useUnreadCount({
    enabled: canNotifications,
  });

  const cameraCountsQuery = useCameraStatusCounts(siteId, {
    enabled: canCameras,
  });

  const reportHistoryQuery = useReportHistory(
    { page: 1, limit: 15 },
    {
      enabled: canReports,
      staleTime: 60 * 1000,
    },
  );

  const auditFailedQuery = useAuditLogs(
    { page: 1, limit: 20 },
    {
      enabled: canAudit,
      staleTime: 60 * 1000,
      refetchInterval: 2 * 60 * 1000,
      refetchIntervalInBackground: false,
    },
  );

  const maintenanceQuery = useMaintenanceStatus({
    enabled: canMaintenance,
  });

  const cronJobsQuery = useCronJobs(canCron);

  return useMemo(() => {
    void seenTick;
    return computeSidebarBadges({
      permissions: isAuthenticated ? permissions : [],
      pendingIncidentsCount: incidentCountsQuery.data?.pendingReview ?? 0,
      unreadNotificationsCount: unreadNotificationsQuery.data ?? 0,
      offlineCamerasCount: cameraCountsQuery.data?.offline ?? 0,
      reportHistory: reportHistoryQuery.data?.items,
      reportsLastSeenAt,
      failedAuditLogs: auditFailedQuery.data?.items,
      auditLastSeenAt,
      maintenanceEnabled: Boolean(maintenanceQuery.data?.enabled),
      cronJobs: cronJobsQuery.data,
      formatLabel: (key, count) => t(key, { count }),
    });
  }, [
    seenTick,
    isAuthenticated,
    permissions,
    incidentCountsQuery.data?.pendingReview,
    unreadNotificationsQuery.data,
    cameraCountsQuery.data?.offline,
    reportHistoryQuery.data?.items,
    reportsLastSeenAt,
    auditFailedQuery.data?.items,
    auditLastSeenAt,
    maintenanceQuery.data?.enabled,
    cronJobsQuery.data,
    t,
  ]);
}

/**
 * Provider đặt tại AppShell để AppSidebar, MobileTabBar và MobileMoreSheet dùng chung
 * đúng một tập subscription/query thay vì nhân đôi.
 */
export function SidebarBadgesProvider({ children }: { children: ReactNode }) {
  const badges = useComputeSidebarBadges();
  return createElement(
    SidebarBadgesContext.Provider,
    { value: badges },
    children,
  );
}

/**
 * Trả về bản đồ badge theo từng NavItem key cho Sidebar.
 */
export function useSidebarBadges(): SidebarBadgesMap {
  const context = useContext(SidebarBadgesContext);
  if (context !== null) {
    return context;
  }
  return {};
}
