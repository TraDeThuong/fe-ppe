import type { IncidentAssignmentItem, IncidentItem, NotificationSeverity } from "@/types";

export const DISPATCH_SIGNAL_PREFIX = "[ĐIỀU PHỐI]";
export const RESOLVED_REPORT_PREFIX = "[BÁO CÁO ĐÃ KHẮC PHỤC]";
export const COMMENT_SIGNAL_PREFIX = "[BÌNH LUẬN]";

export type IncidentAlertKind =
  | "RAW_AI_ALERT"
  | "MANAGER_DISPATCH"
  | "OFFICER_RESOLVED_REPORT"
  | "INCIDENT_COMMENT";

export interface ClassifiedIncidentAlert {
  kind: IncidentAlertKind;
  shouldTriggerBellAndToast: boolean;
  toastSeverity: NotificationSeverity;
}

/**
 * Phân loại tín hiệu SSE realtime theo vai trò người dùng hiện tại:
 * - Cảnh báo AI thô: chỉ SAFETY_MANAGER / ADMIN nhận còi & popup.
 * - Tín hiệu [ĐIỀU PHỐI] từ Quản lý: chỉ SAFETY_OFFICER nhận chuông & popup.
 * - Tín hiệu [BÁO CÁO ĐÃ KHẮC PHỤC] từ Officer: chỉ SAFETY_MANAGER / ADMIN nhận thông báo nghiệm thu.
 * - Tín hiệu [BÌNH LUẬN] (notification:incident_comment): mọi vai trò liên quan đều nhận chuông & popup (trừ tác giả).
 */
export function classifyIncidentAlert(
  data: unknown,
  eventType?: string,
  userRole?: string | null,
  currentUserId?: string | null,
): ClassifiedIncidentAlert {
  const role = (userRole || "").toUpperCase();
  const isOfficer = role === "SAFETY_OFFICER";
  const isManagerOrAdmin = role === "SAFETY_MANAGER" || role === "ADMIN" || role === "MANAGER";

  const payload =
    data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const text = String(
    payload.content || payload.description || payload.title || "",
  ).trim();
  const rawSeverity = String(payload.severity || "").toUpperCase();

  if (
    eventType === "notification:incident_comment" ||
    text.startsWith(COMMENT_SIGNAL_PREFIX)
  ) {
    const authorId =
      typeof payload.authorId === "string" ? payload.authorId : undefined;
    const isSelfComment = Boolean(
      authorId && currentUserId && authorId === currentUserId,
    );
    return {
      kind: "INCIDENT_COMMENT",
      shouldTriggerBellAndToast: !isSelfComment,
      toastSeverity: "NORMAL",
    };
  }

  if (text.startsWith(DISPATCH_SIGNAL_PREFIX)) {
    const toastSeverity: NotificationSeverity =
      rawSeverity === "CRITICAL" || rawSeverity === "HIGH" || rawSeverity === "NORMAL" || rawSeverity === "LOW"
        ? (rawSeverity as NotificationSeverity)
        : "HIGH";
    return {
      kind: "MANAGER_DISPATCH",
      shouldTriggerBellAndToast: isOfficer,
      toastSeverity,
    };
  }

  if (text.startsWith(RESOLVED_REPORT_PREFIX)) {
    return {
      kind: "OFFICER_RESOLVED_REPORT",
      shouldTriggerBellAndToast: !isOfficer,
      toastSeverity: "NORMAL",
    };
  }

  const defaultSeverity: NotificationSeverity =
    eventType === "notification:ppe_violation"
      ? "CRITICAL"
      : rawSeverity === "CRITICAL" || rawSeverity === "HIGH" || rawSeverity === "NORMAL" || rawSeverity === "LOW"
        ? (rawSeverity as NotificationSeverity)
        : "HIGH";

  return {
    kind: "RAW_AI_ALERT",
    shouldTriggerBellAndToast: isManagerOrAdmin || !isOfficer,
    toastSeverity: defaultSeverity,
  };
}

export function buildDispatchSignalDescription(params: {
  count: number;
  cameraLabel?: string;
  note?: string;
  managerName?: string;
}): string {
  const who = params.managerName ? ` (${params.managerName})` : "";
  const cam = params.cameraLabel ? ` tại ${params.cameraLabel}` : "";
  const countText =
    params.count > 1 ? `${params.count} sự cố vi phạm${cam}` : `1 sự cố vi phạm${cam}`;
  const extra = params.note?.trim() ? ` — Chỉ đạo: ${params.note.trim()}` : "";
  return `${DISPATCH_SIGNAL_PREFIX} Quản lý${who} đã giao ${countText} cho bạn kiểm tra và xử lý.${extra}`;
}

