"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  AlertTriangle,
  Building2,
  Camera,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  Clock,
  ExternalLink,
  Eye,
  Filter,
  HardHat,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Shirt,
  UserCheck,
  Video,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/providers/locale-provider";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import { IncidentStatusBadge } from "./incident-status-badge";
import { IncidentSeverityBadge } from "./incident-severity-badge";
import type { IncidentItem, IncidentSeverity, IncidentStatus, ViolationType } from "@/types";

export type IncidentStatKey = "total" | "pendingReview" | "critical" | "resolved";

export interface IncidentStatsDetailPanelProps {
  activeStat: IncidentStatKey;
  incidents: IncidentItem[];
  loading?: boolean;
  onClose: () => void;
  onReview?: (incident: IncidentItem) => void;
  onAssign?: (incident: IncidentItem) => void;
  onResolve?: (incident: IncidentItem) => void;
  onFilterStatus?: (status: string) => void;
  onFilterSeverity?: (severity: string) => void;
  onFilterViolation?: (violation: string) => void;
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
  loading = false,
  onClose,
  onReview,
  onAssign,
  onResolve,
  onFilterStatus,
  onFilterSeverity,
  onFilterViolation,
}: IncidentStatsDetailPanelProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const { getSiteName, getCameraCode } = useEntityLookup();

  // 1. Phân bổ theo trạng thái (Status Breakdown)
  const statusStats = useMemo(() => {
    let pending = 0;
    let confirmed = 0;
    let resolved = 0;
    let closed = 0;
    let dismissed = 0;

    for (const item of incidents) {
      if (item.status === "PENDING_REVIEW") pending++;
      else if (item.status === "CONFIRMED") confirmed++;
      else if (item.status === "RESOLVED") resolved++;
      else if (item.status === "CLOSED") closed++;
      else if (item.status === "DISMISSED") dismissed++;
    }

    return { pending, confirmed, resolved, closed, dismissed };
  }, [incidents]);

  // 2. Phân bổ theo loại vi phạm (Violation Type Breakdown)
  const violationStats = useMemo(() => {
    let noHelmet = 0;
    let noVest = 0;
    let restrictedArea = 0;
    let multi = 0;
    let other = 0;

    for (const item of incidents) {
      if (item.violationType === "NO_HELMET") noHelmet++;
      else if (item.violationType === "NO_VEST") noVest++;
      else if (item.violationType === "RESTRICTED_AREA") restrictedArea++;
      else if (item.violationType === "MULTI_VIOLATION") multi++;
      else other++;
    }

    return { noHelmet, noVest, restrictedArea, multi, other };
  }, [incidents]);

  // 3. Phân bổ theo mức độ (Severity Breakdown)
  const severityStats = useMemo(() => {
    let critical = 0;
    let high = 0;
    let medium = 0;
    let low = 0;

    for (const item of incidents) {
      if (item.severity === "CRITICAL") critical++;
      else if (item.severity === "HIGH") high++;
      else if (item.severity === "MEDIUM") medium++;
      else low++;
    }

    return { critical, high, medium, low };
  }, [incidents]);

  // 4. Các danh sách sự cố đã lọc theo mục đích
  const pendingIncidents = useMemo(
    () => incidents.filter((i) => i.status === "PENDING_REVIEW"),
    [incidents],
  );

  const criticalIncidents = useMemo(
    () => incidents.filter((i) => i.severity === "CRITICAL" || i.severity === "HIGH"),
    [incidents],
  );

  const resolvedIncidents = useMemo(
    () => incidents.filter((i) => i.status === "RESOLVED" || i.status === "CLOSED"),
    [incidents],
  );

  const totalCount = incidents.length;
  const resolvedCount = statusStats.resolved + statusStats.closed;
  const resolutionRate =
    totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 100;

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
                {activeStat === "total" && `${totalCount}`}
                {activeStat === "pendingReview" && `${pendingIncidents.length}`}
                {activeStat === "critical" && `${severityStats.critical + severityStats.high}`}
                {activeStat === "resolved" && `${resolvedCount}`}
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

          {activeStat === "critical" && onFilterSeverity && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onFilterSeverity("CRITICAL")}
              className="h-7 sm:h-8 gap-1 text-[11px] sm:text-xs text-danger hover:text-danger px-2 sm:px-3"
            >
              <Filter className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">{isVietnamese ? "Lọc khẩn cấp" : "Filter Critical"}</span>
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
                    {statusStats.pending}
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
                    {statusStats.confirmed}
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
                    {statusStats.resolved}
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
                    {statusStats.closed}
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
                    {statusStats.dismissed}
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
                    {violationStats.noHelmet}
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
                    {violationStats.noVest}
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
                    {violationStats.restrictedArea}
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
                    {violationStats.multi}
                  </Badge>
                </button>
              </div>
            </div>
          </div>

          {/* Danh sách sự cố gần nhất */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-0.5 text-xs">
              <span className="font-bold text-foreground">
                {isVietnamese ? "Sự cố ghi nhận gần nhất" : "Recent Incidents"}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {isVietnamese ? `Hiển thị ${Math.min(incidents.length, 6)} sự cố` : `Showing ${Math.min(incidents.length, 6)} incidents`}
              </span>
            </div>

            <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-0.5">
              {incidents.slice(0, 6).map((incident) => (
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
                        <span className="flex items-center gap-1 truncate">
                          <Building2 className="h-3 w-3 shrink-0" />
                          {incident.siteName || getSiteName(incident.siteId)}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-mono">
                          <Camera className="h-3 w-3 shrink-0" />
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
                {isVietnamese
                  ? `Có ${pendingIncidents.length} sự cố vi phạm đang chờ nhân sự xác thực`
                  : `${pendingIncidents.length} violations awaiting human verification`}
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
                  {isVietnamese ? "Không còn sự cố nào chờ duyệt" : "No pending review incidents"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {isVietnamese ? "Mọi vi phạm PPE phát hiện đã được thẩm duyệt hoàn tất." : "All detected PPE violations have been processed."}
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
                        <span className="flex items-center gap-1 truncate">
                          <Building2 className="h-3 w-3 shrink-0" />
                          {incident.siteName || getSiteName(incident.siteId)}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-mono">
                          <Camera className="h-3 w-3 shrink-0" />
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
              <span className="text-base sm:text-lg font-black text-danger font-mono">
                {severityStats.critical}
              </span>
            </div>

            <div className="rounded-xl border border-warning/40 bg-warning/10 p-2 sm:p-2.5 text-center">
              <span className="text-[10px] sm:text-[11px] font-bold text-warning uppercase block truncate">
                {t("incidents.severity.high")}
              </span>
              <span className="text-base sm:text-lg font-black text-warning font-mono">
                {severityStats.high}
              </span>
            </div>

            <div className="rounded-xl border border-primary/40 bg-primary/10 p-2 sm:p-2.5 text-center">
              <span className="text-[10px] sm:text-[11px] font-bold text-primary uppercase block truncate">
                {t("incidents.severity.medium")}
              </span>
              <span className="text-base sm:text-lg font-black text-primary font-mono">
                {severityStats.medium}
              </span>
            </div>

            <div className="rounded-xl border border-border/40 bg-muted/40 p-2 sm:p-2.5 text-center">
              <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase block truncate">
                {t("incidents.severity.low")}
              </span>
              <span className="text-base sm:text-lg font-black text-muted-foreground font-mono">
                {severityStats.low}
              </span>
            </div>
          </div>

          {/* List of critical violations */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-0.5 text-xs">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <AlertOctagon className="h-3.5 w-3.5 text-danger" />
                {isVietnamese ? "Danh sách vi phạm mức độ cao & khẩn cấp" : "High & Critical Violations List"}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {criticalIncidents.length} {isVietnamese ? "vụ việc" : "records"}
              </span>
            </div>

            <div className="max-h-[240px] overflow-y-auto space-y-1.5 pr-0.5">
              {criticalIncidents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/50 bg-background/40 p-5 text-center text-xs text-muted-foreground">
                  <ShieldCheck className="h-6 w-6 text-success mx-auto mb-1 opacity-80" />
                  <p className="font-semibold text-foreground">
                    {isVietnamese ? "Không có vi phạm khẩn cấp nào" : "No critical violations"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {isVietnamese ? "Hiện trường đang được kiểm soát ở mức rủi ro an toàn cho phép." : "Field sites are maintaining acceptable safety risk standards."}
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
                          <span className="flex items-center gap-1 truncate">
                            <Building2 className="h-3 w-3 shrink-0" />
                            {incident.siteName || getSiteName(incident.siteId)}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-mono">
                            <Camera className="h-3 w-3 shrink-0" />
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
              <span className="text-xl sm:text-2xl font-black text-success font-mono">
                {resolvedCount}
              </span>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {isVietnamese ? "Đã nghiệm thu hiện trường" : "Field-verified solutions"}
              </p>
            </div>

            <div className="rounded-xl border border-primary/40 bg-primary/10 p-2.5 sm:p-3 text-center">
              <span className="text-[10px] sm:text-[11px] font-bold text-primary uppercase block">
                {isVietnamese ? "Tỷ lệ khắc phục an toàn" : "Safety Resolution Rate"}
              </span>
              <span className="text-xl sm:text-2xl font-black text-primary font-mono">
                {resolutionRate}%
              </span>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {isVietnamese ? "Trên tổng số hồ sơ đã mở" : "Of all opened incidents"}
              </p>
            </div>

            <div className="rounded-xl border border-border/40 bg-muted/40 p-2.5 sm:p-3 text-center">
              <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase block">
                {isVietnamese ? "Cảnh báo ảo loại trừ" : "False Alarms Filtered"}
              </span>
              <span className="text-xl sm:text-2xl font-black text-foreground font-mono">
                {statusStats.dismissed}
              </span>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {isVietnamese ? "Đã thẩm duyệt bác bỏ" : "Dismissed after AI check"}
              </p>
            </div>
          </div>

          {/* List of resolved incidents */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-0.5 text-xs">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                {isVietnamese ? "Hồ sơ sự cố đã hoàn tất khắc phục gần đây" : "Recently Resolved Incidents"}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {resolvedIncidents.length} {isVietnamese ? "hồ sơ" : "records"}
              </span>
            </div>

            <div className="max-h-[240px] overflow-y-auto space-y-1.5 pr-0.5">
              {resolvedIncidents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/50 bg-background/40 p-5 text-center text-xs text-muted-foreground">
                  <p>{isVietnamese ? "Chưa có sự cố nào được đánh dấu giải quyết." : "No resolved incidents yet."}</p>
                </div>
              ) : (
                resolvedIncidents.slice(0, 8).map((incident) => (
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
                          <span className="flex items-center gap-1 truncate">
                            <Building2 className="h-3 w-3 shrink-0" />
                            {incident.siteName || getSiteName(incident.siteId)}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-mono">
                            <Camera className="h-3 w-3 shrink-0" />
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
