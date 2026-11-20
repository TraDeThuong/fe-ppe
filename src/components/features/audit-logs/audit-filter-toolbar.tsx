"use client";

import { Calendar, Download, Filter, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { AuditLogStatus } from "@/types";
import {
  AUDIT_ACTION_DICTIONARY,
  getAuditActionInfo,
  type AuditActionCategory,
} from "./audit-action-dictionary";
import { AuditActionBadge } from "./audit-action-badge";

export interface AuditFilterToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  action: string;
  onActionChange: (value: string) => void;
  actionDistribution?: Record<string, number>;
  showQuickActionFilters?: boolean;
  status: string;
  onStatusChange: (value: string) => void;
  startDate?: string;
  onStartDateChange?: (value: string) => void;
  endDate?: string;
  onEndDateChange?: (value: string) => void;
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
  onExport: () => void;
}

const GROUP_ORDER: Array<{
  category: AuditActionCategory;
  groupVi: string;
  groupEn: string;
}> = [
  { category: "config", groupVi: "Cấu hình Hệ thống", groupEn: "System Configuration" },
  { category: "rbac", groupVi: "Phân quyền & Người dùng", groupEn: "RBAC & Users" },
  { category: "auth", groupVi: "Bảo mật & Xác thực", groupEn: "Security & Auth" },
  { category: "system", groupVi: "Hệ thống & Tác vụ định kỳ", groupEn: "System & Cron" },
  { category: "integration", groupVi: "Tích hợp (API / Webhook)", groupEn: "Integrations" },
];

const ACTION_GROUPS = GROUP_ORDER.map((group) => ({
  ...group,
  items: AUDIT_ACTION_DICTIONARY.filter((item) => item.category === group.category),
}));

const KNOWN_ACTION_VALUES = new Set(AUDIT_ACTION_DICTIONARY.map((item) => item.code));

export function AuditFilterToolbar({
  search,
  onSearchChange,
  action,
  onActionChange,
  actionDistribution,
  showQuickActionFilters = false,
  status,
  onStatusChange,
  startDate = "",
  onStartDateChange,
  endDate = "",
  onEndDateChange,
  hasActiveFilters = false,
  onResetFilters,
  onExport,
}: AuditFilterToolbarProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const statuses = [
    { value: "", label: t("audit.toolbar.statusAll") },
    { value: "SUCCESS", label: isVietnamese ? "SUCCESS (Thành công)" : "SUCCESS" },
    { value: "FAILED", label: isVietnamese ? "FAILED (Thất bại)" : "FAILED" },
  ];

  const actionEntries = actionDistribution ? Object.entries(actionDistribution) : [];
  const hasCustomAction = Boolean(action && !KNOWN_ACTION_VALUES.has(action));

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("audit.toolbar.searchPlaceholder")}
            className="w-full rounded-xl border border-border/40 bg-surface pl-10 pr-4 py-2 text-xs sm:text-sm text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)] transition-colors"
          />
        </div>

        {/* Action Select */}
        <div className="flex w-full sm:w-auto items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground hidden sm:inline shrink-0" />
          <select
            value={action}
            onChange={(e) => onActionChange(e.target.value)}
            aria-label={t("audit.table.action")}
            className="w-full sm:w-auto max-w-[230px] rounded-xl border border-border/40 bg-surface px-3 py-2 text-xs font-medium text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]"
          >
            <option value="">{t("audit.toolbar.actionAll")}</option>
            {hasCustomAction && <option value={action}>{getAuditActionInfo(action, locale).label}</option>}
            {actionEntries.length > 0 && (
              <optgroup
                label={isVietnamese ? "Phân bổ hành động (Phổ biến)" : "Action Distribution (Top)"}
              >
                {actionEntries.map(([act, count]) => (
                  <option key={`top-${act}`} value={act}>
                    {getAuditActionInfo(act, locale).label} ({count})
                  </option>
                ))}
              </optgroup>
            )}
            {ACTION_GROUPS.map((group) => (
              <optgroup
                key={group.groupEn}
                label={isVietnamese ? group.groupVi : group.groupEn}
              >
                {group.items.map((item) => (
                  <option key={item.code} value={item.code}>
                    {isVietnamese ? `${item.labelVi} (${item.code})` : `${item.labelEn} (${item.code})`}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Status Select */}
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value as AuditLogStatus | "")}
          aria-label={t("audit.table.status")}
          className="w-full sm:w-auto rounded-xl border border-border/40 bg-surface px-3 py-2 text-xs font-medium text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]"
        >
          {statuses.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        {/* Date Range Filters */}
        {onStartDateChange && onEndDateChange && (
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 w-full sm:w-auto">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground hidden sm:inline shrink-0" />
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => onStartDateChange(e.target.value)}
              aria-label={t("audit.toolbar.fromDate")}
              title={t("audit.toolbar.fromDate")}
              className="flex-1 sm:w-auto rounded-xl border border-border/40 bg-surface px-2.5 py-1.5 text-xs text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]"
            />
            <span className="text-xs text-muted-foreground">–</span>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => onEndDateChange(e.target.value)}
              aria-label={t("audit.toolbar.toDate")}
              title={t("audit.toolbar.toDate")}
              className="flex-1 sm:w-auto rounded-xl border border-border/40 bg-surface px-2.5 py-1.5 text-xs text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]"
            />
          </div>
        )}

        {/* Reset Filter Button */}
        {hasActiveFilters && onResetFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground px-2"
          >
            <RotateCcw className="h-3 w-3" />
            <span>{t("audit.detail.resetFilter")}</span>
          </Button>
        )}
      </div>

      {/* Export Button */}
      <Button
        type="button"
        variant="outline"
        onClick={onExport}
        className="flex items-center gap-2 rounded-xl text-xs sm:text-sm font-semibold shrink-0 shadow-[2px_2px_6px_var(--shadow-dark)]"
      >
        <Download className="h-4 w-4" />
        <span>{t("audit.export")}</span>
      </Button>
      </div>

      {/* Quick Filter Chips by Action Distribution */}
      {showQuickActionFilters && actionEntries.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/25">
          <span className="text-[11px] font-semibold text-muted-foreground mr-1">
            {isVietnamese ? "Lọc theo phân bổ:" : "Quick filter:"}
          </span>
          <button
            type="button"
            onClick={() => onActionChange("")}
            className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
              !action
                ? "border-primary bg-primary/15 text-primary shadow-sm"
                : "border-border/35 bg-surface text-muted-foreground hover:border-primary/50 hover:text-foreground"
            }`}
          >
            {t("audit.toolbar.actionAll")}
          </button>

          {actionEntries.map(([act, count]) => {
            const isActive = action === act;
            return (
              <button
                key={act}
                type="button"
                onClick={() => onActionChange(isActive ? "" : act)}
                aria-pressed={isActive}
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition cursor-pointer ${
                  isActive
                    ? "border-primary bg-primary/15 text-primary ring-1 ring-primary/30 shadow-sm"
                    : "border-border/35 bg-surface text-foreground hover:border-primary/60 hover:text-primary"
                }`}
              >
                <AuditActionBadge action={act} />
                <span className="font-mono text-[10px] font-bold opacity-80">({count})</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
