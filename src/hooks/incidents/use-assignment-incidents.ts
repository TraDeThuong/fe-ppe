"use client";

import { useCallback, useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useRealtime } from "@/contexts/RealtimeContext";
import { incidentService } from "@/services/incident.service";
import { incidentKeys } from "./incident.query-keys";
import type { IncidentItem, IncidentStatus, ViolationType } from "@/types";

export interface AssignmentIncidentTotals {
  pendingReview: number;
  confirmed: number;
  resolved: number;
  closed: number;
  dismissed: number;
  closedOrDismissed: number;
  total: number;
}

export interface StatusBucketResult {
  items: IncidentItem[];
  total: number;
}

export interface UseAssignmentIncidentsParams {
  siteId?: string;
  cameraId?: string;
  violationType?: ViolationType | string;
  fromDate?: string;
  toDate?: string;
  /** Có yêu cầu BE trả kèm assignments cho CONFIRMED & RESOLVED không (mặc định: true) */
  includeAssignments?: boolean;
  /** Có yêu cầu BE trả kèm assignments cho CLOSED không (cần cho SAFETY_OFFICER) */
  includeClosedAssignments?: boolean;
  /** Số trang tối đa (mỗi trang 100) cho trạng thái CONFIRMED để không rớt hồ sơ khi > 100 (mặc định: 3) */
  maxConfirmedPages?: number;
  /** Giới hạn bản ghi tải cho trạng thái CLOSED (mặc định: 100 khi includeClosedAssignments, ngược lại 50) */
  closedLimit?: number;
  /** Giới hạn bản ghi tải cho trạng thái DISMISSED (mặc định: 20) */
  dismissedLimit?: number;
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number | false;
}

export interface UseAssignmentIncidentsResult {
  items: IncidentItem[];
  totals: AssignmentIncidentTotals;
  isLoading: boolean;
  isRefetching: boolean;
  isError: boolean;
  refetch: () => Promise<void>;
}

const DEFAULT_BUCKET_LIMIT = 100;

function isRateLimitError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "status" in error &&
      Number((error as { status?: unknown }).status) === 429,
  );
}

/**
 * Tải 1 nhóm trạng thái sự cố (hỗ trợ tải thêm tối đa `maxPages` trang cho CONFIRMED
 * mà vẫn tuân thủ giới hạn BE `limit <= 100` và tự dừng an toàn nếu gặp HTTP 429).
 */
export async function fetchIncidentStatusBucket(
  params: {
    status: IncidentStatus;
    siteId?: string;
    cameraId?: string;
    violationType?: ViolationType | string;
    fromDate?: string;
    toDate?: string;
    limit: number;
    maxPages?: number;
    includeAssignments?: boolean;
  },
  signal?: AbortSignal,
): Promise<StatusBucketResult> {
  const limit = Math.max(1, Math.min(DEFAULT_BUCKET_LIMIT, params.limit));
  const maxPages = Math.max(1, params.maxPages ?? 1);

  const firstPage = await incidentService.getIncidents(
    {
      page: 1,
      limit,
      status: params.status,
      siteId: params.siteId || undefined,
      cameraId: params.cameraId || undefined,
      violationType: (params.violationType || undefined) as ViolationType | undefined,
      fromDate: params.fromDate || undefined,
      toDate: params.toDate || undefined,
      sortBy: "detectedAt",
      sortOrder: "desc",
      ...(params.includeAssignments ? { includeAssignments: true } : {}),
    },
    { signal },
  );

  const byId = new Map<string, IncidentItem>();
  for (const item of firstPage.items ?? []) {
    byId.set(item.id, item);
  }

  const reportedTotal =
    typeof firstPage.meta?.total === "number"
      ? firstPage.meta.total
      : byId.size;
  const totalPages = Math.min(firstPage.meta?.totalPages ?? 1, maxPages);

  if (totalPages > 1 && !signal?.aborted) {
    for (let page = 2; page <= totalPages; page += 1) {
      if (signal?.aborted) break;
      try {
        const nextPage = await incidentService.getIncidents(
          {
            page,
            limit,
            status: params.status,
            siteId: params.siteId || undefined,
            cameraId: params.cameraId || undefined,
            violationType: (params.violationType || undefined) as ViolationType | undefined,
            fromDate: params.fromDate || undefined,
            toDate: params.toDate || undefined,
            sortBy: "detectedAt",
            sortOrder: "desc",
            ...(params.includeAssignments ? { includeAssignments: true } : {}),
          },
          { signal, suppressToast: true },
        );
        for (const item of nextPage.items ?? []) {
          byId.set(item.id, item);
        }
      } catch (error) {
        // Nếu chạm rate-limit 429 khi tải trang bổ sung, giữ nguyên các trang đã lấy thành công
        if (isRateLimitError(error)) {
          break;
        }
        throw error;
      }
    }
  }

  const items = Array.from(byId.values());
  return {
    items,
    total: Math.max(reportedTotal, items.length),
  };
}

