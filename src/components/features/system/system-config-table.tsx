"use client";

import { useMemo, useState } from "react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import { Check, Copy, Edit2, Globe, Lock, Trash2 } from "lucide-react";
import { Table, TableContent, TableToolbar, TableRefresh, type TableProps, TablePagination, type TableFeatureSet } from "@/components/ui/table";

import { useLocale } from "@/providers/locale-provider";
import { toast } from "@/lib/toast";
import type { SystemConfigItem } from "@/types";

export interface SystemConfigTableProps {
  items: SystemConfigItem[];
  onEdit: (config: SystemConfigItem) => void;
  onDelete: (config: SystemConfigItem) => void;
  loading?: boolean;
  tableState?: Partial<TableProps<SystemConfigItem>>;
  page?: number;
  pageSize?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  canManage?: boolean;
  variant?: "soft" | "sculpted";
}

export function SystemConfigTable({
  items,
  onEdit,
  onDelete,
  loading = false,
  tableState,
  page = 1,
  pageSize = 10,
  totalItems = 0,
  onPageChange,
  onPageSizeChange,
  canManage = true,
  variant = "soft",
}: SystemConfigTableProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalItems / (pageSize || 10)));

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    toast.success(
      t("system.configs.copiedKey", { key }) || (isVietnamese ? `Đã sao chép khóa: ${key}` : `Copied key: ${key}`)
    );
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const paginationState: PaginationState = useMemo(
    () => ({
      pageIndex: Math.max(0, page - 1),
      pageSize,
    }),
    [page, pageSize],
  );

  const handlePaginationChange = (updater: any) => {
    const next = typeof updater === "function" ? updater(paginationState) : updater;
    if (next.pageIndex !== undefined && onPageChange && next.pageIndex + 1 !== page) {
      onPageChange(next.pageIndex + 1);
    }
    if (next.pageSize !== undefined && onPageSizeChange && next.pageSize !== pageSize) {
      onPageSizeChange(next.pageSize);
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case "SECURITY":
        return "bg-danger/10 text-danger border-danger/30";
      case "FEATURE_FLAG":
        return "bg-primary/10 text-primary border-primary/30";
      case "INTEGRATION":
        return "bg-info/10 text-info border-info/30";
      default:
        return "bg-muted/70 text-muted-foreground border-border/40 dark:border-black/50";
    }
  };

  const columns = useMemo<ColumnDef<TableFeatureSet, SystemConfigItem, any>[]>(() => {
    return [
      {
        id: "key",
        accessorKey: "key",
        header: t("system.configs.tableKey"),
        cell: ({ row }) => {
          const item = row.original;
          const isCopied = copiedKey === item.key;
          return (
            <div className="space-y-1 py-1 max-w-xs sm:max-w-md">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-xs font-bold text-primary select-all">
                  {item.key}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(item.key)}
                  className="rounded p-1 text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition"
                  title={t("system.configs.copyKey")}
                  aria-label={t("system.configs.copyKey")}
                >
                  {isCopied ? (
                    <Check className="h-3 w-3 text-success" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>
              {item.description && (
                <p className="text-[11px] text-muted-foreground line-clamp-1">
                  {item.description}
                </p>
              )}
            </div>
          );
        },

      },
      {
        id: "value",
        accessorKey: "value",
        header: t("system.configs.tableValue"),
        cell: ({ row }) => {
          const val = row.original.value;
          if (typeof val === "boolean") {
            return (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${val ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                  }`}
              >
                {val ? <Check className="h-3 w-3" /> : null}
                {String(val)}
              </span>
            );
          }
          if (typeof val === "object" && val !== null) {
            return (
              <span className="font-mono text-[11px] text-info bg-info/10 px-2 py-0.5 rounded border border-info/20 inline-block max-w-[200px] truncate">
                {JSON.stringify(val)}
              </span>
            );
          }
          return (
            <span className="font-mono text-xs text-foreground/90 max-w-[200px] truncate block select-all">
              {String(val ?? "")}
            </span>
          );
        },

      },
      {
        id: "category",
        accessorKey: "category",
        header: t("system.configs.tableCategory"),
        cell: ({ row }) => {
          const cat = String(row.original.category || "GENERAL");
          return (
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[11px] font-medium ${getCategoryBadgeClass(
                cat,
              )}`}
            >
              {cat}
            </span>
          );
        },

      },
      {
        id: "isPublic",
        accessorKey: "isPublic",
        header: t("system.configs.tablePublic"),
        cell: ({ row }) => {
          const isPub = Boolean(row.original.isPublic);
          return (
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${isPub
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-border/40 bg-muted/40 text-muted-foreground dark:border-black/50"
                }`}
            >
              {isPub ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              {isPub ? t("system.configs.public") : t("system.configs.private")}
            </span>
          );
        },

      },
      ...(canManage
        ? [
          {
            id: "actions",
            header: () => (
              <div className="text-right">{t("system.configs.tableActions")}</div>
            ),
            cell: ({ row }: { row: { original: SystemConfigItem } }) => {
              const item = row.original;
              return (
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-primary transition"
                    title={t("system.configs.edit")}
                    aria-label={t("system.configs.edit")}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDelete(item)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger transition"
                    title={t("system.configs.delete")}
                    aria-label={t("system.configs.delete")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            },
            size: 80,

          },
        ]
        : []),
    ];
  }, [t, copiedKey, canManage]);

  return (
    <div className="space-y-4">
      <Table
        data={items}
        columns={columns}
        variant={variant}
        loading={loading}
        emptyMessage={t("system.configs.empty")}
        features={{
          sorting: false,
          globalFilter: false,
          rowSelection: false
        }}
        manualSorting
        manualFiltering
        manualPagination={true}
        pageCount={totalPages}
        rowCount={totalItems}
        pagination={paginationState}
        onPaginationChange={handlePaginationChange}
        getRowId={(row) => row.id || row.key}
        {...tableState}
      >
        <TableToolbar showSearch={false} actions={<TableRefresh />} />
        <TableContent />
        <TablePagination />
      </Table>
    </div>
  );
}
