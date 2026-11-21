"use client";
import { Table, TableToolbar, TableContent, TablePagination, TableRefresh } from "@/components/ui/table";
import type { TableProps } from "@/components/ui/table";

import { ChevronRight, Clock, Globe, XCircle } from "lucide-react";
import type { AuditLogItem } from "@/types";
import { useLocale } from "@/providers/locale-provider";

import { AuditActionBadge } from "./audit-action-badge";
import { diagnoseAuditFailure } from "./audit-error-diagnosis";

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
}: AuditLogTableProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

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

  return (
    <Table
      data={items}
      columns={[
        {
          id: "createdAt",
          header: t("audit.table.timestamp"),
          accessorFn: (log) => log.createdAt,
          enableSorting: true,
          cell: ({ row }) => {
            const log = row.original;
            return (
              <div className="whitespace-nowrap">
                <div className="flex items-center gap-1.5 font-mono text-xs text-foreground/80">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{formatDate(log.createdAt)}</span>
                </div>
              </div>
            );
          },
        },
        {
          id: "userEmail",
          header: t("audit.table.actor"),
          accessorFn: (log) => log.userName || log.actor?.fullName || log.userEmail || log.actor?.email,
          enableSorting: false,
          cell: ({ row }) => {
            const log = row.original;
            const fullName = log.userName || log.actor?.fullName;
            const email = log.userEmail || log.actor?.email;
            const role = log.userRole || log.actor?.roleName;
            const primaryLabel =
              fullName || email || (isVietnamese ? "Hệ thống tự động" : "Automated System");

            const isAdminRole = role?.toUpperCase() === "ADMIN";

            return (
              <div className="min-w-0 max-w-[240px] space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {primaryLabel}
                  </p>
                  {role && (
                    <span
                      className={`inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${
                        isAdminRole
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-accent/50 bg-accent/20 text-foreground"
                      }`}
                    >
                      {role}
                    </span>
                  )}
                </div>
                {fullName && email && (
                  <p className="text-[11px] text-muted-foreground truncate">
                    {email}
                  </p>
                )}
              </div>
            );
          },
        },
        {
          id: "action",
          header: t("audit.table.action"),
          accessorFn: (log) => log.action,
          enableSorting: true,
          cell: ({ row }) => {
            const log = row.original;
            const isFailed = log.status === "FAILED";
            const diagnosis = isFailed ? diagnoseAuditFailure(log, locale) : null;
            return (
              <div className="flex items-center gap-1.5 flex-wrap">
                <AuditActionBadge action={log.action} />
                {isFailed && (
                  <span
                    title={diagnosis?.explanation ?? log.errorMessage ?? undefined}
                    className="inline-flex items-center gap-1 rounded-full border border-danger/30 bg-danger/10 px-2 py-0.5 text-[11px] font-semibold text-danger"
                  >
                    <XCircle className="h-3 w-3 shrink-0" />
                    <span>{diagnosis?.shortLabel || (isVietnamese ? "Thất bại" : "Failed")}</span>
                  </span>
                )}
              </div>
            );
          },
        },
        {
          id: "ipAddress",
          header: t("audit.table.ip"),
          accessorFn: (log) => log.ipAddress,
          enableSorting: false,
          cell: ({ row }) => {
            const log = row.original;
            return (
              <div className="font-mono text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  {log.ipAddress || "—"}
                </span>
              </div>
            );
          },
        },
        {
          id: "actions",
          header: t("audit.table.actions"),
          enableSorting: false,
          cell: ({ row }) => {
            const log = row.original;
            return (
              <div className="text-right">
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
              </div>
            );
          },
        },
      ]}
      loading={loading}
      getRowId={(row) => row.id}
      features={{
        globalFilter: false,
        sorting: false,
        rowSelection: false,
        pagination: true,
      }}
      manualFiltering
      manualSorting
      manualPagination
      emptyMessage={t("audit.table.empty")}
      onRowClick={(row) => onSelectRecord(row.original)}
      {...tableState}
    >
      {!tableState?.toolbar && <TableToolbar showSearch={false} actions={<TableRefresh />} />}
      <TableContent />
      <TablePagination />
    </Table>
  );
}
