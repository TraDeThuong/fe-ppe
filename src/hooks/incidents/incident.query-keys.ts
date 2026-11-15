import type { IncidentQueryParams } from "@/types";

export interface IncidentStatusCountsQueryParams {
  siteId?: string | null;
  cameraId?: string;
  fromDate?: string;
  toDate?: string;
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
    if (!params.cameraId && !params.fromDate && !params.toDate) {
      return [...incidentKeys.all, "status-counts", siteSegment] as const;
    }
    return [
      ...incidentKeys.all,
      "status-counts",
      siteSegment,
      {
        cameraId: params.cameraId || undefined,
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
};
