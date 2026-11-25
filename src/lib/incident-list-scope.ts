import type { IncidentItem } from "@/types";

export type IncidentListScope = "work" | "history" | "all";

export const incidentWorkStatuses = {
  PENDING_REVIEW: "incidents.status.pendingReview",
  CONFIRMED: "incidents.status.confirmed",
  RESOLVED: "incidents.scope.awaitingAcceptance",
  DISMISSED: "incidents.scope.dismissedAwaitingClose",
} as const;

export type IncidentWorkStatus = keyof typeof incidentWorkStatuses;

function isWorkStatus(status: string | null | undefined): status is IncidentWorkStatus {
  return !!status && Object.hasOwn(incidentWorkStatuses, status);
}

export function resolveIncidentListScope(
  get: (key: string) => string | null | undefined,
  role?: string,
): { scope: IncidentListScope; status?: IncidentWorkStatus | "CLOSED"; requiresRole: boolean } {
  const scope = get("scope");
  const status = get("status");
  const stat = get("stat");

  if (scope === "history" || status === "CLOSED") {
    return { scope: "history", status: "CLOSED", requiresRole: false };
  }
  if (scope === "all") return { scope: "all", requiresRole: false };
  if (isWorkStatus(status)) return { scope: "work", status, requiresRole: false };
  if (stat === "pending-review" || stat === "pendingReview") {
    return { scope: "work", status: "PENDING_REVIEW", requiresRole: false };
  }
  if (stat === "resolved") return { scope: "work", status: "RESOLVED", requiresRole: false };

  // Drill-down links from the dashboard, site and camera pages used an unfiltered status.
  if (scope !== "work" && (stat === "critical" || stat === "total" ||
    ["siteId", "cameraId", "fromDate", "toDate"].some((key) => get(key) != null))) {
    return { scope: "all", requiresRole: false };
  }

  return {
    scope: "work",
    status: role?.toUpperCase() === "SAFETY_OFFICER" ? "CONFIRMED" : "PENDING_REVIEW",
    requiresRole: !role,
  };
}

export function getIncidentClosure(incident: IncidentItem) {
  const closure = (incident.statusHistory ?? []).reduce<NonNullable<IncidentItem["statusHistory"]>[number] | undefined>(
    (latest, entry) => entry.newStatus === "CLOSED" && Number.isFinite(Date.parse(entry.changedAt)) &&
      (!latest || Date.parse(entry.changedAt) > Date.parse(latest.changedAt)) ? entry : latest,
    undefined,
  );
  return {
    date: closure?.changedAt,
    label: closure?.oldStatus === "RESOLVED" ? "incidents.scope.closedAfterAcceptance" :
      closure?.oldStatus === "DISMISSED" ? "incidents.scope.closedAfterDismissal" : "incidents.status.closed",
  };
}
