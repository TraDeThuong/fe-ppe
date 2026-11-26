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
  buildDashboardAnalyticsFromReporting,
  collectDashboardPages,
  dashboardPeriod,
  normalizeDashboardTrends,
  pageTotal,
  resolveDashboardTrendsWindow,
  summarizeAiPerformanceTelemetry,
  vietnamToday,
} from "@/lib/dashboard-data";
import {
  clusterIncidentsByPerson,
  type IncidentAggregationMode,
} from "@/lib/incident-cluster-engine";
import type {
  DashboardPeriod,
  DashboardPreset,
  DashboardTrendGroupBy,
} from "@/types/dashboard.types";

const LIVE_INCIDENTS_QUEUE_LIMIT = 15;

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
    const timer = setInterval(update, 60_000);
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
  activeTab: "overview" | "safety" | "devices";
  incidents: boolean;
  analytics: boolean;
  cameras: boolean;
  cameraCatalog?: boolean;
  model: boolean;
  aiMetrics?: boolean;
  ready: boolean;
  groupingMode?: IncidentAggregationMode;
  trendGroupBy?: DashboardTrendGroupBy;
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
  const statsFilter = useMemo(
    () =>
      period
        ? {
            ...(siteId ? { siteId } : {}),
            startDate: period.startDate,
            endDate: period.endDate,
          }
        : undefined,
    [siteId, period],
  );
  const summaryQuery = useQuery({
    queryKey: [...reportingKeys.summary(statsFilter), "dashboard", userId],
    enabled: ready && access.analytics && !!statsFilter,
    queryFn: ({ signal }) =>
      reportingService.getSummary(statsFilter, {
        signal,
        suppressToast: true,
        strict: true,
      }),
    ...polling,
  });
  const violationQuery = useQuery({
    queryKey: [...reportingKeys.distribution(statsFilter), "dashboard", userId],
    enabled: ready && access.analytics && !!statsFilter,
    queryFn: ({ signal }) =>
      reportingService.getViolationDistribution(statsFilter, {
        signal,
        suppressToast: true,
      }),
    ...polling,
  });
  const hourlyRiskParams = useMemo(
    () =>
      period
        ? {
            ...(siteId ? { siteId } : {}),
            startDate: period.startDate,
            endDate: period.endDate,
          }
        : undefined,
    [siteId, period],
  );
  const canLoadHourlyRisk =
    ready &&
    access.analytics &&
    access.activeTab === "safety" &&
    !!hourlyRiskParams;
  const hourlyRiskQuery = useQuery({
    queryKey: [
      ...reportingKeys.hourlyRisk(hourlyRiskParams),
      "dashboard",
      userId,
    ],
    enabled: canLoadHourlyRisk,
    queryFn: ({ signal }) =>
      reportingService.getHourlyRisk(hourlyRiskParams, {
        signal,
        suppressToast: true,
      }),
    ...polling,
  });
  const cameraRankingsParams = useMemo(
    () => (statsFilter ? { ...statsFilter, limit: 50 } : undefined),
    [statsFilter],
  );
  const canLoadCameraRankings =
    ready &&
    access.analytics &&
    access.activeTab === "devices" &&
    !!cameraRankingsParams;
  const cameraRankingsQuery = useQuery({
    queryKey: [
      ...reportingKeys.rankings(cameraRankingsParams),
      "dashboard",
      userId,
    ],
    enabled: canLoadCameraRankings,
    queryFn: ({ signal }) =>
      reportingService.getCameraRankings(cameraRankingsParams, {
        signal,
        suppressToast: true,
      }),
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
            limit: LIVE_INCIDENTS_QUEUE_LIMIT,
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
            limit: LIVE_INCIDENTS_QUEUE_LIMIT,
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
  const trendGroupBy: DashboardTrendGroupBy = access.trendGroupBy ?? "DAY";
  const trendsWindow = useMemo(
    () => resolveDashboardTrendsWindow(period, trendGroupBy),
    [period, trendGroupBy],
  );
  const trendsParams = useMemo(
    () =>
      trendsWindow
        ? {
            ...(siteId ? { siteId } : {}),
            startDate: trendsWindow.startDate,
            endDate: trendsWindow.endDate,
            groupBy: trendsWindow.groupBy,
          }
        : undefined,
    [siteId, trendsWindow],
  );
  const trendsQuery = useQuery({
    queryKey: [...reportingKeys.trends(trendsParams), "dashboard", userId],
    enabled: ready && access.analytics && !!trendsWindow,
    queryFn: ({ signal }) =>
      reportingService.getTrends(trendsParams, {
        signal,
        suppressToast: true,
      }),
    ...polling,
  });
  const aiPerfParams = useMemo(
    () =>
      period
        ? {
            startDate: period.startDate,
            endDate: period.endDate,
          }
        : undefined,
    [period],
  );
  const aiPerformanceQuery = useQuery({
    queryKey: [
      ...reportingKeys.aiPerformance(aiPerfParams),
      "dashboard",
      userId,
    ],
    enabled: ready && Boolean(access.aiMetrics) && !!period,
    queryFn: ({ signal }) =>
      reportingService.getAiPerformance(aiPerfParams, {
        signal,
        suppressToast: true,
      }),
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
  const visibleSummary = visibleQuery(
    summaryQuery,
    ready && access.analytics && !!statsFilter,
  );
  const visibleViolation = visibleQuery(
    violationQuery,
    ready && access.analytics && !!statsFilter,
  );
  const visibleHourlyRisk = visibleQuery(
    hourlyRiskQuery,
    ready && access.analytics && !!hourlyRiskParams,
  );
  const visibleCameraRankings = visibleQuery(
    cameraRankingsQuery,
    ready && access.analytics && !!cameraRankingsParams,
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
  const analytics = useMemo(() => {
    if (!visibleSummary.data) return null;
    return buildDashboardAnalyticsFromReporting({
      summary: visibleSummary.data,
      violations: visibleViolation.data,
      hourlyRisk: visibleHourlyRisk.data,
      cameraRankings: visibleCameraRankings.data,
    });
  }, [
    visibleSummary.data,
    visibleViolation.data,
    visibleHourlyRisk.data,
    visibleCameraRankings.data,
  ]);
  const visiblePeriod = useMemo(
    () => ({
      ...visibleSummary,
      data: visibleSummary.data
        ? {
            total: analytics?.total ?? visibleSummary.data.totalIncidents,
            complete: true as const,
            issue: null,
          }
        : undefined,
      refetch: async () => {
        const [summaryRes] = await Promise.all([
          summaryQuery.refetch(),
          violationQuery.refetch(),
          ...(canLoadHourlyRisk ? [hourlyRiskQuery.refetch()] : []),
          ...(canLoadCameraRankings ? [cameraRankingsQuery.refetch()] : []),
          trendsQuery.refetch(),
        ]);
        return summaryRes;
      },
    }),
    [
      visibleSummary,
      analytics?.total,
      summaryQuery,
      violationQuery,
      canLoadHourlyRisk,
      canLoadCameraRankings,
      hourlyRiskQuery,
      cameraRankingsQuery,
      trendsQuery,
    ],
  );
  const visibleRecent = visibleQuery(recentQuery, ready && access.incidents);
  const visibleDashboardKpi = visibleQuery(
    dashboardKpiQuery,
    ready && access.analytics,
  );
  const visibleModel = visibleQuery(modelQuery, ready && access.model);
  const visibleModels = visibleQuery(modelsQuery, ready && access.model);
  const visibleTrends = visibleQuery(
    trendsQuery,
    ready && access.analytics && !!trendsWindow,
  );
  const visibleAiPerformance = visibleQuery(
    aiPerformanceQuery,
    ready && Boolean(access.aiMetrics) && !!period,
  );
  const trends = useMemo(
    () => normalizeDashboardTrends(visibleTrends.data ?? [], trendsWindow),
    [visibleTrends.data, trendsWindow],
  );
  const aiTelemetry = useMemo(
    () =>
      summarizeAiPerformanceTelemetry(
        visibleAiPerformance.data,
        visibleModel.data,
        visibleDashboardKpi.data?.activeModel ?? null,
      ),
    [
      visibleAiPerformance.data,
      visibleModel.data,
      visibleDashboardKpi.data?.activeModel,
    ],
  );
  const unresolvedClusters = useMemo(() => {
    const items = visibleRecent.data?.items ?? [];
    if (items.length === 0) return [];
    return clusterIncidentsByPerson(items);
  }, [visibleRecent.data?.items]);
  return {
    periodQuery: visiblePeriod,
    summaryQuery: visibleSummary,
    violationQuery: visibleViolation,
    hourlyRiskQuery: visibleHourlyRisk,
    cameraRankingsQuery: visibleCameraRankings,
    pendingQuery: visibleQuery(pendingQuery, ready && access.incidents),
    recentQuery: visibleRecent,
    unresolvedClusters,
    cameraQuery: visibleQuery(cameraQuery, ready && access.cameras),
    cameraCountsQuery: visibleCameraCounts,
    onlineQuery,
    dashboardKpiQuery: visibleDashboardKpi,
    trendsQuery: visibleTrends,
    trendsWindow,
    trends,
    aiPerformanceQuery: visibleAiPerformance,
    aiTelemetry,
    modelQuery: visibleModel,
    modelsQuery: visibleModels,
    analytics,
  };
}
