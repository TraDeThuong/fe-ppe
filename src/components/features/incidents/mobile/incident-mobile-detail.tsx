"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Building2,
  Camera,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  Expand,
  FilePlus2,
  ImageOff,
  MoreHorizontal,
  Pencil,
  Siren,
  UserCheck,
  UserRound,
} from "lucide-react";

import { BottomSheet } from "@ui/bottom-sheet";
import { useHideMobileTabBar } from "@/components/features/app-shell/mobile-chrome-context";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import { useLocale } from "@/providers/locale-provider";
import type { EvidenceItem, IncidentItem } from "@/types";
import { useIncidentGalleryPhotos } from "../viewer/use-incident-gallery-photos";
import type { GalleryMediaItem } from "../viewer/evidence-lightbox-modal";
import { formatIncidentTime } from "./incident-mobile-list";

/* ------------------------------------------------------------------ */
/* Ảnh / video bằng chứng: vuốt ngang để xem ảnh đối chứng             */
/* ------------------------------------------------------------------ */

function mediaCaption(item: GalleryMediaItem, isVietnamese: boolean): string {
  switch (item.category) {
    case "reference":
      return isVietnamese ? "Ảnh đối chứng" : "Reference";
    case "video":
      return "Video";
    case "raw":
    case "wide":
      return isVietnamese ? "Ảnh camera" : "Camera photo";
    default:
      return item.id === "photo-annotated" || item.evidenceType === "SNAPSHOT"
        ? isVietnamese
          ? "Ảnh vi phạm"
          : "Violation"
        : isVietnamese
          ? "Ảnh bổ sung"
          : "Additional";
  }
}

function MediaSlide({ item, isVietnamese }: { item: GalleryMediaItem; isVietnamese: boolean }) {
  const [failed, setFailed] = useState(false);
  const caption = mediaCaption(item, isVietnamese);

  return (
    <figure className="relative aspect-video w-full shrink-0 snap-center overflow-hidden rounded-2xl bg-slate-950">
      {item.category === "video" && item.url ? (
        <video
          src={item.url}
          controls
          preload="metadata"
          playsInline
          className="size-full object-contain"
        />
      ) : item.url && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.url}
          alt={caption}
          onError={() => setFailed(true)}
          className="size-full object-contain"
        />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-2 text-slate-400">
          <ImageOff className="size-8" aria-hidden="true" />
          <span className="text-sm">{isVietnamese ? "Không tải được ảnh" : "Image unavailable"}</span>
        </div>
      )}

      <figcaption className="pointer-events-none absolute left-2.5 top-2.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
        {caption}
      </figcaption>

      {item.url && item.category !== "video" && !failed && (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={isVietnamese ? `Mở ${caption.toLowerCase()} cỡ lớn` : `Open ${caption} full size`}
          className="absolute right-2 top-2 flex size-11 items-center justify-center rounded-full bg-black/55 text-white"
        >
          <Expand className="size-5" aria-hidden="true" />
        </a>
      )}
    </figure>
  );
}

