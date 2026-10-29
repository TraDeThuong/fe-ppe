"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Edit2, Globe, Lock, Trash2 } from "lucide-react";
import type { SystemConfigItem } from "@/types";
import { useLocale } from "@/providers/locale-provider";

export interface SystemConfigTableProps {
  items: SystemConfigItem[];
  onEdit: (config: SystemConfigItem) => void;
  onDelete: (config: SystemConfigItem) => void;
  loading?: boolean;
  page?: number;
  pageSize?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  canManage?: boolean;
}

export function SystemConfigTable({
  items,
  onEdit,
  onDelete,
  loading = false,
  page = 1,
  pageSize = 10,
  totalItems = 0,
  onPageChange,
  onPageSizeChange,
  canManage = true,
}: SystemConfigTableProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  const renderValuePreview = (val: unknown) => {
    if (typeof val === "boolean") {
      return (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
            val ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
          }`}
        >
          {String(val)}
        </span>
      );
    }
    if (typeof val === "object" && val !== null) {
      return (
        <span className="font-mono text-xs text-info bg-info/10 px-2 py-0.5 rounded">
          {JSON.stringify(val).slice(0, 40)}...
        </span>
      );
    }
    return (
      <span className="font-mono text-xs text-foreground/90 max-w-[240px] truncate block">
        {String(val ?? "")}
      </span>
    );
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case "SECURITY":
        return "bg-danger/10 text-danger border-danger/30";
      case "FEATURE_FLAG":
        return "bg-brand/10 text-brand border-brand/30";
      case "INTEGRATION":
        return "bg-info/10 text-info border-info/30";
      default:
        return "bg-muted text-muted-foreground border-border/40";
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-elevated/40" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-border/30 bg-surface p-12 text-center">
        <p className="text-sm text-muted-foreground">{t("system.configs.empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-2xl border border-border/40 bg-surface shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.3)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border/40 bg-surface-elevated/40 text-xs font-semibold uppercase text-muted-foreground">
            <tr>
              <th className="px-5 py-3.5">{t("system.configs.tableKey")}</th>
              <th className="px-5 py-3.5">{t("system.configs.tableValue")}</th>
              <th className="px-5 py-3.5">{t("system.configs.tableCategory")}</th>
              <th className="px-5 py-3.5">{t("system.configs.tablePublic")}</th>
              {canManage && (
                <th className="px-5 py-3.5 text-right">{t("system.configs.tableActions")}</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {items.map((item) => (
              <tr
                key={item.id}
                className="transition-colors duration-150 hover:bg-surface-elevated/30"
              >
                <td className="px-5 py-4">
                  <div className="space-y-1">
                    <span className="font-mono text-xs font-bold text-primary">
                      {item.key}
                    </span>
                    {item.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 max-w-sm">
                        {item.description}
                      </p>
                    )}
                  </div>
                </td>

                <td className="px-5 py-4">{renderValuePreview(item.value)}</td>

                <td className="px-5 py-4">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getCategoryBadgeClass(
                      String(item.category),
                    )}`}
                  >
                    {item.category}
                  </span>
                </td>

                <td className="px-5 py-4">
                  {item.isPublic ? (
                    <span className="inline-flex items-center gap-1 text-xs text-success">
                      <Globe className="h-3.5 w-3.5" />
                      {t("system.configs.public")}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Lock className="h-3.5 w-3.5" />
                      {t("system.configs.private")}
                    </span>
                  )}
                </td>

                {canManage && (
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(item)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 text-muted-foreground transition hover:border-primary hover:text-primary"
                        aria-label={`Edit ${item.key}`}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete(item)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 text-muted-foreground transition hover:border-danger hover:text-danger"
                        aria-label={`Delete ${item.key}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {onPageChange && totalItems > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-2 pt-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>
              {isVietnamese ? (
                <>
                  Hiển thị <span className="font-semibold text-foreground">{startItem}</span> -{" "}
                  <span className="font-semibold text-foreground">{endItem}</span> trên tổng số{" "}
                  <span className="font-semibold text-foreground">{totalItems}</span> cấu hình
                </>
              ) : (
                <>
                  Showing <span className="font-semibold text-foreground">{startItem}</span> -{" "}
                  <span className="font-semibold text-foreground">{endItem}</span> of{" "}
                  <span className="font-semibold text-foreground">{totalItems}</span> configs
                </>
              )}
            </span>

            {onPageSizeChange && (
              <div className="ml-3 flex items-center gap-1.5">
                <span>{isVietnamese ? "Số dòng:" : "Page size:"}</span>
                <select
                  value={pageSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  className="rounded-lg border border-border/40 bg-surface px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none"
                >
                  <option value={10}>10 {isVietnamese ? "/ trang" : "/ page"}</option>
                  <option value={20}>20 {isVietnamese ? "/ trang" : "/ page"}</option>
                  <option value={50}>50 {isVietnamese ? "/ trang" : "/ page"}</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onPageChange(1)}
              disabled={page <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 text-muted-foreground transition hover:border-primary hover:text-primary disabled:opacity-40 disabled:hover:border-border/40 disabled:hover:text-muted-foreground"
              aria-label={isVietnamese ? "Trang đầu" : "First page"}
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 text-muted-foreground transition hover:border-primary hover:text-primary disabled:opacity-40 disabled:hover:border-border/40 disabled:hover:text-muted-foreground"
              aria-label={isVietnamese ? "Trang trước" : "Previous page"}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="px-3 py-1 text-xs font-medium text-foreground">
              {isVietnamese ? `Trang ${page} / ${totalPages}` : `Page ${page} of ${totalPages}`}
            </span>

            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 text-muted-foreground transition hover:border-primary hover:text-primary disabled:opacity-40 disabled:hover:border-border/40 disabled:hover:text-muted-foreground"
              aria-label={isVietnamese ? "Trang sau" : "Next page"}
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => onPageChange(totalPages)}
              disabled={page >= totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 text-muted-foreground transition hover:border-primary hover:text-primary disabled:opacity-40 disabled:hover:border-border/40 disabled:hover:text-muted-foreground"
              aria-label={isVietnamese ? "Trang cuối" : "Last page"}
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
