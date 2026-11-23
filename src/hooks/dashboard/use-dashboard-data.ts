"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { incidentService } from "@/services/incident.service";
import { cameraService } from "@/services/camera.service";
import { aiMetricsService } from "@/services/ai-metrics.service";
import { reportingService } from "@/services/reporting.service";
import { incidentKeys } from "@/hooks/incidents/incident.query-keys";
import { cameraKeys } from "@/hooks/cameras/camera.query-keys";
import { aiMetricsKeys } from "@/hooks/ai-metrics/ai-metrics.query-keys";
import { reportingKeys } from "@/hooks/reporting/reporting.query-keys";
import {
  aggregateDashboard,
  collectDashboardPages,
  dashboardPeriod,
  incidentInPeriod,
  pageTotal,
  vietnamToday,
} from "@/lib/dashboard-data";
import {
  clusterIncidentsByPerson,
  type IncidentAggregationMode,
} from "@/lib/incident-cluster-engine";
import type { DashboardPeriod, DashboardPreset } from "@/types/dashboard.types";

export function useDashboardPeriod(initial?: {
  preset?: DashboardPreset | null;
  customStart?: string | null;
  customEnd?: string | null;
}) {
  const [today, setToday] = useState(() => vietnamToday());
  const validPreset =
    initial?.preset &&
    (["today", "7d", "month", "custom"] as const).includes(initial.preset)
      ? initial.preset
      : "today";
  const [preset, setPreset] = useState<DashboardPreset>(validPreset);
  const [customStart, setCustomStart] = useState(
    initial?.customStart || today,
  );
  const [customEnd, setCustomEnd] = useState(initial?.customEnd || today);
  useEffect(() => {
    const update = () => {
      if (!document.hidden) setToday(vietnamToday());
    };
    const timer = setInterval(update, 1000);
    document.addEventListener("visibilitychange", update);
    window.addEventListener("focus", update);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("focus", update);
    };
  }, []);
  const period = useMemo(
    () => dashboardPeriod(preset, today, customStart, customEnd),
    [preset, today, customStart, customEnd],
  );
  return {
    today,
    preset,
    setPreset,
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd,
    period,
  };
}

interface DashboardAccess {
  userId?: string;
  siteId: string | null;
  period: DashboardPeriod | null;
  incidents: boolean;
  analytics: boolean;
  cameras: boolean;
  cameraCatalog?: boolean;
  model: boolean;
  ready: boolean;
  groupingMode?: IncidentAggregationMode;
}

// Retain stale data for transport failures, but never after access is revoked.
function visibleQuery<T>(query: UseQueryResult<T, Error>, enabled: boolean) {
  const denied =
    query.error &&
    "status" in query.error &&
    (query.error.status === 401 || query.error.status === 403);
  return { ...query, data: enabled && !denied ? query.data : undefined };
}

