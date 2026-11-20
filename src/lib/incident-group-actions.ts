import { env } from "@/config/env";
import { incidentService } from "@/services/incident.service";
import { notificationService } from "@/services/notification.service";
import { EVIDENCE_TYPE, type IncidentItem } from "@/types";
import { RESOLVED_REPORT_PREFIX, runInBatches } from "./incident-workflow";
import {
  appendIncidentGroupLink, canResolveGroupIncident, encodeIncidentGroup, groupProgress,
  isGroupCompletionReceipt, type IncidentGroupContext, type IncidentGroupSnapshot,
} from "./incident-group";

export async function loadIncidentGroup(group: IncidentGroupContext, signal?: AbortSignal): Promise<IncidentGroupSnapshot> {
  const rows: IncidentGroupSnapshot["rows"] = [];
  for (let offset = 0; offset < group.incidentIds.length; offset += 4) {
    signal?.throwIfAborted();
    const batch = group.incidentIds.slice(offset, offset + 4);
    const results = await Promise.allSettled(batch.map((id) => incidentService.getIncidentById(id, { signal })));
    signal?.throwIfAborted();
    results.forEach((result, index) => {
      const id = batch[index];
      if (result.status === "fulfilled" && result.value?.id === id) rows.push({ id, incident: result.value });
      else rows.push({ id, error: result.status === "rejected" && result.reason instanceof Error
        ? result.reason.message : "Không tải được hồ sơ sự cố." });
    });
  }
  return { rows, checkedAt: new Date().toISOString() };
}

export type GroupResolveStage = "access" | "upload" | "resolve" | "verify";
export interface GroupResolveFailure { id: string; stage: GroupResolveStage; message: string }
export interface GroupResolveResult { succeeded: IncidentItem[]; failed: GroupResolveFailure[] }
export type UploadedGroupEvidence = Map<string, { file: File; evidenceId: string }>;

/** Upload receipts live with the form's File object, so retrying a failed resolve does not upload twice. */
export async function resolveIncidentGroupMembers(params: {
  group: IncidentGroupContext; ids: string[]; userId: string;
  resolutionNote: string; afterFixFile?: File | null;
  uploadedEvidence?: UploadedGroupEvidence;
  signal?: AbortSignal;
}): Promise<GroupResolveResult> {
  const { group, userId, resolutionNote, afterFixFile } = params;
  if (userId !== group.assignedTo || !resolutionNote.trim()) throw new Error("Không đủ quyền hoặc thiếu nội dung khắc phục.");
  const ids = [...new Set(params.ids)];
  if (!ids.length || ids.some((id) => !group.incidentIds.includes(id))) throw new Error("Hồ sơ không thuộc nhóm xử lý.");
  const uploads = params.uploadedEvidence ?? new Map();
  const { succeeded, failed } = await runInBatches(ids, 4, async (id) => {
    let stage: GroupResolveStage = "access";
    try {
      params.signal?.throwIfAborted();
      const incident = await incidentService.getIncidentById(id, { signal: params.signal });
      params.signal?.throwIfAborted();
      if (incident.id !== id || !canResolveGroupIncident(incident, userId)) {
        throw new Error("Sự cố đã đổi trạng thái hoặc không còn được phân công cho bạn.");
      }
      if (afterFixFile && uploads.get(id)?.file !== afterFixFile) {
        stage = "upload";
        const evidence = await incidentService.uploadEvidenceDirect({ incidentId: id, cameraId: incident.cameraId,
          evidenceType: EVIDENCE_TYPE.SNAPSHOT, file: afterFixFile, fileName: `after_fix_${afterFixFile.name}` });
        uploads.set(id, { file: afterFixFile, evidenceId: evidence.id });
      }
      stage = "resolve";
      params.signal?.throwIfAborted();
      await incidentService.resolveIncident(id, { resolutionNote: resolutionNote.trim() });
      stage = "verify";
      params.signal?.throwIfAborted();
      const updated = await incidentService.getIncidentById(id, { signal: params.signal });
      if (updated.id !== id || updated.status !== "RESOLVED") throw new Error("Chưa xác minh được trạng thái đã khắc phục.");
      return updated;
    } catch (error) {
      throw { id, stage, message: error instanceof Error ? error.message : "Không thể cập nhật hồ sơ." } satisfies GroupResolveFailure;
    }
  });
  return { succeeded, failed: failed.map(({ error }) => error as GroupResolveFailure) };
}

export type GroupDeliveryState = "sent" | "recorded" | "suppressed" | "partial" | "failed" | "incomplete";
export interface GroupDelivery {
  state: GroupDeliveryState;
  deliveredTo: string[];
  message?: string;
}
export interface GroupCompletionResult { delivery: GroupDelivery; snapshot: IncidentGroupSnapshot }

// Only delivery receipts are shared between mounts; incident data remains scoped in React Query.
const completedDeliveries = new Map<string, GroupDelivery>();
const pendingDeliveries = new Map<string, Promise<GroupDelivery>>();
const receiptKey = (userId: string, group: IncidentGroupContext) => `ppe.incident-group.delivery.v1:${userId}:${group.groupId}`;

