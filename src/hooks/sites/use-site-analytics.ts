"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { incidentKeys } from "@/hooks/incidents/incident.query-keys";
import { incidentService } from "@/services/incident.service";
import { incidentInPeriod, vietnamToday } from "@/lib/dashboard-data";
import {
  aggregateSiteAnalytics, aggregateSiteHourlyRisk, analyticsPeriod,
  collectAnalyticsIncidents, isAccessError, type AnalyticsGroupBy,
} from "@/lib/site-analytics-data";
import type { DashboardPeriod } from "@/types/dashboard.types";

export function useAnalyticsToday() {
  const [today, setToday] = useState(vietnamToday);
  useEffect(() => {
    const update = () => { if (!document.hidden) setToday(vietnamToday()); };
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

export function siteAnalyticsQueryOptions(userId: string | undefined, siteId: string, period: DashboardPeriod | null, enabled: boolean) {
  return {
    queryKey: [...incidentKeys.lists(), "site-analytics", { userId, siteId, period }],
    enabled: enabled && !!userId && !!siteId && !!period,
    queryFn: ({ signal }: { signal: AbortSignal }) => collectAnalyticsIncidents(
      (page, limit) => incidentService.getIncidents({
        siteId, fromDate: period!.fromDate, toDate: period!.toDate,
        page, limit, sortBy: "detectedAt", sortOrder: "desc",
      }, { signal }),
      (id) => incidentService.getIncidentById(id, { signal }),
      period!, siteId, signal,
    ),
    staleTime: 10_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: false,
  } as const;
}

export function useSiteAnalytics(params: {
  userId?: string; siteId: string; startDate: string; endDate: string;
  hourlyDate: string; groupBy: AnalyticsGroupBy; enabled: boolean; today: string;
}) {
  const { userId, siteId, startDate, endDate, hourlyDate, groupBy, enabled, today } = params;
  const period = useMemo(() => analyticsPeriod(startDate, endDate, today), [startDate, endDate, today]);
  const hourPeriod = useMemo(() => analyticsPeriod(hourlyDate, hourlyDate, today), [hourlyDate, today]);
  const periodQuery = useQuery(siteAnalyticsQueryOptions(userId, siteId, period, enabled));
  const inPeriod = !!period && !!hourPeriod && hourlyDate >= period.startDate && hourlyDate <= period.endDate;
  const reusePeriod = enabled && inPeriod && !periodQuery.error && !!periodQuery.data?.complete;
  // Wait for an in-range period's initial load before requesting the same day again.
  const waitingForPeriod = inPeriod && periodQuery.isPending && periodQuery.isFetching;
  const hourlyQuery = useQuery(siteAnalyticsQueryOptions(userId, siteId, hourPeriod,
    enabled && !reusePeriod && !waitingForPeriod && !isAccessError(periodQuery.error),
  ));
  const collection = enabled && period && !periodQuery.error ? periodQuery.data : undefined;
  const analytics = useMemo(() => collection?.complete && period
    ? aggregateSiteAnalytics(collection.items, period, groupBy) : null,
    [collection, period, groupBy]);
  const hourSource = reusePeriod || waitingForPeriod || isAccessError(periodQuery.error) ? periodQuery : hourlyQuery;
  const hourly = useMemo(() => {
    if (!enabled || !hourPeriod || hourSource.error || !hourSource.data?.complete) return null;
    const items = reusePeriod
      ? hourSource.data.items.filter((item) => incidentInPeriod(item, hourPeriod, siteId))
      : hourSource.data.items;
    return aggregateSiteHourlyRisk(items);
  }, [enabled, hourPeriod, hourSource.data, hourSource.error, reusePeriod, siteId]);
  return { period, hourPeriod, periodQuery, hourSource, analytics, hourly };
}
