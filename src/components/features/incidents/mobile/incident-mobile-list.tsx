"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, RotateCcw, ShieldCheck } from "lucide-react";

import { useEntityLookup } from "@/hooks/use-entity-lookup";
import { useLocale } from "@/providers/locale-provider";
import type { IncidentItem } from "@/types";
import { IncidentThumbnail, incidentHasVideoEvidence } from "../table/incident-thumbnail";
import { getIncidentEvidenceUrl } from "../viewer/evidence-media-utils";

const VIOLATION_KEYS: Record<string, string> = {
  NO_HELMET: "incidents.violation.noHelmet",
  NO_VEST: "incidents.violation.noVest",
  RESTRICTED_AREA: "incidents.violation.restrictedArea",
  MULTI_VIOLATION: "incidents.violation.multi",
};

const STATUS_KEYS: Record<string, string> = {
  PENDING_REVIEW: "incidents.status.pendingReview",
  CONFIRMED: "incidents.status.confirmed",
  RESOLVED: "incidents.scope.awaitingAcceptance",
  DISMISSED: "incidents.status.dismissed",
  CLOSED: "incidents.status.closed",
};

/** "Vừa xong" · "5 phút trước" · "3 giờ trước" · "26/11 14:05" */
export function formatIncidentTime(iso: string, isVietnamese: boolean, nowMs = Date.now()): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return "";
  const diffMin = Math.floor(Math.max(0, nowMs - ts) / 60000);
  if (diffMin < 1) return isVietnamese ? "Vừa xong" : "Just now";
  if (diffMin < 60) return isVietnamese ? `${diffMin} phút trước` : `${diffMin} min ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return isVietnamese ? `${diffHour} giờ trước` : `${diffHour} h ago`;
  return new Date(ts).toLocaleString(isVietnamese ? "vi-VN" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SeverityPill({ severity }: { severity: string }) {
  const { t } = useLocale();
  if (severity === "CRITICAL") {
    return (
      <span className="shrink-0 rounded-full bg-danger px-2 py-0.5 text-xs font-bold text-white">
        {t("incidents.severity.critical")}
      </span>
    );
  }
  if (severity === "HIGH") {
    return (
      <span className="shrink-0 rounded-full bg-orange-500/15 px-2 py-0.5 text-xs font-semibold text-orange-700 dark:text-orange-300">
        {t("incidents.severity.high")}
      </span>
    );
  }
  return null;
}

export interface IncidentMobileListProps {
  incidents: IncidentItem[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  /** Hiện trạng thái từng sự cố (khi xem "Tất cả" / "Lịch sử") */
  showStatus?: boolean;
  highlightedId?: string | null;
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/** Danh sách sự cố dạng thẻ cho mobile: ảnh · lỗi vi phạm · nơi xảy ra · thời gian. */
export function IncidentMobileList({
  incidents,
  loading = false,
  error,
  onRetry,
  showStatus = false,
  highlightedId,
  hasActiveFilters = false,
  onResetFilters,
  page,
  totalPages,
  onPageChange,
}: IncidentMobileListProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const { getSiteName, getCameraCode, getCameraName } = useEntityLookup();

  const goToPage = (next: number) => {
    onPageChange(next);
    document.querySelector<HTMLElement>("[data-page-scroll]")?.scrollTo({ top: 0 });
  };

  if (loading && incidents.length === 0) {
    return (
      <ul aria-busy="true" className="space-y-2.5">
        {[0, 1, 2, 3].map((index) => (
          <li
            key={index}
            className="flex animate-pulse gap-3 rounded-2xl border border-border/60 p-2.5"
          >
            <span className="h-16 w-20 rounded-lg bg-foreground/10" />
            <span className="flex-1 space-y-2 py-1">
              <span className="block h-4 w-3/4 rounded bg-foreground/10" />
              <span className="block h-3.5 w-1/2 rounded bg-foreground/10" />
              <span className="block h-3.5 w-1/3 rounded bg-foreground/10" />
            </span>
          </li>
        ))}
      </ul>
    );
  }

  if (error && incidents.length === 0) {
    return (
      <div role="alert" className="space-y-3 rounded-2xl border border-danger/30 bg-danger/5 p-4 text-center">
        <p className="text-[15px] font-medium text-foreground">
          {isVietnamese ? "Không tải được danh sách sự cố." : "Could not load incidents."}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold text-primary"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            {isVietnamese ? "Thử lại" : "Try again"}
          </button>
        )}
      </div>
    );
  }

  if (incidents.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
        <ShieldCheck className="size-10 text-success" aria-hidden="true" />
        <p className="text-base font-semibold text-foreground">
          {isVietnamese ? "Không có sự cố nào" : "No incidents"}
        </p>
        {hasActiveFilters && onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="h-11 rounded-full border border-border px-4 text-sm font-semibold text-primary"
          >
            {isVietnamese ? "Xóa bộ lọc" : "Clear filters"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ul aria-label={isVietnamese ? "Danh sách sự cố" : "Incident list"} className="space-y-2.5">
        {incidents.map((incident) => {
          const violation = VIOLATION_KEYS[incident.violationType]
            ? t(VIOLATION_KEYS[incident.violationType])
            : incident.violationType;
          const siteName = incident.siteName || getSiteName(incident.siteId);
          const cameraCode = incident.cameraCode || getCameraCode(incident.cameraId);
          const cameraName = incident.cameraName || getCameraName(incident.cameraId);
          const location = [siteName, cameraName || cameraCode].filter(Boolean).join(" · ");
          const highlighted = highlightedId === incident.id;

          return (
            <li key={incident.id}>
              <Link
                href={`/incidents/${incident.id}`}
                className={`flex items-center gap-3 rounded-2xl border bg-background p-2.5 shadow-nm-sm transition-shadow active:shadow-nm-pressed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                  highlighted ? "border-primary ring-2 ring-primary/30" : "border-border/70"
                }`}
              >
                <IncidentThumbnail
                  src={getIncidentEvidenceUrl(incident)}
                  hasVideo={incidentHasVideoEvidence(incident)}
                  alt=""
                  className="h-16 w-20"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <p className="line-clamp-2 min-w-0 flex-1 text-[15px] font-semibold leading-snug text-foreground">
                      {violation}
                    </p>
                    <SeverityPill severity={incident.severity} />
                  </div>
                  {location && (
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">{location}</p>
                  )}
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    <time dateTime={incident.detectedAt}>
                      {formatIncidentTime(incident.detectedAt, isVietnamese)}
                    </time>
                    {showStatus && STATUS_KEYS[incident.status] && (
                      <span> · {t(STATUS_KEYS[incident.status])}</span>
                    )}
                  </p>
                </div>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground/60" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>

      {totalPages > 1 && (
        <nav
          aria-label={isVietnamese ? "Phân trang" : "Pagination"}
          className="flex items-center justify-between gap-3"
        >
          <button
            type="button"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            aria-label={isVietnamese ? "Trang trước" : "Previous page"}
            className="flex size-11 items-center justify-center rounded-full border border-border/80 bg-background text-foreground disabled:opacity-40"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <span className="text-sm text-muted-foreground">
            {isVietnamese ? `Trang ${page}/${totalPages}` : `Page ${page} of ${totalPages}`}
          </span>
          <button
            type="button"
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
            aria-label={isVietnamese ? "Trang sau" : "Next page"}
            className="flex size-11 items-center justify-center rounded-full border border-border/80 bg-background text-foreground disabled:opacity-40"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </nav>
      )}
    </div>
  );
}
