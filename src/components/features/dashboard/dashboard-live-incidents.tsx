"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock,
  Eye,
  ExternalLink,
  Radio,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IncidentSeverityBadge } from "@/components/features/incidents/incident-severity-badge";
import { IncidentStatusBadge } from "@/components/features/incidents/incident-status-badge";
import { useLocale } from "@/providers/locale-provider";
import { resolveEvidenceUrl } from "@/lib/evidence-url";
import type { IncidentItem, IncidentSeverity, IncidentStatus, ViolationType } from "@/types";

export interface DashboardLiveIncidentsProps {
  incidents: IncidentItem[];
  loading?: boolean;
  error?: boolean;
  viewAllHref?: string;
  highlightedId?: string | null;
  onReview?: (incident: IncidentItem) => void;
  canReview?: boolean;
}

const VIOLATION_LABELS: Record<string, { vi: string; en: string }> = {
  NO_HELMET: { vi: "Không đội mũ", en: "No Helmet" },
  NO_VEST: { vi: "Không áo phản quang", en: "No Safety Vest" },
  RESTRICTED_AREA: { vi: "Xâm nhập vùng cấm", en: "Restricted Area" },
  MULTI_VIOLATION: { vi: "Vi phạm phức hợp", en: "Multi Violation" },
};

function formatRelativeTime(dateStr: string, isVietnamese: boolean): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);

    if (diffSec < 60) {
      return isVietnamese ? "Vừa xong" : "Just now";
    }
    if (diffMin < 60) {
      return isVietnamese ? `${diffMin} phút trước` : `${diffMin}m ago`;
    }
    if (diffHours < 24) {
      return isVietnamese ? `${diffHours} giờ trước` : `${diffHours}h ago`;
    }
    return new Intl.DateTimeFormat(isVietnamese ? "vi-VN" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export function DashboardLiveIncidents({
  incidents,
  loading = false,
  error = false,
  viewAllHref = "/incidents",
  highlightedId,
  onReview,
  canReview = true,
}: DashboardLiveIncidentsProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  return (
    <div className="relative isolate flex h-full w-full flex-col justify-between overflow-hidden rounded-2xl sm:rounded-[26px] bg-surface/90 p-4 sm:p-5 shadow-[4px_6px_16px_rgba(0,0,0,0.03),-3px_-3px_10px_rgba(255,255,255,0.6)] dark:border-white/[0.08] dark:bg-card/40 dark:shadow-[0_8px_24px_rgba(0,0,0,0.25)] border border-border/40">
      {/* Specular highlight rim */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/[0.06]"
      />

      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-danger/10 text-danger border border-danger/20 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.05)] dark:border-danger/30 dark:shadow-none">
              <Radio className="h-4 w-4 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold tracking-tight text-foreground flex items-center gap-2">
                {t("dashboard.liveIncidents.title")}
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-danger" />
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                {t("dashboard.liveIncidents.subtitle")}
              </p>
            </div>
          </div>

          <Link
            href={viewAllHref}
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            <span>{t("dashboard.liveIncidents.viewAll")}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Incidents List */}
        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 w-full animate-pulse rounded-2xl bg-muted/40"
                />
              ))}
            </div>
          ) : error ? <p className="py-10 text-center text-sm text-muted-foreground">{t("dashboard.data.error")}</p> : incidents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success/10 text-success mb-2 border border-success/20 dark:border-white/[0.08] dark:shadow-none shadow-[inset_2px_2px_4px_rgba(0,0,0,0.04)]">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                {t("dashboard.liveIncidents.empty")}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isVietnamese
                  ? "Chưa ghi nhận sự cố trong danh sách hiện tại."
                  : "No incidents recorded in the current list."}
              </p>
            </div>
          ) : (
            incidents.slice(0, 5).map((inc) => {
              const isHighlighted = inc.id === highlightedId;
              const violationLabel =
                VIOLATION_LABELS[inc.violationType]?.[
                  isVietnamese ? "vi" : "en"
                ] || inc.violationType;

              return (
                <div
                  key={inc.id}
                  className={`group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-3.5 transition-all duration-300 ${
                    isHighlighted
                      ? "border-danger bg-danger/5 shadow-[0_0_15px_rgba(239,68,68,0.25)] animate-pulse"
                      : "border-border/30 bg-background/50 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.03)] dark:border-white/[0.06] dark:bg-background/40 dark:shadow-none hover:border-primary/40 dark:hover:border-white/20"
                  }`}
                >
                  {/* Left: Thumbnail & Details */}
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Snapshot / Camera Icon */}
                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/40 bg-muted/20 shadow-[2px_2px_5px_rgba(0,0,0,0.04)] dark:border-white/[0.08] dark:bg-muted/10 dark:shadow-none">
                      {inc.snapshotUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resolveEvidenceUrl(inc.snapshotUrl)}
                          alt="Violation Snapshot"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Camera className="h-5 w-5 text-muted-foreground" />
                      )}
                      {isHighlighted && (
                        <span className="absolute top-1 right-1 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-danger" />
                        </span>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-foreground truncate max-w-[140px] sm:max-w-none">
                          {violationLabel}
                        </span>
                        <IncidentSeverityBadge
                          severity={inc.severity as IncidentSeverity}
                        />
                        <IncidentStatusBadge
                          status={inc.status as IncidentStatus}
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="font-semibold text-foreground/80">
                          {inc.cameraName || inc.cameraCode || "Camera"}
                        </span>
                        {inc.zoneName && (
                          <>
                            <span>•</span>
                            <span>{inc.zoneName}</span>
                          </>
                        )}
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-3 w-3" />
                          {formatRelativeTime(inc.detectedAt, isVietnamese)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Action Buttons */}
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    {canReview && inc.status === "PENDING_REVIEW" && onReview && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => onReview(inc)}
                        className="h-8 rounded-xl px-2.5 text-xs font-bold shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)]"
                      >
                        {t("dashboard.liveIncidents.quickReview")}
                      </Button>
                    )}

                    <Link href={`/incidents/${inc.id}`}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 rounded-xl hover:bg-surface-elevated"
                        title={isVietnamese ? "Xem chi tiết sự cố" : "View Details"}
                      >
                        <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer hint */}
      <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          {isVietnamese
            ? "Nguồn: hồ sơ sự cố · kiểm tra tự động mỗi 15 giây"
            : "Source: incident records · checked every 15 seconds"}
        </span>
        <span className="font-mono text-xs text-primary font-semibold">
          {isVietnamese ? "Mọi ngày" : "All dates"}
        </span>
      </div>
    </div>
  );
}
