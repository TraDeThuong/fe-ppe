"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Camera,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Image as ImageIcon,
  Inbox,
  Layers,
  Loader2,
  MapPin,
  Maximize2,
  MessageSquareQuote,
  Radio,
  Scan,
  ShieldAlert,
  Trash2,
  User,
  UserCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCan } from "@/hooks/use-can";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import { useIncidentDetail } from "@/hooks/incidents/use-incident-detail";
import { getNotificationChannels, isNotificationRead } from "@/lib/notification-inbox";
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
import type { NotificationPersonCluster } from "@/lib/notification-grouping-engine";
import type { NotificationItemDto } from "@/types";

export interface NotificationDetailPanelProps {
  notification: NotificationItemDto | null;
  /** Cụm đa vi phạm / cùng đối tượng mà thông báo đang chọn thuộc về (nếu có) */
  cluster?: NotificationPersonCluster | null;
  onSelectClusterMember?: (notification: NotificationItemDto) => void;
  onMarkAsRead?: (id: string) => void;
  onMarkManyAsRead?: (ids: string[]) => void;
  isMarkingManyRead?: boolean;
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
        className: "border-warning/30 bg-warning/10 text-warning",
      };
    case "CONFIRMED":
      return {
        label: isVietnamese ? "Đã xác nhận" : "Confirmed",
        className: "border-danger/30 bg-danger/10 text-danger",
      };
    case "RESOLVED":
      return {
        label: isVietnamese ? "Đã khắc phục" : "Resolved",
        className: "border-success/30 bg-success/10 text-success",
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
  cluster = null,
  onSelectClusterMember,
  onMarkAsRead,
  onMarkManyAsRead,
  isMarkingManyRead = false,
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
  const channels = getNotificationChannels(notification);
  const channelInfo = getChannelDisplay(channels[0]);
  const ChannelIcon = channelInfo.icon;
  const channelsLabel = channels.map((ch) => getChannelDisplay(ch).label).join(" · ");
  const channelsFullLabel = channels
    .map((ch) => t(`notifications.channel.${ch}`) || getChannelDisplay(ch).label)
    .join(" · ");

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
      className={`group/panel relative overflow-hidden rounded-[26px] border border-white/75 bg-surface/95 p-4.5 shadow-[12px_12px_28px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light),inset_1px_1px_1.5px_var(--shadow-light)] transition-all duration-300 dark:border-white/[0.08] dark:bg-card/95 sm:rounded-[30px] sm:p-6 ${className}`}
    >
      {/* Thanh ánh sáng quang phổ đỉnh Panel (Primary -> Accent) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-10 top-0 h-[2.5px] rounded-b-full bg-gradient-to-r from-primary/40 via-accent to-primary/40 opacity-85 transition-all duration-500 group-hover/panel:inset-x-5 group-hover/panel:from-primary group-hover/panel:via-accent group-hover/panel:to-primary group-hover/panel:opacity-100"
      />

      {/* Quầng sáng Ambient Radial Aura (Primary + Accent) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-gradient-to-br from-primary/15 via-accent/15 to-transparent blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-20 h-48 w-48 rounded-full bg-gradient-to-tr from-accent/10 via-primary/10 to-transparent blur-3xl"
      />

      <div className="relative space-y-5">
        {/* 1. Header Toolbar */}
        <div className="relative flex items-start justify-between gap-3 pb-4.5">
          {/* Rãnh phân cách khắc chìm bên dưới Header */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-border/70 to-transparent shadow-[0_1px_0_var(--shadow-light)]"
          />

          <div className="flex min-w-0 items-start gap-3.5">
            {/* Medallion 2 tầng: Khung ngoài khắc chìm + Lõi đúc nổi */}
            <div className="relative shrink-0 rounded-[20px] bg-background/80 p-1.5 shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)]">
              <div
                className={`flex size-11 items-center justify-center rounded-[15px] border shadow-[4px_4px_9px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] transition-transform duration-300 group-hover/panel:scale-[1.03] ${kindConfig.medallionClass}`}
              >
                <KindIcon className="size-5" />
              </div>

              {isUnread && (
                <span className="absolute -bottom-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-surface shadow-[1px_1px_3px_var(--shadow-dark)]">
                  <span className="absolute inline-flex size-2 animate-ping rounded-full bg-primary opacity-70" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
              )}
            </div>

            <div className="min-w-0 space-y-2">
              {/* Cụm Badge phân loại & trạng thái */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`inline-flex items-center rounded-xl border px-2.5 py-0.5 text-[11px] font-bold shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)] ${kindConfig.pillClass}`}
                >
                  {isVietnamese ? kindConfig.vi : kindConfig.en}
                </span>

                <span
                  className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-0.5 text-[11px] font-bold shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)] ${sevConfig.badgeClass}`}
                >
                  <SeverityIcon className="size-3" />
                  <span>{t(sevConfig.labelKey)}</span>
                </span>

                {/* Status Pill khắc chìm */}
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)] ${isUnread
                      ? "border-primary/35 bg-primary/10 text-primary"
                      : "border-success/25 bg-success/10 text-success"
                    }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${isUnread
                        ? "animate-pulse bg-primary shadow-[0_0_6px_var(--primary)]"
                        : "bg-success"
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

              {/* Dải thời gian & kênh gửi dạng telemetry */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-background/70 px-2 py-0.5 shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]">
                  <Clock className="size-3.5 text-primary" />
                  <span className="font-medium text-foreground/85">{exactTime}</span>
                  {relativeTime && (
                    <span className="text-muted-foreground/75">({relativeTime})</span>
                  )}
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-lg border border-accent/25 bg-accent/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-accent-foreground">
                  <ChannelIcon className="size-3 text-primary" />
                  <span>{channelsLabel}</span>
                </span>
              </div>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label={isVietnamese ? "Đóng chi tiết" : "Close details"}
              className="flex size-8.5 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border/45 bg-surface text-muted-foreground shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/45 hover:text-primary active:translate-y-0 active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* 1b. Multi-violation / Same-person Cluster Member Switcher (Rãnh chọn kênh khắc chìm) */}
        {cluster && cluster.count > 1 && (
          <div className="space-y-3 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.06] via-background/75 to-accent/[0.08] p-3.5 shadow-[inset_2.5px_2.5px_6px_var(--shadow-dark),inset_-2.5px_-2.5px_6px_var(--shadow-light)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full border border-danger/30 bg-danger/10 px-2.5 py-0.5 text-[10.5px] font-bold text-danger shadow-[1.5px_1.5px_3px_var(--shadow-dark)]">
                  <Layers className="size-3" />
                  <span>
                    {cluster.isMultiViolation
                      ? isVietnamese
                        ? `Tổng hợp Đa vi phạm (${cluster.count} bản ghi)`
                        : `Multi-Violation Cluster (${cluster.count})`
                      : isVietnamese
                        ? `Cùng đối tượng (${cluster.count} bản ghi)`
                        : `Same Person (${cluster.count})`}
                  </span>
                </span>

                {cluster.trackId !== null && (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-surface px-2 py-0.5 font-mono text-[10px] font-bold text-primary shadow-[1.5px_1.5px_3px_var(--shadow-dark),-1.5px_-1.5px_3px_var(--shadow-light)]">
                    <UserCheck className="size-2.5" />
                    <span>#{cluster.trackId}</span>
                  </span>
                )}

                {cluster.matchReasons.includes("SPATIAL_IOU") && (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-border/50 bg-surface px-2 py-0.5 text-[10px] font-semibold text-foreground shadow-[1.5px_1.5px_3px_var(--shadow-dark),-1.5px_-1.5px_3px_var(--shadow-light)]">
                    <Scan className="size-2.5 text-primary" />
                    <span>
                      {isVietnamese
                        ? `Vị trí ${cluster.bestSpatialIoUPct ?? ""}%`
                        : `IoU ${cluster.bestSpatialIoUPct ?? ""}%`}
                    </span>
                  </span>
                )}

                {cluster.matchReasons.includes("VISUAL_SIMILARITY") && (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-border/50 bg-surface px-2 py-0.5 text-[10px] font-semibold text-foreground shadow-[1.5px_1.5px_3px_var(--shadow-dark),-1.5px_-1.5px_3px_var(--shadow-light)]">
                    <ImageIcon className="size-2.5 text-primary" />
                    <span>
                      {isVietnamese
                        ? `Ảnh giống ${cluster.bestVisualSimilarityPct ?? ""}%`
                        : `Visual ${cluster.bestVisualSimilarityPct ?? ""}%`}
                    </span>
                  </span>
                )}
              </div>

              {cluster.unreadCount > 1 && onMarkManyAsRead && (
                <button
                  type="button"
                  disabled={isMarkingManyRead}
                  onClick={() =>
                    onMarkManyAsRead(
                      cluster.items
                        .filter((m) => !isNotificationRead(m))
                        .map((m) => m.id),
                    )
                  }
                  className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-primary/35 bg-surface px-2.5 py-1 text-[11px] font-bold text-primary shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] transition-all hover:bg-primary hover:text-primary-foreground active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2)] disabled:opacity-50"
                >
                  <CheckCheck className="size-3" />
                  <span>
                    {isVietnamese
                      ? `Đọc cả ${cluster.unreadCount}`
                      : `Read all ${cluster.unreadCount}`}
                  </span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {cluster.items.map((member, idx) => {
                const memberParsed = parseNotificationDisplay(member, isVietnamese);
                const active = member.id === notification.id;
                const ts = member.sentAt || member.createdAt;
                const clock = new Date(ts).toLocaleTimeString(locale, {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                });
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => onSelectClusterMember?.(member)}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-bold transition-all duration-150 ${active
                        ? "border-primary bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-[inset_1.5px_1.5px_3px_rgba(0,0,0,0.25),0_2px_8px_var(--primary)/30]"
                        : "border-border/45 bg-surface text-foreground shadow-[2.5px_2.5px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] hover:-translate-y-0.5 hover:border-primary/45 hover:text-primary active:translate-y-0 active:shadow-[inset_2px_2px_4px_var(--shadow-dark)]"
                      }`}
                  >
                    <span className="font-mono text-[10px] opacity-80">#{idx + 1}</span>
                    <span>{memberParsed.violationLabel || memberParsed.cleanTitle}</span>
                    <span className="font-mono text-[10px] opacity-80">· {clock}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. Message Content Well (Khay nội dung chạm khắc sâu) */}
        <div className="space-y-3">
          <div className="relative rounded-2xl border border-black/[0.04] bg-background/75 p-4 shadow-[inset_3.5px_3.5px_9px_var(--shadow-dark),inset_-3.5px_-3.5px_9px_var(--shadow-light)] dark:border-white/[0.05] dark:bg-background/50">
            {/* Dấu chỉ thị góc trang trí */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-2.5 right-2.5 size-1.5 rounded-full bg-gradient-to-br from-primary to-accent opacity-60"
            />
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/95">
              {parsed.cleanBody}
            </p>
          </div>

          {parsed.directiveNote && (
            <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/[0.07] p-3.5 text-xs shadow-[3px_3px_8px_var(--shadow-dark),-2px_-2px_6px_var(--shadow-light)]">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-surface text-warning shadow-[2px_2px_4px_var(--shadow-dark),-1.5px_-1.5px_3px_var(--shadow-light)]">
                <MessageSquareQuote className="size-4" />
              </div>
              <div className="space-y-0.5">
                <p className="font-bold text-foreground">
                  {isVietnamese ? "Chỉ đạo xử lý từ Quản lý" : "Manager Directive"}
                </p>
                <p className="leading-relaxed text-foreground/90">
                  {parsed.directiveNote}
                </p>
              </div>
            </div>
          )}

          {parsed.resolutionNote && (
            <div className="flex items-start gap-3 rounded-2xl border border-success/30 bg-success/[0.07] p-3.5 text-xs shadow-[3px_3px_8px_var(--shadow-dark),-2px_-2px_6px_var(--shadow-light)]">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-surface text-success shadow-[2px_2px_4px_var(--shadow-dark),-1.5px_-1.5px_3px_var(--shadow-light)]">
                <CheckCircle2 className="size-4" />
              </div>
              <div className="space-y-0.5">
                <p className="font-bold text-foreground">
                  {isVietnamese ? "Nội dung báo cáo khắc phục" : "Resolution Summary"}
                </p>
                <p className="leading-relaxed text-foreground/90">
                  {parsed.resolutionNote}
                </p>
              </div>
            </div>
          )}

          {parsed.kind === "COMMENT" && parsed.commentAuthor && (
            <div className="flex items-start gap-3 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/[0.07] to-accent/[0.07] p-3.5 text-xs shadow-[3px_3px_8px_var(--shadow-dark),-2px_-2px_6px_var(--shadow-light)]">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-surface text-primary shadow-[2px_2px_4px_var(--shadow-dark),-1.5px_-1.5px_3px_var(--shadow-light)]">
                <MessageSquareQuote className="size-4" />
              </div>
              <div className="space-y-0.5">
                <p className="font-bold text-foreground">
                  {isVietnamese
                    ? `Phản hồi hiện trường từ ${parsed.commentAuthor}`
                    : `Field comment from ${parsed.commentAuthor}`}
                </p>
                <p className="leading-relaxed text-foreground/90">
                  {parsed.commentText || parsed.cleanBody}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 3. Structured Context & Telemetry Grid */}
        {parsed.incidentId ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-1 rounded-full bg-gradient-to-b from-primary to-accent" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  {isVietnamese ? "Thông tin sự cố liên quan" : "Linked Incident Context"}
                </h3>
              </div>
              {isIncidentLoading && (
                <span className="inline-flex items-center gap-1 rounded-full bg-background/80 px-2.5 py-0.5 text-[11px] font-medium text-primary shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark)]">
                  <Loader2 className="size-3 animate-spin" />
                  <span>{isVietnamese ? "Đang đồng bộ..." : "Syncing..."}</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Công trường / Khu vực */}
              <div className="rounded-2xl border border-black/[0.04] bg-background/65 p-3.5 shadow-[inset_2.5px_2.5px_6px_var(--shadow-dark),inset_-2.5px_-2.5px_6px_var(--shadow-light)] dark:border-white/[0.05]">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                  <span className="flex size-5 items-center justify-center rounded-lg bg-surface text-primary shadow-[1.5px_1.5px_3px_var(--shadow-dark),-1.5px_-1.5px_3px_var(--shadow-light)]">
                    <MapPin className="size-3" />
                  </span>
                  <span>{isVietnamese ? "Công trường & Khu vực" : "Site & Zone"}</span>
                </div>
                <p className="mt-2 truncate text-xs font-extrabold text-foreground">
                  {resolvedSiteName || (isVietnamese ? "Chưa xác định" : "Unspecified")}
                </p>
                {resolvedZoneName && (
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {resolvedZoneName}
                  </p>
                )}
              </div>

              {/* Camera giám sát */}
              <div className="rounded-2xl border border-black/[0.04] bg-background/65 p-3.5 shadow-[inset_2.5px_2.5px_6px_var(--shadow-dark),inset_-2.5px_-2.5px_6px_var(--shadow-light)] dark:border-white/[0.05]">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                  <span className="flex size-5 items-center justify-center rounded-lg bg-surface text-primary shadow-[1.5px_1.5px_3px_var(--shadow-dark),-1.5px_-1.5px_3px_var(--shadow-light)]">
                    <Camera className="size-3" />
                  </span>
                  <span>{isVietnamese ? "Camera giám sát" : "Surveillance Camera"}</span>
                </div>
                <p className="mt-2 truncate font-mono text-xs font-extrabold text-foreground">
                  {resolvedCameraCode || "--"}
                </p>
                {resolvedCameraName && (
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {resolvedCameraName}
                  </p>
                )}
              </div>

              {/* Loại vi phạm */}
              <div className="rounded-2xl border border-black/[0.04] bg-background/65 p-3.5 shadow-[inset_2.5px_2.5px_6px_var(--shadow-dark),inset_-2.5px_-2.5px_6px_var(--shadow-light)] dark:border-white/[0.05]">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                  <span className="flex size-5 items-center justify-center rounded-lg bg-surface text-danger shadow-[1.5px_1.5px_3px_var(--shadow-dark),-1.5px_-1.5px_3px_var(--shadow-light)]">
                    <ShieldAlert className="size-3" />
                  </span>
                  <span>{isVietnamese ? "Loại vi phạm" : "Violation Type"}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-extrabold text-foreground">
                    {resolvedViolationLabel || (isVietnamese ? "Cảnh báo an toàn" : "Safety Alert")}
                  </span>
                  {typeof incident?.confidence === "number" && (
                    <span className="shrink-0 rounded-lg border border-primary/25 bg-gradient-to-r from-primary/15 to-accent/15 px-2 py-0.5 font-mono text-[10px] font-extrabold text-primary shadow-[1px_1px_2px_var(--shadow-dark)]">
                      {Math.round(incident.confidence * (incident.confidence <= 1 ? 100 : 1))}% AI
                    </span>
                  )}
                </div>
              </div>

              {/* Trạng thái sự cố / Nhóm xử lý */}
              <div className="rounded-2xl border border-black/[0.04] bg-background/65 p-3.5 shadow-[inset_2.5px_2.5px_6px_var(--shadow-dark),inset_-2.5px_-2.5px_6px_var(--shadow-light)] dark:border-white/[0.05]">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                  <span className="flex size-5 items-center justify-center rounded-lg bg-surface text-primary shadow-[1.5px_1.5px_3px_var(--shadow-dark),-1.5px_-1.5px_3px_var(--shadow-light)]">
                    <Activity className="size-3" />
                  </span>
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
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {incidentStatusMeta ? (
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold shadow-[1.5px_1.5px_3px_var(--shadow-dark)] ${incidentStatusMeta.className}`}
                    >
                      {incidentStatusMeta.label}
                    </span>
                  ) : (
                    <span className="font-mono text-xs font-bold text-foreground">
                      #{parsed.incidentId.slice(0, 8)}
                    </span>
                  )}

                  {parsed.groupCount > 1 && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-accent/35 bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                      <Layers className="size-3 text-primary" />
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
              <div className="flex items-center justify-between gap-2 rounded-2xl border border-primary/20 bg-gradient-to-r from-surface via-surface to-accent/10 px-3.5 py-2.5 text-xs shadow-[3px_3px_7px_var(--shadow-dark),-2px_-2px_6px_var(--shadow-light)]">
                <span className="flex items-center gap-2 font-medium text-muted-foreground">
                  <span className="flex size-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <User className="size-3.5" />
                  </span>
                  <span>{isVietnamese ? "Đang phụ trách:" : "Assigned to:"}</span>
                </span>
                <span className="font-bold text-foreground">
                  {activeAssignee.assignedToName ||
                    activeAssignee.assignedToEmail ||
                    activeAssignee.assignedTo.slice(0, 8)}
                </span>
              </div>
            )}

            {/* Evidence Snapshot Preview (Khung ảnh Bezel 2 tầng) */}
            {previewImageUrl && !imgError && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-primary" />
                    <span>
                      {isVietnamese ? "Ảnh bằng chứng hiện trường" : "Scene Evidence Snapshot"}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setLightboxOpen(true)}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-primary/25 bg-surface px-2 py-0.5 text-[11px] font-bold text-primary shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)] transition-all hover:bg-primary hover:text-primary-foreground active:shadow-[inset_1.5px_1.5px_3px_rgba(0,0,0,0.2)]"
                  >
                    <Maximize2 className="size-3" />
                    <span>{isVietnamese ? "Phóng to" : "Expand"}</span>
                  </button>
                </div>

                <div className="rounded-[22px] bg-background/80 p-1.5 shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)]">
                  <button
                    type="button"
                    onClick={() => setLightboxOpen(true)}
                    className="group relative block w-full cursor-pointer overflow-hidden rounded-[17px] border border-border/40 bg-surface shadow-[4px_4px_12px_var(--shadow-dark),-4px_-4px_12px_var(--shadow-light)]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewImageUrl}
                      alt={isVietnamese ? "Bằng chứng vi phạm PPE" : "PPE violation evidence"}
                      onError={() => setImgError(true)}
                      className="max-h-[240px] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                    <span className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-black/65 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg backdrop-blur-md transition-transform duration-200 group-hover:scale-105">
                      <Eye className="size-3.5 text-primary" />
                      <span>{isVietnamese ? "Xem ảnh gốc" : "Inspect"}</span>
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* General Delivery Metadata Grid (for Broadcast / System / Email notifications) */
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-black/[0.04] bg-background/65 p-3.5 shadow-[inset_2.5px_2.5px_6px_var(--shadow-dark),inset_-2.5px_-2.5px_6px_var(--shadow-light)] dark:border-white/[0.05]">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                <span className="flex size-5 items-center justify-center rounded-lg bg-surface text-primary shadow-[1.5px_1.5px_3px_var(--shadow-dark),-1.5px_-1.5px_3px_var(--shadow-light)]">
                  <ChannelIcon className="size-3" />
                </span>
                <span>{isVietnamese ? "Kênh phát hành" : "Delivery Channel"}</span>
              </div>
              <p className="mt-2 text-xs font-extrabold text-foreground">
                {channelsFullLabel}
              </p>
            </div>

            <div className="rounded-2xl border border-black/[0.04] bg-background/65 p-3.5 shadow-[inset_2.5px_2.5px_6px_var(--shadow-dark),inset_-2.5px_-2.5px_6px_var(--shadow-light)] dark:border-white/[0.05]">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                <span className="flex size-5 items-center justify-center rounded-lg bg-surface text-primary shadow-[1.5px_1.5px_3px_var(--shadow-dark),-1.5px_-1.5px_3px_var(--shadow-light)]">
                  <Radio className="size-3" />
                </span>
                <span>{isVietnamese ? "Phạm vi thông báo" : "Audience Scope"}</span>
              </div>
              <p className="mt-2 text-xs font-extrabold text-foreground">
                {parsed.isBroadcast
                  ? isVietnamese
                    ? "Phát toàn hệ thống (Broadcast)"
                    : "System-wide Broadcast"
                  : isVietnamese
                    ? "Gửi trực tiếp tới tài khoản"
                    : "Direct Account Notification"}
              </p>
            </div>

            <div className="rounded-2xl border border-black/[0.04] bg-background/65 p-3.5 shadow-[inset_2.5px_2.5px_6px_var(--shadow-dark),inset_-2.5px_-2.5px_6px_var(--shadow-light)] dark:border-white/[0.05]">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                <span className="flex size-5 items-center justify-center rounded-lg bg-surface text-primary shadow-[1.5px_1.5px_3px_var(--shadow-dark),-1.5px_-1.5px_3px_var(--shadow-light)]">
                  <Clock className="size-3" />
                </span>
                <span>{isVietnamese ? "Thời điểm gửi" : "Sent Timestamp"}</span>
              </div>
              <p className="mt-2 text-xs font-extrabold text-foreground">{exactTime}</p>
            </div>

            <div className="rounded-2xl border border-black/[0.04] bg-background/65 p-3.5 shadow-[inset_2.5px_2.5px_6px_var(--shadow-dark),inset_-2.5px_-2.5px_6px_var(--shadow-light)] dark:border-white/[0.05]">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                <span className="flex size-5 items-center justify-center rounded-lg bg-surface text-success shadow-[1.5px_1.5px_3px_var(--shadow-dark),-1.5px_-1.5px_3px_var(--shadow-light)]">
                  <CheckCircle2 className="size-3" />
                </span>
                <span>{isVietnamese ? "Trạng thái tiếp nhận" : "Read Status"}</span>
              </div>
              <p className="mt-2 text-xs font-extrabold text-foreground">
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

        {/* 4. Action Footer (Cụm phím bấm cơ học Neumorphic) */}
        <div className="relative flex flex-wrap items-center justify-between gap-2.5 pt-4.5">
          {/* Rãnh khắc phân tách Footer */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-border/70 to-transparent shadow-[0_1px_0_var(--shadow-light)]"
          />

          <div className="flex flex-wrap items-center gap-2">
            {parsed.incidentHref && (
              <Link href={parsed.incidentHref}>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="gap-1.5 rounded-xl bg-gradient-to-r from-primary via-primary to-accent/90 px-3.5 font-extrabold shadow-[4px_4px_10px_var(--shadow-dark),-3px_-3px_8px_var(--shadow-light)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.25)]"
                >
                  <span>
                    {parsed.isGroupLink
                      ? isVietnamese
                        ? `Mở nhóm xử lý (${parsed.groupCount} sự cố)`
                        : `Open group (${parsed.groupCount})`
                      : parsed.kind === "COMMENT"
                        ? isVietnamese
                          ? "Mở khung trao đổi"
                          : "Open discussion"
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
                  className="gap-1.5 rounded-xl bg-gradient-to-r from-primary via-primary to-accent/90 px-3.5 font-extrabold shadow-[4px_4px_10px_var(--shadow-dark),-3px_-3px_8px_var(--shadow-light)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.25)]"
                >
                  <span>{isVietnamese ? "Mở liên kết chi tiết" : "Open Details"}</span>
                  <ExternalLink className="size-3.5" />
                </Button>
              </Link>
            )}
          </div>

          {/* Khay nút hành động phụ khắc chìm */}
          {(isUnread && onMarkAsRead) || onDelete ? (
            <div className="ml-auto flex items-center gap-1.5 rounded-2xl bg-background/65 p-1 shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
              {isUnread && onMarkAsRead && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onMarkAsRead(notification.id)}
                  disabled={isMarkingRead}
                  className="h-8 gap-1.5 rounded-xl border-border/45 bg-surface text-xs font-bold shadow-[2.5px_2.5px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] transition-all hover:border-success/40 hover:text-success active:shadow-[inset_2px_2px_4px_var(--shadow-dark)]"
                >
                  <Check className="size-3.5 text-success" />
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
                  className="h-8 gap-1.5 rounded-xl border-border/45 bg-surface text-xs font-bold text-muted-foreground shadow-[2.5px_2.5px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] transition-all hover:border-danger/40 hover:text-danger active:shadow-[inset_2px_2px_4px_var(--shadow-dark)]"
                >
                  <Trash2 className="size-3.5" />
                  <span>{t("notifications.actions.delete")}</span>
                </Button>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Evidence Lightbox (Neumorphic Dark Frame) */}
      {lightboxOpen && previewImageUrl && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-[26px] border border-white/20 bg-surface p-2.5 shadow-[0_25px_60px_rgba(0,0,0,0.65),inset_1px_1px_1px_rgba(255,255,255,0.2)]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              aria-label={isVietnamese ? "Đóng ảnh" : "Close preview"}
              className="absolute top-5 right-5 z-10 flex size-9.5 cursor-pointer items-center justify-center rounded-xl border border-white/20 bg-black/75 text-white shadow-lg backdrop-blur-sm transition-transform hover:scale-105 hover:bg-black"
            >
              <X className="size-4" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImageUrl}
              alt={isVietnamese ? "Bằng chứng vi phạm PPE" : "PPE violation evidence"}
              className="max-h-[82vh] w-auto rounded-[18px] object-contain"
            />
          </div>
        </div>
      )}
    </aside>
  );
}
