"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportingKeys } from "@/hooks/reporting/reporting.query-keys";
import { vietnamToday } from "@/lib/dashboard-data";
import {
  analyticsPeriod,
  buildSiteHourlyRiskFromStatistics,
  fetchSiteStatisticsAnalytics,
  isAccessError,
  type AnalyticsGroupBy,
  type SiteAnalytics,
  type SiteHourlyRisk,
} from "@/lib/site-analytics-data";
import { reportingService } from "@/services/reporting.service";
import type { DashboardPeriod } from "@/types/dashboard.types";

export function useAnalyticsToday() {
  const [today, setToday] = useState(vietnamToday);
  useEffect(() => {
    const update = () => {
      if (!document.hidden) setToday(vietnamToday());
    };
    const timer = setInterval(update, 60_000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return today;
}

export function siteAnalyticsQueryOptions(
  userId: string | undefined,
  siteId: string,
  period: DashboardPeriod | null,
  groupBy: AnalyticsGroupBy,
  enabled: boolean,
) {
  return {
    queryKey: [
      ...reportingKeys.all,
      "site-analytics",
      {
        userId,
        siteId,
        startDate: period?.startDate,
        endDate: period?.endDate,
        groupBy,
      },
    ],
    enabled: enabled && !!userId && !!siteId && !!period,
    queryFn: ({ signal }: { signal: AbortSignal }): Promise<SiteAnalytics> =>
      fetchSiteStatisticsAnalytics({
        siteId,
        period: period!,
        groupBy,
        signal,
        deps: {
          getSummary: reportingService.getSummary,
          getTrends: reportingService.getTrends,
          getViolationDistribution: reportingService.getViolationDistribution,
        },
      }),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: false,
  } as const;
}

export function siteHourlyRiskQueryOptions(
  userId: string | undefined,
  siteId: string,
  hourPeriod: DashboardPeriod | null,
  enabled: boolean,
) {
  return {
    queryKey: [
      ...reportingKeys.all,
      "site-hourly-risk",
      { userId, siteId, date: hourPeriod?.startDate },
    ],
    enabled: enabled && !!userId && !!siteId && !!hourPeriod,
    queryFn: async ({ signal }: { signal: AbortSignal }): Promise<SiteHourlyRisk> => {
      const dto = await reportingService.getHourlyRisk(
        {
          siteId,
          date: hourPeriod!.startDate,
        },
        { signal, suppressToast: true, strict: true },
      );
      return buildSiteHourlyRiskFromStatistics(dto);
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: false,
  } as const;
}

export function useSiteAnalytics(params: {
  userId?: string;
  siteId: string;
  startDate: string;
  endDate: string;
  hourlyDate: string;
  groupBy: AnalyticsGroupBy;
  enabled: boolean;
  today: string;
}) {
  const { userId, siteId, startDate, endDate, hourlyDate, groupBy, enabled, today } =
    params;
  const period = useMemo(
    () => analyticsPeriod(startDate, endDate, today),
    [startDate, endDate, today],
  );
  const hourPeriod = useMemo(
    () => analyticsPeriod(hourlyDate, hourlyDate, today),
    [hourlyDate, today],
  );

  const periodQuery = useQuery(
    siteAnalyticsQueryOptions(userId, siteId, period, groupBy, enabled),
  );
  const hourSource = useQuery(
    siteHourlyRiskQueryOptions(
      userId,
      siteId,
      hourPeriod,
      enabled && !isAccessError(periodQuery.error),
    ),
  );

  const analytics =
    enabled && period && !periodQuery.error ? (periodQuery.data ?? null) : null;
  const hourly =
    enabled && hourPeriod && !hourSource.error ? (hourSource.data ?? null) : null;

  return { period, hourPeriod, periodQuery, hourSource, analytics, hourly };
}
