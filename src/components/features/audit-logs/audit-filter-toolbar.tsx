"use client";

import { Calendar, Download, Filter, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableRefresh } from "@/components/ui/table";
import { useLocale } from "@/providers/locale-provider";
import type { AuditLogStatus } from "@/types";
import {
  AUDIT_ACTION_DICTIONARY,
  getAuditActionInfo,
  type AuditActionCategory,
} from "./audit-action-dictionary";

export const AUDIT_SEARCH_MAX_LENGTH = 100;

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
  isDateRangeInvalid?: boolean;
  totalCount?: number;
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
  /** Chỉ truyền khi người dùng có quyền xuất; không truyền thì ẩn nút Export. */
  onExport?: () => void;
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
  isDateRangeInvalid = false,
  totalCount,
  hasActiveFilters = false,
  onResetFilters,
  onExport,
}: AuditFilterToolbarProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const statuses = [
    { value: "", label: t("audit.toolbar.statusAll") },
    { value: "SUCCESS", label: isVietnamese ? "Thành công (SUCCESS)" : "SUCCESS" },
    { value: "FAILED", label: isVietnamese ? "Thất bại (FAILED)" : "FAILED" },
  ];

  const actionEntries = actionDistribution ? Object.entries(actionDistribution) : [];
  const hasCustomAction = Boolean(action && !KNOWN_ACTION_VALUES.has(action));
  const rangeErrorProps = isDateRangeInvalid
    ? { "aria-invalid": true, "aria-describedby": "audit-filter-range-error" }
    : {};

  return (
    <div className="space-y-3">
      {/* Hàng 1: Tìm kiếm + Số bản ghi + Hành động (Đặt lại, Làm mới, Xuất) */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            maxLength={AUDIT_SEARCH_MAX_LENGTH}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("audit.toolbar.searchPlaceholder")}
            className="h-9 w-full rounded-xl border border-border/40 bg-surface pl-10 pr-4 text-xs sm:text-sm text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)] transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 shrink-0">
          {typeof totalCount === "number" && (
            <span className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border/40 bg-background px-3 text-xs font-bold text-muted-foreground shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]">
              <span className="size-1.5 rounded-full bg-primary" />
              <span className="font-mono text-foreground">{totalCount.toLocaleString()}</span>
              <span>{t("audit.pagination.records")}</span>
            </span>
          )}

          {hasActiveFilters && onResetFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onResetFilters}
              className="h-9 gap-1.5 rounded-xl px-3 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{t("audit.detail.resetFilter")}</span>
            </Button>
          )}

          <TableRefresh />

          {onExport && (
            <Button
              type="button"
              variant="outline"
              onClick={onExport}
              className="h-9 flex items-center gap-2 rounded-xl px-3.5 text-xs font-semibold shrink-0 shadow-[2px_2px_6px_var(--shadow-dark)]"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{t("audit.export")}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Hàng 2: Bộ lọc chi tiết (Hành động, Trạng thái, Khoảng ngày) */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Action Select */}
        <div className="relative flex w-full sm:w-auto items-center">
          <Filter className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={action}
            onChange={(e) => onActionChange(e.target.value)}
            aria-label={t("audit.table.action")}
            className="h-9 w-full sm:w-[235px] rounded-xl border border-border/40 bg-surface pl-8 pr-3 text-xs font-medium text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]"
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
          className="h-9 w-full sm:w-[175px] rounded-xl border border-border/40 bg-surface px-3 text-xs font-medium text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]"
        >
          {statuses.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        {/* Unified Date Range Pill */}
        {onStartDateChange && onEndDateChange && (
          <div className="flex h-9 w-full sm:w-auto items-center gap-1.5 rounded-xl border border-border/40 bg-surface px-2.5 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => onStartDateChange(e.target.value)}
              aria-label={t("audit.toolbar.fromDate")}
              title={t("audit.toolbar.fromDate")}
              {...rangeErrorProps}
              className="min-w-0 flex-1 bg-transparent text-xs text-foreground focus:outline-none"
            />
            <span className="text-xs text-muted-foreground">–</span>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => onEndDateChange(e.target.value)}
              aria-label={t("audit.toolbar.toDate")}
              title={t("audit.toolbar.toDate")}
              {...rangeErrorProps}
              className="min-w-0 flex-1 bg-transparent text-xs text-foreground focus:outline-none"
            />
          </div>
        )}
      </div>

      {isDateRangeInvalid && (
        <p id="audit-filter-range-error" role="alert" className="text-xs font-medium text-danger">
          {t("audit.toolbar.invalidRange")}
        </p>
      )}

      {/* Hàng 3: Dải lọc nhanh theo phân bổ hành động (1 lớp pill gọn, không lồng viền) */}
      {showQuickActionFilters && actionEntries.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-border/25">
          <span className="text-[11px] font-semibold text-muted-foreground mr-1">
            {isVietnamese ? "Lọc nhanh:" : "Quick filter:"}
          </span>
          <button
            type="button"
            onClick={() => onActionChange("")}
            className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold transition cursor-pointer ${
              !action
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border/40 bg-background/80 text-muted-foreground hover:border-primary/50 hover:text-foreground"
            }`}
          >
            {t("audit.toolbar.actionAll")}
          </button>

          {actionEntries.map(([act, count]) => {
            const isActive = action === act;
            const info = getAuditActionInfo(act, locale);
            return (
              <button
                key={act}
                type="button"
                onClick={() => onActionChange(isActive ? "" : act)}
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
      )}
    </div>
  );
}
