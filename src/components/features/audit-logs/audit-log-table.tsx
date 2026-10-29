"use client";

import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe,
  Shield,
  User,
  XCircle,
} from "lucide-react";
import type { AuditLogItem } from "@/types";
import { useLocale } from "@/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { AuditActionBadge } from "./audit-action-badge";

export interface AuditLogTableProps {
  items: AuditLogItem[];
  onSelectRecord: (record: AuditLogItem) => void;
  loading?: boolean;
  page?: number;
  totalPages?: number;
  total?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
}

export function AuditLogTable({
  items,
  onSelectRecord,
  loading = false,
  page = 1,
  totalPages = 1,
  total = items.length,
  limit = 20,
  onPageChange,
  onLimitChange,
}: AuditLogTableProps) {
  const { t, locale } = useLocale();

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString(locale === "vi-VN" ? "vi-VN" : "en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  const startRecord = total === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, total);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-elevated/40" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-border/30 bg-surface p-12 text-center shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.3)]">
        <Shield className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-semibold text-foreground">{t("audit.table.empty")}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Không có sự kiện kiểm toán nào phù hợp với điều kiện tìm kiếm và bộ lọc hiện tại.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Table Container */}
      <div className="overflow-x-auto rounded-2xl border border-border/40 bg-surface shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.3)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border/40 bg-surface-elevated/40 text-xs font-semibold uppercase text-muted-foreground">
            <tr>
              <th className="px-5 py-3.5">{t("audit.table.timestamp")}</th>
              <th className="px-5 py-3.5">{t("audit.table.actor")}</th>
              <th className="px-5 py-3.5">{t("audit.table.action")}</th>
              <th className="px-5 py-3.5">{t("audit.table.target")}</th>
              <th className="px-5 py-3.5">{t("audit.table.status")}</th>
              <th className="px-5 py-3.5">{t("audit.table.ip")}</th>
              <th className="px-5 py-3.5 text-right">{t("audit.table.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {items.map((log) => (
              <tr
                key={log.id}
                onClick={() => onSelectRecord(log)}
                className="cursor-pointer transition-colors duration-150 hover:bg-surface-elevated/30"
              >
                <td className="px-5 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-1.5 font-mono text-xs text-foreground/80">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{formatDate(log.createdAt)}</span>
                  </div>
                </td>

                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-elevated text-primary text-xs font-bold shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)]">
                      <User className="h-3.5 w-3.5" />
                    </span>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-foreground max-w-[160px] truncate">
                        {log.userEmail || "Hệ thống tự động"}
                      </p>
                      {log.userRole && (
                        <span className="inline-flex rounded-full px-1.5 py-0.2 text-[10px] font-semibold bg-muted text-muted-foreground">
                          {log.userRole}
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                <td className="px-5 py-4">
                  <AuditActionBadge action={log.action} />
                </td>

                <td className="px-5 py-4">
                  <div className="space-y-0.5">
                    <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-foreground">
                      <Shield className="h-3 w-3 text-primary" />
                      {log.targetType}
                    </span>
                    {log.targetId && (
                      <p className="font-mono text-[11px] text-muted-foreground max-w-[120px] truncate">
                        #{log.targetId.slice(0, 10)}...
                      </p>
                    )}
                  </div>
                </td>

                <td className="px-5 py-4">
                  {log.status === "SUCCESS" ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      SUCCESS
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-danger">
                      <XCircle className="h-3.5 w-3.5" />
                      FAILED
                    </span>
                  )}
                </td>

                <td className="px-5 py-4 font-mono text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    {log.ipAddress || "127.0.0.1"}
                  </span>
                </td>

                <td className="px-5 py-4 text-right">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectRecord(log);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-border/40 px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary hover:text-primary"
                  >
                    <span>{t("audit.table.actions")}</span>
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {onPageChange && total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>
              {t("audit.pagination.showing")}{" "}
              <strong className="text-foreground font-mono">{startRecord}</strong> -{" "}
              <strong className="text-foreground font-mono">{endRecord}</strong>{" "}
              {t("audit.pagination.of")}{" "}
              <strong className="text-foreground font-mono">{total}</strong>{" "}
              {t("audit.pagination.records")}
            </span>

            {onLimitChange && (
              <div className="flex items-center gap-1.5 ml-2">
                <span>/</span>
                <select
                  value={limit}
                  onChange={(e) => onLimitChange(Number(e.target.value))}
                  className="rounded-lg border border-border/40 bg-surface px-2 py-1 text-xs font-mono text-foreground focus:outline-none"
                >
                  <option value={10}>10 / trang</option>
                  <option value={20}>20 / trang</option>
                  <option value={50}>50 / trang</option>
                  <option value={100}>100 / trang</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="h-7 px-2 text-xs gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>{t("audit.pagination.prev")}</span>
            </Button>

            <span className="font-mono text-xs px-2 text-foreground font-semibold">
              {t("audit.pagination.page")} {page} / {Math.max(1, totalPages)}
            </span>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="h-7 px-2 text-xs gap-1"
            >
              <span>{t("audit.pagination.next")}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
