import type { IncidentQueryParams } from "@/types";

export const incidentKeys = {
  all: ["incidents"] as const,
  lists: () => [...incidentKeys.all, "list"] as const,
  list: (params?: IncidentQueryParams) => [...incidentKeys.lists(), params] as const,
  details: () => [...incidentKeys.all, "detail"] as const,
  detail: (id: string) => [...incidentKeys.details(), id] as const,
  assignments: (id: string) => [...incidentKeys.all, "assignments", id] as const,
  comments: (id: string) => [...incidentKeys.all, "comments", id] as const,
  integrity: (evidenceId: string) => [...incidentKeys.all, "integrity", evidenceId] as const,
};