function EvidenceCarousel({ items, isVietnamese }: { items: GalleryMediaItem[]; isVietnamese: boolean }) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (items.length === 0) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-2xl bg-slate-950 text-slate-400">
        <ImageOff className="size-8" aria-hidden="true" />
        <span className="text-sm">{isVietnamese ? "Chưa có ảnh bằng chứng" : "No evidence image"}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        className="-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 scrollbar-none [&::-webkit-scrollbar]:hidden"
        onScroll={(event) => {
          const el = event.currentTarget;
          const index = Math.round(el.scrollLeft / Math.max(el.clientWidth - 12, 1));
          if (index !== activeIndex) setActiveIndex(Math.min(items.length - 1, Math.max(0, index)));
        }}
      >
        {items.map((item) => (
          <MediaSlide key={`${item.id}-${item.url}`} item={item} isVietnamese={isVietnamese} />
        ))}
      </div>
      {items.length > 1 && (
        <div className="flex items-center justify-center gap-1.5" aria-hidden="true">
          {items.map((item, index) => (
            <span
              key={`dot-${item.id}-${index}`}
              className={`h-1.5 rounded-full transition-all ${
                index === activeIndex ? "w-4 bg-primary" : "w-1.5 bg-foreground/20"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Thông tin chính                                                     */
/* ------------------------------------------------------------------ */

const SEVERITY_STYLE: Record<string, string> = {
  CRITICAL: "bg-danger text-white",
  HIGH: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  MEDIUM: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  LOW: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
};

const STATUS_STYLE: Record<string, string> = {
  PENDING_REVIEW: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  CONFIRMED: "bg-primary/12 text-primary",
  RESOLVED: "bg-success/15 text-success",
  DISMISSED: "bg-foreground/10 text-muted-foreground",
  CLOSED: "bg-foreground/10 text-muted-foreground",
};

function FactRow({
  icon,
  label,
  children,
  href,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  href?: string;
}) {
  const content = (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground/5 text-muted-foreground">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="sr-only">{label}: </span>
        <span className="block truncate text-[15px] text-foreground">{children}</span>
      </span>
      {href && <ChevronRight className="size-5 shrink-0 text-muted-foreground/60" aria-hidden="true" />}
    </>
  );
  return href ? (
    <Link href={href} className="flex min-h-12 items-center gap-3 px-3 py-1.5 active:bg-foreground/5">
      {content}
    </Link>
  ) : (
    <div className="flex min-h-12 items-center gap-3 px-3 py-1.5">{content}</div>
  );
}

function Disclosure({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={defaultOpen || undefined} className="group rounded-2xl border border-border/70 bg-background">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-[15px] font-semibold text-foreground [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown
          className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="border-t border-border/60 p-3">{children}</div>
    </details>
  );
}

/* ------------------------------------------------------------------ */
/* Màn chi tiết                                                         */
/* ------------------------------------------------------------------ */

export interface IncidentMobileDetailActions {
  hasAssignments: boolean;
  canReview: boolean;
  canAssign: boolean;
  canSelfOrAssignedResolve: boolean;
  canClose: boolean;
  canUpdate: boolean;
  canTriggerAlert: boolean;
  isNotifying?: boolean;
  onReview: (decision: "CONFIRMED" | "DISMISSED") => void;
  onAssign: () => void;
  onResolve: () => void;
  onClose: () => void;
  onEdit: () => void;
  onAttach: () => void;
  onTriggerAlert: () => void;
}

export interface IncidentMobileDetailProps {
  incident: IncidentItem;
  primaryEvidence?: EvidenceItem;
  snapshotUrl?: string;
  assignedOfficerName?: string;
  /** Cán bộ an toàn chưa được giao sự cố này */
  awaitingDispatch?: boolean;
  actions: IncidentMobileDetailActions;
  onDownloadEvidence: (evidence: EvidenceItem) => void;
  /** Khung trao đổi (dùng lại IncidentCommentsTimeline) */
  comments: ReactNode;
  commentCount: number;
  /** Mở sẵn mục "Trao đổi" (link ?focus=comments từ thông báo) */
  commentsDefaultOpen?: boolean;
}

/**
 * Chi tiết sự cố trên mobile (< 768px):
 * ảnh bằng chứng · lỗi + mức độ + trạng thái · nơi/giờ/người phụ trách ·
 * "Trao đổi" và "Xem thêm" thu gọn · nút quyết định cố định ở đáy.
 */
export function IncidentMobileDetail({
  incident,
  primaryEvidence,
  snapshotUrl,
  assignedOfficerName,
  awaitingDispatch = false,
  actions,
  onDownloadEvidence,
  comments,
  commentCount,
  commentsDefaultOpen = false,
}: IncidentMobileDetailProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const { getSiteName, getZoneName, getCamera, getCameraCode, getCameraName } = useEntityLookup();
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);

  const { galleryPhotos, violationLabel } = useIncidentGalleryPhotos({
    evidence: primaryEvidence,
    evidences: incident.evidences,
    snapshotUrl,
    violationType: incident.violationType,
    confidence: incident.confidence,
    cameraId: incident.cameraId,
    incidentId: incident.id,
  });

  const camera = getCamera(incident.cameraId);
  const siteName = incident.siteName || getSiteName(incident.siteId);
  const zoneName = incident.zoneName || getZoneName(incident.siteId, incident.zoneId || camera?.zoneId);
  const cameraLabel =
    incident.cameraName || getCameraName(incident.cameraId) || incident.cameraCode || getCameraCode(incident.cameraId);
  const detectedAt = new Date(incident.detectedAt);
  const detectedLabel = Number.isNaN(detectedAt.getTime())
    ? ""
    : `${detectedAt.toLocaleString(isVietnamese ? "vi-VN" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })} · ${formatIncidentTime(incident.detectedAt, isVietnamese)}`;

  const severityLabel: Record<string, string> = {
    CRITICAL: t("incidents.severity.critical"),
    HIGH: t("incidents.severity.high"),
    MEDIUM: t("incidents.severity.medium"),
    LOW: t("incidents.severity.low"),
  };
  const statusLabel: Record<string, string> = {
    PENDING_REVIEW: t("incidents.status.pendingReview"),
    CONFIRMED: t("incidents.status.confirmed"),
    RESOLVED: t("incidents.scope.awaitingAcceptance"),
    DISMISSED: t("incidents.status.dismissed"),
    CLOSED: t("incidents.status.closed"),
  };

  // Cùng quy tắc với IncidentDetailHeader (desktop)
  const { status } = incident;
  const showReview = status === "PENDING_REVIEW" && actions.canReview;
  const showAssign = status === "CONFIRMED" && !actions.hasAssignments && actions.canAssign;
  const showResolve =
    status === "CONFIRMED" &&
    actions.canSelfOrAssignedResolve &&
    (actions.hasAssignments || !actions.canAssign);
  const showResolveSecondary =
    status === "CONFIRMED" && !actions.hasAssignments && actions.canAssign && actions.canSelfOrAssignedResolve;
  const showReassign = status === "CONFIRMED" && actions.hasAssignments && actions.canAssign;
  const showClose = (status === "RESOLVED" || status === "DISMISSED") && actions.canClose;
  const isOpen = status !== "CLOSED";

  const secondaryActions: { key: string; label: string; icon: ReactNode; onSelect: () => void }[] = [
    ...(showReassign
      ? [{ key: "reassign", label: isVietnamese ? "Giao lại cán bộ" : "Reassign", icon: <UserCheck className="size-5" />, onSelect: actions.onAssign }]
      : []),
    ...(showResolveSecondary
      ? [{ key: "resolve", label: isVietnamese ? "Tự khắc phục" : "Resolve myself", icon: <UserRound className="size-5" />, onSelect: actions.onResolve }]
      : []),
    ...(actions.canUpdate && isOpen
      ? [
          { key: "attach", label: isVietnamese ? "Đính kèm ảnh/video" : "Attach photo/video", icon: <FilePlus2 className="size-5" />, onSelect: actions.onAttach },
          { key: "edit", label: isVietnamese ? "Sửa thông tin" : "Edit details", icon: <Pencil className="size-5" />, onSelect: actions.onEdit },
        ]
      : []),
    ...(actions.canTriggerAlert && isOpen
      ? [{ key: "alert", label: isVietnamese ? "Báo động lại" : "Re-send alert", icon: <Siren className="size-5" />, onSelect: actions.onTriggerAlert }]
      : []),
  ];

  const hasPrimary = showReview || showAssign || showResolve || showClose;
  const showActionBar = hasPrimary || secondaryActions.length > 0;
  useHideMobileTabBar(showActionBar);

  const primaryButtonClass =
    "h-12 flex-1 rounded-xl bg-primary px-4 text-[15px] font-semibold text-primary-foreground shadow-nm-sm active:brightness-95";
  const secondaryButtonClass =
    "h-12 flex-1 rounded-xl border border-border/80 bg-background px-4 text-[15px] font-semibold text-foreground active:bg-foreground/5";

  const files = incident.evidences ?? [];
  const note =
    incident.description && incident.description.trim() !== violationLabel ? incident.description.trim() : "";

  return (
    <div className={`space-y-4 ${showActionBar ? "pb-16" : ""}`}>
      <h1 className="sr-only">
        {isVietnamese ? "Chi tiết sự cố" : "Incident"}: {violationLabel}
      </h1>

      <EvidenceCarousel items={galleryPhotos} isVietnamese={isVietnamese} />

      <div className="space-y-2">
        <p className="text-xl font-bold leading-snug text-foreground">{violationLabel}</p>
        <div className="flex flex-wrap gap-2">
          {severityLabel[incident.severity] && (
            <span className={`rounded-full px-2.5 py-1 text-sm font-semibold ${SEVERITY_STYLE[incident.severity] ?? ""}`}>
              {severityLabel[incident.severity]}
            </span>
          )}
          {statusLabel[status] && (
            <span className={`rounded-full px-2.5 py-1 text-sm font-semibold ${STATUS_STYLE[status] ?? ""}`}>
              {statusLabel[status]}
            </span>
          )}
        </div>
      </div>

      <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-background shadow-nm-sm">
        {siteName && (
          <FactRow
            icon={<Building2 className="size-4.5" aria-hidden="true" />}
            label={isVietnamese ? "Công trường" : "Site"}
            href={incident.siteId ? `/sites/${incident.siteId}` : undefined}
          >
            {[siteName, zoneName].filter(Boolean).join(" · ")}
          </FactRow>
        )}
        {cameraLabel && (
          <FactRow
            icon={<Camera className="size-4.5" aria-hidden="true" />}
            label="Camera"
            href={incident.cameraId ? `/cameras/${incident.cameraId}` : undefined}
          >
            {cameraLabel}
          </FactRow>
        )}
        {detectedLabel && (
          <FactRow
            icon={<Clock className="size-4.5" aria-hidden="true" />}
            label={isVietnamese ? "Thời điểm phát hiện" : "Detected at"}
          >
            <time dateTime={incident.detectedAt}>{detectedLabel}</time>
          </FactRow>
        )}
        {(assignedOfficerName || awaitingDispatch) && (
          <FactRow
            icon={<UserRound className="size-4.5" aria-hidden="true" />}
            label={isVietnamese ? "Người phụ trách" : "Assigned to"}
          >
            {assignedOfficerName ||
              (isVietnamese ? "Chờ quản lý phân công" : "Waiting for a manager to assign")}
          </FactRow>
        )}
      </div>

      <Disclosure
        title={`${isVietnamese ? "Trao đổi" : "Discussion"}${commentCount ? ` (${commentCount})` : ""}`}
        defaultOpen={commentsDefaultOpen}
      >
        {comments}
      </Disclosure>

      {(note || files.length > 0) && (
        <Disclosure title={isVietnamese ? "Xem thêm" : "More details"}>
          <div className="space-y-4">
            {note && (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-muted-foreground">{isVietnamese ? "Ghi chú" : "Note"}</p>
                <p className="text-[15px] text-foreground">{note}</p>
              </div>
            )}
            {files.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-muted-foreground">
                  {isVietnamese ? `Tệp bằng chứng (${files.length})` : `Evidence files (${files.length})`}
                </p>
                <ul className="divide-y divide-border/60">
                  {files.map((file, index) => (
                    <li key={file.id} className="flex items-center gap-3 py-1.5">
                      <span className="min-w-0 flex-1 truncate text-[15px] text-foreground">
                        {file.evidenceType === "REFERENCE_SNAPSHOT"
                          ? isVietnamese ? "Ảnh đối chứng" : "Reference photo"
                          : file.evidenceType === "VIDEO_CLIP"
                            ? "Video"
                            : isVietnamese ? `Ảnh vi phạm ${files.length > 1 ? index + 1 : ""}` : `Photo ${index + 1}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => onDownloadEvidence(file)}
                        aria-label={isVietnamese ? "Tải về" : "Download"}
                        className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground active:bg-foreground/5"
                      >
                        <Download className="size-5" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Disclosure>
      )}

      {showActionBar && (
        // Cố định ở đáy màn hình (thanh tab đã ẩn) để nút quyết định luôn trong tầm ngón cái.
        <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-border/70 bg-background/95 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-6px_18px_-12px_rgba(0,0,0,0.35)] backdrop-blur md:hidden">
          {secondaryActions.length > 0 && (
            <button
              type="button"
              onClick={() => setMoreActionsOpen(true)}
              aria-haspopup="dialog"
              aria-label={isVietnamese ? "Thao tác khác" : "More actions"}
              className={
                hasPrimary
                  ? "flex size-12 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-background text-foreground"
                  : `${secondaryButtonClass} inline-flex items-center justify-center gap-2`
              }
            >
              <MoreHorizontal className="size-5" aria-hidden="true" />
              {!hasPrimary && <span>{isVietnamese ? "Thao tác" : "Actions"}</span>}
            </button>
          )}
          {showReview && (
            <>
              <button type="button" onClick={() => actions.onReview("DISMISSED")} className={secondaryButtonClass}>
                {isVietnamese ? "Bác bỏ" : "Dismiss"}
              </button>
              <button type="button" onClick={() => actions.onReview("CONFIRMED")} className={primaryButtonClass}>
                {isVietnamese ? "Xác nhận" : "Confirm"}
              </button>
            </>
          )}
          {showAssign && (
            <button type="button" onClick={actions.onAssign} className={primaryButtonClass}>
              {t("incidents.actions.assign")}
            </button>
          )}
          {showResolve && (
            <button type="button" onClick={actions.onResolve} className={primaryButtonClass}>
              {isVietnamese ? "Báo cáo khắc phục" : "Report fix"}
            </button>
          )}
          {showClose && (
            <button type="button" onClick={actions.onClose} className={primaryButtonClass}>
              {t("incidents.actions.close")}
            </button>
          )}
        </div>
      )}

      <BottomSheet
        open={moreActionsOpen}
        onClose={() => setMoreActionsOpen(false)}
        title={isVietnamese ? "Thao tác khác" : "More actions"}
        closeLabel={isVietnamese ? "Đóng" : "Close"}
      >
        <ul className="space-y-1 pt-1">
          {secondaryActions.map((action) => (
            <li key={action.key}>
              <button
                type="button"
                disabled={action.key === "alert" && actions.isNotifying}
                onClick={() => {
                  setMoreActionsOpen(false);
                  action.onSelect();
                }}
                className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] font-medium text-foreground active:bg-foreground/5 disabled:opacity-50"
              >
                <span className="text-muted-foreground">{action.icon}</span>
                {action.label}
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>
    </div>
  );
}
