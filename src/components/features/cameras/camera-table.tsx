"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import {
  Activity,
  ArrowUpRight,
  Camera,
  Edit2,
  Play,
  Radio,
  RefreshCw,
  Square,
  Trash2,
} from "lucide-react";
import {
  Table,
  TableBulkActions,
  TableContent,
  TablePagination,
  TableRowActions,
  TableSelectionHeader,
  TableSelectionRow,
  TableToolbar,
  type TableBulkAction,
  type TableFeatureSet,
  type TableFeatures,
  type TableProps,
  type TableRowAction,
} from "@/components/ui/table";
import { NM } from "@/components/features/ai-test/nm-styles";
import { cameraService } from "@/services/camera.service";
import { settleInBatches } from "@/lib/table-utils";
import { toast } from "@/lib/toast";
import { RefreshIconButton } from "@/components/ui/refresh-action";
import { useCan } from "@/hooks/use-can";
import { useLocale } from "@/providers/locale-provider";
import type { LiveSessionInfo } from "@/types/ai-test.types";
import type { CameraItem } from "@/types";

export interface CameraTableProps {
  cameras: CameraItem[];
  getSessionForCamera: (camera: CameraItem) => LiveSessionInfo | undefined;
  onStartLive?: (camera: CameraItem) => void;
  onStopLive?: (camera: CameraItem) => void;
  onPing: (camera: CameraItem) => void;
  onEdit: (camera: CameraItem) => void;
  onDelete: (camera: CameraItem) => void;
  loading?: boolean;
  isRefreshing?: boolean;
  tableState?: Partial<TableProps<CameraItem>>;
  onRefresh?: () => void;
  variant?: "soft" | "sculpted";
}

