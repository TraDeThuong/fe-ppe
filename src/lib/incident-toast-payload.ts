import { notificationIncidentTarget } from "@/lib/incident-group";
import {
  formatViolationTypeLabel,
  parseNotificationDisplay,
} from "@/lib/notification-display";
import { stripEmojis } from "@/lib/strip-emojis";
import type { IncidentAlertKind } from "@/lib/incident-workflow";
import type { IncidentToastInput } from "@ui/toaster";
import type { NotificationItemDto, NotificationSeverity } from "@/types";

export interface IncidentAlertPayload {
  incidentId?: string;
  siteId?: string;
  cameraId?: string;
  cameraCode?: string;
  siteName?: string;
  violationType?: string;
  severity?: string;
  title?: string;
  content?: string;
  description?: string;
  evidenceUrl?: string;
  referenceEvidenceUrl?: string;
  detectedAt?: string;
  [key: string]: unknown;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface BuildIncidentToastParams {
  alertData: IncidentAlertPayload;
  kind: IncidentAlertKind;
  severity: NotificationSeverity;
  isVietnamese: boolean;
  resolveCameraCode?: (cameraId: string) => string | undefined;
  resolveSiteName?: (siteId: string, fallback?: string) => string | undefined;
  onOpenHref?: (href: string) => void;
  onCompareHref?: (href: string) => void;
}

export interface BuiltIncidentToast {
  input: IncidentToastInput;
  toastKey: string;
  burstKey: string;
  incidentHref: string | null;
  compareHref: string | null;
}

function cleanFriendlyCamera(
  alertData: IncidentAlertPayload,
  parsedCamera?: string,
  resolveCameraCode?: (cameraId: string) => string | undefined,
): string | undefined {
  if (alertData.cameraCode && !UUID_REGEX.test(alertData.cameraCode)) {
    return alertData.cameraCode;
  }
  if (parsedCamera && !UUID_REGEX.test(parsedCamera)) {
    return parsedCamera;
  }
  const candidateId =
    alertData.cameraId ||
    (alertData.cameraCode && UUID_REGEX.test(alertData.cameraCode)
      ? alertData.cameraCode
      : undefined);
  if (candidateId && resolveCameraCode) {
    const resolved = resolveCameraCode(candidateId);
    if (resolved && resolved !== "--") return resolved;
  }
  return undefined;
}

function cleanFriendlySite(
  alertData: IncidentAlertPayload,
  parsedSite?: string,
  resolveSiteName?: (siteId: string, fallback?: string) => string | undefined,
): string | undefined {
  if (alertData.siteName && !UUID_REGEX.test(alertData.siteName)) {
    return alertData.siteName;
  }
  if (parsedSite && !UUID_REGEX.test(parsedSite)) {
    return parsedSite;
  }
  const candidateId =
    alertData.siteId ||
    (alertData.siteName && UUID_REGEX.test(alertData.siteName)
      ? alertData.siteName
      : undefined);
  if (candidateId && resolveSiteName) {
    const resolved = resolveSiteName(candidateId, "");
    if (resolved && !UUID_REGEX.test(resolved)) return resolved;
  }
  return undefined;
}

/**
 * Chuẩn hóa payload SSE sự cố thành đầu vào gọn sạch cho WoodenIncidentToast:
 * - Không rò rỉ UUID, mã thô (NO_HELMET, [CRITICAL]) hay emoji
 * - Tạo sẵn liên kết mở trang sự cố (hoặc nhóm xử lý) và đối chiếu
 * - Sinh burstKey ổn định để gom các cảnh báo lặp trên cùng camera & loại vi phạm
 */
export function buildIncidentToastPayload({
  alertData,
  kind,
  severity,
  isVietnamese,
  resolveCameraCode,
  resolveSiteName,
  onOpenHref,
  onCompareHref,
}: BuildIncidentToastParams): BuiltIncidentToast {
  const incidentId = alertData.incidentId;
  const rawContent = alertData.content || alertData.description || "";

  const target = notificationIncidentTarget({
    incidentId,
    content: rawContent,
  });
  const compareTarget = notificationIncidentTarget(
    { incidentId, content: rawContent },
    true,
  );

  // Chuyển sang cấu trúc tối giản tương thích parseNotificationDisplay để dùng chung logic lọc sạch
  const syntheticNotification: NotificationItemDto = {
    id: incidentId || "realtime-alert",
    userId: "",
    incidentId: incidentId ?? null,
    templateId: null,
    channel: "IN_APP",
    title: alertData.title || "",
    content: rawContent,
    severity,
    status: "SENT",
    sentAt: alertData.detectedAt ?? null,
    readAt: null,
    createdAt: alertData.detectedAt || new Date().toISOString(),
    type: "PPE_VIOLATION",
    metadata: {
      cameraCode: alertData.cameraCode,
      cameraId: alertData.cameraId,
      siteName: alertData.siteName,
      siteId: alertData.siteId,
      violationType: alertData.violationType,
    },
  };

  const parsed = parseNotificationDisplay(syntheticNotification, isVietnamese);
  const violationCode =
    alertData.violationType?.toUpperCase().trim() || parsed.violationCode;
  const violationLabel = violationCode
    ? formatViolationTypeLabel(violationCode, isVietnamese)
    : undefined;

  const cameraLabel = cleanFriendlyCamera(
    alertData,
    parsed.cameraCode,
    resolveCameraCode,
  );
  const siteLabel = cleanFriendlySite(
    alertData,
    parsed.siteName,
    resolveSiteName,
  );

  const fallbackTitle =
    kind === "OFFICER_RESOLVED_REPORT"
      ? isVietnamese
        ? "Sự cố đã được khắc phục"
        : "Incident remediated"
      : kind === "MANAGER_DISPATCH"
        ? isVietnamese
          ? "Nhiệm vụ xử lý sự cố mới"
          : "New incident assignment"
        : violationLabel
          ? isVietnamese
            ? `Phát hiện ${violationLabel.toLowerCase()}`
            : `${violationLabel} detected`
          : isVietnamese
            ? "Phát hiện vi phạm bảo hộ PPE"
            : "PPE violation detected";

  const cleanTitle = stripEmojis(parsed.cleanTitle || "").trim() || fallbackTitle;
  const rawDesc =
    kind === "MANAGER_DISPATCH" && parsed.directiveNote
      ? parsed.directiveNote
      : kind === "OFFICER_RESOLVED_REPORT" && parsed.resolutionNote
        ? parsed.resolutionNote
        : parsed.cleanBody;
  const cleanDescription = stripEmojis(rawDesc || "").trim();
  const description =
    cleanDescription &&
    cleanDescription.toLowerCase() !== cleanTitle.toLowerCase()
      ? cleanDescription
      : undefined;

  const incidentHref = target.href;
  const compareHref =
    kind !== "OFFICER_RESOLVED_REPORT" ? compareTarget.href : null;

  const toastKey = `ppe-incident-${kind}-${incidentId || Date.now()}`;
  const burstKey = `${kind}:${cameraLabel || alertData.cameraId || "global"}:${violationCode || "PPE"}`;

  const input: IncidentToastInput = {
    kind,
    violationType: violationCode,
    violationLabel,
    severity,
    title: cleanTitle,
    description,
    cameraLabel,
    siteLabel,
    isGroupTarget: Boolean(target.group),
    groupCount: target.group?.incidentIds.length,
    incidentHref: incidentHref ?? undefined,
    compareHref: compareHref ?? undefined,
    onOpen:
      incidentHref && onOpenHref ? () => onOpenHref(incidentHref) : undefined,
    onCompare:
      compareHref && onCompareHref
        ? () => onCompareHref(compareHref)
        : undefined,
  };

  return {
    input,
    toastKey,
    burstKey,
    incidentHref,
    compareHref,
  };
}
