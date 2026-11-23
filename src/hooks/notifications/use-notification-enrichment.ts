"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCan } from "@/hooks/use-can";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import {
  buildIncidentSignalMap,
  type NotificationEnrichedSignals,
} from "@/lib/notification-enrichment";
import { incidentService } from "@/services/incident.service";
import type { IncidentItem } from "@/types";

export interface UseNotificationEnrichmentOptions {
  enabled?: boolean;
  /** Số lượng sự cố gần nhất tối đa dùng để đối chiếu track_id & bbox (mặc định 200 = tối đa 2 page) */
  maxIncidents?: number;
}

const MAX_PAGE_SIZE = 100;

async function fetchRecentIncidentsForEnrichment(
  maxIncidents: number,
  signal?: AbortSignal,
): Promise<IncidentItem[]> {
  const first = await incidentService.getIncidents(
    {
      page: 1,
      limit: Math.min(MAX_PAGE_SIZE, maxIncidents),
      sortBy: "detectedAt",
      sortOrder: "desc",
    },
    { signal, suppressToast: true },
  );

  const items = [...first.items];
  const totalPages = first.meta?.totalPages ?? 1;

  if (maxIncidents > MAX_PAGE_SIZE && totalPages >= 2 && items.length >= MAX_PAGE_SIZE) {
    try {
      const second = await incidentService.getIncidents(
        {
          page: 2,
          limit: Math.min(MAX_PAGE_SIZE, maxIncidents - MAX_PAGE_SIZE),
          sortBy: "detectedAt",
          sortOrder: "desc",
        },
        { signal, suppressToast: true },
      );
      items.push(...second.items);
    } catch {
      // Giữ trang 1 nếu trang 2 lỗi mạng nhẹ
    }
  }

  return items;
}

/**
 * Tải nhẹ ngữ cảnh sự cố từ `GET /api/v1/incidents` (đã gồm sẵn `evidences[0].metadata.aiDetections`
 * và `storageKey` chứa `track_id`) để lập chỉ mục `Map<incidentId, NotificationEnrichedSignals>`
 * phục vụ gom nhóm cùng người / đa vi phạm / theo camera hoàn toàn phía Frontend.
 */
export function useNotificationEnrichment(
  options?: UseNotificationEnrichmentOptions,
) {
  const can = useCan();
  const canReadIncidents = can("PPE_INCIDENT_READ");
  const maxIncidents = options?.maxIncidents ?? 200;
  const enabled = (options?.enabled ?? true) && canReadIncidents;

  const { getCameraCode, getSiteName } = useEntityLookup({ enabled });

  const query = useQuery({
    queryKey: ["notifications", "incident-enrichment", maxIncidents],
    queryFn: ({ signal }) => fetchRecentIncidentsForEnrichment(maxIncidents, signal),
    enabled,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const signalsMap = useMemo<Map<string, NotificationEnrichedSignals>>(() => {
    const rawMap = buildIncidentSignalMap(query.data ?? []);
    if (rawMap.size === 0) return rawMap;

    const enriched = new Map<string, NotificationEnrichedSignals>();
    for (const [id, sig] of rawMap.entries()) {
      enriched.set(id, {
        ...sig,
        cameraCode: sig.cameraCode || getCameraCode(sig.cameraId, "") || undefined,
        siteName: sig.siteName || getSiteName(sig.siteId, "") || undefined,
      });
    }
    return enriched;
  }, [query.data, getCameraCode, getSiteName]);

  return {
    signalsMap,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}
