import { incidentService } from "@/services/incident.service";
import { notificationService } from "@/services/notification.service";
import {
  buildDispatchSignalDescription,
  buildResolvedReportDescription,
  runInBatches,
} from "./incident-workflow";
import {
  EVIDENCE_TYPE,
  type DispatchIncidentNotificationPayload,
  type EvidenceItem,
  type IncidentItem,
  type NotificationSeverity,
  type SharedResolutionEvidencePayload,
} from "@/types";
import { env } from "@/config/env";
import { appendIncidentGroupLink, isIncidentGroup, type IncidentGroupContext } from "./incident-group";

/** BE giới hạn mỗi lệnh batch tối đa 100 id. */
const BATCH_CHUNK_SIZE = 100;
const SAMPLE_SNAPSHOT_RE = /(?:^|\/)images\/camera-live-evidence\.jpg(?:$|[?#])/i;
const VIDEO_FILE_RE = /\.(mp4|webm|mov|m4v|avi|mkv)(?:$|[?#])/i;

/**
 * Đường dẫn bằng chứng nội bộ mà notification-service chấp nhận (`isSafeInternalEvidencePath`):
 * service tự tải ảnh qua kênh M2M nên đường dẫn không hết hạn như presigned URL và không lộ host MinIO.
 * Ưu tiên ảnh vi phạm SNAPSHOT, bỏ video.
 */
export function getTrustedEvidenceDownloadPath(incident: IncidentItem): string | undefined {
  const images = (incident.evidences ?? []).filter((e) =>
    Boolean(e.id) &&
    e.evidenceType !== EVIDENCE_TYPE.VIDEO_CLIP &&
    !String(e.mimeType || "").toLowerCase().startsWith("video/") &&
    !VIDEO_FILE_RE.test(e.fileName || e.storageKey || "") &&
    // Ảnh mẫu tĩnh của trang camera không phải ảnh vi phạm thật
    !SAMPLE_SNAPSHOT_RE.test(e.storageKey || "") && !SAMPLE_SNAPSHOT_RE.test(e.url || ""),
  );
  const snap = images.find((e) => e.evidenceType === EVIDENCE_TYPE.SNAPSHOT) || images[0];
  return snap?.id ? `/api/v1/incidents/evidences/${snap.id}/download` : undefined;
}

function summarizeCameraLabels(incidents: readonly IncidentItem[]): string {
  const labels = new Set<string>();
  for (const inc of incidents) {
    labels.add(inc.cameraCode || inc.cameraName || inc.cameraId.slice(0, 8));
  }
  const arr = Array.from(labels);
  if (arr.length === 0) return "";
  if (arr.length <= 3) return arr.join(", ");
  return `${arr.slice(0, 3).join(", ")} (+${arr.length - 3})`;
}

function chunk<T>(items: readonly T[], size = BATCH_CHUNK_SIZE): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * BE đang chạy chưa có endpoint batch (container build trước khi có batch-assign/resolve/close)
 * → 404/405/501. Chỉ khi đó mới chuyển sang luồng gọi từng sự cố; lỗi khác vẫn báo cho người dùng.
 */
export function isBatchEndpointMissing(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("status" in error)) return false;
  const status = Number((error as { status?: unknown }).status);
  return status === 404 || status === 405 || status === 501;
}

export interface DispatchIncidentsResult {
  assignedCount: number;
  assignedIds: string[];
  failedCount: number;
  failedItems: Array<{ id: string; stage: "review" | "assignment"; message: string }>;
  signalSent: boolean;
  /** true khi BE (batch-assign) tự gửi thông báo giao việc; FE không gửi thêm để tránh trùng. */
  notifiedByServer?: boolean;
  group?: IncidentGroupContext;
  notificationPayload?: DispatchIncidentNotificationPayload;
}

export async function sendDispatchSignal(payload: DispatchIncidentNotificationPayload): Promise<boolean> {
  const result = await notificationService.triggerIncidentNotification(payload);
  return result.dispatchedCount > 0 && result.notifications.some(
    (notification) => notification.status === "SENT" && payload.recipientUserIds?.includes(notification.userId),
  );
}

const ASSIGN_SKIPPED_MESSAGE =
  "BE không phân công được (sự cố không còn ở trạng thái đã xác nhận hoặc ngoài phạm vi công trường).";

/**
 * Xác nhận (nếu đang chờ duyệt) rồi giao sự cố cho 1 cán bộ.
 * - Ưu tiên `POST /incidents/batch-assign`: 1 request cho tối đa 100 sự cố, BE kiểm tra người nhận
 *   thuộc công trường và tự gửi 1 thông báo giao việc.
 * - Chỉ khi BE chưa có endpoint (404) mới gọi `POST /:id/assignments` từng sự cố và tự gửi tín hiệu.
 */
export async function dispatchIncidentsWithSignal(params: {
  incidents: readonly IncidentItem[];
  assignedTo: string;
  note?: string;
  managerName?: string;
  managerId?: string;
  groupDispatch?: boolean;
}): Promise<DispatchIncidentsResult> {
  const { assignedTo, note, managerName, groupDispatch, managerId } = params;
  const incidents = [...new Map(params.incidents.map((incident) => [incident.id, incident])).values()]
    .sort((a, b) => Date.parse(a.detectedAt) - Date.parse(b.detectedAt) || a.id.localeCompare(b.id));
  const result: DispatchIncidentsResult = { assignedCount: 0, assignedIds: [], failedCount: 0, failedItems: [], signalSent: false };
  if (!incidents.length) return result;
  const draft: IncidentGroupContext | undefined = groupDispatch ? {
    v: 1, groupId: crypto.randomUUID(), incidentIds: incidents.map((incident) => incident.id),
    assignedBy: managerId || "", assignedTo, createdAt: new Date().toISOString(),
  } : undefined;
  if (draft && !isIncidentGroup(draft)) throw new Error("Nhóm giao xử lý không hợp lệ hoặc vượt 100 sự cố.");

  const pendingIds = incidents.filter((incident) => incident.status === "PENDING_REVIEW").map((incident) => incident.id);
  const reviewed = new Set<string>();
  let reviewError = "Sự cố chưa được xác nhận thành công.";
  if (pendingIds.length) {
    try {
      const response = await incidentService.batchReviewIncidents({ ids: pendingIds, action: "CONFIRM" });
      for (const id of response.updatedIds || []) reviewed.add(id);
    } catch (error) { reviewError = errorMessage(error, reviewError); }
  }
  const eligible = incidents.filter((incident) => {
    if (incident.status === "CONFIRMED" || (incident.status === "PENDING_REVIEW" && reviewed.has(incident.id))) return true;
    result.failedItems.push({ id: incident.id, stage: "review", message: reviewError });
    return false;
  });

  const assigned = new Set<string>();
  let useLegacy = false;
  for (const ids of chunk(eligible.map((incident) => incident.id))) {
    try {
      const res = await incidentService.batchAssignIncidents({ ids, assignedTo, ...(note ? { note } : {}) });
      for (const id of res.assignedIds || []) assigned.add(id);
      for (const id of ids) {
        if (!assigned.has(id)) result.failedItems.push({ id, stage: "assignment", message: ASSIGN_SKIPPED_MESSAGE });
      }
    } catch (error) {
      if (isBatchEndpointMissing(error) && assigned.size === 0) { useLegacy = true; break; }
      const message = errorMessage(error, "Không thể phân công sự cố.");
      for (const id of ids) result.failedItems.push({ id, stage: "assignment", message });
    }
  }

  if (useLegacy) {
    // BE chưa có batch-assign: BE kiểm tra trạng thái CONFIRMED ở POST /:id/assignments nên không cần GET /:id trước.
    const { succeeded, failed } = await runInBatches(eligible, 4, async (incident) => {
      await incidentService.assignOfficer(incident.id, { assignedTo, ...(note ? { note } : {}) });
      return incident;
    });
    for (const incident of succeeded) assigned.add(incident.id);
    for (const failure of failed) result.failedItems.push({ id: failure.item.id, stage: "assignment",
      message: errorMessage(failure.error, "Không thể phân công sự cố.") });
  }

  const succeeded = eligible.filter((incident) => assigned.has(incident.id));
  result.assignedCount = succeeded.length;
  result.assignedIds = succeeded.map((incident) => incident.id);
  result.failedCount = result.failedItems.length;
  if (draft && succeeded.length) result.group = { ...draft, incidentIds: result.assignedIds };

  if (!useLegacy) {
    result.notifiedByServer = succeeded.length > 0;
    result.signalSent = succeeded.length > 0;
    return result;
  }

  // Luồng cũ: BE không tự báo khi giao từng sự cố nên FE gửi 1 tín hiệu điều phối gộp.
  const rep = succeeded[0];
  if (rep) {
    const description = buildDispatchSignalDescription({ count: succeeded.length,
      cameraLabel: summarizeCameraLabels(succeeded), note, managerName });
    result.notificationPayload = {
      incidentId: rep.id, siteId: rep.siteId, cameraId: rep.cameraId, cameraCode: rep.cameraCode,
      siteName: rep.siteName, violationType: rep.violationType,
      severity: (rep.severity || "HIGH") as NotificationSeverity,
      description: result.group ? appendIncidentGroupLink(description, result.group, env.appUrl) : description,
      evidenceUrl: getTrustedEvidenceDownloadPath(rep), recipientUserIds: [assignedTo], channels: ["IN_APP", "EMAIL"],
    };
    try { result.signalSent = await sendDispatchSignal(result.notificationPayload); }
    catch { /* Keep the exact notification payload so the manager can retry without reassigning. */ }
  }
  return result;
}

export interface ResolveIncidentsResult {
  resolvedCount: number;
  resolvedIds: string[];
  closedCount: number;
  /** Số sự cố đã khắc phục nhưng chưa đóng được (khi chọn "đóng luôn"). */
  closeFailedCount: number;
  failedCount: number;
  /** Lý do lỗi đầu tiên (upload/khắc phục/đóng) để hiển thị cho người dùng. */
  firstError?: string;
  reportSignalSent: boolean;
}

function sharedFromEvidence(evidence: EvidenceItem, file: File): SharedResolutionEvidencePayload {
  return {
    cameraId: evidence.cameraId,
    evidenceType: (evidence.evidenceType as SharedResolutionEvidencePayload["evidenceType"]) || EVIDENCE_TYPE.SNAPSHOT,
    storageKey: evidence.storageKey,
    fileName: evidence.fileName || file.name,
    mimeType: evidence.mimeType || file.type || "image/jpeg",
    fileSize: Number(evidence.fileSize ?? file.size) || 0,
  };
}

/**
 * Báo cáo khắc phục (và có thể đóng luôn) cho một hoặc nhiều sự cố.
 * - Ảnh sau khắc phục chỉ tải lên 1 lần cho mỗi công trường (storageKey của BE gắn theo siteId),
 *   các sự cố còn lại gắn chung tệp đó qua `sharedEvidence` của batch-resolve.
 * - Khắc phục/đóng dùng `batch-resolve` / `batch-close`; 404 → gọi từng sự cố.
 * - Lỗi đóng hồ sơ được đếm vào `closeFailedCount`, không nuốt âm thầm.
 */
export async function resolveIncidentsWithReport(params: {
  incidents: readonly IncidentItem[];
  resolutionNote: string;
  afterFixFile?: File | null;
  closeImmediately?: boolean;
  officerName?: string;
}): Promise<ResolveIncidentsResult> {
  const { resolutionNote, afterFixFile, closeImmediately, officerName } = params;
  const incidents = [...new Map(params.incidents.map((inc) => [inc.id, inc])).values()];
  const empty: ResolveIncidentsResult = {
    resolvedCount: 0, resolvedIds: [], closedCount: 0, closeFailedCount: 0, failedCount: 0, reportSignalSent: false,
  };
  if (incidents.length === 0) return empty;

  const failed = new Set<string>();
  const resolved = new Set<string>();
  let firstError: string | undefined;
  const fail = (ids: readonly string[], error: unknown, fallback: string) => {
    for (const id of ids) failed.add(id);
    firstError ||= errorMessage(error, fallback);
  };

  // 1. Tải ảnh sau khắc phục 1 lần / công trường
  const bySite = new Map<string, IncidentItem[]>();
  for (const inc of incidents) {
    const list = bySite.get(inc.siteId) ?? [];
    list.push(inc);
    bySite.set(inc.siteId, list);
  }
  const sharedBySite = new Map<string, SharedResolutionEvidencePayload>();
  const uploadedOn = new Set<string>();
  if (afterFixFile) {
    for (const [siteId, list] of bySite) {
      const first = list[0];
      try {
        const evidence = await incidentService.uploadEvidenceDirect({
          incidentId: first.id,
          cameraId: first.cameraId,
          evidenceType: EVIDENCE_TYPE.SNAPSHOT,
          file: afterFixFile,
          fileName: `after_fix_${afterFixFile.name}`,
        });
        uploadedOn.add(first.id);
        if (evidence?.storageKey) sharedBySite.set(siteId, sharedFromEvidence(evidence, afterFixFile));
      } catch (error) {
        fail(list.map((inc) => inc.id), error, "Không tải được ảnh sau khắc phục.");
      }
    }
  }
  const toResolve = incidents.filter((inc) => !failed.has(inc.id));

  // 2. Khắc phục qua batch-resolve (nhóm theo cùng tệp dùng chung)
  type ResolveGroup = { ids: string[]; shared?: SharedResolutionEvidencePayload };
  const groups: ResolveGroup[] = [];
  const plainIds: string[] = [];
  for (const [siteId, list] of bySite) {
    const shared = sharedBySite.get(siteId);
    const ids = list.filter((inc) => !failed.has(inc.id)).map((inc) => inc.id);
    if (!shared) { plainIds.push(...ids); continue; }
    // Sự cố đã nhận tệp khi upload không gắn thêm lần nữa
    plainIds.push(...ids.filter((id) => uploadedOn.has(id)));
    const rest = ids.filter((id) => !uploadedOn.has(id));
    if (rest.length) groups.push({ ids: rest, shared });
  }
  if (plainIds.length) groups.unshift({ ids: plainIds });

  let useLegacy = false;
  for (const group of groups) {
    for (const ids of chunk(group.ids)) {
      if (useLegacy) break;
      try {
        const res = await incidentService.batchResolveIncidents({
          ids, resolutionNote, ...(group.shared ? { sharedEvidence: group.shared } : {}),
        });
        for (const id of res.resolvedIds || []) resolved.add(id);
        const skipped = ids.filter((id) => !resolved.has(id));
        if (skipped.length) fail(skipped, null, "Sự cố không còn ở trạng thái chờ khắc phục hoặc không được giao cho bạn.");
      } catch (error) {
        if (isBatchEndpointMissing(error) && resolved.size === 0) { useLegacy = true; break; }
        fail(ids, error, "Không thể báo cáo khắc phục sự cố.");
      }
    }
    if (useLegacy) break;
  }

  if (useLegacy) {
    const sharedOf = (inc: IncidentItem) => sharedBySite.get(inc.siteId);
    const legacy = await runInBatches(toResolve, 4, async (inc) => {
      const shared = sharedOf(inc);
      if (afterFixFile && !uploadedOn.has(inc.id)) {
        if (shared) {
          // Gắn bản ghi bằng chứng trỏ tới tệp đã tải lên, không tải lại cùng ảnh
          await incidentService.addEvidence(inc.id, {
            cameraId: shared.cameraId || inc.cameraId,
            evidenceType: shared.evidenceType || EVIDENCE_TYPE.SNAPSHOT,
            storageKey: shared.storageKey,
            fileName: shared.fileName,
            mimeType: shared.mimeType,
            fileSize: shared.fileSize,
            capturedAt: new Date().toISOString(),
          });
        } else {
          await incidentService.uploadEvidenceDirect({
            incidentId: inc.id, cameraId: inc.cameraId, evidenceType: EVIDENCE_TYPE.SNAPSHOT,
            file: afterFixFile, fileName: `after_fix_${afterFixFile.name}`,
          });
        }
      }
      return incidentService.resolveIncident(inc.id, { resolutionNote });
    });
    for (const inc of legacy.succeeded) resolved.add(inc.id);
    for (const failure of legacy.failed) fail([failure.item.id], failure.error, "Không thể báo cáo khắc phục sự cố.");
  }

  const resolvedIds = toResolve.filter((inc) => resolved.has(inc.id)).map((inc) => inc.id);

  // 3. Đóng luôn (nếu chọn) — lỗi được báo về, không bỏ qua
  let closedCount = 0;
  let closeFailedCount = 0;
  if (closeImmediately && resolvedIds.length) {
    const closed = new Set<string>();
    let closeLegacy = false;
    for (const ids of chunk(resolvedIds)) {
      try {
        const res = await incidentService.batchCloseIncidents({ ids, closeNote: resolutionNote });
        for (const id of res.closedIds || []) closed.add(id);
      } catch (error) {
        if (isBatchEndpointMissing(error) && closed.size === 0) { closeLegacy = true; break; }
        firstError ||= errorMessage(error, "Không thể đóng hồ sơ sự cố.");
      }
    }
    if (closeLegacy) {
      const legacy = await runInBatches(resolvedIds, 4, (id) =>
        incidentService.closeIncident(id, { closeNote: resolutionNote }));
      for (const inc of legacy.succeeded) closed.add(inc.id);
      if (legacy.failed[0]) firstError ||= errorMessage(legacy.failed[0].error, "Không thể đóng hồ sơ sự cố.");
    }
    closedCount = closed.size;
    closeFailedCount = resolvedIds.length - closedCount;
    if (closeFailedCount > 0) firstError ||= "Đã khắc phục nhưng chưa đóng được hồ sơ (kiểm tra quyền hoặc trạng thái).";
  }

  // 4. Tín hiệu báo cáo khắc phục tới Quản lý (BE batch-resolve không tự gửi)
  let reportSignalSent = false;
  const rep = incidents.find((inc) => resolved.has(inc.id));
  if (rep && !closeImmediately) {
    try {
      const sent = await notificationService.triggerIncidentNotification({
        incidentId: rep.id,
        siteId: rep.siteId,
        cameraId: rep.cameraId,
        cameraCode: rep.cameraCode,
        siteName: rep.siteName,
        violationType: rep.violationType,
        severity: "NORMAL",
        description: buildResolvedReportDescription({
          count: resolvedIds.length,
          cameraLabel: summarizeCameraLabels(incidents.filter((inc) => resolved.has(inc.id))),
          resolutionNote,
          officerName,
        }),
        evidenceUrl: getTrustedEvidenceDownloadPath(rep),
        channels: ["IN_APP"],
      });
      reportSignalSent = sent.dispatchedCount > 0;
    } catch {
      // Không chặn quy trình resolve nếu notification tạm lỗi
    }
  }

  return {
    resolvedCount: resolvedIds.length,
    resolvedIds,
    closedCount,
    closeFailedCount,
    failedCount: failed.size,
    ...(firstError ? { firstError } : {}),
    reportSignalSent,
  };
}

export interface CloseIncidentsResult {
  closedIds: string[];
  failedIds: string[];
  firstError?: string;
}

/** Nghiệm thu & đóng hàng loạt qua `batch-close`; 404 → gọi từng sự cố. */
export async function closeIncidentsBatch(ids: readonly string[], closeNote?: string): Promise<CloseIncidentsResult> {
  const unique = [...new Set(ids)];
  const closed = new Set<string>();
  let firstError: string | undefined;
  let legacy = false;
  for (const part of chunk(unique)) {
    try {
      const res = await incidentService.batchCloseIncidents({ ids: part, ...(closeNote ? { closeNote } : {}) });
      for (const id of res.closedIds || []) closed.add(id);
    } catch (error) {
      if (isBatchEndpointMissing(error) && closed.size === 0) { legacy = true; break; }
      firstError ||= errorMessage(error, "Không thể đóng hồ sơ sự cố.");
    }
  }
  if (legacy) {
    const res = await runInBatches(unique, 4, (id) => incidentService.closeIncident(id, closeNote ? { closeNote } : undefined));
    for (const inc of res.succeeded) closed.add(inc.id);
    if (res.failed[0]) firstError ||= errorMessage(res.failed[0].error, "Không thể đóng hồ sơ sự cố.");
  }
  return {
    closedIds: unique.filter((id) => closed.has(id)),
    failedIds: unique.filter((id) => !closed.has(id)),
    ...(firstError ? { firstError } : {}),
  };
}