export function buildResolvedReportDescription(params: {
  count: number;
  cameraLabel?: string;
  resolutionNote: string;
  officerName?: string;
}): string {
  const who = params.officerName || "Cán bộ an toàn";
  const cam = params.cameraLabel ? ` tại ${params.cameraLabel}` : "";
  const countText =
    params.count > 1 ? `${params.count} sự cố${cam}` : `sự cố${cam}`;
  return `${RESOLVED_REPORT_PREFIX} ${who} đã xử lý xong ${countText}: ${params.resolutionNote.trim()}`;
}

export function isIncidentAssignedToUser(
  incident: Pick<IncidentItem, "assignments">,
  userId?: string | null,
): boolean {
  if (!userId || !Array.isArray(incident.assignments)) return false;
  return incident.assignments.some((a) => {
    const assigneeId = a.assignedTo || (a as unknown as { assignedToUserId?: string }).assignedToUserId;
    return assigneeId === userId && a.status !== "COMPLETED";
  });
}

export function getActiveAssignment(
  incident: Pick<IncidentItem, "assignments">,
): IncidentAssignmentItem | undefined {
  if (!Array.isArray(incident.assignments) || incident.assignments.length === 0) {
    return undefined;
  }
  return (
    incident.assignments.find((a) => a.status === "ACTIVE" || a.status !== "COMPLETED") ||
    undefined
  );
}

export function hasIncidentAssignmentCount(
  incident: Pick<IncidentItem, "assignments" | "_count">,
): boolean {
  if (Array.isArray(incident.assignments) && incident.assignments.length > 0) {
    return incident.assignments.some((a) => a.status !== "COMPLETED");
  }
  return typeof incident._count?.assignments === "number" && incident._count.assignments > 0;
}

export type ResponsibilityOwnerRole = "SAFETY_MANAGER" | "SAFETY_OFFICER" | "COMPLETED";

export type ResponsibilityPhase =
  | "AWAITING_MANAGER_REVIEW"
  | "AWAITING_MANAGER_DISPATCH"
  | "OFFICER_REMEDIATING"
  | "AWAITING_MANAGER_ACCEPTANCE"
  | "COMPLETED";

export interface ResponsiblePersonRef {
  id: string;
  name: string;
  email?: string;
  role?: string;
}

export interface ResponsibilityLookupContext {
  siteManagersBySiteId?: ReadonlyMap<string, ResponsiblePersonRef[]>;
  usersById?: ReadonlyMap<string, ResponsiblePersonRef>;
}

export interface IncidentResponsibilityInfo {
  phase: ResponsibilityPhase;
  ownerRole: ResponsibilityOwnerRole;
  ownerIds: string[];
  ownerNames: string[];
  assignedOfficerId?: string;
  assignedOfficerName?: string;
  siteManagerIds: string[];
  siteManagerNames: string[];
}