/**
 * Hợp nhất các nhóm trạng thái đã tải riêng biệt thành danh sách sự cố không trùng lặp
 * (sắp xếp theo `detectedAt` mới nhất trước) kèm bộ tổng chính xác từ `meta.total`.
 */
export function mergeStatusBuckets(buckets: {
  pendingReview?: StatusBucketResult;
  confirmed?: StatusBucketResult;
  resolved?: StatusBucketResult;
  closed?: StatusBucketResult;
  dismissed?: StatusBucketResult;
}): { items: IncidentItem[]; totals: AssignmentIncidentTotals } {
  const byId = new Map<string, IncidentItem>();

  const orderedBuckets = [
    buckets.pendingReview,
    buckets.confirmed,
    buckets.resolved,
    buckets.closed,
    buckets.dismissed,
  ];

  for (const bucket of orderedBuckets) {
    if (!bucket) continue;
    for (const item of bucket.items) {
      if (!byId.has(item.id)) {
        byId.set(item.id, item);
      }
    }
  }

  const items = Array.from(byId.values()).sort((a, b) => {
    const timeA = Date.parse(a.detectedAt || a.createdAt || "") || 0;
    const timeB = Date.parse(b.detectedAt || b.createdAt || "") || 0;
    return timeB - timeA;
  });

  const pendingReview = Math.max(
    buckets.pendingReview?.total ?? 0,
    buckets.pendingReview?.items.length ?? 0,
  );
  const confirmed = Math.max(
    buckets.confirmed?.total ?? 0,
    buckets.confirmed?.items.length ?? 0,
  );
  const resolved = Math.max(
    buckets.resolved?.total ?? 0,
    buckets.resolved?.items.length ?? 0,
  );
  const closed = Math.max(
    buckets.closed?.total ?? 0,
    buckets.closed?.items.length ?? 0,
  );
  const dismissed = Math.max(
    buckets.dismissed?.total ?? 0,
    buckets.dismissed?.items.length ?? 0,
  );
  const closedOrDismissed = closed + dismissed;
  const total = pendingReview + confirmed + resolved + closedOrDismissed;

  return {
    items,
    totals: {
      pendingReview,
      confirmed,
      resolved,
      closed,
      dismissed,
      closedOrDismissed,
      total,
    },
  };
}

/**
 * Hook tải danh sách sự cố tách riêng theo từng trạng thái vòng đời
 * (`PENDING_REVIEW`, `CONFIRMED`, `RESOLVED`, `CLOSED`, `DISMISSED`).
 *
 * Mục tiêu (Phương án A - FE only, giữ nguyên BE limit <= 100):
 * - Ngăn cảnh báo AI `PENDING_REVIEW` mới (> 100 bản ghi) đẩy trôi toàn bộ
 *   hồ sơ `CONFIRMED`, `RESOLVED`, `CLOSED`, `DISMISSED` khỏi màn hình điều phối.
 * - Tận dụng `meta.total` của từng trạng thái để hiển thị KPI chuẩn xác toàn DB.
 * - Dùng chung queryKey gốc `incidentKeys.lists()` để tự động đồng bộ cache giữa
 *   `/incidents`, `/incidents/assignments` và các thao tác mutation/SSE.
 */
