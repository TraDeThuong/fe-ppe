"use client";
import { Table, TableToolbar, TableContent, TablePagination, TableRefresh } from "@/components/ui/table";
import type { TableProps } from "@/components/ui/table";

import { CheckCircle2, ChevronRight, Clock, Globe, Shield, User, XCircle } from "lucide-react";
import type { AuditLogItem } from "@/types";
import { useLocale } from "@/providers/locale-provider";

import { AuditActionBadge } from "./audit-action-badge";

export interface AuditLogTableProps {
  items: AuditLogItem[];
  onSelectRecord: (record: AuditLogItem) => void;
  loading?: boolean;
  tableState?: Partial<TableProps<AuditLogItem>>;
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
  tableState,
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

  return (<Table
    data={items}
    columns={[{
      id: "createdAt",
      header: t("audit.table.timestamp"),
      accessorFn: (log) => log.createdAt,
      enableSorting: true,
      cell: ({ row }) => {
        const log = row.original;
        return <div className={"whitespace-nowrap"}>
          <div className="flex items-center gap-1.5 font-mono text-xs text-foreground/80">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{formatDate(log.createdAt)}</span>
          </div>
        </div>;
      }
    },
    {
      id: "userEmail",
      header: t("audit.table.actor"),
      accessorFn: (log) => log.userEmail,
      enableSorting: false,
      cell: ({ row }) => {
        const log = row.original;
        return <div className={""}>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-elevated text-primary text-xs font-bold shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)]">
              <User className="h-3.5 w-3.5" />
            </span>
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-foreground max-w-[160px] truncate">
                {log.userEmail || log.actor?.email || "Hệ thống tự động"}
              </p>
              {(log.userRole || log.actor?.roleName) && (
                <span className="inline-flex rounded-full px-1.5 py-0.2 text-[10px] font-semibold bg-muted text-muted-foreground">
                  {log.userRole || log.actor?.roleName}
                </span>
              )}
            </div>
          </div>
        </div>;
      }
    },
    {
      id: "action",
      header: t("audit.table.action"),
      accessorFn: (log) => log.action,
      enableSorting: true,
      cell: ({ row }) => {
        const log = row.original;
        return <div className={""}>
          <AuditActionBadge action={log.action} />
        </div>;
      }
    },
    {
      id: "targetType",
      header: t("audit.table.target"),
      accessorFn: (log) => log.targetType,
      enableSorting: true,
      cell: ({ row }) => {
        const log = row.original;
        return <div className={""}>
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
        </div>;
      }
    },
    {
      id: "status",
      header: t("audit.table.status"),
      accessorFn: (log) => log.status,
      enableSorting: false,
      cell: ({ row }) => {
        const log = row.original;
        return <div className={""}>
          {log.status === "SUCCESS" || (!log.status && !log.errorMessage) ? (
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
        </div>;
      }
    },
    {
      id: "ipAddress",
      header: t("audit.table.ip"),
      accessorFn: (log) => log.ipAddress,
      enableSorting: false,
      cell: ({ row }) => {
        const log = row.original;
        return <div className={"font-mono text-xs text-muted-foreground"}>
          <span className="inline-flex items-center gap-1">
            <Globe className="h-3 w-3" />
            {log.ipAddress || "127.0.0.1"}
          </span>
        </div>;
      }
    },
    {
      id: "actions",
      header: t("audit.table.actions"),
      enableSorting: false,
      cell: ({ row }) => {
        const log = row.original;
        return <div className={"text-right"}>
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
        </div>;
      }
    }]}
    loading={loading}
    getRowId={row => row.id}
    features={{
      globalFilter: false,
      sorting: false,
      rowSelection: false,
      pagination: true
    }}
    manualFiltering
    manualSorting
    manualPagination
    emptyMessage={t("audit.table.empty")}
    onRowClick={row => onSelectRecord(row.original)}
    {...tableState}
  >
    <TableToolbar showSearch={false} actions={<TableRefresh />} />
    <TableContent />
    <TablePagination />
  </Table>);
}