export function resolveIncidentResponsibility(
  incident: IncidentItem,
  context?: ResponsibilityLookupContext,
): IncidentResponsibilityInfo {
  const siteManagers =
    (incident.siteId && context?.siteManagersBySiteId?.get(incident.siteId)) || [];
  const siteManagerIds = siteManagers.map((m) => m.id);
  const siteManagerNames = siteManagers.map((m) => m.name);

  const activeAssignment = getActiveAssignment(incident);
  const latestAssignment = activeAssignment || incident.assignments?.[0];
  const rawOfficerId =
    (activeAssignment?.assignedTo ||
      (activeAssignment as unknown as { assignedToUserId?: string })?.assignedToUserId ||
      latestAssignment?.assignedTo ||
      (latestAssignment as unknown as { assignedToUserId?: string })?.assignedToUserId) ??
    undefined;

  const assignedOfficerName =
    activeAssignment?.assignedToName ||
    latestAssignment?.assignedToName ||
    (rawOfficerId ? context?.usersById?.get(rawOfficerId)?.name : undefined);

  if (incident.status === "PENDING_REVIEW") {
    return {
      phase: "AWAITING_MANAGER_REVIEW",
      ownerRole: "SAFETY_MANAGER",
      ownerIds: siteManagerIds,
      ownerNames: siteManagerNames,
      siteManagerIds,
      siteManagerNames,
    };
  }

  if (incident.status === "CONFIRMED") {
    if (activeAssignment && rawOfficerId) {
      return {
        phase: "OFFICER_REMEDIATING",
        ownerRole: "SAFETY_OFFICER",
        ownerIds: [rawOfficerId],
        ownerNames: [assignedOfficerName || `#${rawOfficerId.slice(0, 8)}`],
        assignedOfficerId: rawOfficerId,
        assignedOfficerName: assignedOfficerName || `#${rawOfficerId.slice(0, 8)}`,
        siteManagerIds,
        siteManagerNames,
      };
    }

    return {
      phase: "AWAITING_MANAGER_DISPATCH",
      ownerRole: "SAFETY_MANAGER",
      ownerIds: siteManagerIds,
      ownerNames: siteManagerNames,
      siteManagerIds,
      siteManagerNames,
    };
  }

  if (incident.status === "RESOLVED") {
    return {
      phase: "AWAITING_MANAGER_ACCEPTANCE",
      ownerRole: "SAFETY_MANAGER",
      ownerIds: siteManagerIds,
      ownerNames: siteManagerNames,
      assignedOfficerId: rawOfficerId,
      assignedOfficerName,
      siteManagerIds,
      siteManagerNames,
    };
  }

  return {
    phase: "COMPLETED",
    ownerRole: "COMPLETED",
    ownerIds: rawOfficerId ? [rawOfficerId] : siteManagerIds,
    ownerNames: assignedOfficerName
      ? [assignedOfficerName]
      : siteManagerNames,
    assignedOfficerId: rawOfficerId,
    assignedOfficerName,
    siteManagerIds,
    siteManagerNames,
  };
}

export interface ManagerResponsibilityGroup {
  managerKey: string;
  managerId: string;
  managerName: string;
  managerEmail?: string;
  isUnassignedSiteManager: boolean;
  siteIds: string[];
  siteNames: string[];
  pendingReviewItems: IncidentItem[];
  unassignedConfirmedItems: IncidentItem[];
  awaitingAcceptanceItems: IncidentItem[];
  allActionableItems: IncidentItem[];
}

export interface OfficerResponsibilityGroup {
  officerId: string;
  officerName: string;
  officerEmail?: string;
  siteNames: string[];
  cameraLabels: string[];
  activeConfirmedItems: IncidentItem[];
  resolvedItems: IncidentItem[];
  closedItems: IncidentItem[];
  totalAssigned: number;
  completionRate: number;
}

