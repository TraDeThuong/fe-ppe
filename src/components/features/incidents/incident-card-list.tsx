"use client";

import {
  Building2,
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock,
  UserCheck,
} from "lucide-react";
import { IncidentSeverityBadge } from "./incident-severity-badge";
import { IncidentStatusBadge } from "./incident-status-badge";
import { useAuth } from "@/contexts/AuthContext";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import { isIncidentAssignedToUser } from "@/lib/incident-workflow";
import { useLocale } from "@/providers/locale-provider";
import type { IncidentItem } from "@/types";
import { IncidentListStatus } from "./table/incident-list-status";
import { getIncidentEvidenceUrl } from "./viewer/evidence-media-utils";
import { IncidentTelemetryChips } from "./table/incident-thumbnail";

export interface IncidentCardListProps {
  incidents: IncidentItem[];
  selectedId: string | null;
  onSelect: (incident: IncidentItem) => void;
  highlightedId?: string | null;
  canSelectRows?: boolean;
  selectedIdSet?: Set<string>;
  onToggleRowSelection?: (id: string) => void;
  loading?: boolean;
  fetching?: boolean;
  error?: unknown;
  onRetry?: () => void;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  limitOptions?: number[];
}

function getSeverityAccentClass(severity: string): string {
  switch (severity) {
    case "CRITICAL":
      return "bg-danger";
    case "HIGH":
      return "bg-orange-500";
    case "MEDIUM":
      return "bg-amber-500";
    case "LOW":
      return "bg-blue-500";
    default:
      return "bg-border";
  }
}

