"use client";

import Link from "next/link";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  CheckSquare,
  Clock,
  Eye,
  Filter,
  HardHat,
  ShieldCheck,
  Shirt,
  UserCheck,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/providers/locale-provider";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import { IncidentStatusBadge } from "./incident-status-badge";
import { IncidentSeverityBadge } from "./incident-severity-badge";
import { getAwaitingAcceptanceCount } from "@/lib/incident-list-scope";
import type { IncidentItem, IncidentStatusCounts } from "@/types";

export type IncidentStatKey = "total" | "pendingReview" | "critical" | "resolved";

export interface IncidentStatsDetailPanelProps {
  activeStat: IncidentStatKey;
  incidents: IncidentItem[];
  statusCounts?: IncidentStatusCounts;
  listLoading?: boolean;
  listError?: boolean;
  onClose: () => void;
  onReview?: (incident: IncidentItem) => void;
  onAssign?: (incident: IncidentItem) => void;
  onFilterStatus?: (status: string) => void;
  onFilterViolation?: (violation: string) => void;
  onFilterSite?: (siteId: string) => void;
}

function formatDate(dateInput?: string | Date | null, loc: string = "vi-VN"): string {
  if (!dateInput) return "—";
  try {
    const d = new Date(dateInput);
    return d.toLocaleString(loc, {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function IncidentStatsDetailPanel({
  activeStat,
  incidents = [],
  statusCounts,
  listLoading = false,
  listError = false,
  onClose,
  onReview,
  onAssign,
  onFilterStatus,
  onFilterViolation,
  onFilterSite,
}: IncidentStatsDetailPanelProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const { getSiteName, getCameraCode } = useEntityLookup();

  const statusStats = {
    total: statusCounts?.total,
    pendingReview: statusCounts?.pendingReview,
    confirmed: statusCounts?.confirmed,
    critical: statusCounts?.critical,
    resolved: getAwaitingAcceptanceCount(statusCounts),
    closed: statusCounts?.closed,
    dismissed: statusCounts?.dismissed,
  };
  const { bySeverity, byViolationType, remediated, falseAlarms } = statusCounts ?? {};
  const resolutionRate = statusCounts?.total && remediated !== undefined
    ? Math.round((remediated / statusCounts.total) * 100)
    : undefined;

  const pageIncidents = listLoading || listError ? [] : incidents;
  const previewIncidents = pageIncidents.slice(0, 6);
  const pendingIncidents = pageIncidents.filter((incident) => incident.status === "PENDING_REVIEW");
  const criticalIncidents = pageIncidents.filter((incident) => incident.severity === "CRITICAL");
  const resolvedIncidents = pageIncidents.filter((incident) => incident.status === "RESOLVED" || incident.status === "CLOSED").slice(0, 8);
  const listEmptyMessage = listLoading
    ? t("incidents.stats.loadingRows")
    : listError ? t("incidents.stats.unavailableRows") : t("incidents.stats.noRows");

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

  return (
    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-white/60 bg-surface/95 p-3 sm:p-4.5 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)] transition-all duration-300 dark:border-white/10 dark:bg-card/95 animate-in fade-in slide-in-from-top-2">
      {/* Specular Rim Top Highlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 sm:inset-x-8 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent"
      />

      {/* Header Toolbar - Tinh gọn cho Mobile */}
      <div className="mb-2.5 sm:mb-3.5 flex items-center justify-between gap-2 border-b border-border/40 pb-2.5 sm:pb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-primary/10 text-primary shadow-[inset_1px_1px_2px_rgba(0,0,0,0.08)]">
            {activeStat === "total" && <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            {activeStat === "pendingReview" && <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-warning" />}
            {activeStat === "critical" && <AlertOctagon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-danger" />}
            {activeStat === "resolved" && <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-success" />}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">
                {activeStat === "total" && (t("incidents.detail.totalTitle") || (isVietnamese ? "Tổng hợp hồ sơ sự cố" : "Incident Records Overview"))}
                {activeStat === "pendingReview" && (t("incidents.detail.pendingTitle") || (isVietnamese ? "Sự cố chờ thẩm duyệt" : "Pending Review Incidents"))}
                {activeStat === "critical" && (t("incidents.detail.criticalTitle") || (isVietnamese ? "Sự cố vi phạm khẩn cấp" : "Critical Hazard Incidents"))}
                {activeStat === "resolved" && (t("incidents.detail.resolvedTitle") || (isVietnamese ? "Sự cố đã giải quyết & đóng" : "Resolved & Closed Incidents"))}
              </h3>

              <Badge variant="outline" size="sm" className="font-mono text-[10px] sm:text-[11px] text-foreground px-1.5 py-0">
                {statusStats[activeStat] ?? "—"}
              </Badge>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate hidden sm:block">
              {activeStat === "total" && (t("incidents.detail.totalDesc") || (isVietnamese ? "Phân bổ theo trạng thái xử lý, loại vi phạm và sự cố ghi nhận gần nhất" : "Breakdown by lifecycle status, violation types and latest incidents"))}
              {activeStat === "pendingReview" && (t("incidents.detail.pendingDesc") || (isVietnamese ? "Cần cán bộ an toàn xác thực bằng chứng hình ảnh AI và phân công xử lý" : "Requires safety officer to verify AI evidence and assign remediation"))}
              {activeStat === "critical" && (t("incidents.detail.criticalDesc") || (isVietnamese ? "Mức độ nguy hiểm cao hoặc xâm nhập vùng cấm cần xử lý tức thì" : "High danger level or restricted zone breach requiring immediate response"))}
              {activeStat === "resolved" && (t("incidents.detail.resolvedDesc") || (isVietnamese ? "Đã hoàn tất khắc phục vi phạm hiện trường và nghiệm thu hồ sơ" : "Field violations remediated and safety cases closed"))}
            </p>
          </div>
        </div>

        {/* Action Controls & Close */}
        <div className="flex items-center gap-1.5 shrink-0">
          {activeStat === "pendingReview" && onFilterStatus && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onFilterStatus("PENDING_REVIEW")}
              className="h-7 sm:h-8 gap-1 text-[11px] sm:text-xs text-warning hover:text-warning px-2 sm:px-3"
            >
              <Filter className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">{isVietnamese ? "Lọc chờ duyệt" : "Filter Pending"}</span>
            </Button>
          )}

          {activeStat === "resolved" && onFilterStatus && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onFilterStatus("RESOLVED")}
              className="h-7 sm:h-8 gap-1 text-[11px] sm:text-xs text-success hover:text-success px-2 sm:px-3"
            >
              <Filter className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">{isVietnamese ? "Lọc đã giải quyết" : "Filter Resolved"}</span>
            </Button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg sm:rounded-xl border border-border/40 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
            aria-label={t("incidents.detail.closeAria") || (isVietnamese ? "Đóng bảng chi tiết" : "Close detail panel")}
          >
            <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>
      </div>

      {/* ── 1. NỘI DUNG: TỔNG SỐ SỰ CỐ (TOTAL) ────────────────────────────── */}
      {activeStat === "total" && (
        <div className="space-y-3">
          {/* Bento Summary 2 Ô: Phân bổ trạng thái + Phân bổ loại vi phạm */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {/* Box 1: Trạng thái vòng đời */}
            <div className="rounded-xl border border-border/40 bg-background/60 p-2.5 sm:p-3 shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  {isVietnamese ? "Vòng đời xử lý sự cố" : "Incident Lifecycle"}
                </span>
                <span className="text-[10px] text-muted-foreground">{isVietnamese ? "Nhấn để lọc" : "Click to filter"}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => onFilterStatus?.("PENDING_REVIEW")}
                  className="flex items-center justify-between rounded-lg border border-warning/30 bg-warning/5 px-2 py-1 text-left hover:bg-warning/10 transition"
                >
                  <span className="text-[10px] sm:text-[11px] text-warning font-semibold truncate">
                    {t("incidents.status.pendingReview")}
                  </span>
                  <Badge variant="outline" size="sm" className="border-warning/30 text-warning text-[9px] px-1 py-0 ml-1">
                    {statusStats.pendingReview ?? "—"}
                  </Badge>
                </button>

                <button
                  type="button"
                  onClick={() => onFilterStatus?.("CONFIRMED")}
                  className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-2 py-1 text-left hover:bg-primary/10 transition"
                >
                  <span className="text-[10px] sm:text-[11px] text-primary font-semibold truncate">
                    {t("incidents.status.confirmed")}
                  </span>
                  <Badge variant="outline" size="sm" className="border-primary/30 text-primary text-[9px] px-1 py-0 ml-1">
                    {statusStats.confirmed ?? "—"}
                  </Badge>
                </button>

                <button
                  type="button"
                  onClick={() => onFilterStatus?.("RESOLVED")}
                  className="flex items-center justify-between rounded-lg border border-success/30 bg-success/5 px-2 py-1 text-left hover:bg-success/10 transition"
                >
                  <span className="text-[10px] sm:text-[11px] text-success font-semibold truncate">
                    {t("incidents.status.resolved")}
                  </span>
                  <Badge variant="outline" size="sm" className="border-success/30 text-success text-[9px] px-1 py-0 ml-1">
                    {statusStats.resolved ?? "—"}
                  </Badge>
                </button>

                <button
                  type="button"
                  onClick={() => onFilterStatus?.("CLOSED")}
                  className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/40 px-2 py-1 text-left hover:bg-muted/60 transition"
                >
                  <span className="text-[10px] sm:text-[11px] text-muted-foreground font-semibold truncate">
                    {t("incidents.status.closed")}
                  </span>
                  <Badge variant="secondary" size="sm" className="text-[9px] px-1 py-0 ml-1">
                    {statusStats.closed ?? "—"}
                  </Badge>
                </button>

                <button
                  type="button"
                  onClick={() => onFilterStatus?.("DISMISSED")}
                  className="flex items-center justify-between rounded-lg border border-border/40 bg-background/80 px-2 py-1 text-left hover:bg-muted/30 transition col-span-2 sm:col-span-1"
                >
                  <span className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
                    {t("incidents.status.dismissed")}
                  </span>
                  <Badge variant="secondary" size="sm" className="text-[9px] px-1 py-0 ml-1">
                    {statusStats.dismissed ?? "—"}
                  </Badge>
                </button>
              </div>
            </div>

            {/* Box 2: Phân bổ vi phạm PPE */}
            <div className="rounded-xl border border-border/40 bg-background/60 p-2.5 sm:p-3 shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <HardHat className="h-3.5 w-3.5 text-primary" />
                  {isVietnamese ? "Loại vi phạm phát hiện" : "Violation Types"}
                </span>
                <span className="text-[10px] text-muted-foreground">{isVietnamese ? "Nhấn để lọc" : "Click to filter"}</span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => onFilterViolation?.("NO_HELMET")}
                  className="flex items-center justify-between rounded-lg border border-border/40 bg-background/80 px-2 py-1 text-left hover:bg-primary/5 hover:border-primary/30 transition"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <HardHat className="h-3 w-3 text-warning shrink-0" />
                    <span className="text-[10px] sm:text-[11px] text-foreground font-medium truncate">
                      {t("incidents.violation.noHelmet")}
                    </span>
                  </div>
                  <Badge variant="outline" size="sm" className="font-mono text-[9px] px-1 py-0 ml-1">
                    {byViolationType ? (byViolationType.NO_HELMET ?? 0) : "—"}
                  </Badge>
                </button>

                <button
                  type="button"
                  onClick={() => onFilterViolation?.("NO_VEST")}
                  className="flex items-center justify-between rounded-lg border border-border/40 bg-background/80 px-2 py-1 text-left hover:bg-primary/5 hover:border-primary/30 transition"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Shirt className="h-3 w-3 text-info shrink-0" />
                    <span className="text-[10px] sm:text-[11px] text-foreground font-medium truncate">
                      {t("incidents.violation.noVest")}
                    </span>
                  </div>
                  <Badge variant="outline" size="sm" className="font-mono text-[9px] px-1 py-0 ml-1">
                    {byViolationType ? (byViolationType.NO_VEST ?? 0) : "—"}
                  </Badge>
                </button>

                <button
                  type="button"
                  onClick={() => onFilterViolation?.("RESTRICTED_AREA")}
                  className="flex items-center justify-between rounded-lg border border-border/40 bg-background/80 px-2 py-1 text-left hover:bg-primary/5 hover:border-primary/30 transition"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <AlertOctagon className="h-3 w-3 text-danger shrink-0" />
                    <span className="text-[10px] sm:text-[11px] text-foreground font-medium truncate">
                      {t("incidents.violation.restrictedArea")}
                    </span>
                  </div>
                  <Badge variant="outline" size="sm" className="font-mono text-[9px] px-1 py-0 ml-1">
                    {byViolationType ? (byViolationType.RESTRICTED_AREA ?? 0) : "—"}
                  </Badge>
                </button>

                <button
                  type="button"
                  onClick={() => onFilterViolation?.("MULTI_VIOLATION")}
                  className="flex items-center justify-between rounded-lg border border-border/40 bg-background/80 px-2 py-1 text-left hover:bg-primary/5 hover:border-primary/30 transition"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Zap className="h-3 w-3 text-primary shrink-0" />
                    <span className="text-[10px] sm:text-[11px] text-foreground font-medium truncate">
                      {t("incidents.violation.multi")}
                    </span>
                  </div>
                  <Badge variant="outline" size="sm" className="font-mono text-[9px] px-1 py-0 ml-1">
                    {byViolationType ? (byViolationType.MULTI_VIOLATION ?? 0) : "—"}
                  </Badge>
                </button>
              </div>
            </div>
          </div>

          {/* Danh sách sự cố gần nhất */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-0.5 text-xs">
              <span className="font-bold text-foreground">
                {isVietnamese ? "Sự cố trên trang này" : "Incidents on this page"}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {!listLoading && !listError && (
                  isVietnamese ? `Hiển thị ${previewIncidents.length} sự cố` : `Showing ${previewIncidents.length} incidents`
                )}
              </span>
            </div>

            <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-0.5">
              {previewIncidents.length === 0 ? <p className="p-3 text-xs text-muted-foreground">{listEmptyMessage}</p> : previewIncidents.map((incident) => (
                <div
                  key={incident.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border/40 bg-background/60 p-2 sm:p-2.5 shadow-[inset_1px_1px_2px_var(--shadow-dark)] hover:border-primary/40 transition"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {incident.violationType === "NO_HELMET" ? (
                        <HardHat className="h-3.5 w-3.5" />
                      ) : incident.violationType === "NO_VEST" ? (
                        <Shirt className="h-3.5 w-3.5" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Link
                          href={`/incidents/${incident.id}`}
                          className="font-mono text-xs font-bold text-primary hover:underline"
                        >
                          #{incident.id.slice(0, 8)}
                        </Link>
                        <span className="text-xs font-semibold text-foreground truncate">
                          {formatViolation(incident.violationType)}
                        </span>
                        <IncidentSeverityBadge severity={incident.severity} />
                        <IncidentStatusBadge status={incident.status} />
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-muted-foreground flex items-center gap-2 truncate mt-0.5">
                        {onFilterSite && incident.siteId ? (
                          <button
                            type="button"
                            onClick={() => onFilterSite(incident.siteId)}
                            className="flex items-center gap-1 truncate hover:text-primary transition hover:underline"
                            title={isVietnamese ? `Lọc theo công trường ${incident.siteName || getSiteName(incident.siteId)}` : "Filter by this site"}
                          >
                            <span className="truncate">{incident.siteName || getSiteName(incident.siteId)}</span>
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 truncate">
                            {incident.siteName || getSiteName(incident.siteId)}
                          </span>
                        )}
                        <span>•</span>
                        <span className="flex items-center gap-1 font-mono">
                          {incident.cameraCode || getCameraCode(incident.cameraId)}
                        </span>
                        <span>•</span>
                        <span>{formatDate(incident.detectedAt, locale)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Link href={`/incidents/${incident.id}`}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] sm:text-xs text-primary hover:text-primary gap-0.5"
                      >
                        <Eye className="h-3 w-3" />
                        <span className="hidden sm:inline">{t("incidents.actions.viewDetail")}</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 2. NỘI DUNG: CHỜ THẨM DUYỆT (PENDING REVIEW) ────────────────────── */}
      {activeStat === "pendingReview" && (
        <div className="space-y-3">
          {/* Attention Banner */}
          <div className="rounded-xl border border-warning/40 bg-warning/10 p-2.5 sm:p-3 text-xs flex items-start gap-2.5">
            <Clock className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground text-xs sm:text-sm">
                {isVietnamese ? "Sự cố cần nhân sự xác thực" : "Incidents awaiting human verification"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isVietnamese
                  ? "Cán bộ an toàn cần thẩm duyệt minh chứng hình ảnh từ Camera AI để xác nhận vi phạm hiện trường hoặc bác bỏ cảnh báo ảo."
                  : "Safety officers must examine AI visual evidence to confirm actual violations or dismiss false positives."}
              </p>
            </div>
          </div>

          {/* Danh sách các sự cố chờ duyệt */}
          <div className="max-h-[260px] overflow-y-auto space-y-2 pr-0.5">
            {pendingIncidents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/50 bg-background/40 p-6 text-center text-xs text-muted-foreground space-y-1">
                <CheckCircle2 className="h-6 w-6 text-success mx-auto mb-1 opacity-80" />
                <p className="font-semibold text-foreground">
                  {listEmptyMessage}
                </p>
              </div>
            ) : (
              pendingIncidents.map((incident) => (
                <div
                  key={incident.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-warning/30 bg-background/70 p-2.5 sm:p-3 shadow-[inset_1px_1px_2px_var(--shadow-dark)]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning font-bold">
                      <Clock className="h-4 w-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Link
                          href={`/incidents/${incident.id}`}
                          className="font-mono text-xs font-bold text-primary hover:underline"
                        >
                          #{incident.id.slice(0, 8)}
                        </Link>
                        <span className="text-xs font-bold text-foreground truncate">
                          {formatViolation(incident.violationType)}
                        </span>
                        <IncidentSeverityBadge severity={incident.severity} />
                      </div>

                      <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-muted-foreground truncate mt-0.5">
                        {onFilterSite && incident.siteId ? (
                          <button
                            type="button"
                            onClick={() => onFilterSite(incident.siteId)}
                            className="flex items-center gap-1 truncate hover:text-primary transition hover:underline"
                            title={isVietnamese ? `Lọc theo công trường ${incident.siteName || getSiteName(incident.siteId)}` : "Filter by this site"}
                          >
                            <span className="truncate">{incident.siteName || getSiteName(incident.siteId)}</span>
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 truncate">
                            {incident.siteName || getSiteName(incident.siteId)}
                          </span>
                        )}
                        <span>•</span>
                        <span className="flex items-center gap-1 font-mono">
                          {incident.cameraCode || getCameraCode(incident.cameraId)}
                        </span>
                        <span>•</span>
                        <span>{formatDate(incident.detectedAt, locale)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    {onReview && (
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => onReview(incident)}
                        className="h-7 text-[11px] px-2.5 gap-1"
                      >
                        <CheckSquare className="h-3 w-3" />
                        <span>{t("incidents.actions.review")}</span>
                      </Button>
                    )}

                    <Link href={`/incidents/${incident.id}`}>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                      >
                        <Eye className="h-3 w-3" />
                        <span className="sr-only sm:not-sr-only sm:inline">{t("incidents.actions.viewDetail")}</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── 3. NỘI DUNG: VI PHẠM KHẨN CẤP (CRITICAL) ───────────────────────── */}
      {activeStat === "critical" && (
        <div className="space-y-3">
          {/* Breakdown cards for Severities */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-xl border border-danger/40 bg-danger/10 p-2 sm:p-2.5 text-center">
              <span className="text-[10px] sm:text-[11px] font-bold text-danger uppercase block truncate">
                {t("incidents.severity.critical")}
              </span>
              <span className="text-base sm:text-lg font-black text-danger font-mono tabular-nums">
                {statusCounts ? <AnimatedNumber value={statusCounts.critical} /> : "—"}
              </span>
            </div>

            <div className="rounded-xl border border-warning/40 bg-warning/10 p-2 sm:p-2.5 text-center">
              <span className="text-[10px] sm:text-[11px] font-bold text-warning uppercase block truncate">
                {t("incidents.severity.high")}
              </span>
              <span className="text-base sm:text-lg font-black text-warning font-mono tabular-nums">
                {bySeverity ? <AnimatedNumber value={bySeverity.HIGH ?? 0} /> : "—"}
              </span>
            </div>

            <div className="rounded-xl border border-primary/40 bg-primary/10 p-2 sm:p-2.5 text-center">
              <span className="text-[10px] sm:text-[11px] font-bold text-primary uppercase block truncate">
                {t("incidents.severity.medium")}
              </span>
              <span className="text-base sm:text-lg font-black text-primary font-mono tabular-nums">
                {bySeverity ? <AnimatedNumber value={bySeverity.MEDIUM ?? 0} /> : "—"}
              </span>
            </div>

            <div className="rounded-xl border border-border/40 bg-muted/40 p-2 sm:p-2.5 text-center">
              <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase block truncate">
                {t("incidents.severity.low")}
              </span>
              <span className="text-base sm:text-lg font-black text-muted-foreground font-mono tabular-nums">
                {bySeverity ? <AnimatedNumber value={bySeverity.LOW ?? 0} /> : "—"}
              </span>
            </div>
          </div>

          {/* List of critical violations */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-0.5 text-xs">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <AlertOctagon className="h-3.5 w-3.5 text-danger" />
                {isVietnamese ? "Vi phạm khẩn cấp trên trang này" : "Critical incidents on this page"}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {!listLoading && !listError && (isVietnamese ? `${criticalIncidents.length} vụ việc` : `${criticalIncidents.length} records`)}
              </span>
            </div>

            <div className="max-h-[240px] overflow-y-auto space-y-1.5 pr-0.5">
              {criticalIncidents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/50 bg-background/40 p-5 text-center text-xs text-muted-foreground">
                  <ShieldCheck className="h-6 w-6 text-success mx-auto mb-1 opacity-80" />
                  <p className="font-semibold text-foreground">
                    {listEmptyMessage}
                  </p>
                </div>
              ) : (
                criticalIncidents.map((incident) => (
                  <div
                    key={incident.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-danger/30 bg-danger/[0.04] p-2 sm:p-2.5 shadow-[inset_1px_1px_2px_var(--shadow-dark)]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-danger/15 text-danger font-bold relative">
                        <AlertOctagon className="h-3.5 w-3.5" />
                        <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-danger animate-ping" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link
                            href={`/incidents/${incident.id}`}
                            className="font-mono text-xs font-bold text-primary hover:underline"
                          >
                            #{incident.id.slice(0, 8)}
                          </Link>
                          <span className="text-xs font-bold text-foreground truncate">
                            {formatViolation(incident.violationType)}
                          </span>
                          <IncidentSeverityBadge severity={incident.severity} />
                          <IncidentStatusBadge status={incident.status} />
                        </div>
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground flex items-center gap-2 truncate mt-0.5">
                          {onFilterSite && incident.siteId ? (
                            <button
                              type="button"
                              onClick={() => onFilterSite(incident.siteId)}
                              className="flex items-center gap-1 truncate hover:text-primary transition hover:underline"
                              title={isVietnamese ? `Lọc theo công trường ${incident.siteName || getSiteName(incident.siteId)}` : "Filter by this site"}
                            >
                              <span className="truncate">{incident.siteName || getSiteName(incident.siteId)}</span>
                            </button>
                          ) : (
                            <span className="flex items-center gap-1 truncate">
                              {incident.siteName || getSiteName(incident.siteId)}
                            </span>
                          )}
                          <span>•</span>
                          <span className="flex items-center gap-1 font-mono">
                            {incident.cameraCode || getCameraCode(incident.cameraId)}
                          </span>
                          <span>•</span>
                          <span>{formatDate(incident.detectedAt, locale)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {incident.status === "PENDING_REVIEW" && onReview && (
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => onReview(incident)}
                          className="h-6 sm:h-7 px-2 text-[10px] sm:text-xs gap-0.5"
                        >
                          <CheckSquare className="h-3 w-3" />
                          <span>{t("incidents.actions.review")}</span>
                        </Button>
                      )}

                      {incident.status === "CONFIRMED" && onAssign && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onAssign(incident)}
                          className="h-6 sm:h-7 px-2 text-[10px] sm:text-xs text-primary gap-0.5"
                        >
                          <UserCheck className="h-3 w-3" />
                          <span>{t("incidents.actions.assign")}</span>
                        </Button>
                      )}

                      <Link href={`/incidents/${incident.id}`}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 sm:h-7 px-2 text-[10px] sm:text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 4. NỘI DUNG: ĐÃ GIẢI QUYẾT & ĐÓNG (RESOLVED) ───────────────────── */}
      {activeStat === "resolved" && (
        <div className="space-y-3">
          {/* Resolution KPI metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-xl border border-success/40 bg-success/10 p-2.5 sm:p-3 text-center">
              <span className="text-[10px] sm:text-[11px] font-bold text-success uppercase block">
                {isVietnamese ? "Tổng sự cố đã khắc phục" : "Total Remediated"}
              </span>
              <span className="text-xl sm:text-2xl font-black text-success font-mono tabular-nums">
                {remediated === undefined ? "—" : <AnimatedNumber value={remediated} />}
              </span>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {isVietnamese ? "Đã khắc phục, gồm hồ sơ đóng sau nghiệm thu" : "Includes cases closed after acceptance"}
              </p>
            </div>

            <div className="rounded-xl border border-primary/40 bg-primary/10 p-2.5 sm:p-3 text-center">
              <span className="text-[10px] sm:text-[11px] font-bold text-primary uppercase block">
                {isVietnamese ? "Tỷ lệ khắc phục an toàn" : "Safety Resolution Rate"}
              </span>
              <span className="text-xl sm:text-2xl font-black text-primary font-mono tabular-nums">
                {resolutionRate === undefined ? "—" : <><AnimatedNumber value={resolutionRate} />%</>}
              </span>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {isVietnamese ? "Trên tổng số hồ sơ theo bộ lọc" : "Of all incidents matching the filters"}
              </p>
            </div>

            <div className="rounded-xl border border-border/40 bg-muted/40 p-2.5 sm:p-3 text-center">
              <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase block">
                {isVietnamese ? "Cảnh báo ảo loại trừ" : "False Alarms Filtered"}
              </span>
              <span className="text-xl sm:text-2xl font-black text-foreground font-mono tabular-nums">
                {falseAlarms === undefined ? "—" : <AnimatedNumber value={falseAlarms} />}
              </span>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {isVietnamese ? "Gồm hồ sơ đã đóng sau bác bỏ" : "Includes cases closed after dismissal"}
              </p>
            </div>
          </div>

          {/* List of resolved incidents */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-0.5 text-xs">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                {isVietnamese ? "Hồ sơ chờ nghiệm thu trên trang này" : "Incidents awaiting acceptance on this page"}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {!listLoading && !listError && (isVietnamese ? `${resolvedIncidents.length} hồ sơ` : `${resolvedIncidents.length} records`)}
              </span>
            </div>

            <div className="max-h-[240px] overflow-y-auto space-y-1.5 pr-0.5">
              {resolvedIncidents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/50 bg-background/40 p-5 text-center text-xs text-muted-foreground">
                  <p>{listEmptyMessage}</p>
                </div>
              ) : (
                resolvedIncidents.map((incident) => (
                  <div
                    key={incident.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-success/30 bg-success/[0.04] p-2 sm:p-2.5 shadow-[inset_1px_1px_2px_var(--shadow-dark)]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success font-bold">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link
                            href={`/incidents/${incident.id}`}
                            className="font-mono text-xs font-bold text-primary hover:underline"
                          >
                            #{incident.id.slice(0, 8)}
                          </Link>
                          <span className="text-xs font-semibold text-foreground truncate">
                            {formatViolation(incident.violationType)}
                          </span>
                          <IncidentStatusBadge status={incident.status} />
                        </div>
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground flex items-center gap-2 truncate mt-0.5">
                          {onFilterSite && incident.siteId ? (
                            <button
                              type="button"
                              onClick={() => onFilterSite(incident.siteId)}
                              className="flex items-center gap-1 truncate hover:text-primary transition hover:underline"
                              title={isVietnamese ? `Lọc theo công trường ${incident.siteName || getSiteName(incident.siteId)}` : "Filter by this site"}
                            >
                              <span className="truncate">{incident.siteName || getSiteName(incident.siteId)}</span>
                            </button>
                          ) : (
                            <span className="flex items-center gap-1 truncate">
                              {incident.siteName || getSiteName(incident.siteId)}
                            </span>
                          )}
                          <span>•</span>
                          <span className="flex items-center gap-1 font-mono">
                            {incident.cameraCode || getCameraCode(incident.cameraId)}
                          </span>
                          <span>•</span>
                          <span>{isVietnamese ? "Phát hiện: " : "Detected: "}{formatDate(incident.detectedAt, locale)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Link href={`/incidents/${incident.id}`}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 sm:h-7 px-2 text-[10px] sm:text-xs text-primary hover:text-primary gap-0.5"
                        >
                          <Eye className="h-3 w-3" />
                          <span className="hidden sm:inline">{t("incidents.actions.viewDetail")}</span>
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
