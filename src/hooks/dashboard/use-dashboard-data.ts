"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { incidentService } from "@/services/incident.service";
import { cameraService } from "@/services/camera.service";
import { aiMetricsService } from "@/services/ai-metrics.service";
import { incidentKeys } from "@/hooks/incidents/incident.query-keys";
import { cameraKeys } from "@/hooks/cameras/camera.query-keys";
import { aiMetricsKeys } from "@/hooks/ai-metrics/ai-metrics.query-keys";
import {
  aggregateDashboard,
  collectDashboardPages,
  dashboardPeriod,
  incidentInPeriod,
  pageTotal,
  vietnamToday,
} from "@/lib/dashboard-data";
import type { DashboardPeriod, DashboardPreset } from "@/types/dashboard.types";

export function useDashboardPeriod() {
  const [today, setToday] = useState(() => vietnamToday());
  const [preset, setPreset] = useState<DashboardPreset>("today");
  const [customStart, setCustomStart] = useState(today);
  const [customEnd, setCustomEnd] = useState(today);
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
  model: boolean;
  ready: boolean;
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
    enabled: ready && access.analytics && access.incidents && !!period,
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
    },
    ...polling,
    refetchInterval: 15_000,
  });
  const recentQuery = useQuery({
    queryKey: [...incidentKeys.lists(), "dashboard-recent", scope],
    enabled: ready && access.incidents,
    queryFn: ({ signal }) =>
      incidentService.getIncidents(
        {
          siteId: siteId || undefined,
          page: 1,
          limit: 5,
          sortBy: "detectedAt",
          sortOrder: "desc",
        },
        { signal },
      ),
    ...polling,
    refetchInterval: 15_000,
  });
  const cameraQuery = useQuery({
    queryKey: [...cameraKeys.lists(), "dashboard-catalog", scope],
    enabled: ready && access.cameras,
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
  const onlineQuery = useQuery({
    queryKey: [...cameraKeys.lists(), "dashboard-online", scope],
    enabled: ready && access.cameras,
    queryFn: async ({ signal }) => {
      const page = await cameraService.getCameras(
        { siteId: siteId || undefined, status: "ONLINE", page: 1, limit: 1 },
        { signal },
      );
      const total = pageTotal(page, 1, 1);
      if (total === null) throw new Error("Invalid camera count metadata");
      return total;
    },
    ...polling,
  });
  const modelQuery = useQuery({
    queryKey: [...aiMetricsKeys.activeVersion(), "dashboard", userId],
    enabled: ready && access.model,
    queryFn: ({ signal }) =>
      aiMetricsService.getActiveModelVersion({ signal, strict: true }),
    ...polling,
  });
  const visiblePeriod = visibleQuery(
    periodQuery,
    ready && access.analytics && access.incidents && !!period,
  );
  const analytics = useMemo(
    () =>
      visiblePeriod.data?.complete
        ? aggregateDashboard(visiblePeriod.data.items)
        : null,
    [visiblePeriod.data],
  );
  return {
    periodQuery: visiblePeriod,
    pendingQuery: visibleQuery(pendingQuery, ready && access.incidents),
    recentQuery: visibleQuery(recentQuery, ready && access.incidents),
    cameraQuery: visibleQuery(cameraQuery, ready && access.cameras),
    onlineQuery: visibleQuery(onlineQuery, ready && access.cameras),
    modelQuery: visibleQuery(modelQuery, ready && access.model),
    analytics,
  };
}
