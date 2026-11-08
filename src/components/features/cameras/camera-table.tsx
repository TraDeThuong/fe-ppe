"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { Activity, Camera, CheckCircle2, Edit2, Play, ShieldAlert, Sliders, Trash2 } from "lucide-react";
import { Table, TableToolbar, TableContent, TablePagination, TableSelectionHeader, TableSelectionRow, TableRowActions, TableRefresh, type TableProps, type TableFeatureSet, type TableRowAction, type TableBulkAction, TableBulkActions } from "@/components/ui/table";
import { cameraService } from "@/services/camera.service";
import { settleInBatches } from "@/lib/table-utils";
import { toast } from "@/lib/toast";
import { useCan } from "@/hooks/use-can";
import { useLocale } from "@/providers/locale-provider";
import type { CameraItem } from "@/types";

export interface CameraTableProps {
  cameras: CameraItem[];
  onViewLive: (camera: CameraItem) => void;
  onPing: (camera: CameraItem) => void;
  onConfigureRoi: (camera: CameraItem) => void;
  onEdit: (camera: CameraItem) => void;
  onDelete: (camera: CameraItem) => void;
  loading?: boolean;
  tableState?: Partial<TableProps<CameraItem>>;
  onRefresh?: () => void;
  variant?: "soft" | "sculpted";
}

