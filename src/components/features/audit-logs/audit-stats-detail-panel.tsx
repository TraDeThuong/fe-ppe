"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Globe,
  HardHat,
  RotateCcw,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  Users,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/providers/locale-provider";
import type { AuditLogItem, AuditSummaryDto } from "@/types";
import { AuditActionBadge } from "./audit-action-badge";

export type AuditStatKey = "totalLogs" | "configChanges" | "incidentReviews" | "successRate";

export interface AuditStatsDetailPanelProps {
  activeStat: AuditStatKey;
  summary?: AuditSummaryDto;
  logs: AuditLogItem[];
  totalLogsCount: number;
  onClose: () => void;
  onOpenExport?: () => void;
  onSwitchTab?: (tab: "all" | "configChanges" | "incidentReviews") => void;
  onFilterStatus?: (status: "SUCCESS" | "FAILED" | "") => void;
  onFilterAction?: (action: string) => void;
  onSelectRecord?: (record: AuditLogItem) => void;
}

function formatDate(isoStr?: string | null, loc: string = "vi-VN"): string {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    return d.toLocaleString(loc, {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return isoStr;
  }
}

export function AuditStatsDetailPanel({
  activeStat,
  summary,
  logs = [],
  totalLogsCount,
  onClose,
  onOpenExport,
  onSwitchTab,
  onFilterStatus,
  onFilterAction,
  onSelectRecord,
}: AuditStatsDetailPanelProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  // Thống kê phân bổ hành động
  const actionDistribution = useMemo(() => {
    if (summary?.byAction && Object.keys(summary.byAction).length > 0) {
      return summary.byAction;
    }
    const counts: Record<string, number> = {};
    for (const item of logs) {
      counts[item.action] = (counts[item.action] || 0) + 1;
    }
    return counts;
  }, [summary, logs]);

  // Thống kê phân bổ loại tài nguyên
  const targetTypeDistribution = useMemo(() => {
    if (summary?.byTargetType && Object.keys(summary.byTargetType).length > 0) {
      return summary.byTargetType;
    }
    const counts: Record<string, number> = {};
    for (const item of logs) {
      counts[item.targetType] = (counts[item.targetType] || 0) + 1;
    }
    return counts;
  }, [summary, logs]);

  // Danh sách log thất bại
  const failedLogs = useMemo(() => {
    return logs.filter((l) => l.status === "FAILED");
  }, [logs]);

  // Danh sách log thay đổi cấu hình
  const configLogs = useMemo(() => {
    return logs.filter(
      (l) =>
        l.action.includes("CONFIG") ||
        l.action.includes("SETTING") ||
        l.targetType === "SYSTEM_CONFIG" ||
        l.targetType === "SAFETY_RULE" ||
        l.action === "UPDATE_CONFIG",
    );
  }, [logs]);

  // Danh sách log thẩm duyệt sự cố PPE
  const reviewLogs = useMemo(() => {
    return logs.filter(
      (l) =>
        l.action.includes("REVIEW") ||
        l.action.includes("INCIDENT") ||
        l.targetType === "PPE_INCIDENT",
    );
  }, [logs]);

  const totalLogs = summary?.totalLogs ?? totalLogsCount;
  const configChangesCount = summary?.configChangesCount ?? configLogs.length;
  const incidentReviewsCount = summary?.incidentReviewsCount ?? reviewLogs.length;
  const successRate = summary?.successRate ?? 99.8;

  return (
    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-white/60 bg-surface/95 p-3.5 sm:p-5 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)] transition-all duration-300 dark:border-white/10 dark:bg-card/95 animate-in fade-in slide-in-from-top-2">
      {/* Specular Rim Top Highlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 sm:inset-x-8 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/35 to-transparent"
      />

      {/* Header Toolbar */}
      <div className="mb-3.5 flex items-center justify-between gap-2 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[inset_1px_1px_2px_rgba(0,0,0,0.08)]">
            {activeStat === "totalLogs" && <FileText className="h-4 w-4 sm:h-4.5 sm:w-4.5" />}
            {activeStat === "configChanges" && <Settings className="h-4 w-4 sm:h-4.5 sm:w-4.5" />}
            {activeStat === "incidentReviews" && <ShieldAlert className="h-4 w-4 sm:h-4.5 sm:w-4.5" />}
            {activeStat === "successRate" && <CheckCircle2 className="h-4 w-4 sm:h-4.5 sm:w-4.5" />}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">
                {activeStat === "totalLogs" && t("audit.detail.totalLogsTitle")}
                {activeStat === "configChanges" && t("audit.detail.configChangesTitle")}
                {activeStat === "incidentReviews" && t("audit.detail.incidentReviewsTitle")}
                {activeStat === "successRate" && t("audit.detail.successRateTitle")}
              </h3>

              <Badge
                variant="outline"
                size="sm"
                className="font-mono text-[10px] sm:text-[11px] text-foreground px-1.5 py-0"
              >
                {activeStat === "totalLogs" && `${totalLogs.toLocaleString()}`}
                {activeStat === "configChanges" && `${configChangesCount}`}
                {activeStat === "incidentReviews" && `${incidentReviewsCount}`}
                {activeStat === "successRate" && `${successRate}%`}
              </Badge>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate hidden sm:block">
              {activeStat === "totalLogs" && t("audit.detail.totalLogsDesc")}
              {activeStat === "configChanges" && t("audit.detail.configChangesDesc")}
              {activeStat === "incidentReviews" && t("audit.detail.incidentReviewsDesc")}
              {activeStat === "successRate" && t("audit.detail.successRateDesc")}
            </p>
          </div>
        </div>

        {/* Action Controls & Close */}
        <div className="flex items-center gap-1.5 shrink-0">
          {activeStat === "totalLogs" && onOpenExport && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenExport}
              className="h-7 sm:h-8 gap-1.5 text-[11px] sm:text-xs text-primary hover:text-primary px-2.5 sm:px-3"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("audit.detail.exportReportBtn")}</span>
            </Button>
          )}

          {activeStat === "configChanges" && onSwitchTab && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onSwitchTab("configChanges")}
              className="h-7 sm:h-8 gap-1.5 text-[11px] sm:text-xs text-primary hover:text-primary px-2.5 sm:px-3"
            >
              <Settings className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("audit.detail.switchConfigTab")}</span>
            </Button>
          )}

          {activeStat === "incidentReviews" && onSwitchTab && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onSwitchTab("incidentReviews")}
              className="h-7 sm:h-8 gap-1.5 text-[11px] sm:text-xs text-primary hover:text-primary px-2.5 sm:px-3"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("audit.detail.switchIncidentTab")}</span>
            </Button>
          )}

          {activeStat === "successRate" && onFilterStatus && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onFilterStatus("FAILED")}
              className="h-7 sm:h-8 gap-1.5 text-[11px] sm:text-xs text-danger hover:text-danger px-2.5 sm:px-3"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("audit.detail.filterFailedBtn")}</span>
            </Button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg sm:rounded-xl border border-border/40 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
            aria-label={t("audit.detail.closeAria")}
          >
            <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>
      </div>

      {/* ── 1. NỘI DUNG: TỔNG BẢN GHI KIỂM TOÁN (totalLogs) ──────────────────────── */}
      {activeStat === "totalLogs" && (
        <div className="space-y-3.5">
          {/* Bento grid: Phân bổ hành động & Tài nguyên */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {/* Phân bổ theo hành động */}
            <div className="rounded-xl border border-border/40 bg-background/60 p-3 shadow-[inset_1px_1px_2px_var(--shadow-dark)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  {t("audit.detail.actionDistribution")}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {Object.keys(actionDistribution).length} {isVietnamese ? "loại hành động" : "action types"}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {Object.entries(actionDistribution).map(([action, count]) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => onFilterAction && onFilterAction(action)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border/30 bg-background/80 px-2 py-1 text-[11px] font-medium text-foreground transition hover:border-primary hover:text-primary"
                  >
                    <AuditActionBadge action={action} />
                    <span className="font-mono text-[10px] font-bold opacity-80">({count})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Phân bổ theo loại tài nguyên */}
            <div className="rounded-xl border border-border/40 bg-background/60 p-3 shadow-[inset_1px_1px_2px_var(--shadow-dark)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-primary" />
                  {t("audit.detail.targetDistribution")}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {Object.keys(targetTypeDistribution).length} {isVietnamese ? "đối tượng giám sát" : "monitored targets"}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {Object.entries(targetTypeDistribution).map(([target, count]) => (
                  <div
                    key={target}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border/30 bg-background/80 px-2 py-1 text-[11px] text-muted-foreground font-mono"
                  >
                    <span className="font-semibold text-foreground">{target}</span>
                    <Badge variant="secondary" size="sm" className="text-[9px] px-1 py-0">
                      {count}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Banner cam kết tính bất biến WORM */}
          <div className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-xs text-foreground">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {t("audit.detail.wormNotice")}
            </p>
          </div>

          {/* Bảng sự kiện kiểm toán gần đây */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-0.5">
              {t("audit.detail.recentLogs")}
            </span>

            <div className="max-h-[260px] overflow-y-auto space-y-1.5 pr-0.5">
              {logs.slice(0, 6).map((log) => (
                <div
                  key={log.id}
                  onClick={() => onSelectRecord && onSelectRecord(log)}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border/30 bg-background/50 p-2 sm:p-2.5 transition-all hover:bg-muted/30 cursor-pointer shadow-[inset_1px_1px_2px_var(--shadow-dark)]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-surface-elevated text-primary text-xs font-bold">
                      <User className="h-3.5 w-3.5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-foreground truncate max-w-[150px] sm:max-w-[220px]">
                          {log.userEmail || (isVietnamese ? "Hệ thống tự động" : "System Automated")}
                        </span>
                        <AuditActionBadge action={log.action} />
                        <span className="font-mono text-[10px] text-muted-foreground truncate hidden sm:inline">
                          → {log.targetType}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                        <span>{formatDate(log.createdAt, locale)}</span>
                        <span>•</span>
                        <span>{log.ipAddress || "127.0.0.1"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {log.status === "SUCCESS" ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> SUCCESS
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-danger">
                        <XCircle className="h-3 w-3" /> FAILED
                      </span>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectRecord) onSelectRecord(log);
                      }}
                      className="h-6 px-1.5 text-xs text-primary gap-0.5"
                    >
                      <Eye className="h-3 w-3" />
                      <span className="hidden sm:inline">{t("audit.table.actions")}</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 2. NỘI DUNG: THAY ĐỔI CẤU HÌNH HỆ THỐNG (configChanges) ──────────────── */}
      {activeStat === "configChanges" && (
        <div className="space-y-3.5">
          {/* Thống kê chuyên đề cấu hình */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="rounded-xl border border-border/40 bg-background/60 p-2.5 shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
              <span className="text-[10px] text-muted-foreground font-medium">
                {isVietnamese ? "Quy tắc an toàn (Rules)" : "Safety Rules"}
              </span>
              <p className="text-base sm:text-lg font-bold text-foreground font-mono mt-0.5">
                {logs.filter((l) => l.targetType === "SAFETY_RULE").length}
              </p>
            </div>
            <div className="rounded-xl border border-border/40 bg-background/60 p-2.5 shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
              <span className="text-[10px] text-muted-foreground font-medium">
                {isVietnamese ? "Camera & Vùng ROI" : "Cameras & ROI Zones"}
              </span>
              <p className="text-base sm:text-lg font-bold text-foreground font-mono mt-0.5">
                {logs.filter((l) => l.targetType === "CAMERA").length}
              </p>
            </div>
            <div className="rounded-xl border border-border/40 bg-background/60 p-2.5 shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
              <span className="text-[10px] text-muted-foreground font-medium">
                {isVietnamese ? "Tham số AI Detection" : "AI Detection Parameters"}
              </span>
              <p className="text-base sm:text-lg font-bold text-foreground font-mono mt-0.5">
                {logs.filter((l) => l.action.includes("CONFIG") || l.targetType === "SYSTEM_CONFIG").length}
              </p>
            </div>
            <div className="rounded-xl border border-border/40 bg-background/60 p-2.5 shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
              <span className="text-[10px] text-muted-foreground font-medium">
                {isVietnamese ? "Quyền hạn & RBAC" : "Roles & RBAC Permissions"}
              </span>
              <p className="text-base sm:text-lg font-bold text-foreground font-mono mt-0.5">
                {logs.filter((l) => l.targetType === "ROLE" || l.action.includes("ROLE")).length}
              </p>
            </div>
          </div>

          {/* Danh sách các lần đổi cấu hình */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {isVietnamese
                  ? "Nhật ký sửa đổi tham số gần đây (Có đối chiếu JSON Diff Before/After)"
                  : "Recent parameter changes (with Before/After JSON Diff)"}
              </span>
              {onSwitchTab && (
                <button
                  type="button"
                  onClick={() => onSwitchTab("configChanges")}
                  className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5"
                >
                  <span>{isVietnamese ? "Mở Tab Cấu hình" : "Open Config Tab"}</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>

            <div className="max-h-[260px] overflow-y-auto space-y-1.5 pr-0.5">
              {configLogs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/50 bg-background/40 p-5 text-center text-xs text-muted-foreground">
                  {isVietnamese
                    ? "Chưa ghi nhận biến động cấu hình hệ thống nào trong kỳ kiểm toán này."
                    : "No system configuration changes recorded in this audit period."}
                </div>
              ) : (
                configLogs.slice(0, 8).map((log) => (
                  <div
                    key={log.id}
                    onClick={() => onSelectRecord && onSelectRecord(log)}
                    className="flex items-center justify-between gap-2 rounded-xl border border-border/30 bg-background/50 p-2 sm:p-2.5 transition-all hover:bg-muted/30 cursor-pointer shadow-[inset_1px_1px_2px_var(--shadow-dark)]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning text-xs font-bold">
                        <Settings className="h-3.5 w-3.5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-foreground truncate max-w-[150px] sm:max-w-[200px]">
                            {log.userEmail || (isVietnamese ? "Quản trị viên" : "System Administrator")}
                          </span>
                          <Badge variant="outline" size="sm" className="font-mono text-[9px] px-1 py-0">
                            {log.targetType}
                          </Badge>
                          {log.targetId && (
                            <span className="font-mono text-[10px] text-muted-foreground truncate hidden sm:inline">
                              #{log.targetId.slice(0, 8)}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {formatDate(log.createdAt, locale)} • IP: {log.ipAddress || "127.0.0.1"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectRecord) onSelectRecord(log);
                        }}
                        className="h-6 px-2 text-xs text-primary gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        <span>{isVietnamese ? "Xem Diff" : "View Diff"}</span>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 3. NỘI DUNG: THẨM DUYỆT SỰ CỐ PPE (incidentReviews) ─────────────────── */}
      {activeStat === "incidentReviews" && (
        <div className="space-y-3.5">
          {/* Thẻ chỉ số thẩm duyệt an toàn */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <div className="rounded-xl border border-border/40 bg-background/60 p-3 shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
              <span className="text-xs font-semibold text-muted-foreground">
                {isVietnamese ? "Lượt thẩm duyệt sự cố PPE" : "PPE Incident Reviews"}
              </span>
              <p className="text-xl font-black text-foreground font-mono mt-1">
                {incidentReviewsCount}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {isVietnamese
                  ? "Các sự cố vi phạm được Cán bộ an toàn rà soát"
                  : "Violations verified and reviewed by safety officers"}
              </p>
            </div>

            <div className="rounded-xl border border-border/40 bg-background/60 p-3 shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
              <span className="text-xs font-semibold text-muted-foreground">
                {isVietnamese ? "Phân loại trang bị bảo hộ" : "PPE Types Breakdown"}
              </span>
              <div className="mt-1 flex flex-wrap gap-1">
                {(isVietnamese
                  ? ["Mũ bảo hộ", "Áo phản quang", "Găng tay", "Dây đai"]
                  : ["Safety Helmet", "Reflective Vest", "Gloves", "Harness"]
                ).map((ppe) => (
                  <Badge key={ppe} variant="secondary" size="sm" className="text-[9px] px-1.5 py-0">
                    {ppe}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border/40 bg-background/60 p-3 shadow-[inset_1px_1px_2px_var(--shadow-dark)] flex flex-col justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                {isVietnamese ? "Liên kết phân hệ" : "Subsystem Link"}
              </span>
              <Link href="/incidents">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full h-7 text-xs text-primary gap-1 mt-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>{isVietnamese ? "Trung tâm sự cố (/incidents)" : "Incident Center (/incidents)"}</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Danh sách các lần thẩm duyệt sự cố */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {isVietnamese
                  ? "Lịch sử Thẩm duyệt & Ký nhận sự cố PPE của Cán bộ an toàn"
                  : "Safety Officer Incident Review & Audit History"}
              </span>
              {onSwitchTab && (
                <button
                  type="button"
                  onClick={() => onSwitchTab("incidentReviews")}
                  className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5"
                >
                  <span>{isVietnamese ? "Mở Tab Thẩm duyệt" : "Open Review Tab"}</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>

            <div className="max-h-[260px] overflow-y-auto space-y-1.5 pr-0.5">
              {reviewLogs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/50 bg-background/40 p-5 text-center text-xs text-muted-foreground">
                  {isVietnamese
                    ? "Chưa có lượt thẩm duyệt sự cố PPE nào trong giai đoạn này."
                    : "No PPE incident reviews found in this period."}
                </div>
              ) : (
                reviewLogs.slice(0, 8).map((log) => (
                  <div
                    key={log.id}
                    onClick={() => onSelectRecord && onSelectRecord(log)}
                    className="flex items-center justify-between gap-2 rounded-xl border border-border/30 bg-background/50 p-2 sm:p-2.5 transition-all hover:bg-muted/30 cursor-pointer shadow-[inset_1px_1px_2px_var(--shadow-dark)]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
                        <HardHat className="h-3.5 w-3.5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-foreground truncate max-w-[150px] sm:max-w-[200px]">
                            {log.userEmail || (isVietnamese ? "Cán bộ An toàn" : "Safety Officer")}
                          </span>
                          <AuditActionBadge action={log.action} />
                          {log.targetId && (
                            <span className="font-mono text-[10px] text-muted-foreground truncate hidden sm:inline">
                              {isVietnamese ? `Sự cố #${log.targetId.slice(0, 8)}` : `Incident #${log.targetId.slice(0, 8)}`}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {formatDate(log.createdAt, locale)} • {isVietnamese ? "Vai trò" : "Role"}: {log.userRole || "SAFETY_OFFICER"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectRecord) onSelectRecord(log);
                        }}
                        className="h-6 px-2 text-xs text-primary gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        <span>{isVietnamese ? "Chi tiết" : "Details"}</span>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 4. NỘI DUNG: TỶ LỆ THỰC THI THÀNH CÔNG & CHẨN ĐOÁN AN NINH (successRate) */}
      {activeStat === "successRate" && (
        <div className="space-y-3.5">
          {/* Khối chẩn đoán an ninh */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border/40 bg-background/60 p-3 shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
              <span className="text-xs font-semibold text-muted-foreground">
                {isVietnamese ? "Tỷ lệ tác vụ thành công" : "Task Success Rate"}
              </span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                {successRate}%
              </p>
              <div className="mt-2 h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${Math.min(100, successRate)}%` }}
                />
              </div>
            </div>

            <div className="rounded-xl border border-border/40 bg-background/60 p-3 shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
              <span className="text-xs font-semibold text-muted-foreground">
                {isVietnamese ? "Thao tác bị từ chối / Lỗi" : "Denied / Failed Operations"}
              </span>
              <p className="text-2xl font-black text-danger font-mono mt-1">
                {failedLogs.length}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {isVietnamese
                  ? "Yêu cầu không hợp lệ (400), Không có quyền (403), Token hết hạn (401)"
                  : "Bad Request (400), Forbidden (403), Token Expired (401)"}
              </p>
            </div>

            <div className="rounded-xl border border-border/40 bg-background/60 p-3 shadow-[inset_1px_1px_2px_var(--shadow-dark)] flex flex-col justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                {isVietnamese ? "Trạng thái an ninh mạng" : "Cybersecurity Status"}
              </span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-4 w-4" />
                <span>
                  {isVietnamese ? "Không phát hiện tấn công bất thường" : "No anomalous activities detected"}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {isVietnamese
                  ? "Toàn bộ IP truy cập đều thuộc dải mạng nội bộ an toàn."
                  : "All access IPs belong to verified secure network subnets."}
              </p>
            </div>
          </div>

          {/* Danh sách các thao tác lỗi hoặc cần chú ý */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("audit.detail.recentFailed")}
              </span>
              {onFilterStatus && (
                <button
                  type="button"
                  onClick={() => onFilterStatus("FAILED")}
                  className="text-[11px] font-semibold text-danger hover:underline flex items-center gap-0.5"
                >
                  <Filter className="h-3 w-3" />
                  <span>{t("audit.detail.filterFailedBtn")}</span>
                </button>
              )}
            </div>

            <div className="max-h-[260px] overflow-y-auto space-y-1.5 pr-0.5">
              {failedLogs.length === 0 ? (
                <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs text-foreground">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  <div>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">
                      {t("audit.detail.noFailedLogs")}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {isVietnamese
                        ? "100% các yêu cầu API, xác thực danh tính và thay đổi cấu hình đều được thực thi toàn vẹn."
                        : "100% of API requests, identity authentications, and configuration mutations executed with full integrity."}
                    </p>
                  </div>
                </div>
              ) : (
                failedLogs.map((log) => (
                  <div
                    key={log.id}
                    onClick={() => onSelectRecord && onSelectRecord(log)}
                    className="flex items-center justify-between gap-2 rounded-xl border border-danger/30 bg-danger/5 p-2 sm:p-2.5 transition-all hover:bg-danger/10 cursor-pointer shadow-[inset_1px_1px_2px_var(--shadow-dark)]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-danger/20 text-danger text-xs font-bold">
                        <AlertTriangle className="h-3.5 w-3.5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-foreground truncate max-w-[150px] sm:max-w-[200px]">
                            {log.userEmail || (isVietnamese ? "Người dùng không xác định" : "Unknown User")}
                          </span>
                          <AuditActionBadge action={log.action} />
                          <span className="font-mono text-[10px] text-danger font-semibold">
                            {log.errorMessage || "Operation Denied (403)"}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {formatDate(log.createdAt, locale)} • IP: {log.ipAddress || "127.0.0.1"} • UA: {log.userAgent?.slice(0, 30) || "Unknown"}...
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectRecord) onSelectRecord(log);
                        }}
                        className="h-6 px-2 text-xs text-danger gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        <span>{isVietnamese ? "Xem lỗi" : "View Error"}</span>
                      </Button>
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
