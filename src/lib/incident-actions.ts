import { incidentService } from "@/services/incident.service";
import { notificationService } from "@/services/notification.service";
import {
  buildDispatchSignalDescription,
  buildResolvedReportDescription,
  runInBatches,
} from "./incident-workflow";
import { EVIDENCE_TYPE, type IncidentItem, type NotificationSeverity } from "@/types";

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

export async function dispatchIncidentsWithSignal(params: {
  incidents: readonly IncidentItem[];
  assignedTo: string;
  note?: string;
  managerName?: string;
}): Promise<{ assignedCount: number; failedCount: number; signalSent: boolean }> {
  const { incidents, assignedTo, note, managerName } = params;
  if (incidents.length === 0) {
    return { assignedCount: 0, failedCount: 0, signalSent: false };
  }

  const pendingIds = incidents
    .filter((i) => i.status === "PENDING_REVIEW")
    .map((i) => i.id);

  if (pendingIds.length > 0) {
    await incidentService.batchReviewIncidents({
      ids: pendingIds,
      action: "CONFIRM",
    });
  }

  const { succeeded, failed } = await runInBatches(incidents, 4, (inc) =>
    incidentService.assignOfficer(inc.id, { assignedTo }).then(() => inc),
  );

  let signalSent = false;
  const rep = succeeded[0];
  if (rep) {
    try {
      await notificationService.triggerIncidentNotification({
        incidentId: rep.id,
        siteId: rep.siteId,
        cameraId: rep.cameraId,
        cameraCode: rep.cameraCode,
        siteName: rep.siteName,
        violationType: rep.violationType,
        severity: (rep.severity || "HIGH") as NotificationSeverity,
        description: buildDispatchSignalDescription({
          count: succeeded.length,
          cameraLabel: summarizeCameraLabels(succeeded),
          note,
          managerName,
        }),
        evidenceUrl: getTrustedEvidenceDownloadPath(rep),
        recipientUserIds: [assignedTo],
        channels: ["IN_APP", "EMAIL"],
      });
      signalSent = true;
    } catch {
      // Không làm hỏng luồng phân công nếu notification service tạm chậm
    }
  }

  return {
    assignedCount: succeeded.length,
    failedCount: failed.length,
    signalSent,
  };
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
      try {
        await incidentService.uploadEvidenceDirect({
          incidentId: inc.id,
          cameraId: inc.cameraId,
          evidenceType: EVIDENCE_TYPE.SNAPSHOT,
          file: afterFixFile,
          fileName: `after_fix_${afterFixFile.name}`,
        });
      } catch {
        // Upload ảnh sau khắc phục là tùy chọn, không chặn resolve
      }
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
      await notificationService.triggerIncidentNotification({
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
      reportSignalSent = true;
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