export function CameraTable({
  cameras,
  getSessionForCamera,
  onStartLive,
  onStopLive,
  onPing,
  onEdit,
  onDelete,
  loading = false,
  isRefreshing = false,
  tableState,
  onRefresh,
  variant = "soft",
}: CameraTableProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const can = useCan();
  const canManage = can("PPE_CAMERA_MANAGE");
  const [pingPending, setPingPending] = useState(false);

  const selectedIds = useMemo(
    () => Object.keys(rowSelection).filter((k) => rowSelection[k]),
    [rowSelection],
  );

  const runBulkPing = useCallback(async () => {
    if (pingPending || !canManage) return;
    const ids = cameras
      .filter((camera) => rowSelection[camera.id])
      .map((camera) => camera.id);
    setPingPending(true);
    try {
      const result = await settleInBatches(ids, async (id) => {
        const ping = await cameraService.pingCamera(id);
        if (!ping.success) throw new Error(ping.errorMessage || "Ping failed");
      });
      setRowSelection(Object.fromEntries(result.failed.map((id) => [id, true])));
      const text = isVietnamese
        ? `${result.succeeded.length} thành công, ${result.failed.length} thất bại.`
        : `${result.succeeded.length} succeeded, ${result.failed.length} failed.`;
      if (result.failed.length) toast.error(text);
      else toast.success(text);
      onRefresh?.();
    } finally {
      setPingPending(false);
    }
  }, [cameras, canManage, isVietnamese, onRefresh, pingPending, rowSelection]);

  const bulkActions = useMemo<TableBulkAction[]>(() => {
    if (selectedIds.length === 0) return [];
    return [
      {
        id: "bulk-ping",
        label: isVietnamese
          ? `Đo Ping (${selectedIds.length})`
          : `Ping Selected (${selectedIds.length})`,
        icon: <Activity size={14} />,
        variant: "primary",
        disabled: pingPending || !canManage,
        onClick: () => {
          void runBulkPing();
        },
      },
    ];
  }, [canManage, isVietnamese, pingPending, runBulkPing, selectedIds.length]);

  const getRowActions = useCallback(
    (camera: CameraItem): TableRowAction<CameraItem>[] => {
      const session = getSessionForCamera(camera);
      const isLive = session?.status === "running";
      return [
        {
          id: "toggle-live",
          hidden: !canManage || (!onStartLive && !onStopLive),
          label: isLive
            ? isVietnamese
              ? "Dừng AI Live"
              : "Stop AI Live"
            : isVietnamese
              ? "Bật AI Live"
              : "Start AI Live",
          icon: isLive ? (
            <Square size={14} className="text-accent" />
          ) : (
            <Play size={14} className="text-primary" />
          ),
          onClick: (c) => (isLive ? onStopLive?.(c) : onStartLive?.(c)),
        },
        {
          id: "ping",
          hidden: !canManage,
          label: isVietnamese ? "Đo Ping kiểm tra mạng" : "Ping network check",
          icon: <Activity size={14} />,
          onClick: (c) => onPing(c),
        },
        {
          id: "edit",
          hidden: !canManage,
          label: isVietnamese ? "Chỉnh sửa thông số" : "Edit parameters",
          icon: <Edit2 size={14} />,
          onClick: (c) => onEdit(c),
        },
        {
          id: "delete",
          hidden: !canManage,
          label: isVietnamese ? "Xóa Camera" : "Delete Camera",
          icon: <Trash2 size={14} className="text-accent" />,
          variant: "danger",
          onClick: (c) => onDelete(c),
        },
      ];
    },
    [canManage, getSessionForCamera, isVietnamese, onDelete, onEdit, onPing, onStartLive, onStopLive],
  );

  const columns = useMemo<ColumnDef<TableFeatureSet, CameraItem, unknown>[]>(
    () => [
      ...(canManage
        ? ([
            {
              id: "select",
              header: () => <TableSelectionHeader />,
              cell: ({ row }) => <TableSelectionRow row={row} />,
              enableSorting: false,
              size: 40,
            },
          ] as ColumnDef<TableFeatureSet, CameraItem, unknown>[])
        : []),
      {
        id: "name",
        accessorKey: "name",
        header: isVietnamese ? "Thiết bị Camera" : "Camera Device",
        cell: ({ row }) => {
          const camera = row.original;
          return (
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-primary ${NM.recessed}`}
              >
                <Camera className="size-4" />
              </div>
              <div className="min-w-0">
                <Link
                  href={`/cameras/${camera.id}`}
                  className="block truncate font-bold text-foreground hover:text-primary"
                >
                  {camera.name}
                </Link>
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                  <span className="font-bold text-primary">{camera.code}</span>
                  <span>•</span>
                  <span className="truncate">{camera.sourceType || "RTSP"}</span>
                </div>
              </div>
            </div>
          );
        },
      },
      {
        id: "site",
        header: isVietnamese ? "Vị trí" : "Location",
        enableSorting: false,
        cell: ({ row }) => {
          const camera = row.original;
          return (
            <div className="min-w-0 text-xs">
              <div className="truncate font-semibold text-foreground">
                {camera.siteName || (isVietnamese ? "Chưa gán site" : "Unassigned site")}
              </div>
              <div className="truncate text-[11px] text-muted-foreground">
                {camera.zoneName || (isVietnamese ? "Toàn công trường" : "Site-wide")}
              </div>
            </div>
          );
        },
      },
      {
        id: "status",
        accessorKey: "status",
        header: isVietnamese ? "Kết nối DB" : "DB Status",
        cell: ({ row }) => {
          const isOnline = row.original.status === "ONLINE";
          return (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-extrabold ${
                isOnline
                  ? "bg-primary/15 text-primary"
                  : "bg-foreground/10 text-muted-foreground"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isOnline ? "bg-primary" : "bg-muted-foreground/50"
                }`}
              />
              {row.original.status}
            </span>
          );
        },
      },
      {
        id: "ai_live",
        header: "AI Live Tracking",
        enableSorting: false,
        cell: ({ row }) => {
          const session = getSessionForCamera(row.original);
          const isLive = session?.status === "running";
          const metrics = session?.metrics;

          if (!isLive) {
            return (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/[0.06] px-2.5 py-0.5 font-mono text-[10px] font-bold text-muted-foreground">
                IDLE
              </span>
            );
          }

          return (
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-extrabold text-accent">
                <Radio className="size-2.5 animate-pulse" />
                LIVE
              </span>
              <span className="font-bold text-primary">
                {typeof metrics?.fps === "number" ? `${metrics.fps.toFixed(1)} FPS` : "--"}
              </span>
              <span className="text-muted-foreground">
                · {metrics?.counts?.person ?? metrics?.active_persons ?? 0}p /{" "}
                <strong
                  className={
                    (metrics?.active_violations ?? 0) > 0
                      ? "text-accent"
                      : "text-foreground"
                  }
                >
                  {metrics?.active_violations ?? 0}{" "}
                  {isVietnamese ? "vp" : "viol"}
                </strong>
              </span>
            </div>
          );
        },
      },
      {
        id: "studio",
        header: "Studio",
        enableSorting: false,
        cell: ({ row }) => (
          <Link
            href={`/cameras/${row.original.id}`}
            className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold text-primary ${NM.tactileBtn}`}
          >
            <span>{isVietnamese ? "Mở Studio" : "Open Studio"}</span>
            <ArrowUpRight className="size-3.5" />
          </Link>
        ),
      },
      ...(canManage
        ? ([
            {
              id: "actions",
              header: "",
              enableSorting: false,
              cell: ({ row }) => (
                <TableRowActions row={row} actions={getRowActions(row.original)} />
              ),
              size: 56,
            },
          ] as ColumnDef<TableFeatureSet, CameraItem, unknown>[])
        : []),
    ],
    [canManage, getRowActions, getSessionForCamera, isVietnamese],
  );

  const features: TableFeatures = {
    pagination: true,
    sorting: true,
    rowSelection: canManage,
    globalFilter: false,
  };

  return (
    <div className={`overflow-hidden rounded-[26px] p-3 sm:p-4 ${NM.chassis}`}>
      <Table
        data={cameras}
        columns={columns}
        features={features}
        loading={loading}
        variant={variant}
        getRowId={(row) => row.id}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        {...tableState}
      >
        <TableToolbar
          showSearch={false}
          showColumnVisibility={true}
          actions={
            onRefresh ? (
              <RefreshIconButton
                onRefresh={onRefresh}
                isRefreshing={isRefreshing}
                title={isVietnamese ? "Làm mới danh sách camera" : "Refresh camera list"}
                ariaLabel={isVietnamese ? "Làm mới danh sách camera" : "Refresh camera list"}
                className={`inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-primary disabled:opacity-50 ${NM.tactileBtn}`}
                iconClassName="size-3.5"
              />
            ) : undefined
          }
        />

        {selectedIds.length > 0 && (
          <div className="border-b border-border/30 bg-primary/5 p-3">
            <TableBulkActions
              actions={bulkActions}
              selectedCount={selectedIds.length}
              onClearSelection={() => setRowSelection({})}
              selectionLabel={isVietnamese ? "camera đã chọn" : "cameras selected"}
              clearSelectionLabel={isVietnamese ? "Bỏ chọn" : "Clear"}
            />
          </div>
        )}

        <TableContent />
        <TablePagination pageSizeOptions={[12, 24, 48]} showRowCount />
      </Table>
    </div>
  );
}
