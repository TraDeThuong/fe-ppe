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
import { useCan } from "@/hooks/use-can";
import type { LiveSessionInfo } from "@/types/ai-test.types";
import type { CameraItem } from "@/types";

export interface CameraTableProps {
  cameras: CameraItem[];
  getSessionForCamera: (camera: CameraItem) => LiveSessionInfo | undefined;
  onStartLive: (camera: CameraItem) => void;
  onStopLive: (camera: CameraItem) => void;
  onPing: (camera: CameraItem) => void;
  onEdit: (camera: CameraItem) => void;
  onDelete: (camera: CameraItem) => void;
  loading?: boolean;
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
  tableState,
  onRefresh,
  variant = "soft",
}: CameraTableProps) {
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
      const text = `${result.succeeded.length} thành công, ${result.failed.length} thất bại.`;
      if (result.failed.length) toast.error(text);
      else toast.success(text);
      onRefresh?.();
    } finally {
      setPingPending(false);
    }
  }, [cameras, canManage, onRefresh, pingPending, rowSelection]);

  const bulkActions = useMemo<TableBulkAction[]>(() => {
    if (selectedIds.length === 0) return [];
    return [
      {
        id: "bulk-ping",
        label: `Đo Ping (${selectedIds.length})`,
        icon: <Activity size={14} />,
        variant: "primary",
        disabled: pingPending || !canManage,
        onClick: () => {
          void runBulkPing();
        },
      },
    ];
  }, [canManage, pingPending, runBulkPing, selectedIds.length]);

  const getRowActions = useCallback(
    (camera: CameraItem): TableRowAction<CameraItem>[] => {
      const session = getSessionForCamera(camera);
      const isLive = session?.status === "running";
      return [
        {
          id: "toggle-live",
          label: isLive ? "Dừng AI Live" : "Bật AI Live",
          icon: isLive ? (
            <Square size={14} className="text-accent" />
          ) : (
            <Play size={14} className="text-primary" />
          ),
          onClick: (c) => (isLive ? onStopLive(c) : onStartLive(c)),
        },
        {
          id: "ping",
          hidden: !canManage,
          label: "Đo Ping kiểm tra mạng",
          icon: <Activity size={14} />,
          onClick: (c) => onPing(c),
        },
        {
          id: "edit",
          hidden: !canManage,
          label: "Chỉnh sửa thông số",
          icon: <Edit2 size={14} />,
          onClick: (c) => onEdit(c),
        },
        {
          id: "delete",
          hidden: !canManage,
          label: "Xóa Camera",
          icon: <Trash2 size={14} className="text-accent" />,
          variant: "danger",
          onClick: (c) => onDelete(c),
        },
      ];
    },
    [canManage, getSessionForCamera, onDelete, onEdit, onPing, onStartLive, onStopLive],
  );

  const columns = useMemo<ColumnDef<TableFeatureSet, CameraItem, unknown>[]>(
    () => [
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
        header: "Thiết bị Camera",
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
        header: "Vị trí",
        enableSorting: false,
        cell: ({ row }) => {
          const camera = row.original;
          return (
            <div className="min-w-0 text-xs">
              <div className="truncate font-semibold text-foreground">
                {camera.siteName || "Chưa gán site"}
              </div>
              <div className="truncate text-[11px] text-muted-foreground">
                {camera.zoneName || "Toàn công trường"}
              </div>
            </div>
          );
        },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Kết nối DB",
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
                  {metrics?.active_violations ?? 0} vp
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
            <span>Mở Studio</span>
            <ArrowUpRight className="size-3.5" />
          </Link>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <TableRowActions row={row} actions={getRowActions(row.original)} />
        ),
        size: 56,
      },
    ],
    [getRowActions, getSessionForCamera],
  );

  const features: TableFeatures = {
    pagination: true,
    sorting: true,
    rowSelection: true,
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
              <button
                type="button"
                onClick={onRefresh}
                title="Làm mới danh sách camera"
                className={`inline-flex h-9 w-9 items-center justify-center rounded-xl text-primary ${NM.tactileBtn}`}
              >
                <RefreshCw className="size-3.5" />
              </button>
            ) : undefined
          }
        />

        {selectedIds.length > 0 && (
          <div className="border-b border-border/30 bg-primary/5 p-3">
            <TableBulkActions
              actions={bulkActions}
              selectedCount={selectedIds.length}
              onClearSelection={() => setRowSelection({})}
              selectionLabel="camera đã chọn"
              clearSelectionLabel="Bỏ chọn"
            />
          </div>
        )}

        <TableContent />
        <TablePagination pageSizeOptions={[12, 24, 48]} showRowCount />
      </Table>
    </div>
  );
}