export function groupIncidentsByResponsibility(
  incidents: readonly IncidentItem[],
  context: ResponsibilityLookupContext & {
    resolveSiteName: (siteId: string, fallbackName?: string) => string;
    resolveCameraLabel: (incident: IncidentItem) => string;
  },
): {
  managerGroups: ManagerResponsibilityGroup[];
  officerGroups: OfficerResponsibilityGroup[];
} {
  const managerMap = new Map<string, ManagerResponsibilityGroup>();
  const officerMap = new Map<string, OfficerResponsibilityGroup>();

  const ensureManagerGroup = (
    key: string,
    id: string,
    name: string,
    email: string | undefined,
    isUnassigned: boolean,
  ): ManagerResponsibilityGroup => {
    let grp = managerMap.get(key);
    if (!grp) {
      grp = {
        managerKey: key,
        managerId: id,
        managerName: name,
        managerEmail: email,
        isUnassignedSiteManager: isUnassigned,
        siteIds: [],
        siteNames: [],
        pendingReviewItems: [],
        unassignedConfirmedItems: [],
        awaitingAcceptanceItems: [],
        allActionableItems: [],
      };
      managerMap.set(key, grp);
    }
    return grp;
  };

  for (const incident of incidents) {
    const resp = resolveIncidentResponsibility(incident, context);
    const siteName = context.resolveSiteName(incident.siteId, incident.siteName);
    const camLabel = context.resolveCameraLabel(incident);

    // 1. Track Manager responsibility (PENDING_REVIEW, CONFIRMED without active assignment, RESOLVED awaiting acceptance)
    if (
      resp.phase === "AWAITING_MANAGER_REVIEW" ||
      resp.phase === "AWAITING_MANAGER_DISPATCH" ||
      resp.phase === "AWAITING_MANAGER_ACCEPTANCE"
    ) {
      const managers =
        (incident.siteId && context.siteManagersBySiteId?.get(incident.siteId)) || [];

      const targetManagers: Array<{
        key: string;
        id: string;
        name: string;
        email?: string;
        isUnassigned: boolean;
      }> =
        managers.length > 0
          ? managers.map((m) => ({
              key: m.id,
              id: m.id,
              name: m.name,
              email: m.email,
              isUnassigned: false,
            }))
          : [
              {
                key: `SITE_MANAGER_${incident.siteId || "GLOBAL"}`,
                id: "",
                name: `Safety Manager (${siteName})`,
                email: undefined,
                isUnassigned: true,
              },
            ];

      for (const tm of targetManagers) {
        const grp = ensureManagerGroup(
          tm.key,
          tm.id,
          tm.name,
          tm.email,
          tm.isUnassigned,
        );
        if (incident.siteId && !grp.siteIds.includes(incident.siteId)) {
          grp.siteIds.push(incident.siteId);
        }
        if (siteName && !grp.siteNames.includes(siteName)) {
          grp.siteNames.push(siteName);
        }
        grp.allActionableItems.push(incident);
        if (resp.phase === "AWAITING_MANAGER_REVIEW") {
          grp.pendingReviewItems.push(incident);
        } else if (resp.phase === "AWAITING_MANAGER_DISPATCH") {
          grp.unassignedConfirmedItems.push(incident);
        } else if (resp.phase === "AWAITING_MANAGER_ACCEPTANCE") {
          grp.awaitingAcceptanceItems.push(incident);
        }
      }
    }

    // 2. Track Officer responsibility (any incident assigned to an officer: active CONFIRMED, RESOLVED, or CLOSED)
    if (resp.assignedOfficerId) {
      const officerProfile = context.usersById?.get(resp.assignedOfficerId);
      const officerName =
        resp.assignedOfficerName ||
        officerProfile?.name ||
        `Officer #${resp.assignedOfficerId.slice(0, 8)}`;

      let offGrp = officerMap.get(resp.assignedOfficerId);
      if (!offGrp) {
        offGrp = {
          officerId: resp.assignedOfficerId,
          officerName,
          officerEmail: officerProfile?.email,
          siteNames: [],
          cameraLabels: [],
          activeConfirmedItems: [],
          resolvedItems: [],
          closedItems: [],
          totalAssigned: 0,
          completionRate: 0,
        };
        officerMap.set(resp.assignedOfficerId, offGrp);
      }

      if (siteName && !offGrp.siteNames.includes(siteName)) {
        offGrp.siteNames.push(siteName);
      }
      if (camLabel && !offGrp.cameraLabels.includes(camLabel)) {
        offGrp.cameraLabels.push(camLabel);
      }

      offGrp.totalAssigned += 1;
      if (incident.status === "CONFIRMED") {
        offGrp.activeConfirmedItems.push(incident);
      } else if (incident.status === "RESOLVED") {
        offGrp.resolvedItems.push(incident);
      } else if (incident.status === "CLOSED") {
        offGrp.closedItems.push(incident);
      }
    }
  }

  for (const offGrp of officerMap.values()) {
    const done = offGrp.resolvedItems.length + offGrp.closedItems.length;
    offGrp.completionRate =
      offGrp.totalAssigned > 0 ? Math.round((done / offGrp.totalAssigned) * 100) : 0;
  }

  const managerGroups = Array.from(managerMap.values()).sort(
    (a, b) => b.allActionableItems.length - a.allActionableItems.length,
  );
  const officerGroups = Array.from(officerMap.values()).sort(
    (a, b) =>
      b.activeConfirmedItems.length - a.activeConfirmedItems.length ||
      b.totalAssigned - a.totalAssigned,
  );

  return { managerGroups, officerGroups };
}

export interface SiteResponsibilityGroup {
  siteId: string;
  siteName: string;
  managerNames: string[];
  officerNames: string[];
  items: IncidentItem[];
  pendingItems: IncidentItem[];
  unassignedConfirmedItems: IncidentItem[];
  assignedConfirmedItems: IncidentItem[];
  resolvedItems: IncidentItem[];
  closedOrDismissedItems: IncidentItem[];
}