export function IncidentCardList({
  incidents,
  selectedId,
  onSelect,
  highlightedId,
  canSelectRows = false,
  selectedIdSet,
  onToggleRowSelection,
  loading = false,
  fetching = false,
  error,
  onRetry,
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
  limitOptions = [10, 20, 50],
}: IncidentCardListProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const { user } = useAuth();
  const { getSiteName, getCameraCode } = useEntityLookup();

  const formatViolation = (type: string) => {
    switch (type) {
      case "NO_HELMET":
        return t("incidents.violation.noHelmet");
      case "NO_VEST":
        return t("incidents.violation.noVest");
      case "RESTRICTED_AREA":
        return t("incidents.violation.restrictedArea");
      case "MULTI_VIOLATION":
        return t("incidents.violation.multi");
      default:
        return type;
    }
  };

  if (incidents.length === 0) {
    return <IncidentListStatus loading={loading} error={error} onRetry={onRetry} />;
  }

  const effectiveTotal = Math.max(total, incidents.length);
  const startIdx = (page - 1) * limit + 1;
  const endIdx = Math.min(effectiveTotal, (page - 1) * limit + incidents.length);
  const safeTotalPages = Math.max(1, totalPages);

  return (
    <div className="flex min-h-full flex-col gap-3">
      {/* 1. Balanced Neumorphic Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between gap-2 rounded-2xl border border-border/30 bg-surface/95 px-3.5 py-2.5 text-xs shadow-nm-sm backdrop-blur-md">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span
            className={`h-2 w-2 rounded-full ${fetching ? "animate-ping bg-primary" : "bg-emerald-500"
              }`}
          />
          <span className="font-medium">
            {isVietnamese ? (
              <>
                Đang xem{" "}
                <strong className="font-bold text-foreground">
                  {startIdx}–{endIdx}
                </strong>{" "}
                / <strong className="font-bold text-foreground">{effectiveTotal}</strong> sự cố
              </>
            ) : (
              <>
                Showing{" "}
                <strong className="font-bold text-foreground">
                  {startIdx}–{endIdx}
                </strong>{" "}
                of <strong className="font-bold text-foreground">{effectiveTotal}</strong>
              </>
            )}
          </span>
        </div>

        <span className="hidden xl:inline-flex items-center gap-1.5 rounded-lg border border-border/30 bg-background/80 px-2 py-0.5 font-mono text-[10px] text-muted-foreground shadow-nm-inset">
          <kbd className="font-bold text-foreground">↑↓</kbd>
          <span>{isVietnamese ? "chuyển nhanh" : "navigate"}</span>
        </span>
      </div>

      {/* 2. Balanced Split-Layout Neumorphic Cards */}
      <div
        role="listbox"
        aria-label={isVietnamese ? "Danh sách thẻ sự cố" : "Incident card list"}
        className="flex-1 space-y-2.5 px-0.5 py-0.5"
      >
        {incidents.map((incident) => {
          const isActive = selectedId === incident.id;
          const isChecked = Boolean(selectedIdSet?.has(incident.id));
          const isHighlighted = highlightedId === incident.id;
          const siteName = incident.siteName || getSiteName(incident.siteId);
          const cameraCode = incident.cameraCode || getCameraCode(incident.cameraId);
          const activeAssignee =
            incident.assignments?.find((a) => a.status !== "COMPLETED") ||
            incident.assignments?.[0];
          const assigneeName = activeAssignee?.assignedToName;
          const isMine = isIncidentAssignedToUser(incident, user?.id);

          const detectedStr = new Date(incident.detectedAt).toLocaleString(locale, {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div
              key={incident.id}
              role="option"
              aria-selected={isActive}
              tabIndex={0}
              onClick={() => onSelect(incident)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(incident);
                }
              }}
              className={`group relative flex cursor-pointer items-center justify-between gap-3 rounded-2xl border p-3.5 pl-4.5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isHighlighted
                  ? "border-danger/60 bg-danger/10 shadow-nm-inset"
                  : isActive
                    ? "border-primary/45 bg-background/95 shadow-nm-inset"
                    : isChecked
                      ? "border-primary/35 bg-surface shadow-nm-sm"
                      : "border-border/25 bg-surface shadow-nm-sm hover:-translate-y-0.5 hover:border-primary/40"
                }`}
            >
              {/* Left Severity Accent Strip */}
              <span
                aria-hidden="true"
                className={`absolute inset-y-2.5 left-1.5 w-1 rounded-full transition-opacity ${isActive ? "opacity-100" : "opacity-80 group-hover:opacity-100"
                  } ${getSeverityAccentClass(incident.severity)}`}
              />

              {/* Left Section: Checkbox + Violation Title & Location */}
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {canSelectRows && onToggleRowSelection && (
                  <div
                    className="shrink-0"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleRowSelection(incident.id)}
                      aria-label={
                        isVietnamese
                          ? `Chọn sự cố #${incident.id.slice(0, 8)}`
                          : `Select incident #${incident.id.slice(0, 8)}`
                      }
                      className="h-4 w-4 cursor-pointer rounded accent-primary"
                    />
                  </div>
                )}

                <div className="min-w-0 flex-1 space-y-1.5">
                  {/* Top: ID + Violation Name + AI Telemetry */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">
                      #{incident.id.slice(0, 6)}
                    </span>
                    <h4 className="truncate text-[13px] font-extrabold tracking-tight text-foreground">
                      {formatViolation(incident.violationType)}
                    </h4>
                    <IncidentTelemetryChips incident={incident} />
                  </div>

                  {/* Bottom: Site · Camera · Assignee */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="inline-flex min-w-0 max-w-[120px] items-center gap-1 font-medium">
                      <Building2 className="h-3 w-3 shrink-0 text-primary/75" />
                      <span className="truncate">{siteName}</span>
                    </span>

                    <span className="opacity-40">•</span>

                    <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-foreground/80">
                      <Camera className="h-3 w-3 shrink-0 text-primary/75" />
                      <span className="max-w-[75px] truncate">{cameraCode}</span>
                    </span>

                    {isMine ? (
                      <>
                        <span className="opacity-40">•</span>
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                          <UserCheck className="h-3 w-3" />
                          <span>{isVietnamese ? "Của bạn" : "Yours"}</span>
                        </span>
                      </>
                    ) : assigneeName ? (
                      <>
                        <span className="opacity-40">•</span>
                        <span className="inline-flex min-w-0 max-w-[95px] items-center gap-1">
                          <UserCheck className="h-3 w-3 shrink-0 text-primary/75" />
                          <span className="truncate">{assigneeName}</span>
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Right Section: Time + Badges Stacked Cleanly */}
              <div className="flex shrink-0 flex-col items-end justify-between gap-1.5">
                <span className="inline-flex items-center gap-1 font-mono text-[10px] font-medium text-muted-foreground">
                  <Clock className="h-3 w-3 opacity-70" />
                  {detectedStr}
                </span>

                <div className="flex items-center gap-1">
                  <IncidentSeverityBadge severity={incident.severity} />
                  <IncidentStatusBadge status={incident.status} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Balanced Pagination Footer */}
      <div className="sticky bottom-0 z-20 flex items-center justify-between gap-2 rounded-2xl border border-border/30 bg-surface/95 px-3.5 py-2 text-xs shadow-nm-sm backdrop-blur-md">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="hidden sm:inline">{isVietnamese ? "Hiển thị" : "Show"}</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            aria-label={isVietnamese ? "Số sự cố mỗi trang" : "Incidents per page"}
            className="cursor-pointer rounded-xl border border-border/30 bg-background px-2.5 py-1 text-xs font-bold text-foreground shadow-nm-inset focus:border-primary focus:outline-none"
          >
            {limitOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label={isVietnamese ? "Trang trước" : "Previous page"}
            className="inline-flex h-8 items-center gap-1 rounded-xl border border-border/30 bg-surface px-2.5 text-xs font-semibold text-foreground shadow-nm-sm transition hover:border-primary/40 hover:text-primary active:shadow-nm-inset disabled:cursor-not-allowed disabled:opacity-35 disabled:shadow-none"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{isVietnamese ? "Trước" : "Prev"}</span>
          </button>

          <span className="rounded-xl border border-border/25 bg-background/80 px-2.5 py-1 font-mono text-[11px] font-bold text-foreground shadow-nm-inset">
            {page} / {safeTotalPages}
          </span>

          <button
            type="button"
            disabled={page >= safeTotalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label={isVietnamese ? "Trang sau" : "Next page"}
            className="inline-flex h-8 items-center gap-1 rounded-xl border border-border/30 bg-surface px-2.5 text-xs font-semibold text-foreground shadow-nm-sm transition hover:border-primary/40 hover:text-primary active:shadow-nm-inset disabled:cursor-not-allowed disabled:opacity-35 disabled:shadow-none"
          >
            <span className="hidden sm:inline">{isVietnamese ? "Sau" : "Next"}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
