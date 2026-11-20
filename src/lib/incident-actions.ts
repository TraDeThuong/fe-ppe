import { incidentService } from "@/services/incident.service";
import { notificationService } from "@/services/notification.service";
import {
  buildDispatchSignalDescription,
  buildResolvedReportDescription,
  runInBatches,
} from "./incident-workflow";
import { EVIDENCE_TYPE, type IncidentItem, type NotificationSeverity, type DispatchIncidentNotificationPayload } from "@/types";
import { env } from "@/config/env";
import { appendIncidentGroupLink, isIncidentGroup, type IncidentGroupContext } from "./incident-group";

function getTrustedEvidenceDownloadPath(incident: IncidentItem): string | undefined {
  const snap =
    incident.evidences?.find((e) => e.evidenceType === EVIDENCE_TYPE.SNAPSHOT) ||
    incident.evidences?.[0];
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

export interface DispatchIncidentsResult {
  assignedCount: number;
  assignedIds: string[];
  failedCount: number;
  failedItems: Array<{ id: string; stage: "review" | "assignment"; message: string }>;
  signalSent: boolean;
  group?: IncidentGroupContext;
  notificationPayload?: DispatchIncidentNotificationPayload;
}

export async function sendDispatchSignal(payload: DispatchIncidentNotificationPayload): Promise<boolean> {
  const result = await notificationService.triggerIncidentNotification(payload);
  return result.dispatchedCount > 0 && result.notifications.some(
    (notification) => notification.status === "SENT" && payload.recipientUserIds?.includes(notification.userId),
  );
}

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
    } catch (error) { reviewError = error instanceof Error ? error.message : reviewError; }
  }
  const eligible = incidents.filter((incident) => {
    if (incident.status === "CONFIRMED" || (incident.status === "PENDING_REVIEW" && reviewed.has(incident.id))) return true;
    result.failedItems.push({ id: incident.id, stage: "review", message: reviewError });
    return false;
  });
  const { succeeded, failed } = await runInBatches(eligible, 4, async (incident) => {
    const fresh = groupDispatch ? await incidentService.getIncidentById(incident.id) : incident;
    // The selected pending snapshot was confirmed above; group mode verifies the server's current state.
    if (groupDispatch && fresh.status !== "CONFIRMED") throw new Error("Sự cố không còn ở trạng thái đã xác nhận.");
    await incidentService.assignOfficer(incident.id, { assignedTo });
    return fresh;
  });
  for (const failure of failed) result.failedItems.push({ id: failure.item.id, stage: "assignment",
    message: failure.error instanceof Error ? failure.error.message : "Không thể phân công sự cố." });
  result.assignedCount = succeeded.length;
  result.assignedIds = succeeded.map((incident) => incident.id);
  result.failedCount = result.failedItems.length;
  if (draft && succeeded.length) result.group = { ...draft, incidentIds: result.assignedIds };
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

export async function resolveIncidentsWithReport(params: {
  incidents: readonly IncidentItem[];
  resolutionNote: string;
  afterFixFile?: File | null;
  closeImmediately?: boolean;
  officerName?: string;
}): Promise<{
  resolvedCount: number;
  closedCount: number;
  failedCount: number;
  reportSignalSent: boolean;
}> {
  const { incidents, resolutionNote, afterFixFile, closeImmediately, officerName } = params;
  if (incidents.length === 0) {
    return { resolvedCount: 0, closedCount: 0, failedCount: 0, reportSignalSent: false };
  }

  let closedCount = 0;

  const { succeeded, failed } = await runInBatches(incidents, 4, async (inc) => {
    if (afterFixFile) {
      await incidentService.uploadEvidenceDirect({
        incidentId: inc.id,
        cameraId: inc.cameraId,
        evidenceType: EVIDENCE_TYPE.SNAPSHOT,
        file: afterFixFile,
        fileName: `after_fix_${afterFixFile.name}`,
      });
    }

    const updated = await incidentService.resolveIncident(inc.id, {
      resolutionNote,
    });

    if (closeImmediately) {
      try {
        await incidentService.closeIncident(inc.id, {
          closeNote: resolutionNote,
        });
        closedCount += 1;
      } catch {
        // Bỏ qua lỗi đóng nếu quyền hoặc trạng thái không cho phép
      }
    }

    return updated;
  });

  let reportSignalSent = false;
  const rep = succeeded[0];
  if (rep && !closeImmediately) {
    try {
      const sent = await notificationService.triggerIncidentNotification({
        incidentId: rep.id,
        siteId: rep.siteId,
        cameraId: rep.cameraId,
        cameraCode: rep.cameraCode || incidents[0]?.cameraCode,
        siteName: rep.siteName || incidents[0]?.siteName,
        violationType: rep.violationType,
        severity: "NORMAL",
        description: buildResolvedReportDescription({
          count: succeeded.length,
          cameraLabel: summarizeCameraLabels(incidents),
          resolutionNote,
          officerName,
        }),
        evidenceUrl: getTrustedEvidenceDownloadPath(incidents[0] || rep),
        channels: ["IN_APP"],
      });
      reportSignalSent = sent.dispatchedCount > 0;
    } catch {
      // Không chặn quy trình resolve nếu notification tạm lỗi
    }
  }

  return {
    resolvedCount: succeeded.length,
    closedCount,
    failedCount: failed.length,
    reportSignalSent,
  };
}