export function groupIncidentsBySiteResponsibility(
  incidents: readonly IncidentItem[],
  context: ResponsibilityLookupContext & {
    resolveSiteName: (siteId: string, fallbackName?: string) => string;
  },
): SiteResponsibilityGroup[] {
  const map = new Map<string, SiteResponsibilityGroup>();

  for (const incident of incidents) {
    const siteKey = incident.siteId || "UNKNOWN_SITE";
    const siteName = context.resolveSiteName(incident.siteId, incident.siteName);
    const resp = resolveIncidentResponsibility(incident, context);

    let grp = map.get(siteKey);
    if (!grp) {
      grp = {
        siteId: incident.siteId || "",
        siteName,
        managerNames: [...resp.siteManagerNames],
        officerNames: [],
        items: [],
        pendingItems: [],
        unassignedConfirmedItems: [],
        assignedConfirmedItems: [],
        resolvedItems: [],
        closedOrDismissedItems: [],
      };
      map.set(siteKey, grp);
    }

    for (const mName of resp.siteManagerNames) {
      if (!grp.managerNames.includes(mName)) {
        grp.managerNames.push(mName);
      }
    }
    if (resp.assignedOfficerName && !grp.officerNames.includes(resp.assignedOfficerName)) {
      grp.officerNames.push(resp.assignedOfficerName);
    }

    grp.items.push(incident);
    if (resp.phase === "AWAITING_MANAGER_REVIEW") {
      grp.pendingItems.push(incident);
    } else if (resp.phase === "AWAITING_MANAGER_DISPATCH") {
      grp.unassignedConfirmedItems.push(incident);
    } else if (resp.phase === "OFFICER_REMEDIATING") {
      grp.assignedConfirmedItems.push(incident);
    } else if (resp.phase === "AWAITING_MANAGER_ACCEPTANCE") {
      grp.resolvedItems.push(incident);
    } else {
      grp.closedOrDismissedItems.push(incident);
    }
  }

  return Array.from(map.values()).sort((a, b) => b.items.length - a.items.length);
}

export interface CameraIncidentGroup {
  cameraKey: string;
  cameraId: string;
  cameraLabel: string;
  items: IncidentItem[];
  pendingIds: string[];
  confirmedIds: string[];
  resolvedIds: string[];
  /** Các sự cố chưa đóng/chưa bác bỏ có thể gán cho Officer (PENDING_REVIEW + CONFIRMED) */
  dispatchableIds: string[];
}

export function groupIncidentsByCamera(
  incidents: readonly IncidentItem[],
  resolveCameraLabel: (incident: IncidentItem) => string,
): CameraIncidentGroup[] {
  const map = new Map<string, CameraIncidentGroup>();

  for (const incident of incidents) {
    const cameraKey = incident.cameraId || incident.cameraCode || "UNKNOWN";
    let group = map.get(cameraKey);
    if (!group) {
      group = {
        cameraKey,
        cameraId: incident.cameraId || "",
        cameraLabel: resolveCameraLabel(incident),
        items: [],
        pendingIds: [],
        confirmedIds: [],
        resolvedIds: [],
        dispatchableIds: [],
      };
      map.set(cameraKey, group);
    }

    group.items.push(incident);
    if (incident.status === "PENDING_REVIEW") {
      group.pendingIds.push(incident.id);
      group.dispatchableIds.push(incident.id);
    } else if (incident.status === "CONFIRMED") {
      group.confirmedIds.push(incident.id);
      group.dispatchableIds.push(incident.id);
    } else if (incident.status === "RESOLVED") {
      group.resolvedIds.push(incident.id);
    }
  }

  return Array.from(map.values());
}

export async function runInBatches<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<{ succeeded: R[]; failed: Array<{ item: T; error: unknown }> }> {
  const limit = Math.max(1, Math.floor(concurrency));
  const succeeded: R[] = [];
  const failed: Array<{ item: T; error: unknown }> = [];

  for (let i = 0; i < items.length; i += limit) {
    const chunk = items.slice(i, i + limit);
    const settled = await Promise.allSettled(chunk.map((item) => worker(item)));
    settled.forEach((res, idx) => {
      if (res.status === "fulfilled") {
        succeeded.push(res.value);
      } else {
        failed.push({ item: chunk[idx], error: res.reason });
      }
    });
  }

  return { succeeded, failed };
}
