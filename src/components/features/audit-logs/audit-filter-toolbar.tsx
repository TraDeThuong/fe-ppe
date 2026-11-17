"use client";

import { Download, Filter, RotateCcw, Search, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { AuditLogStatus } from "@/types";

export interface AuditFilterToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  action: string;
  onActionChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  targetType?: string;
  onTargetTypeChange?: (value: string) => void;
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
  onExport: () => void;
}

export function AuditFilterToolbar({
  search,
  onSearchChange,
  action,
  onActionChange,
  status,
  onStatusChange,
  targetType = "",
  onTargetTypeChange,
  hasActiveFilters = false,
  onResetFilters,
  onExport,
}: AuditFilterToolbarProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const actions = [
    { value: "", label: t("audit.toolbar.actionAll") },
    { value: "CREATE", label: isVietnamese ? "CREATE (Tạo mới)" : "CREATE" },
    { value: "UPDATE", label: isVietnamese ? "UPDATE (Cập nhật)" : "UPDATE" },
    { value: "DELETE", label: isVietnamese ? "DELETE (Xóa)" : "DELETE" },
    { value: "UPDATE_CONFIG", label: isVietnamese ? "UPDATE_CONFIG (Sửa cấu hình)" : "UPDATE_CONFIG" },
    { value: "REVIEW_INCIDENT", label: isVietnamese ? "REVIEW_INCIDENT (Duyệt sự cố)" : "REVIEW_INCIDENT" },
    { value: "ASSIGN_ROLE", label: isVietnamese ? "ASSIGN_ROLE (Gán vai trò)" : "ASSIGN_ROLE" },
    { value: "LOGIN", label: isVietnamese ? "LOGIN (Đăng nhập)" : "LOGIN" },
    { value: "LOGOUT", label: isVietnamese ? "LOGOUT (Đăng xuất)" : "LOGOUT" },
    { value: "TOGGLE_FEATURE", label: isVietnamese ? "TOGGLE_FEATURE (Bật/Tắt tính năng)" : "TOGGLE_FEATURE" },
  ];

  const statuses = [
    { value: "", label: t("audit.toolbar.statusAll") },
    { value: "SUCCESS", label: isVietnamese ? "SUCCESS (Thành công)" : "SUCCESS" },
    { value: "FAILED", label: isVietnamese ? "FAILED (Thất bại)" : "FAILED" },
  ];

  const targetTypes = [
    { value: "", label: t("audit.toolbar.targetAll") },
    { value: "USER", label: isVietnamese ? "USER (Người dùng)" : "USER" },
    { value: "ROLE", label: isVietnamese ? "ROLE (Vai trò & Quyền)" : "ROLE" },
    { value: "CAMERA", label: isVietnamese ? "CAMERA (Thiết bị Camera)" : "CAMERA" },
    { value: "SITE", label: isVietnamese ? "SITE (Công trường & Phân khu)" : "SITE" },
    { value: "PPE_INCIDENT", label: isVietnamese ? "PPE_INCIDENT (Sự cố an toàn)" : "PPE_INCIDENT" },
    { value: "SAFETY_RULE", label: isVietnamese ? "SAFETY_RULE (Quy tắc PPE)" : "SAFETY_RULE" },
    { value: "SYSTEM_CONFIG", label: isVietnamese ? "SYSTEM_CONFIG (Tham số hệ thống)" : "SYSTEM_CONFIG" },
    { value: "MAINTENANCE_CONFIG", label: isVietnamese ? "MAINTENANCE_CONFIG (Bảo trì hệ thống)" : "MAINTENANCE_CONFIG" },
  ];

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
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
          <Filter className="h-3.5 w-3.5 text-muted-foreground hidden sm:inline" />
          <select
            value={action}
            onChange={(e) => onActionChange(e.target.value)}
            className="w-full sm:w-auto rounded-xl border border-border/40 bg-surface px-3 py-2 text-xs font-medium text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]"
          >
            {actions.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>

        {/* Target Type Select */}
        {onTargetTypeChange && (
          <div className="flex w-full sm:w-auto items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-muted-foreground hidden sm:inline" />
            <select
              value={targetType}
              onChange={(e) => onTargetTypeChange(e.target.value)}
              className="w-full sm:w-auto rounded-xl border border-border/40 bg-surface px-3 py-2 text-xs font-medium text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]"
            >
              {targetTypes.map((tgt) => (
                <option key={tgt.value} value={tgt.value}>
                  {tgt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Status Select */}
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value as AuditLogStatus | "")}
          className="w-full sm:w-auto rounded-xl border border-border/40 bg-surface px-3 py-2 text-xs font-medium text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]"
        >
          {statuses.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

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
  );
}
