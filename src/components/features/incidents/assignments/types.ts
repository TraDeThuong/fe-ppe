import type { IncidentGroupContext } from "@/lib/incident-group";
import type { ResponsibilityLookupContext } from "@/lib/incident-workflow";
import type {
  AssignmentFilterState,
  AssignmentGroupBy,
} from "@/lib/incident-assignment-groups";
import type { IncidentItem } from "@/types";

export type AdminGroupMode =
  | "responsibility"
  | "site"
  | "camera"
  | "person"
  | "violation"
  | "severity"
  | "hour"
  | "shift"
  | "batches";

export type ManagerGroupMode = AssignmentGroupBy | "batches";

export type OfficerGroupMode =
  | "flat"
  | "camera"
  | "severity"
  | "person"
  | "violation"
  | "hour"
  | "shift";

export type ManagerTabKey = "triage" | "dispatched" | "acceptance";
export type OfficerTabKey = "pending" | "completed";
export type AssignmentRoleView = "ADMIN" | "SAFETY_MANAGER" | "SAFETY_OFFICER";

export type { AssignmentFilterState, AssignmentGroupBy };

export interface OfficerWorkloadInfo {
  activeCount: number;
  resolvedCount: number;
}

export interface CategorizedAssignments {
  pendingReview: IncidentItem[];
  unassignedConfirmed: IncidentItem[];
  triageItems: IncidentItem[];
  assignedConfirmed: IncidentItem[];
  awaitingAcceptance: IncidentItem[];
  closedOrDismissed: IncidentItem[];
  myActiveConfirmed: IncidentItem[];
  myCompleted: IncidentItem[];
}

export interface DispatchedGroupView {
  group: IncidentGroupContext;
  message: string;
  memberIncidents: IncidentItem[];
  resolvedCount: number;
  remainingEditableItems: IncidentItem[];
}

export interface AssignmentRowActions {
  onReview: (incident: IncidentItem) => void;
  onDispatch: (incidents: IncidentItem[]) => void;
  onClose: (incident: IncidentItem) => void;
  onResolve: (incident: IncidentItem) => void;
}

export interface AssignmentFormatters {
  resolveSiteLabel: (siteId: string, fallback?: string) => string;
  resolveCameraLabel: (incident: IncidentItem) => string;
  formatViolation: (violationType: string) => string;
}

export type AssignmentResponsibilityContext = ResponsibilityLookupContext & {
  resolveSiteName: (siteId: string, fallbackName?: string) => string;
  resolveCameraLabel: (incident: IncidentItem) => string;
};
