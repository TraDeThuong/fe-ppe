import type { IncidentQueryParams } from "@/types";

export interface IncidentStatusCountsQueryParams {
  siteId?: string | null;
  cameraId?: string;
  cameraIds?: string[] | string;
  fromDate?: string;
  toDate?: string;
}

function normalizeCameraIdsKey(cameraIds?: string[] | string): string | null | undefined {
  if (cameraIds === undefined) return undefined;
  const list = Array.isArray(cameraIds)
    ? cameraIds
    : cameraIds.split(",");
  const cleaned = Array.from(new Set(list.map((id) => id.trim()).filter(Boolean))).sort();
  if (cleaned.length > 0) return cleaned.join(",");
  // The API client resolves an empty camera set locally; never share its cache with unfiltered counts.
  return Array.isArray(cameraIds) ? null : undefined;
}

export const incidentKeys = {
  all: ["incidents"] as const,
  lists: () => [...incidentKeys.all, "list"] as const,
  list: (params?: IncidentQueryParams) => [...incidentKeys.lists(), params] as const,
  statusCountsRoot: () => [...incidentKeys.all, "status-counts"] as const,
  statusCounts: (params?: string | null | IncidentStatusCountsQueryParams) => {
    if (typeof params === "string" || params == null) {
      return [...incidentKeys.all, "status-counts", params || "all"] as const;
    }
    const siteSegment = params.siteId || "all";
    const normalizedCameraIds = normalizeCameraIdsKey(params.cameraIds);
    if (!params.cameraId && normalizedCameraIds === undefined && !params.fromDate && !params.toDate) {
      return [...incidentKeys.all, "status-counts", siteSegment] as const;
    }
    return [
      ...incidentKeys.all,
      "status-counts",
      siteSegment,
      {
        cameraId: params.cameraId || undefined,
        cameraIds: normalizedCameraIds,
        fromDate: params.fromDate || undefined,
        toDate: params.toDate || undefined,
      },
    ] as const;
  },
  details: () => [...incidentKeys.all, "detail"] as const,
  detail: (id: string) => [...incidentKeys.details(), id] as const,
  assignments: (id: string) => [...incidentKeys.all, "assignments", id] as const,
  comments: (id: string) => [...incidentKeys.all, "comments", id] as const,
  integrity: (evidenceId: string) => [...incidentKeys.all, "integrity", evidenceId] as const,
  evidences: () => [...incidentKeys.all, "evidences"] as const,
  evidenceList: (params?: unknown) => [...incidentKeys.evidences(), "list", params ?? {}] as const,
  evidenceDetail: (id: string) => [...incidentKeys.evidences(), "detail", id] as const,
};
