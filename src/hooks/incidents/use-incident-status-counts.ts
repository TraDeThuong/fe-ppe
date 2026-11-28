"use client";

import { useEffect } from "react";
import {
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { useRealtime } from "@/contexts/RealtimeContext";
import {
  fetchFilteredStatusCounts,
  fetchIncidentBreakdown,
  hasExtendedCountFilters,
  pickStatusCountsFilters,
  withDerivedCounts,
  type IncidentBreakdown,
} from "@/lib/incident-counts";
import { incidentService } from "@/services/incident.service";
import type { IncidentStatusCounts } from "@/types";
import {
  incidentKeys,
  type IncidentStatusCountsQueryParams,
} from "./incident.query-keys";

export type IncidentStatusCountsResult = IncidentStatusCounts;

export type UseIncidentStatusCountsOptions = Omit<
  UseQueryOptions<IncidentStatusCountsResult, Error>,
  "queryKey" | "queryFn"
>;

function isRateLimitError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "status" in error &&
      Number((error as { status?: unknown }).status) === 429,
  );
}

function normalizeStatusCountsParams(
  siteIdOrParams?: string | null | IncidentStatusCountsQueryParams,
): IncidentStatusCountsQueryParams {
  if (typeof siteIdOrParams === "string" || siteIdOrParams == null) {
    return { siteId: siteIdOrParams || undefined };
  }
  return { ...siteIdOrParams, siteId: siteIdOrParams.siteId || undefined };
}

async function fetchStatusCounts(
  params: IncidentStatusCountsQueryParams,
  signal?: AbortSignal,
): Promise<IncidentStatusCountsResult> {
  const filters = { ...params, siteId: params.siteId || undefined };
  if (hasExtendedCountFilters(filters)) {
    return fetchFilteredStatusCounts(
      (query) => incidentService.getIncidents(query, { signal, suppressToast: true }),
      filters,
    );
  }
  const counts = await incidentService.getStatusCounts(
    pickStatusCountsFilters(filters),
    { signal, suppressToast: true },
  );
  return withDerivedCounts(counts);
}

/**
 * Lấy bộ đếm trạng thái sự cố khớp với bộ lọc của danh sách.
 * Không lọc thêm → 1 request `/incidents/status-counts`; có tìm kiếm / mức độ / loại vi phạm /
 * người được giao → đếm bằng `meta.total` (BE develop bỏ qua các bộ lọc này ở status-counts).
 * Tự động đồng bộ (có debounce 1.5s) khi nhận sự kiện SSE từ RealtimeContext.
 */
export function useIncidentStatusCounts(
  siteIdOrParams?: string | null | IncidentStatusCountsQueryParams,
  options?: UseIncidentStatusCountsOptions,
) {
  const queryClient = useQueryClient();
  const { lastAlert, isConnected } = useRealtime();
  const normalizedParams = normalizeStatusCountsParams(siteIdOrParams);

  const query = useQuery<IncidentStatusCountsResult, Error>({
    queryKey: incidentKeys.statusCounts(normalizedParams),
    queryFn: ({ signal }) => fetchStatusCounts(normalizedParams, signal),
    staleTime: 30 * 1000,
    refetchInterval: (q) =>
      isRateLimitError(q.state.error)
        ? false
        : isConnected
          ? 60 * 1000
          : 30 * 1000,
    refetchIntervalInBackground: false,
    retry: false,
    ...options,
  });

  useEffect(() => {
    if (!lastAlert) return;
    if (options?.enabled === false) return;

    const timer = setTimeout(() => {
      void queryClient.invalidateQueries({
        queryKey: incidentKeys.statusCountsRoot(),
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [lastAlert, options?.enabled, queryClient]);

  return query;
}

/**
 * Phân bố theo mức độ và loại vi phạm cho panel thống kê — chỉ tải khi panel mở.
 * Key nằm dưới `statusCountsRoot` nên được làm mới cùng bộ đếm khi có sự cố mới.
 */
export function useIncidentBreakdown(
  params: IncidentStatusCountsQueryParams,
  options?: { enabled?: boolean },
) {
  const normalizedParams = normalizeStatusCountsParams(params);
  return useQuery<IncidentBreakdown, Error>({
    queryKey: incidentKeys.breakdown(normalizedParams),
    queryFn: ({ signal }) =>
      fetchIncidentBreakdown(
        (query) => incidentService.getIncidents(query, { signal, suppressToast: true }),
        { ...normalizedParams, siteId: normalizedParams.siteId || undefined },
      ),
    enabled: options?.enabled ?? true,
    staleTime: 60 * 1000,
    retry: false,
  });
}
