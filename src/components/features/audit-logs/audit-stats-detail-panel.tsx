"use client";

import { useMemo } from "react";
import {
  Download,
  FileText,
  Info,
  Settings,
  ShieldCheck,
  User,
  Users,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/providers/locale-provider";
import type { AuditSummaryDto } from "@/types";
import { AuditActionBadge } from "./audit-action-badge";
import { getAuditActionInfo } from "./audit-action-dictionary";

export type AuditStatKey = "totalLogs" | "configChanges";

export interface AuditStatsDetailPanelProps {
  activeStat: AuditStatKey;
  summary?: AuditSummaryDto;
  totalLogsCount: number;
  onClose: () => void;
  onOpenExport?: () => void;
  onSwitchTab?: (tab: "all" | "configChanges") => void;
  onFilterAction?: (action: string) => void;
}

const CONFIG_ACTIONS = [
  "TOGGLE_FEATURE_FLAG",
  "UPDATE_SYSTEM_CONFIG",
  "CREATE_SYSTEM_CONFIG",
  "DELETE_SYSTEM_CONFIG",
] as const;

export function AuditStatsDetailPanel({
  activeStat,
  summary,
  totalLogsCount,
  onClose,
  onOpenExport,
  onSwitchTab,
  onFilterAction,
}: AuditStatsDetailPanelProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

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

  const totalLogs = summary?.totalLogs ?? totalLogsCount;
  const configChangesCount = summary?.configChangesCount ?? summary?.categoryCounts?.config ?? 0;

  return (
    <div
      className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-white/60 bg-surface/95 p-3.5 sm:p-5 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)] transition-all duration-300 dark:border-white/10 dark:bg-card/95 animate-in fade-in slide-in-from-top-2"
    >
      {/* Specular Rim Top Highlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 sm:inset-x-8 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/35 to-transparent"
      />

      {/* Header Toolbar */}
      <div className="mb-3.5 flex items-center justify-between gap-2 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[inset_1px_1px_2px_rgba(0,0,0,0.08)]"
          >
            {activeStat === "totalLogs" && <FileText className="h-4 w-4 sm:h-4.5 sm:w-4.5" />}
            {activeStat === "configChanges" && <Settings className="h-4 w-4 sm:h-4.5 sm:w-4.5" />}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">
                {activeStat === "totalLogs" && t("audit.detail.totalLogsTitle")}
                {activeStat === "configChanges" && t("audit.detail.configChangesTitle")}
              </h3>

              <Badge
                variant="outline"
                size="sm"
                className="font-mono text-[10px] sm:text-[11px] px-1.5 py-0 text-foreground"
              >
                {activeStat === "totalLogs" && totalLogs.toLocaleString()}
                {activeStat === "configChanges" && configChangesCount.toLocaleString()}
              </Badge>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate hidden sm:block">
              {activeStat === "totalLogs" && t("audit.detail.totalLogsDesc")}
              {activeStat === "configChanges" && t("audit.detail.configChangesDesc")}
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
                <span className="text-[10px] text-muted-foreground">
                  {Object.keys(actionDistribution).length}{" "}
                  {isVietnamese ? "hành động phổ biến" : "top actions"}
                </span>
              </div>

              {Object.keys(actionDistribution).length === 0 ? (
                <p className="text-[11px] text-muted-foreground py-2">
                  {isVietnamese ? "Chưa có dữ liệu phân bổ hành động." : "No action distribution data yet."}
                </p>
              ) : (
                // Chỉ hiển thị số liệu; việc lọc theo hành động nằm ở toolbar phía trên bảng.
                <ul className="flex flex-wrap gap-1.5">
                  {Object.entries(actionDistribution).map(([action, count]) => {
                    const info = getAuditActionInfo(action, locale);
                    return (
                      <li
                        key={action}
                        title={`${info.code} — ${info.description}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-background/80 px-3 py-1 text-[11px] font-semibold text-foreground"
                      >
                        <span>{info.label}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">({count})</span>
                      </li>
                    );
                  })}
                </ul>
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
    </div>
  );
}
