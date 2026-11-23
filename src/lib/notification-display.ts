import { BROADCAST_USER_ID } from "@/lib/notification-inbox";
import { notificationIncidentTarget } from "@/lib/incident-group";
import {
  COMMENT_SIGNAL_PREFIX,
  DISPATCH_SIGNAL_PREFIX,
  RESOLVED_REPORT_PREFIX,
} from "@/lib/incident-workflow";
import { stripEmojis } from "@/lib/strip-emojis";
import type { NotificationItemDto } from "@/types";

export type NotificationDisplayKind =
  | "DISPATCH"
  | "RESOLVED"
  | "COMMENT"
  | "PPE_ALERT"
  | "BROADCAST"
  | "SYSTEM";

const VIOLATION_LABELS: Record<string, { vi: string; en: string }> = {
  NO_HELMET: { vi: "Không đội mũ bảo hộ", en: "No Hard Hat" },
  NO_HARDHAT: { vi: "Không đội mũ bảo hộ", en: "No Hard Hat" },
  NO_VEST: { vi: "Không mặc áo phản quang", en: "No Safety Vest" },
  NO_BOOTS: { vi: "Không mang giày bảo hộ", en: "No Safety Boots" },
  NO_GLOVES: { vi: "Không đeo găng tay bảo hộ", en: "No Safety Gloves" },
  NO_MASK: { vi: "Không đeo khẩu trang", en: "No Mask" },
  RESTRICTED_AREA: { vi: "Xâm nhập vùng cấm", en: "Restricted Area Entry" },
  RESTRICTED_ZONE: { vi: "Vào khu vực cấm", en: "Restricted Zone Entry" },
  MULTI_VIOLATION: { vi: "Nhiều vi phạm PPE", en: "Multiple PPE Violations" },
};

const VIOLATION_CODE_RE =
  /\b(NO_HELMET|NO_HARDHAT|NO_VEST|NO_BOOTS|NO_GLOVES|NO_MASK|RESTRICTED_AREA|RESTRICTED_ZONE|MULTI_VIOLATION)\b/i;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Chuyển mã loại vi phạm PPE sang nhãn thân thiện theo ngôn ngữ hiện tại.
 */
export function formatViolationTypeLabel(
  violationType?: string | null,
  isVietnamese = true,
): string {
  if (!violationType) {
    return isVietnamese ? "Vi phạm bảo hộ PPE" : "PPE Violation";
  }
  const key = violationType.toUpperCase().trim();
  const mapped = VIOLATION_LABELS[key];
  if (mapped) {
    return isVietnamese ? mapped.vi : mapped.en;
  }
  return violationType;
}

/**
 * Định dạng thời gian tương đối ngắn gọn cho danh sách thông báo.
 */
