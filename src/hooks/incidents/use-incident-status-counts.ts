"use client";

import { useEffect } from "react";
import {
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { useRealtime } from "@/contexts/RealtimeContext";
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
  return {
    siteId: siteIdOrParams.siteId || undefined,
    cameraId: siteIdOrParams.cameraId || undefined,
    cameraIds: siteIdOrParams.cameraIds || undefined,
    fromDate: siteIdOrParams.fromDate || undefined,
    toDate: siteIdOrParams.toDate || undefined,
  };
}

async function fetchIncidentStatusCounts(
  params: IncidentStatusCountsQueryParams,
  signal?: AbortSignal,
): Promise<IncidentStatusCountsResult> {
  try {
    const query = {
      ...(params.siteId ? { siteId: params.siteId } : {}),
      ...(params.cameraId ? { cameraId: params.cameraId } : {}),
      ...(params.cameraIds ? { cameraIds: params.cameraIds } : {}),
      ...(params.fromDate ? { fromDate: params.fromDate } : {}),
      ...(params.toDate ? { toDate: params.toDate } : {}),
    };
    return await incidentService.getStatusCounts(
      Object.keys(query).length > 0 ? query : undefined,
      { signal, suppressToast: true },
    );
  } catch (error) {
    const status =
      error && typeof error === "object" && "status" in error
        ? Number((error as { status?: unknown }).status)
        : undefined;
    // Tuyệt đối không bắn thêm fallback request khi gặp 401, 403 hoặc 429 (tránh khuếch đại rate-limit)
    if (status === 401 || status === 403 || status === 429) {
      throw error;
    }

    // Fallback khi backend /incidents/status-counts chưa khả dụng hoặc trả 422
    const page = await incidentService.getIncidents(
      {
        siteId: params.siteId || undefined,
        cameraId: params.cameraId || undefined,
        cameraIds: params.cameraIds || undefined,
        fromDate: params.fromDate || undefined,
        toDate: params.toDate || undefined,
        status: "PENDING_REVIEW",
        page: 1,
        limit: 1,
      },
      { signal },
    );
    const pendingReview = page.meta?.total ?? page.items.length;
    return {
      total: pendingReview,
      pendingReview,
      confirmed: 0,
      critical: 0,
      resolved: 0,
      closed: 0,
      dismissed: 0,
    };
  }
}

/**
 * Lấy bộ đếm nhanh trạng thái sự cố (total, pendingReview, critical, resolved).
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
    queryFn: ({ signal }) => fetchIncidentStatusCounts(normalizedParams, signal),
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
