import type { IncidentItem, NotificationSeverity } from "@/types";

export const DISPATCH_SIGNAL_PREFIX = "[ĐIỀU PHỐI]";
export const RESOLVED_REPORT_PREFIX = "[BÁO CÁO ĐÃ KHẮC PHỤC]";

export type IncidentAlertKind =
  | "RAW_AI_ALERT"
  | "MANAGER_DISPATCH"
  | "OFFICER_RESOLVED_REPORT";

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
 */
export function classifyIncidentAlert(
  data: unknown,
  eventType?: string,
  userRole?: string | null,
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