export function formatRelativeNotificationTime(
  dateString: string | Date | null | undefined,
  isVietnamese: boolean,
): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (!Number.isFinite(date.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return isVietnamese ? "Vừa xong" : "Just now";
  if (diffMin < 60)
    return isVietnamese ? `${diffMin} phút trước` : `${diffMin}m ago`;
  if (diffHour < 24)
    return isVietnamese ? `${diffHour} giờ trước` : `${diffHour}h ago`;
  if (diffDay === 1) return isVietnamese ? "Hôm qua" : "Yesterday";
  if (diffDay < 7)
    return isVietnamese ? `${diffDay} ngày trước` : `${diffDay}d ago`;

  return date.toLocaleDateString(isVietnamese ? "vi-VN" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Định dạng mốc thời gian đầy đủ (giờ:phút · ngày/tháng/năm).
 */
export function formatExactNotificationTime(
  dateString: string | Date | null | undefined,
  locale = "vi-VN",
): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (!Number.isFinite(date.getTime())) return "—";
  return date.toLocaleString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export interface ParsedNotificationDisplay {
  kind: NotificationDisplayKind;
  cleanTitle: string;
  cleanBody: string;
  directiveNote?: string;
  resolutionNote?: string;
  commentAuthor?: string;
  commentText?: string;
  violationCode?: string;
  violationLabel?: string;
  siteName?: string;
  cameraCode?: string;
  zoneName?: string;
  incidentId?: string;
  incidentHref: string | null;
  isGroupLink: boolean;
  groupCount: number;
  isLegacyDispatch: boolean;
  isBroadcast: boolean;
}

function replaceViolationCodesInText(text: string, isVietnamese: boolean): string {
  return text.replace(
    /\b(NO_HELMET|NO_HARDHAT|NO_VEST|NO_BOOTS|NO_GLOVES|NO_MASK|RESTRICTED_AREA|RESTRICTED_ZONE|MULTI_VIOLATION)\b/gi,
    (match) => formatViolationTypeLabel(match, isVietnamese),
  );
}

/**
 * Chuẩn hóa tiêu đề, nội dung và trích xuất metadata có cấu trúc từ bản ghi NotificationItemDto.
 */
export function parseNotificationDisplay(
  notification: NotificationItemDto,
  isVietnamese = true,
): ParsedNotificationDisplay {
  const meta = ((notification as unknown as { metadata?: Record<string, unknown>; data?: Record<string, unknown> })
    .metadata ||
    (notification as unknown as { data?: Record<string, unknown> }).data ||
    {}) as Record<string, unknown>;

  const rawTitle = stripEmojis(notification.title || "").trim();
  const targetIncidentId =
    (notification.incidentId ||
      (typeof meta.incidentId === "string" ? meta.incidentId : undefined) ||
      (notification.type === "PPE_VIOLATION" && typeof meta.id === "string"
        ? meta.id
        : undefined)) ??
    undefined;

  const incidentTarget = notificationIncidentTarget({
    incidentId: targetIncidentId,
    content: notification.content || "",
  });

  const rawBody = stripEmojis(incidentTarget.content || "").trim();
  const isBroadcast = notification.userId === BROADCAST_USER_ID;

  // Xác định loại thông báo
  let kind: NotificationDisplayKind = "SYSTEM";
  if (rawBody.startsWith(DISPATCH_SIGNAL_PREFIX)) {
    kind = "DISPATCH";
  } else if (rawBody.startsWith(RESOLVED_REPORT_PREFIX)) {
    kind = "RESOLVED";
  } else if (
    rawBody.startsWith(COMMENT_SIGNAL_PREFIX) ||
    notification.type === "INCIDENT_COMMENT"
  ) {
    kind = "COMMENT";
  } else if (
    notification.type === "PPE_VIOLATION" ||
    Boolean(targetIncidentId) ||
    VIOLATION_CODE_RE.test(rawTitle) ||
    VIOLATION_CODE_RE.test(rawBody) ||
    /vi phạm\s*ppe|bảo hộ/i.test(rawTitle)
  ) {
    kind = "PPE_ALERT";
  } else if (isBroadcast) {
    kind = "BROADCAST";
  }

  // Trích xuất violationCode từ metadata hoặc text
  const rawViolationMeta =
    typeof meta.violationType === "string" ? meta.violationType : undefined;
  const violationMatch =
    rawViolationMeta?.match(VIOLATION_CODE_RE) ||
    rawTitle.match(VIOLATION_CODE_RE) ||
    rawBody.match(VIOLATION_CODE_RE);
  const violationCode = rawViolationMeta
    ? rawViolationMeta.toUpperCase().trim()
    : violationMatch?.[1]?.toUpperCase();
  const violationLabel = violationCode
    ? formatViolationTypeLabel(violationCode, isVietnamese)
    : undefined;

  // Trích xuất mã camera từ metadata hoặc nội dung chuẩn
  const metaCam =
    typeof meta.cameraCode === "string" && !UUID_RE.test(meta.cameraCode)
      ? meta.cameraCode
      : typeof meta.cameraId === "string" && !UUID_RE.test(meta.cameraId)
        ? meta.cameraId
        : undefined;
  const camMatch =
    rawBody.match(/tại vị trí camera\s+([A-Za-z0-9_-]+)/i) ||
    rawBody.match(
      /tại\s+([A-Z0-9][A-Z0-9_-]{1,24})(?=\s+(?:cho bạn|với|lúc)|[:.,]|$)/,
    );
  const cameraCode =
    metaCam || (camMatch?.[1] && !UUID_RE.test(camMatch[1]) ? camMatch[1] : undefined);

  // Trích xuất tên công trường từ metadata hoặc tiêu đề chuẩn
  const metaSite =
    typeof meta.siteName === "string" && !UUID_RE.test(meta.siteName)
      ? meta.siteName
      : undefined;
  const siteTitleMatch = rawTitle.match(/\btại\s+(.+)$/i);
  const parsedSite = siteTitleMatch?.[1]?.trim();
  const siteName =
    metaSite ||
    (parsedSite &&
    parsedSite.toLowerCase() !== "công trường" &&
    !UUID_RE.test(parsedSite)
      ? parsedSite
      : undefined);

  const zoneName =
    typeof meta.zoneName === "string" ? meta.zoneName : undefined;

  // Làm sạch tiêu đề: bỏ tag [CRITICAL]/[HIGH]/... trùng lặp với badge và dịch mã vi phạm
  const titleWithoutBrackets = rawTitle
    .replace(/\s*\[(CRITICAL|HIGH|NORMAL|MEDIUM|LOW)\]\s*/gi, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+:/g, ":")
    .trim();
  const cleanTitle = replaceViolationCodesInText(titleWithoutBrackets, isVietnamese) || rawTitle;

  // Làm sạch nội dung & tách ghi chú chỉ đạo / nghiệm thu / bình luận
  let cleanBody = rawBody;
  let directiveNote: string | undefined;
  let resolutionNote: string | undefined;
  let commentAuthor: string | undefined;
  let commentText: string | undefined;

  if (kind === "DISPATCH") {
    cleanBody = cleanBody.slice(DISPATCH_SIGNAL_PREFIX.length).trim();
    const directiveSplit = cleanBody.split(/\s*—\s*Chỉ đạo:\s*/i);
    if (directiveSplit.length > 1) {
      cleanBody = directiveSplit[0].trim();
      directiveNote = directiveSplit.slice(1).join(" — ").trim();
    }
  } else if (kind === "RESOLVED") {
    cleanBody = cleanBody.slice(RESOLVED_REPORT_PREFIX.length).trim();
    const colonIdx = cleanBody.indexOf(":");
    if (colonIdx > 0 && colonIdx < cleanBody.length - 1) {
      resolutionNote = cleanBody.slice(colonIdx + 1).trim();
      cleanBody = cleanBody.slice(0, colonIdx).trim();
    }
  } else if (kind === "COMMENT") {
    const withoutPrefix = cleanBody.startsWith(COMMENT_SIGNAL_PREFIX)
      ? cleanBody.slice(COMMENT_SIGNAL_PREFIX.length).trim()
      : cleanBody;
    const metaAuthor =
      typeof meta.authorName === "string" && meta.authorName.trim()
        ? meta.authorName.trim()
        : undefined;
    const colonIdx = withoutPrefix.indexOf(":");
    if (colonIdx > 0 && colonIdx < withoutPrefix.length - 1) {
      commentAuthor = metaAuthor || withoutPrefix.slice(0, colonIdx).trim();
      commentText = withoutPrefix.slice(colonIdx + 1).trim();
      cleanBody = commentText;
    } else {
      commentAuthor = metaAuthor;
      commentText = withoutPrefix;
      cleanBody = withoutPrefix;
    }
  } else {
    // Bỏ câu "Mức độ: CRITICAL." dư thừa nếu đã có badge mức độ
    cleanBody = cleanBody
      .replace(/\s*Mức độ:\s*(CRITICAL|HIGH|NORMAL|MEDIUM|LOW)\.?\s*/gi, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  cleanBody = replaceViolationCodesInText(cleanBody, isVietnamese);

  const groupCount = incidentTarget.group?.incidentIds.length ?? 0;
  const incidentHref =
    kind === "COMMENT" && targetIncidentId && !incidentTarget.group
      ? `/incidents/${encodeURIComponent(targetIncidentId)}?focus=comments`
      : incidentTarget.href;

  return {
    kind,
    cleanTitle,
    cleanBody,
    directiveNote,
    resolutionNote,
    commentAuthor,
    commentText,
    violationCode,
    violationLabel,
    siteName,
    cameraCode,
    zoneName,
    incidentId: targetIncidentId,
    incidentHref,
    isGroupLink: Boolean(incidentTarget.group),
    groupCount,
    isLegacyDispatch: incidentTarget.legacy,
    isBroadcast,
  };
}