export function useAssignmentIncidents(
  params: UseAssignmentIncidentsParams = {},
): UseAssignmentIncidentsResult {
  const { isConnected } = useRealtime();
  const {
    siteId,
    cameraId,
    violationType,
    fromDate,
    toDate,
    includeAssignments = true,
    includeClosedAssignments = false,
    maxConfirmedPages = 3,
    closedLimit = includeClosedAssignments ? 100 : 50,
    dismissedLimit = 20,
    enabled = true,
    staleTime = 30 * 1000,
    refetchInterval,
  } = params;

  const baseScope = useMemo(
    () => ({
      siteId: siteId || undefined,
      cameraId: cameraId || undefined,
      violationType: violationType || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    }),
    [siteId, cameraId, violationType, fromDate, toDate],
  );

  const bucketSpecs = useMemo(
    () =>
      [
        {
          key: "pendingReview" as const,
          status: "PENDING_REVIEW" as IncidentStatus,
          limit: DEFAULT_BUCKET_LIMIT,
          maxPages: 1,
          includeAssignments: false,
        },
        {
          key: "confirmed" as const,
          status: "CONFIRMED" as IncidentStatus,
          limit: DEFAULT_BUCKET_LIMIT,
          maxPages: maxConfirmedPages,
          includeAssignments,
        },
        {
          key: "resolved" as const,
          status: "RESOLVED" as IncidentStatus,
          limit: DEFAULT_BUCKET_LIMIT,
          maxPages: 1,
          includeAssignments,
        },
        {
          key: "closed" as const,
          status: "CLOSED" as IncidentStatus,
          limit: closedLimit,
          maxPages: 1,
          includeAssignments: includeClosedAssignments,
        },
        {
          key: "dismissed" as const,
          status: "DISMISSED" as IncidentStatus,
          limit: dismissedLimit,
          maxPages: 1,
          includeAssignments: false,
        },
      ] as const,
    [
      maxConfirmedPages,
      includeAssignments,
      closedLimit,
      includeClosedAssignments,
      dismissedLimit,
    ],
  );

  const queries = useQueries({
    queries: bucketSpecs.map((spec) => ({
      queryKey: [
        ...incidentKeys.lists(),
        "status-bucket",
        spec.status,
        {
          ...baseScope,
          limit: spec.limit,
          maxPages: spec.maxPages,
          includeAssignments: spec.includeAssignments || undefined,
        },
      ] as const,
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        fetchIncidentStatusBucket(
          {
            status: spec.status,
            ...baseScope,
            limit: spec.limit,
            maxPages: spec.maxPages,
            includeAssignments: spec.includeAssignments,
          },
          signal,
        ),
      enabled,
      staleTime,
      retry: false,
      refetchOnWindowFocus: false,
      refetchIntervalInBackground: false,
      refetchInterval: (query: { state: { error: unknown } }) => {
        if (refetchInterval === false) return false;
        if (isRateLimitError(query.state.error)) return false;
        if (typeof refetchInterval === "number") return refetchInterval;
        return isConnected ? 60 * 1000 : 30 * 1000;
      },
    })),
  });

  const pendingData = queries[0]?.data;
  const confirmedData = queries[1]?.data;
  const resolvedData = queries[2]?.data;
  const closedData = queries[3]?.data;
  const dismissedData = queries[4]?.data;

  const merged = useMemo(
    () =>
      mergeStatusBuckets({
        pendingReview: pendingData,
        confirmed: confirmedData,
        resolved: resolvedData,
        closed: closedData,
        dismissed: dismissedData,
      }),
    [pendingData, confirmedData, resolvedData, closedData, dismissedData],
  );

  const isLoading = queries.some((q) => q.isLoading);
  const isRefetching = queries.some((q) => q.isRefetching);
  const isError = queries.every((q) => q.isError);

  const refetch = useCallback(async () => {
    await Promise.all(queries.map((q) => q.refetch()));
  }, [queries]);

  return {
    items: merged.items,
    totals: merged.totals,
    isLoading,
    isRefetching,
    isError,
    refetch,
  };
}