export function CameraTable({
  cameras,
  onViewLive,
  onPing,
  onConfigureRoi,
  onEdit,
  onDelete,
  loading = false,
  tableState,
  onRefresh,
  variant = "soft",
}: CameraTableProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const can = useCan();
  const canManage = can("PPE_CAMERA_MANAGE");
  const canPing = can("PPE_CAMERA_MANAGE");
  const [pingPending, setPingPending] = useState(false);
  const runBulkPing = async () => {
    if (pingPending || !canPing) return;
    const ids = cameras.filter(camera => rowSelection[camera.id]).map(camera => camera.id);
    setPingPending(true);
    try {
      const result = await settleInBatches(ids, async id => {
        const ping = await cameraService.pingCamera(id);
        if (!ping.success) throw new Error(ping.errorMessage || "Ping failed");
      });
      setRowSelection(Object.fromEntries(result.failed.map(id => [id, true])));
      const text = isVietnamese ? `${result.succeeded.length} thành công, ${result.failed.length} thất bại.` : `${result.succeeded.length} succeeded, ${result.failed.length} failed.`;
      if (result.failed.length) toast.error(text); else toast.success(text);
      onRefresh?.();
    } finally {
      setPingPending(false);
    }
  };
  // Bulk Actions
  const bulkActions = useMemo<TableBulkAction[]>(() => {
    const selectedIds = Object.keys(rowSelection).filter(
      (k) => rowSelection[k]
    );
    if (selectedIds.length === 0) return [];

    return [
      {
        id: "bulk-ping",
        label: isVietnamese
          ? `Đo Ping (${selectedIds.length})`
          : `Ping Test (${selectedIds.length})`,
        icon: <Activity size={14} />,
        variant: "primary",
        disabled: pingPending || !canPing,
        onClick: () => {
          void runBulkPing();
        },

      },
    ];
  }, [rowSelection, isVietnamese, cameras, onPing, pingPending, canPing]);

  // Row Actions definition
  const getRowActions = useCallback(
    (camera: CameraItem): TableRowAction<CameraItem>[] => {
      return [
        {
          id: "live",
          label: isVietnamese ? "Xem Live Stream" : "View Live Stream",
          icon: <Play size={14} className="text-primary" />,
          onClick: (c) => onViewLive(c),

        },
        {
          id: "ping",
          hidden: !canPing,
          label: isVietnamese ? "Đo Ping kiểm tra mạng" : "Ping Health Check",
          icon: <Activity size={14} />,
          onClick: (c) => onPing(c),

        },
        {
          id: "roi",
          hidden: !canManage,
          label: isVietnamese ? "Cấu hình AI ROI" : "Configure AI ROI",
          icon: <Sliders size={14} />,
          onClick: (c) => onConfigureRoi(c),

        },
        {
          id: "edit",
          hidden: !canManage,
          label: isVietnamese ? "Chỉnh sửa thông số" : "Edit Settings",
          icon: <Edit2 size={14} />,
          onClick: (c) => onEdit(c),

        },
        {
          id: "delete",
          hidden: !canManage,
          label: isVietnamese ? "Xóa camera" : "Delete Camera",
          icon: <Trash2 size={14} />,
          variant: "danger",
          onClick: (c) => onDelete(c),

        },
      ];
    },
    [isVietnamese, onViewLive, onPing, onConfigureRoi, onEdit, onDelete, canManage, canPing]
  );

  // TanStack Columns definition
  const columns = useMemo<ColumnDef<TableFeatureSet, CameraItem, any>[]>(() => {
    return [
      {
        id: "select",
        header: () => <TableSelectionHeader />,
        cell: ({ row }) => <TableSelectionRow row={row} />,
        enableSorting: false,
        size: 40,

      },
      {
        id: "name",
        accessorKey: "name",
        header: t("cameras.table.name"),
        cell: ({ row }) => {
          const camera = row.original;
          const isOnline = camera.status === "ONLINE";
          return (
            <div className="flex items-center gap-3 py-1">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-elevated/70 text-primary shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
                <Camera className="h-5 w-5" />
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-danger"
                    }`}
                />
              </div>
              <div className="min-w-0">
                <Link
                  href={`/cameras/${camera.id}`}
                  className="font-bold text-sm text-foreground hover:text-primary transition hover:underline line-clamp-1"
                  title={isVietnamese ? "Mở Camera AI Intelligence Studio" : "Open Camera AI Intelligence Studio"}
                >
                  {camera.name}
                </Link>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                  <span className="font-mono font-semibold text-primary">
                    {camera.code}
                  </span>
                  <span>•</span>
                  <span>{camera.sourceType}</span>
                </div>
              </div>
            </div>
          );
        },

      },
      {
        id: "site",
        enableSorting: false,
        header: t("cameras.table.site"),
        cell: ({ row }) => {
          const camera = row.original;
          return (
            <div className="flex flex-col">
              {camera.siteId ? (
                <Link
                  href={`/sites/${camera.siteId}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-foreground hover:text-primary transition hover:underline"
                  title={isVietnamese ? "Mở trung tâm điều hành công trường này" : "Open site operations center"}
                >
                  <span className="line-clamp-1">
                    {camera.siteName || (isVietnamese ? "Công trường chính" : "Main Site")}
                  </span>
                </Link>
              ) : (
                <span className="text-xs font-semibold text-foreground">
                  {camera.siteName || (isVietnamese ? "Công trường chính" : "Main Site")}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                {camera.location || camera.zoneName || (isVietnamese ? "Khu vực thi công" : "Construction Zone")}
              </span>
            </div>
          );
        },

      },
      {
        id: "specs",
        enableSorting: false,
        header: isVietnamese ? "Độ phân giải & FPS" : "Resolution & FPS",
        cell: ({ row }) => {
          const camera = row.original;
          return (
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className="rounded-lg bg-surface-elevated/70 px-2 py-0.5 font-semibold text-foreground shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
                {camera.config?.resolution || "1080p"}
              </span>
              <span className="text-muted-foreground">
                {camera.config?.captureFps || 25} FPS
              </span>
            </div>
          );
        },

      },
      {
        id: "status",
        accessorKey: "status",
        header: t("cameras.table.status"),
        cell: ({ row }) => {
          const isOnline = row.original.status === "ONLINE";
          return (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${isOnline
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                  : "bg-danger/15 text-danger border border-danger/30"
                }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-danger"
                  }`}
              />
              {row.original.status}
            </span>
          );
        },

      },
      {
        id: "latency",
        enableSorting: false,
        header: isVietnamese ? "Độ trễ & Mạng" : "Latency & Health",
        cell: ({ row }) => {
          const camera = row.original;
          const isOnline = camera.status === "ONLINE";
          const lat = camera.currentLatencyMs || (isOnline ? 38 : 0);
          const isFast = lat > 0 && lat <= 60;
          return (
            <div className="flex items-center gap-2 font-mono text-xs">
              <span
                className={`inline-flex items-center gap-1 font-semibold ${isFast
                    ? "text-emerald-600 dark:text-emerald-400"
                    : isOnline
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }`}
              >
                {lat}ms
              </span>
            </div>
          );
        },

      },
      {
        id: "roi",
        enableSorting: false,
        header: isVietnamese ? "Vùng AI ROI" : "AI ROI Zone",
        cell: ({ row }) => {
          const camera = row.original;
          const hasRoi = Boolean(
            (camera.config?.roiPolygon && camera.config.roiPolygon.length >= 3) ||
            ((camera.config as any)?.roi_polygon && Array.isArray((camera.config as any).roi_polygon) && (camera.config as any).roi_polygon.length >= 3)
          );
          return hasRoi ? (
            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              {isVietnamese ? "Đã hiệu chuẩn" : "Calibrated"}
            </span>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onConfigureRoi(camera);
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-600 hover:bg-amber-500/20 transition dark:text-amber-400"
              title={isVietnamese ? "Nhấp để thiết lập vùng quét AI ROI" : "Click to configure AI ROI detection zone"}
            >
              <Sliders className="h-3 w-3" />
              {isVietnamese ? "Chưa cài đặt" : "Configure"}
            </button>
          );
        },

      },
      {
        id: "incidents",
        enableSorting: false,
        header: isVietnamese ? "Sự cố PPE" : "Alerts",
        cell: ({ row }) => {
          const camera = row.original;
          return (
            <Link
              href={`/incidents?cameraId=${camera.id}&cameraCode=${camera.code}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 rounded-lg border border-border/40 bg-surface-elevated/40 px-2 py-0.5 text-xs font-semibold text-muted-foreground hover:text-primary hover:border-primary/40 transition"
              title={isVietnamese ? `Xem danh sách các vi phạm an toàn do ${camera.code} phát hiện` : `View safety violations detected by ${camera.code}`}
            >
              <ShieldAlert className="h-3 w-3 text-amber-500" />
              <span>{isVietnamese ? "Xem sự cố" : "View"}</span>
            </Link>
          );
        },

      },
      {
        id: "actions",
        header: () => <span className="sr-only">{isVietnamese ? "Hành động" : "Actions"}</span>,
        cell: ({ row }) => {
          const actions = getRowActions(row.original);
          return (
            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewLive(row.original);
                }}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-primary transition"
                title={isVietnamese ? "Xem Live Video Stream" : "View Live Video Stream"}
              >
                <Play className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPing(row.original);
                }}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-primary transition"
                title={isVietnamese ? "Đo ping kiểm tra kết nối" : "Ping test camera connection"}
              >
                <Activity className="h-3.5 w-3.5" />
              </button>

              <TableRowActions
                row={row}
                actions={actions}
                label={isVietnamese ? "Thao tác" : "Actions"}
              />
            </div>
          );
        },
        enableSorting: false,
        size: 90,

      },
    ];
  }, [t, isVietnamese, getRowActions, onConfigureRoi, onViewLive, onPing]);

  return (
    <div className="space-y-4">
      <Table
        data={cameras}
        columns={columns}
        variant={variant}
        loading={loading}
        emptyMessage={t("cameras.table.empty")}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        getRowId={(row) => row.id}
        features={{ rowSelection: canPing }}
        {...tableState}
        fetching={Boolean(tableState?.fetching) || pingPending}
      >
        <TableToolbar showSearch={false} actions={<TableRefresh />} />
        {/* Bulk Action Bar if items selected */}
        <TableBulkActions actions={bulkActions} />

        {/* TanStack Table Content */}
        <TableContent />

        {/* TanStack Table Pagination */}
        <TablePagination />
      </Table>
    </div>
  );
}
