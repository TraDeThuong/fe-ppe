"use client";

import { useEffect } from "react";
import {
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { useRealtime } from "@/contexts/RealtimeContext";
import { incidentService } from "@/services/incident.service";
import {
  incidentKeys,
  type IncidentStatusCountsQueryParams,
} from "./incident.query-keys";

export interface IncidentStatusCountsResult {
  total: number;
  pendingReview: number;
  critical: number;
  resolved: number;
}

export type UseIncidentStatusCountsOptions = Omit<
  UseQueryOptions<IncidentStatusCountsResult, Error>,
  "queryKey" | "queryFn"
>;

function normalizeStatusCountsParams(
  siteIdOrParams?: string | null | IncidentStatusCountsQueryParams,
): IncidentStatusCountsQueryParams {
  if (typeof siteIdOrParams === "string" || siteIdOrParams == null) {
    return { siteId: siteIdOrParams || undefined };
  }
  return {
    siteId: siteIdOrParams.siteId || undefined,
    cameraId: siteIdOrParams.cameraId || undefined,
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
      ...(params.fromDate ? { fromDate: params.fromDate } : {}),
      ...(params.toDate ? { toDate: params.toDate } : {}),
    };
    return await incidentService.getStatusCounts(
      Object.keys(query).length > 0 ? query : undefined,
    );
  } catch (error) {
    const status =
      error && typeof error === "object" && "status" in error
        ? Number((error as { status?: unknown }).status)
        : undefined;
    if (status === 401 || status === 403) {
      throw error;
    }

    // Fallback khi backend /incidents/status-counts chưa khả dụng hoặc trả 422
    const page = await incidentService.getIncidents(
      {
        siteId: params.siteId || undefined,
        cameraId: params.cameraId || undefined,
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
      critical: 0,
      resolved: 0,
    };
  }
}

/**
 * Lấy bộ đếm nhanh trạng thái sự cố (total, pendingReview, critical, resolved).
 * Tự động đồng bộ khi nhận sự kiện SSE từ RealtimeContext (vi phạm PPE mới / thông báo mới).
 */
export function useIncidentStatusCounts(
  siteIdOrParams?: string | null | IncidentStatusCountsQueryParams,
  options?: UseIncidentStatusCountsOptions,
) {
  const queryClient = useQueryClient();
  const { lastAlert } = useRealtime();
  const normalizedParams = normalizeStatusCountsParams(siteIdOrParams);

  const query = useQuery<IncidentStatusCountsResult, Error>({
    queryKey: incidentKeys.statusCounts(normalizedParams),
    queryFn: ({ signal }) => fetchIncidentStatusCounts(normalizedParams, signal),
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
    refetchIntervalInBackground: false,
    retry: false,
    ...options,
  });

  useEffect(() => {
    if (!lastAlert) return;
    if (options?.enabled === false) return;

    void queryClient.invalidateQueries({
      queryKey: incidentKeys.statusCountsRoot(),
    });
  }, [lastAlert, options?.enabled, queryClient]);

  return query;
}
