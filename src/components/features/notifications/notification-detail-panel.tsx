"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Inbox,
  Layers,
  Loader2,
  MapPin,
  Maximize2,
  MessageSquareQuote,
  Radio,
  ShieldAlert,
  Trash2,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCan } from "@/hooks/use-can";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import { useIncidentDetail } from "@/hooks/incidents/use-incident-detail";
import { isNotificationRead } from "@/lib/notification-inbox";
import {
  formatExactNotificationTime,
  formatRelativeNotificationTime,
  formatViolationTypeLabel,
  parseNotificationDisplay,
} from "@/lib/notification-display";
import {
  isDockerInternalMinioUrl,
  resolveEvidenceUrl,
} from "@/lib/evidence-url";
import { incidentService } from "@/services/incident.service";
import { useLocale } from "@/providers/locale-provider";
import {
  getChannelDisplay,
  KIND_META,
  SEVERITY_META,
} from "./notification-meta-badges";
import { EVIDENCE_TYPE } from "@/types/incident.types";
import type { NotificationItemDto } from "@/types";

export interface NotificationDetailPanelProps {
  notification: NotificationItemDto | null;
  onMarkAsRead?: (id: string) => void;
  isMarkingRead?: boolean;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
  onClose?: () => void;
  className?: string;
}