export function useDashboardData(access: DashboardAccess) {
  const { userId, siteId, period, ready } = access;
  const scope = { dashboardUser: userId, siteId };
  const polling = {
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
    retry: false,
  } as const;
  const periodQuery = useQuery({
    queryKey: [...incidentKeys.lists(), "dashboard-period", scope, period],
    enabled: ready && access.incidents && !!period,
    queryFn: ({ signal }) =>
      collectDashboardPages(
        (page, limit) =>
          incidentService.getIncidents(
            {
              siteId: siteId || undefined,
              fromDate: period!.fromDate,
              toDate: period!.toDate,
              page,
              limit,
              sortBy: "detectedAt",
              sortOrder: "desc",
            },
            { signal },
          ),
        { signal, accept: (item) => incidentInPeriod(item, period!, siteId) },
      ),
    ...polling,
  });
  const pendingQuery = useQuery({
    queryKey: [...incidentKeys.lists(), "dashboard-pending", scope],
    enabled: ready && access.incidents,
    queryFn: async ({ signal }) => {
      try {
        const counts = await incidentService.getStatusCounts({
          siteId: siteId || undefined,
        });
        return counts.pendingReview;
      } catch {
        const page = await incidentService.getIncidents(
          {
            siteId: siteId || undefined,
            status: "PENDING_REVIEW",
            page: 1,
            limit: 1,
          },
          { signal },
        );
        const total = pageTotal(page, 1, 1);
        if (total === null) throw new Error("Invalid incident count metadata");
        return total;
      }
    },
    ...polling,
    refetchInterval: 15_000,
  });
  const recentQuery = useQuery({
    queryKey: [...incidentKeys.lists(), "dashboard-unresolved", scope],
    enabled: ready && access.incidents,
    queryFn: async ({ signal }) => {
      const [pendingPage, confirmedPage] = await Promise.all([
        incidentService.getIncidents(
          {
            siteId: siteId || undefined,
            status: "PENDING_REVIEW",
            page: 1,
            limit: 100,
            sortBy: "detectedAt",
            sortOrder: "desc",
          },
          { signal },
        ),
        incidentService.getIncidents(
          {
            siteId: siteId || undefined,
            status: "CONFIRMED",
            page: 1,
            limit: 100,
            sortBy: "detectedAt",
            sortOrder: "desc",
          },
          { signal },
        ),
      ]);

      const mergedMap = new Map<string, (typeof pendingPage.items)[number]>();
      for (const item of [...pendingPage.items, ...confirmedPage.items]) {
        mergedMap.set(item.id, item);
      }

      return {
        items: [...mergedMap.values()],
        totalPending: pendingPage.meta?.total ?? pendingPage.items.length,
        totalConfirmed: confirmedPage.meta?.total ?? confirmedPage.items.length,
      };
    },
    ...polling,
    refetchInterval: 15_000,
  });
  const dashboardKpiQuery = useQuery({
    queryKey: [...reportingKeys.dashboardKpi(siteId), "dashboard", userId],
    // BE GET /statistics/dashboard-kpi yêu cầu chặt quyền PPE_REPORTING_READ (access.analytics)
    enabled: ready && access.analytics,
    queryFn: () => reportingService.getDashboardKpi(siteId || undefined),
    ...polling,
  });
  const recentNeedsCameraName = (recentQuery.data?.items ?? []).some(
    (inc) => !inc.cameraName && !!inc.cameraId,
  );
  const cameraQuery = useQuery({
    queryKey: [...cameraKeys.lists(), "dashboard-catalog", scope],
    enabled:
      ready &&
      access.cameras &&
      ((access.cameraCatalog ?? true) || recentNeedsCameraName),
    queryFn: ({ signal }) =>
      collectDashboardPages(
        (page, limit) =>
          cameraService.getCameras(
            { siteId: siteId || undefined, page, limit },
            { signal },
          ),
        { signal, accept: (item) => !siteId || item.siteId === siteId },
      ),
    ...polling,
  });
  const cameraCountsQuery = useQuery({
    queryKey: [...cameraKeys.statusCounts(siteId), "dashboard", userId],
    enabled: ready && access.cameras,
    queryFn: async ({ signal }) => {
      try {
        return await cameraService.getStatusCounts(siteId || undefined);
      } catch {
        const [allPage, onlinePage] = await Promise.all([
          cameraService.getCameras(
            { siteId: siteId || undefined, page: 1, limit: 1 },
            { signal },
          ),
          cameraService.getCameras(
            { siteId: siteId || undefined, status: "ONLINE", page: 1, limit: 1 },
            { signal },
          ),
        ]);
        const total = pageTotal(allPage, 1, 1);
        const online = pageTotal(onlinePage, 1, 1);
        if (total === null || online === null) {
          throw new Error("Invalid camera count metadata");
        }
        return {
          total,
          online,
          offline: Math.max(0, total - online),
        };
      }
    },
    ...polling,
  });
  const modelQuery = useQuery({
    queryKey: [...aiMetricsKeys.activeVersion(), "dashboard", userId],
    enabled: ready && access.model,
    queryFn: async ({ signal }) => {
      try {
        return await aiMetricsService.getActiveModelVersion({
          signal,
          strict: true,
        });
      } catch (err) {
        if (
          err &&
          typeof err === "object" &&
          "status" in err &&
          err.status === 404
        ) {
          return null;
        }
        throw err;
      }
    },
    ...polling,
  });
  const modelsQuery = useQuery({
    queryKey: [...aiMetricsKeys.models(), "dashboard", userId],
    enabled: ready && access.model,
    queryFn: () => aiMetricsService.getAiModels(),
    ...polling,
  });
  const visiblePeriod = visibleQuery(
    periodQuery,
    ready && access.incidents && !!period,
  );
  const visibleCameraCounts = visibleQuery(
    cameraCountsQuery,
    ready && access.cameras,
  );
  const onlineQuery = useMemo(
    () => ({
      ...visibleCameraCounts,
      data: visibleCameraCounts.data?.online,
    }),
    [visibleCameraCounts],
  );
  const groupingMode: IncidentAggregationMode =
    access.groupingMode ?? "clustered";
  const analytics = useMemo(() => {
    if (!visiblePeriod.data?.complete) return null;
    return aggregateDashboard(visiblePeriod.data.items, { mode: groupingMode });
  }, [visiblePeriod.data, groupingMode]);
  const visibleRecent = visibleQuery(recentQuery, ready && access.incidents);
  const unresolvedClusters = useMemo(() => {
    const items = visibleRecent.data?.items ?? [];
    if (items.length === 0) return [];
    return clusterIncidentsByPerson(items);
  }, [visibleRecent.data?.items]);
  return {
    periodQuery: visiblePeriod,
    pendingQuery: visibleQuery(pendingQuery, ready && access.incidents),
    recentQuery: visibleRecent,
    unresolvedClusters,
    cameraQuery: visibleQuery(cameraQuery, ready && access.cameras),
    cameraCountsQuery: visibleCameraCounts,
    onlineQuery,
    dashboardKpiQuery: visibleQuery(
      dashboardKpiQuery,
      ready && access.analytics,
    ),
    modelQuery: visibleQuery(modelQuery, ready && access.model),
    modelsQuery: visibleQuery(modelsQuery, ready && access.model),
    analytics,
  };
}