function savedDelivery(userId: string, group: IncidentGroupContext): GroupDelivery | undefined {
  const key = receiptKey(userId, group);
  const memory = completedDeliveries.get(`${key}:${encodeIncidentGroup(group)}`);
  if (memory) return memory;
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) || "null");
    if (saved?.context === encodeIncidentGroup(group) && saved.delivery &&
      ["sent", "recorded", "suppressed", "partial"].includes(saved.delivery.state) &&
      Array.isArray(saved.delivery.deliveredTo)) return saved.delivery as GroupDelivery;
  } catch { /* Storage may be unavailable. The inbox remains the persistent receipt source. */ }
}

function rememberDelivery(userId: string, group: IncidentGroupContext, delivery: GroupDelivery) {
  if (delivery.state === "failed" || delivery.state === "incomplete") return;
  const key = receiptKey(userId, group);
  completedDeliveries.set(`${key}:${encodeIncidentGroup(group)}`, delivery);
  try { sessionStorage.setItem(key, JSON.stringify({ context: encodeIncidentGroup(group), delivery })); } catch { /* Best effort. */ }
}

async function findCompletionReceipt(group: IncidentGroupContext, signal?: AbortSignal): Promise<boolean> {
  for (let page = 1; page <= 100; page++) {
    signal?.throwIfAborted();
    const result = await notificationService.getNotifications({ search: group.groupId, channel: "IN_APP", page, limit: 100 });
    signal?.throwIfAborted();
    if (result.data.some((notification) => isGroupCompletionReceipt(notification.content, notification.incidentId, group))) return true;
    const totalPages = result.meta?.totalPages;
    if (typeof totalPages !== "number" || !Number.isSafeInteger(totalPages) || totalPages < 0) {
      throw new Error("Không thể xác minh thông báo tổng kết trước đó.");
    }
    if (page >= totalPages) return false;
  }
  throw new Error("Chưa đọc được đầy đủ thông báo tổng kết.");
}

/** Every completion attempt re-reads all members. Delivery failure never rolls back saved remediation. */
export async function ensureIncidentGroupCompletion(params: {
  group: IncidentGroupContext; userId: string; officerName?: string; retryDelivery?: boolean;
  signal?: AbortSignal;
}): Promise<GroupCompletionResult> {
  const { group, userId, officerName, retryDelivery } = params;
  const snapshot = await loadIncidentGroup(group, params.signal);
  if (userId !== group.assignedTo || !groupProgress(group, snapshot.rows).complete) {
    return { snapshot, delivery: { state: "incomplete", deliveredTo: [] } };
  }
  const key = `${receiptKey(userId, group)}:${encodeIncidentGroup(group)}`;
  const previous = savedDelivery(userId, group);
  if (previous && (!retryDelivery || previous.state === "sent" || previous.state === "recorded")) return { snapshot, delivery: previous };
  let pending = pendingDeliveries.get(key);
  if (!pending) {
    pending = (async (): Promise<GroupDelivery> => {
      try {
        // A receipt from a previous browser/device prevents an automatic duplicate.
        if (!previous && await findCompletionReceipt(group, params.signal)) {
          const delivery: GroupDelivery = { state: "recorded", deliveredTo: [] };
          rememberDelivery(userId, group, delivery);
          return delivery;
        }
        const recipients = [...new Set([group.assignedBy, group.assignedTo])]
          .filter((id) => !previous?.deliveredTo.includes(id));
        const description = appendIncidentGroupLink(
          `${RESOLVED_REPORT_PREFIX} ${officerName || "Cán bộ an toàn"} đã khắc phục ${group.incidentIds.length}/${group.incidentIds.length} sự cố trong nhóm. Chờ quản lý nghiệm thu. Hoàn tất: ${new Date().toISOString()}.`,
          group, env.appUrl,
        );
        const representative = snapshot.rows[0].incident!;
        params.signal?.throwIfAborted();
        const result = await notificationService.triggerIncidentNotification({
          incidentId: representative.id, siteId: representative.siteId, cameraId: representative.cameraId,
          cameraCode: representative.cameraCode, siteName: representative.siteName,
          violationType: representative.violationType, severity: "NORMAL", description,
          recipientUserIds: recipients, channels: ["IN_APP"],
        });
        const deliveredTo = [...new Set([...(previous?.deliveredTo ?? []),
          ...(result.dispatchedCount > 0 ? result.notifications.filter((row) => row.channel === "IN_APP" && row.status === "SENT").map((row) => row.userId) : []),
        ])];
        const delivery: GroupDelivery = { state: deliveredTo.includes(group.assignedBy) ? "sent" : deliveredTo.length ? "partial" : "suppressed", deliveredTo };
        rememberDelivery(userId, group, delivery);
        return delivery;
      } catch (error) {
        return { state: "failed", deliveredTo: previous?.deliveredTo ?? [],
          message: error instanceof Error ? error.message : "Không gửi được tổng kết nhóm." };
      }
    })();
    pendingDeliveries.set(key, pending);
  }
  try { return { snapshot, delivery: await pending }; }
  finally { if (pendingDeliveries.get(key) === pending) pendingDeliveries.delete(key); }
}