function getIncidentStatusDisplay(status: string | undefined, isVietnamese: boolean) {
  switch (status) {
    case "PENDING_REVIEW":
      return {
        label: isVietnamese ? "Chờ thẩm duyệt" : "Pending Review",
        className:
          "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      };
    case "CONFIRMED":
      return {
        label: isVietnamese ? "Đã xác nhận" : "Confirmed",
        className:
          "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
      };
    case "RESOLVED":
      return {
        label: isVietnamese ? "Đã khắc phục" : "Resolved",
        className:
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      };
    case "CLOSED":
      return {
        label: isVietnamese ? "Đã đóng hồ sơ" : "Closed",
        className: "border-border/50 bg-muted/40 text-muted-foreground",
      };
    case "DISMISSED":
      return {
        label: isVietnamese ? "Đã bác bỏ" : "Dismissed",
        className: "border-border/50 bg-muted/40 text-muted-foreground",
      };
    default:
      return {
        label: status || "—",
        className: "border-border/40 bg-background text-muted-foreground",
      };
  }
}

export function NotificationDetailPanel({
  notification,
  onMarkAsRead,
  isMarkingRead = false,
  onDelete,
  isDeleting = false,
  onClose,
  className = "",
}: NotificationDetailPanelProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const can = useCan();
  const canReadIncidents = can("PPE_INCIDENT_READ");

  const [imgError, setImgError] = useState(false);
  const [signedEvidenceUrl, setSignedEvidenceUrl] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const parsed = useMemo(
    () => (notification ? parseNotificationDisplay(notification, isVietnamese) : null),
    [notification, isVietnamese],
  );

  const incidentId = parsed?.incidentId || "";
  const shouldHydrateIncident = Boolean(incidentId) && canReadIncidents;

  const { data: incident, isLoading: isIncidentLoading } = useIncidentDetail(
    incidentId,
    shouldHydrateIncident,
  );

  const { getSiteName, getZoneName, getCameraCode, getCameraName } =
    useEntityLookup({ enabled: shouldHydrateIncident });

  const snapshotEvidence = useMemo(() => {
    if (!incident?.evidences || incident.evidences.length === 0) return null;
    return (
      incident.evidences.find((e) => e.evidenceType === EVIDENCE_TYPE.SNAPSHOT) ||
      incident.evidences[0]
    );
  }, [incident]);

  const directEvidenceUrl = useMemo(() => {
    if (notification?.evidenceUrl) {
      return resolveEvidenceUrl(notification.evidenceUrl);
    }
    if (incident?.snapshotUrl) {
      return resolveEvidenceUrl(incident.snapshotUrl);
    }
    const rawUrl = snapshotEvidence?.url || snapshotEvidence?.storageKey;
    if (!rawUrl || isDockerInternalMinioUrl(rawUrl)) return "";
    return resolveEvidenceUrl(rawUrl);
  }, [notification?.evidenceUrl, incident?.snapshotUrl, snapshotEvidence]);

  useEffect(() => {
    setImgError(false);
    setSignedEvidenceUrl(null);
    setLightboxOpen(false);

    if (directEvidenceUrl || !snapshotEvidence?.id) return;

    let cancelled = false;
    void incidentService
      .getEvidenceDownloadUrl(snapshotEvidence.id, { action: "VIEW" })
      .then((res) => {
        if (!cancelled && res.downloadUrl && !isDockerInternalMinioUrl(res.downloadUrl)) {
          setSignedEvidenceUrl(res.downloadUrl);
        }
      })
      .catch(() => {
        // Bỏ qua lỗi khi không tải được URL ảnh dự phòng
      });

    return () => {
      cancelled = true;
    };
  }, [directEvidenceUrl, snapshotEvidence?.id, notification?.id]);

  const previewImageUrl = directEvidenceUrl || signedEvidenceUrl || "";

  if (!notification || !parsed) {
    return (
      <aside
        className={`flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-border/30 bg-background p-8 text-center shadow-[inset_3px_3px_8px_var(--shadow-dark),inset_-3px_-3px_8px_var(--shadow-light)] sm:rounded-3xl ${className}`}
      >
        <div className="mb-3 flex size-12 items-center justify-center rounded-2xl border border-border/40 bg-background text-primary shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)]">
          <Inbox className="size-5" />
        </div>
        <h3 className="text-sm font-bold text-foreground">
          {isVietnamese ? "Chọn một thông báo để xem chi tiết" : "Select a notification to inspect"}
        </h3>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          {isVietnamese
            ? "Nội dung đầy đủ, thông tin công trường, camera và ảnh bằng chứng sẽ hiển thị tại đây."
            : "Full message details, site context, camera metadata, and evidence preview appear here."}
        </p>
      </aside>
    );
  }

  const isUnread = !isNotificationRead(notification);
  const severity = notification.severity || "NORMAL";
  const sevConfig = SEVERITY_META[severity] || SEVERITY_META.NORMAL;
  const SeverityIcon = sevConfig.icon;
  const kindConfig = KIND_META[parsed.kind];
  const KindIcon = kindConfig.icon;
  const channelInfo = getChannelDisplay(notification.channel);
  const ChannelIcon = channelInfo.icon;

  const timestamp = notification.sentAt || notification.createdAt;
  const exactTime = formatExactNotificationTime(timestamp, locale);
  const relativeTime = formatRelativeNotificationTime(timestamp, isVietnamese);

  const resolvedSiteName = incident?.siteId
    ? getSiteName(incident.siteId, parsed.siteName || incident.siteName || (isVietnamese ? "Công trường xây dựng" : "Construction Site"))
    : parsed.siteName;
  const resolvedZoneName =
    incident?.siteId && incident?.zoneId
      ? getZoneName(incident.siteId, incident.zoneId, parsed.zoneName || "")
      : parsed.zoneName;
  const resolvedCameraCode = incident?.cameraId
    ? getCameraCode(incident.cameraId, parsed.cameraCode)
    : parsed.cameraCode;
  const resolvedCameraName = incident?.cameraId
    ? getCameraName(incident.cameraId, "")
    : "";
  const resolvedViolationLabel = incident?.violationType
    ? formatViolationTypeLabel(incident.violationType, isVietnamese)
    : parsed.violationLabel;

  const incidentStatusMeta = incident
    ? getIncidentStatusDisplay(incident.status, isVietnamese)
    : null;

  const activeAssignee = incident?.assignments?.find(
    (a) => a.status === "ACTIVE",
  );

  return (
    <aside
      aria-label={isVietnamese ? "Chi tiết thông báo" : "Notification details"}
      className={`group/panel relative overflow-hidden rounded-2xl border border-white/80 bg-surface/95 p-4 shadow-[10px_10px_24px_var(--shadow-dark),-8px_-8px_20px_var(--shadow-light)] transition-all dark:border-white/[0.07] dark:bg-card/95 sm:rounded-3xl sm:p-6 ${className}`}
    >
      {/* Ambient Radial Aura */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 h-52 w-52 rounded-full bg-gradient-to-br from-primary/15 via-accent/10 to-transparent blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-10 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/60 to-transparent"
      />

      <div className="relative space-y-5">
        {/* 1. Header Toolbar */}
        <div className="flex items-start justify-between gap-3 border-b border-border/30 pb-4">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={`flex size-11 shrink-0 items-center justify-center rounded-2xl border shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] ${kindConfig.medallionClass}`}
            >
              <KindIcon className="size-5" />
            </div>

            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${kindConfig.pillClass}`}
                >
                  {isVietnamese ? kindConfig.vi : kindConfig.en}
                </span>

                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${sevConfig.badgeClass}`}
                >
                  <SeverityIcon className="size-3" />
                  <span>{t(sevConfig.labelKey)}</span>
                </span>

                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                    isUnread
                      ? "border-primary/35 bg-primary/10 text-primary"
                      : "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${
                      isUnread ? "bg-primary animate-pulse" : "bg-emerald-500"
                    }`}
                  />
                  <span>
                    {isUnread
                      ? isVietnamese
                        ? "Chưa đọc"
                        : "Unread"
                      : isVietnamese
                        ? "Đã đọc"
                        : "Read"}
                  </span>
                </span>
              </div>

              <h2 className="text-base font-extrabold tracking-tight text-foreground sm:text-lg">
                {parsed.cleanTitle}
              </h2>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5 text-primary/80" />
                  <span>{exactTime}</span>
                  {relativeTime && (
                    <span className="text-muted-foreground/75">({relativeTime})</span>
                  )}
                </span>

                <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                  <ChannelIcon className="size-3 text-primary/80" />
                  <span>{channelInfo.label}</span>
                </span>
              </div>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label={isVietnamese ? "Đóng chi tiết" : "Close details"}
              className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-border/40 bg-background text-muted-foreground shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] transition-all hover:text-primary"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* 2. Message Content Well */}
        <div className="space-y-3">
          <div className="rounded-2xl border border-black/[0.04] bg-background/70 p-4 shadow-[inset_3px_3px_8px_var(--shadow-dark),inset_-3px_-3px_8px_var(--shadow-light)] dark:border-white/[0.05] dark:bg-background/45">
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
              {parsed.cleanBody}
            </p>
          </div>

          {parsed.directiveNote && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-3.5 text-xs">
              <MessageSquareQuote className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="space-y-0.5">
                <p className="font-bold text-amber-800 dark:text-amber-300">
                  {isVietnamese ? "Chỉ đạo xử lý từ Quản lý" : "Manager Directive"}
                </p>
                <p className="leading-relaxed text-foreground/90">
                  {parsed.directiveNote}
                </p>
              </div>
            </div>
          )}

          {parsed.resolutionNote && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.07] p-3.5 text-xs">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div className="space-y-0.5">
                <p className="font-bold text-emerald-800 dark:text-emerald-300">
                  {isVietnamese ? "Nội dung báo cáo khắc phục" : "Resolution Summary"}
                </p>
                <p className="leading-relaxed text-foreground/90">
                  {parsed.resolutionNote}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 3. Structured Context & Telemetry Grid */}
        {parsed.incidentId ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {isVietnamese ? "Thông tin sự cố liên quan" : "Linked Incident Context"}
              </h3>
              {isIncidentLoading && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Loader2 className="size-3 animate-spin text-primary" />
                  <span>{isVietnamese ? "Đang đồng bộ..." : "Syncing..."}</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {/* Công trường / Khu vực */}
              <div className="rounded-xl border border-black/[0.04] bg-background/60 p-3 shadow-[inset_2px_2px_6px_var(--shadow-dark),inset_-2px_-2px_6px_var(--shadow-light)] dark:border-white/[0.04]">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                  <MapPin className="size-3.5 text-primary" />
                  <span>{isVietnamese ? "Công trường & Khu vực" : "Site & Zone"}</span>
                </div>
                <p className="mt-1 truncate text-xs font-bold text-foreground">
                  {resolvedSiteName || (isVietnamese ? "Chưa xác định" : "Unspecified")}
                </p>
                {resolvedZoneName && (
                  <p className="truncate text-[11px] text-muted-foreground">
                    {resolvedZoneName}
                  </p>
                )}
              </div>

              {/* Camera giám sát */}
              <div className="rounded-xl border border-black/[0.04] bg-background/60 p-3 shadow-[inset_2px_2px_6px_var(--shadow-dark),inset_-2px_-2px_6px_var(--shadow-light)] dark:border-white/[0.04]">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                  <Camera className="size-3.5 text-primary" />
                  <span>{isVietnamese ? "Camera giám sát" : "Surveillance Camera"}</span>
                </div>
                <p className="mt-1 truncate font-mono text-xs font-bold text-foreground">
                  {resolvedCameraCode || "--"}
                </p>
                {resolvedCameraName && (
                  <p className="truncate text-[11px] text-muted-foreground">
                    {resolvedCameraName}
                  </p>
                )}
              </div>

              {/* Loại vi phạm */}
              <div className="rounded-xl border border-black/[0.04] bg-background/60 p-3 shadow-[inset_2px_2px_6px_var(--shadow-dark),inset_-2px_-2px_6px_var(--shadow-light)] dark:border-white/[0.04]">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                  <ShieldAlert className="size-3.5 text-danger" />
                  <span>{isVietnamese ? "Loại vi phạm" : "Violation Type"}</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-bold text-foreground">
                    {resolvedViolationLabel || (isVietnamese ? "Cảnh báo an toàn" : "Safety Alert")}
                  </span>
                  {typeof incident?.confidence === "number" && (
                    <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">
                      {Math.round(incident.confidence * (incident.confidence <= 1 ? 100 : 1))}% AI
                    </span>
                  )}
                </div>
              </div>

              {/* Trạng thái sự cố / Nhóm xử lý */}
              <div className="rounded-xl border border-black/[0.04] bg-background/60 p-3 shadow-[inset_2px_2px_6px_var(--shadow-dark),inset_-2px_-2px_6px_var(--shadow-light)] dark:border-white/[0.04]">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                  <Activity className="size-3.5 text-primary" />
                  <span>
                    {parsed.groupCount > 1
                      ? isVietnamese
                        ? "Nhóm xử lý"
                        : "Incident Group"
                      : isVietnamese
                        ? "Trạng thái sự cố"
                        : "Incident Status"}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {incidentStatusMeta ? (
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${incidentStatusMeta.className}`}
                    >
                      {incidentStatusMeta.label}
                    </span>
                  ) : (
                    <span className="font-mono text-xs font-semibold text-foreground">
                      #{parsed.incidentId.slice(0, 8)}
                    </span>
                  )}

                  {parsed.groupCount > 1 && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      <Layers className="size-3" />
                      <span>
                        {isVietnamese
                          ? `${parsed.groupCount} sự cố`
                          : `${parsed.groupCount} items`}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {activeAssignee && (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-border/30 bg-background/70 px-3.5 py-2.5 text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <User className="size-3.5 text-primary" />
                  <span>{isVietnamese ? "Đang phụ trách:" : "Assigned to:"}</span>
                </span>
                <span className="font-semibold text-foreground">
                  {activeAssignee.assignedToName ||
                    activeAssignee.assignedToEmail ||
                    activeAssignee.assignedTo.slice(0, 8)}
                </span>
              </div>
            )}

            {/* Evidence Snapshot Preview */}
            {previewImageUrl && !imgError && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-muted-foreground">
                    {isVietnamese ? "Ảnh bằng chứng hiện trường" : "Scene Evidence Snapshot"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setLightboxOpen(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                  >
                    <Maximize2 className="size-3" />
                    <span>{isVietnamese ? "Phóng to" : "Expand"}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  className="group relative block w-full overflow-hidden rounded-2xl border border-border/40 bg-background shadow-[4px_4px_12px_var(--shadow-dark),-4px_-4px_12px_var(--shadow-light)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewImageUrl}
                    alt={isVietnamese ? "Bằng chứng vi phạm PPE" : "PPE violation evidence"}
                    onError={() => setImgError(true)}
                    className="max-h-[240px] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                  <span className="absolute right-2.5 bottom-2.5 inline-flex items-center gap-1 rounded-lg bg-black/65 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                    <Eye className="size-3" />
                    <span>{isVietnamese ? "Xem ảnh gốc" : "Inspect"}</span>
                  </span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* General Delivery Metadata Grid (for Broadcast / System / Email notifications) */
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div className="rounded-xl border border-black/[0.04] bg-background/60 p-3 shadow-[inset_2px_2px_6px_var(--shadow-dark),inset_-2px_-2px_6px_var(--shadow-light)] dark:border-white/[0.04]">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <ChannelIcon className="size-3.5 text-primary" />
                <span>{isVietnamese ? "Kênh phát hành" : "Delivery Channel"}</span>
              </div>
              <p className="mt-1 text-xs font-bold text-foreground">
                {t(`notifications.channel.${notification.channel}`) || channelInfo.label}
              </p>
            </div>

            <div className="rounded-xl border border-black/[0.04] bg-background/60 p-3 shadow-[inset_2px_2px_6px_var(--shadow-dark),inset_-2px_-2px_6px_var(--shadow-light)] dark:border-white/[0.04]">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <Radio className="size-3.5 text-primary" />
                <span>{isVietnamese ? "Phạm vi thông báo" : "Audience Scope"}</span>
              </div>
              <p className="mt-1 text-xs font-bold text-foreground">
                {parsed.isBroadcast
                  ? isVietnamese
                    ? "Phát toàn hệ thống (Broadcast)"
                    : "System-wide Broadcast"
                  : isVietnamese
                    ? "Gửi trực tiếp tới tài khoản"
                    : "Direct Account Notification"}
              </p>
            </div>

            <div className="rounded-xl border border-black/[0.04] bg-background/60 p-3 shadow-[inset_2px_2px_6px_var(--shadow-dark),inset_-2px_-2px_6px_var(--shadow-light)] dark:border-white/[0.04]">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <Clock className="size-3.5 text-primary" />
                <span>{isVietnamese ? "Thời điểm gửi" : "Sent Timestamp"}</span>
              </div>
              <p className="mt-1 text-xs font-bold text-foreground">{exactTime}</p>
            </div>

            <div className="rounded-xl border border-black/[0.04] bg-background/60 p-3 shadow-[inset_2px_2px_6px_var(--shadow-dark),inset_-2px_-2px_6px_var(--shadow-light)] dark:border-white/[0.04]">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                <span>{isVietnamese ? "Trạng thái tiếp nhận" : "Read Status"}</span>
              </div>
              <p className="mt-1 text-xs font-bold text-foreground">
                {isUnread
                  ? isVietnamese
                    ? "Đang chờ xác nhận đọc"
                    : "Pending acknowledgment"
                  : notification.readAt
                    ? formatExactNotificationTime(notification.readAt, locale)
                    : isVietnamese
                      ? "Đã đọc"
                      : "Read"}
              </p>
            </div>
          </div>
        )}

        {/* 4. Action Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-border/30 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            {parsed.incidentHref && (
              <Link href={parsed.incidentHref}>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="gap-1.5 rounded-xl font-bold shadow-[3px_3px_8px_var(--shadow-dark),-3px_-3px_8px_var(--shadow-light)]"
                >
                  <span>
                    {parsed.isGroupLink
                      ? isVietnamese
                        ? `Mở nhóm xử lý (${parsed.groupCount} sự cố)`
                        : `Open group (${parsed.groupCount})`
                      : t("notifications.actions.viewIncident")}
                  </span>
                  <ExternalLink className="size-3.5" />
                </Button>
              </Link>
            )}

            {notification.actionUrl && !parsed.incidentHref && (
              <Link href={notification.actionUrl}>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="gap-1.5 rounded-xl font-bold shadow-[3px_3px_8px_var(--shadow-dark),-3px_-3px_8px_var(--shadow-light)]"
                >
                  <span>{isVietnamese ? "Mở liên kết chi tiết" : "Open Details"}</span>
                  <ExternalLink className="size-3.5" />
                </Button>
              </Link>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {isUnread && onMarkAsRead && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onMarkAsRead(notification.id)}
                disabled={isMarkingRead}
                className="gap-1.5 rounded-xl border-border/40 bg-background text-xs font-semibold shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)]"
              >
                <Check className="size-3.5 text-emerald-500" />
                <span>{t("notifications.actions.markRead")}</span>
              </Button>
            )}

            {onDelete && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onDelete(notification.id)}
                disabled={isDeleting}
                className="gap-1.5 rounded-xl border-border/40 bg-background text-xs font-semibold text-muted-foreground hover:border-destructive/30 hover:text-destructive shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)]"
              >
                <Trash2 className="size-3.5" />
                <span>{t("notifications.actions.delete")}</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Evidence Lightbox */}
      {lightboxOpen && previewImageUrl && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl border border-white/20 bg-background p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              aria-label={isVietnamese ? "Đóng ảnh" : "Close preview"}
              className="absolute top-4 right-4 z-10 flex size-9 items-center justify-center rounded-xl bg-black/70 text-white hover:bg-black"
            >
              <X className="size-4" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImageUrl}
              alt={isVietnamese ? "Bằng chứng vi phạm PPE" : "PPE violation evidence"}
              className="max-h-[82vh] w-auto rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </aside>
  );
}
