"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  HelpCircle,
  Info,
  Settings,
  ShieldCheck,
  User,
  Users,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/providers/locale-provider";
import { useAuditLogs } from "@/hooks";
import type { AuditLogItem, AuditSummaryDto } from "@/types";
import { AuditActionBadge } from "./audit-action-badge";
import { getAuditActionInfo } from "./audit-action-dictionary";
import { diagnoseAuditFailure } from "./audit-error-diagnosis";

export type AuditStatKey = "totalLogs" | "configChanges" | "failed";

export interface AuditStatsDetailPanelProps {
  activeStat: AuditStatKey;
  summary?: AuditSummaryDto;
  logs?: AuditLogItem[];
  totalLogsCount: number;
  selectedAction?: string;
  onClose: () => void;
  onOpenExport?: () => void;
  onOpenHelp?: () => void;
  onSwitchTab?: (tab: "all" | "configChanges") => void;
  onFilterStatus?: (status: "SUCCESS" | "FAILED" | "") => void;
  onFilterAction?: (action: string) => void;
  onSelectRecord?: (record: AuditLogItem) => void;
}

const CONFIG_ACTIONS = [
  "TOGGLE_FEATURE_FLAG",
  "UPDATE_SYSTEM_CONFIG",
  "CREATE_SYSTEM_CONFIG",
  "DELETE_SYSTEM_CONFIG",
] as const;

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
  totalLogsCount,
  selectedAction = "",
  onClose,
  onOpenExport,
  onOpenHelp,
  onSwitchTab,
  onFilterStatus,
  onFilterAction,
  onSelectRecord,
}: AuditStatsDetailPanelProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  // Fetch dedicated global failed-logs preview when failed diagnosis panel is active
  const { data: failedLogsData, isLoading: isLoadingFailedLogs } = useAuditLogs(
    { status: "FAILED", page: 1, limit: 5, sortBy: "createdAt", order: "desc" },
    { enabled: activeStat === "failed" },
  );

  // Phân bổ hành động từ summary toàn cục
  const actionDistribution = useMemo(() => {
    if (summary?.byAction && Object.keys(summary.byAction).length > 0) {
      return summary.byAction;
    }
    if (Array.isArray(summary?.topActions) && summary.topActions.length > 0) {
      return Object.fromEntries(summary.topActions.map((a) => [a.action, a.count]));
    }
    return {};
  }, [summary]);

  const topActors = useMemo(() => {
    return summary?.topActors ?? [];
  }, [summary]);

  const failedLogs = failedLogsData?.items ?? [];

  const totalLogs = summary?.totalLogs ?? totalLogsCount;
  const configChangesCount = summary?.configChangesCount ?? summary?.categoryCounts?.config ?? 0;
  const failedCount = summary?.failedCount ?? failedLogsData?.meta?.total ?? failedLogs.length;

  return (
    <div
      className={`relative overflow-hidden rounded-xl sm:rounded-2xl border bg-surface/95 p-3.5 sm:p-5 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)] transition-all duration-300 dark:bg-card/95 animate-in fade-in slide-in-from-top-2 ${
        activeStat === "failed"
          ? "border-danger/30 dark:border-danger/25"
          : "border-white/60 dark:border-white/10"
      }`}
    >
      {/* Specular Rim Top Highlight */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-6 sm:inset-x-8 top-0 h-[2px] bg-gradient-to-r from-transparent to-transparent ${
          activeStat === "failed" ? "via-danger/45" : "via-primary/35"
        }`}
      />

      {/* Header Toolbar */}
      <div className="mb-3.5 flex items-center justify-between gap-2 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl shadow-[inset_1px_1px_2px_rgba(0,0,0,0.08)] ${
              activeStat === "failed"
                ? "bg-danger/15 text-danger"
                : "bg-primary/10 text-primary"
            }`}
          >
            {activeStat === "totalLogs" && <FileText className="h-4 w-4 sm:h-4.5 sm:w-4.5" />}
            {activeStat === "configChanges" && <Settings className="h-4 w-4 sm:h-4.5 sm:w-4.5" />}
            {activeStat === "failed" && <AlertTriangle className="h-4 w-4 sm:h-4.5 sm:w-4.5" />}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">
                {activeStat === "totalLogs" && t("audit.detail.totalLogsTitle")}
                {activeStat === "configChanges" && t("audit.detail.configChangesTitle")}
                {activeStat === "failed" && t("audit.detail.failedTitle")}
              </h3>

              <Badge
                variant="outline"
                size="sm"
                className={`font-mono text-[10px] sm:text-[11px] px-1.5 py-0 ${
                  activeStat === "failed" ? "border-danger/35 text-danger" : "text-foreground"
                }`}
              >
                {activeStat === "totalLogs" && totalLogs.toLocaleString()}
                {activeStat === "configChanges" && configChangesCount.toLocaleString()}
                {activeStat === "failed" && failedCount.toLocaleString()}
              </Badge>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate hidden sm:block">
              {activeStat === "totalLogs" && t("audit.detail.totalLogsDesc")}
              {activeStat === "configChanges" && t("audit.detail.configChangesDesc")}
              {activeStat === "failed" && t("audit.detail.failedDesc")}
            </p>
          </div>
        </div>

        {/* Action Controls & Close */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenHelp && activeStat !== "failed" && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onOpenHelp}
              className="h-7 sm:h-8 gap-1 text-[11px] sm:text-xs text-muted-foreground hover:text-primary px-2"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("audit.help.shortBtn")}</span>
            </Button>
          )}

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

          {activeStat === "failed" && onFilterStatus && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onFilterStatus("FAILED")}
              className="h-7 sm:h-8 gap-1.5 text-[11px] sm:text-xs text-danger hover:text-danger border-danger/30 px-2.5 sm:px-3"
            >
              <Filter className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("audit.detail.filterAllFailed")}</span>
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

      {/* ── 1. TỔNG BẢN GHI KIỂM TOÁN (totalLogs) ─────────────────────────── */}
      {/* Chỉ giữ thống kê tổng hợp (Top Actions + Top Actors + WORM); KHÔNG lặp lại danh sách dòng với bảng bên dưới */}
      {activeStat === "totalLogs" && (
        <div className="space-y-3.5">
          {/* Bento grid: Phân bổ hành động & Top Actors */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {/* Phân bổ theo hành động */}
            <div className="rounded-xl border border-border/40 bg-background/60 p-3 shadow-[inset_1px_1px_2px_var(--shadow-dark)] space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  {t("audit.detail.actionDistribution")}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">
                    {Object.keys(actionDistribution).length}{" "}
                    {isVietnamese ? "hành động phổ biến" : "top actions"}
                  </span>
                  {onOpenHelp && (
                    <button
                      type="button"
                      onClick={onOpenHelp}
                      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-primary hover:bg-primary/10 transition cursor-pointer"
                    >
                      <HelpCircle className="h-3 w-3" />
                      <span>{t("audit.help.shortBtn")}</span>
                    </button>
                  )}
                </div>
              </div>

              {Object.keys(actionDistribution).length === 0 ? (
                <p className="text-[11px] text-muted-foreground py-2">
                  {isVietnamese ? "Chưa có dữ liệu phân bổ hành động." : "No action distribution data yet."}
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => onFilterAction && onFilterAction("")}
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold transition cursor-pointer ${
                        !selectedAction
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-border/40 bg-background/80 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                      }`}
                    >
                      {t("audit.toolbar.actionAll")}
                    </button>

                    {Object.entries(actionDistribution).map(([action, count]) => {
                      const isActive = selectedAction === action;
                      const info = getAuditActionInfo(action, locale);
                      return (
                        <button
                          key={action}
                          type="button"
                          onClick={() => onFilterAction && onFilterAction(isActive ? "" : action)}
                          aria-pressed={isActive}
                          title={`${info.code} — ${info.description}`}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition cursor-pointer ${
                            isActive
                              ? "border-primary bg-primary text-primary-foreground shadow-sm"
                              : "border-border/40 bg-background/80 text-foreground hover:border-primary/50 hover:text-primary"
                          }`}
                        >
                          <span>{info.label}</span>
                          <span
                            className={`font-mono text-[10px] ${
                              isActive ? "opacity-90" : "text-muted-foreground"
                            }`}
                          >
                            ({count})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {selectedAction
                      ? isVietnamese
                        ? `Đang lọc theo "${getAuditActionInfo(selectedAction, locale).label}". Bấm lại để bỏ lọc.`
                        : `Filtering by "${getAuditActionInfo(selectedAction, locale).label}". Click again to clear.`
                      : isVietnamese
                        ? "Bấm vào một hành động để lọc bảng bên dưới, hoặc rê chuột để xem mã kỹ thuật."
                        : "Click an action to filter the table below, or hover to view its technical code."}
                  </p>
                </>
              )}
            </div>

            {/* Top người thực hiện tích cực nhất */}
            <div className="rounded-xl border border-border/40 bg-background/60 p-3 shadow-[inset_1px_1px_2px_var(--shadow-dark)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  {t("audit.detail.topActors")}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {topActors.length} {isVietnamese ? "tài khoản" : "accounts"}
                </span>
              </div>

              {topActors.length === 0 ? (
                <p className="text-[11px] text-muted-foreground py-2">
                  {isVietnamese ? "Chưa có dữ liệu người thực hiện." : "No actor activity data yet."}
                </p>
              ) : (
                <div className="space-y-1.5">
                  {topActors.map((actor, idx) => (
                    <div
                      key={actor.actorId ?? `${actor.actorName}-${idx}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border/25 bg-background/80 px-2.5 py-1.5 text-[11px]"
                    >
                      <span className="flex items-center gap-1.5 min-w-0 font-medium text-foreground truncate">
                        <User className="h-3 w-3 shrink-0 text-primary" />
                        <span className="truncate">{actor.actorName}</span>
                      </span>
                      <Badge variant="secondary" size="sm" className="font-mono text-[10px] px-1.5 py-0 shrink-0">
                        {actor.count} {isVietnamese ? "lượt" : "events"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Banner cam kết tính bất biến WORM */}
          <div className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-xs text-foreground">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {t("audit.detail.wormNotice")}
            </p>
          </div>
        </div>
      )}

      {/* ── 2. THAY ĐỔI CẤU HÌNH HỆ THỐNG (configChanges) ────────────────── */}
      {/* Không lặp danh sách log với Tab "Thay đổi Cấu hình" bên dưới; cung cấp giải thích & bộ lọc nhanh theo loại thay đổi */}
      {activeStat === "configChanges" && (
        <div className="space-y-3.5">
          <div className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-3 text-xs">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1 text-[11px] leading-relaxed text-muted-foreground">
              <p className="font-semibold text-foreground">
                {isVietnamese
                  ? "Phạm vi theo dõi của nhóm Thay đổi cấu hình:"
                  : "Scope of System Configuration Changes:"}
              </p>
              <p>
                {isVietnamese
                  ? "Chỉ thống kê các thao tác điều chỉnh trực tiếp thiết lập vận hành của hệ thống và Feature Flags (không bao gồm đăng nhập, phân quyền hay tác vụ định kỳ). Chọn nhanh một loại thao tác bên dưới để lọc bảng:"
                  : "Tracks only operations that directly modify system settings and feature flags (excluding routine sign-ins, role updates, or scheduled tasks). Click any action below to filter the table:"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {CONFIG_ACTIONS.map((act) => {
              const info = getAuditActionInfo(act, locale);
              return (
                <button
                  key={act}
                  type="button"
                  onClick={() => {
                    onSwitchTab?.("configChanges");
                    onFilterAction?.(act);
                  }}
                  className="flex flex-col items-start justify-between gap-2 rounded-xl border border-border/35 bg-background/70 p-3 text-left transition-all hover:border-primary/45 hover:bg-primary/5 cursor-pointer shadow-[inset_1px_1px_2px_var(--shadow-dark)]"
                >
                  <AuditActionBadge action={act} />
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {info.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 3. CHẨN ĐOÁN & HƯỚNG DẪN KHẮC PHỤC LỖI (failed) ───────────────── */}
      {activeStat === "failed" && (
        <div className="space-y-3">
          {isLoadingFailedLogs ? (
            <div className="space-y-2 py-2">
              <div className="h-24 animate-pulse rounded-xl bg-background/60" />
              <div className="h-24 animate-pulse rounded-xl bg-background/60" />
            </div>
          ) : failedLogs.length === 0 ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-foreground">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="font-bold text-primary">
                  {t("audit.detail.noFailedLogs")}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-0.5">
              {failedLogs.map((log) => {
                const diagnosis = diagnoseAuditFailure(log, locale);
                return (
                  <div
                    key={log.id}
                    className="rounded-xl border border-danger/25 bg-background/70 p-3.5 shadow-[inset_1px_1px_3px_var(--shadow-dark)] space-y-2.5"
                  >
                    {/* Header lỗi */}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold text-danger">
                            {diagnosis.title}
                          </span>
                          <AuditActionBadge action={log.action} />
                        </div>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          {log.userName || log.actor?.fullName || log.userEmail || log.actor?.email || (isVietnamese ? "Hệ thống" : "System")}
                          {" • "}
                          {formatDate(log.createdAt, locale)}
                          {log.ipAddress ? ` • IP: ${log.ipAddress}` : ""}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {diagnosis.actionLink && (
                          <Link href={diagnosis.actionLink.href}>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1 text-[11px] font-semibold text-primary border-primary/30 hover:bg-primary/10 px-2.5"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span>{diagnosis.actionLink.label}</span>
                            </Button>
                          </Link>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onSelectRecord && onSelectRecord(log)}
                          className="h-7 gap-1 text-[11px] text-muted-foreground hover:text-foreground px-2"
                        >
                          <Eye className="h-3 w-3" />
                          <span>{t("audit.table.actions")}</span>
                        </Button>
                      </div>
                    </div>

                    {/* Nguyên nhân & Mức độ ảnh hưởng */}
                    <div className="rounded-lg border border-border/30 bg-surface/60 p-2.5 space-y-1.5 text-xs">
                      <p className="text-foreground leading-relaxed">{diagnosis.explanation}</p>
                      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Info className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>{diagnosis.impactNote}</span>
                      </p>
                    </div>

                    {/* Các bước khắc phục */}
                    <div className="space-y-1">
                      <span className="flex items-center gap-1.5 text-[11px] font-bold text-foreground">
                        <Wrench className="h-3 w-3 text-primary" />
                        {t("audit.detail.howToFix")}:
                      </span>
                      <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-muted-foreground pl-0.5">
                        {diagnosis.steps.map((step, idx) => (
                          <li key={idx} className="leading-relaxed">
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
