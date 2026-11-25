"use client";
import { useMemo, useState } from "react";
import type { RowSelectionState } from "@tanstack/react-table";
import {
  Table,
  TableToolbar,
  TableContent,
  TablePagination,
  TableRefresh,
  TableRowActions,
  TableSelectionHeader,
  TableSelectionRow,
  TableBulkActions,
  type TableBulkAction,
} from "@/components/ui/table";
import type { TableProps } from "@/components/ui/table";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Archive,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Columns2,
  ExternalLink,
  Layers,
  List,
  Send,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { IncidentStatusBadge } from "./incident-status-badge";
import { IncidentSeverityBadge } from "./incident-severity-badge";
import { IncidentSplitView } from "./incident-split-view";
import { useCan } from "@/hooks/use-can";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/providers/locale-provider";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import { EVIDENCE_TYPE, type IncidentItem } from "@/types";
import { resolveEvidenceUrl } from "@/lib/evidence-url";
import {
  groupIncidentsByCamera,
  isIncidentAssignedToUser,
} from "@/lib/incident-workflow";
import { clusterIncidentsByPerson } from "@/lib/incident-cluster-engine";
import { getIncidentClosure } from "@/lib/incident-list-scope";

export type IncidentViewMode = "table" | "grouped" | "split" | "camera";

export interface IncidentTableProps {
  incidents: IncidentItem[];
  viewMode?: IncidentViewMode;
  history?: boolean;
  onViewModeChange?: (mode: IncidentViewMode) => void;
  onReview?: (incident: IncidentItem) => void;
  onBatchReview?: (ids: string[], action: "CONFIRM" | "REJECT") => Promise<void> | void;
  onBatchDispatch?: (items: IncidentItem[]) => Promise<void> | void;
  onBatchResolve?: (items: IncidentItem[]) => Promise<void> | void;
  onBatchClose?: (items: IncidentItem[]) => Promise<void> | void;
  batchReviewPending?: boolean;
  batchActionPending?: boolean;
  onAssign?: (incident: IncidentItem) => void;
  onResolve?: (incident: IncidentItem) => void;
  onClose?: (incident: IncidentItem) => void;
  onEdit?: (incident: IncidentItem) => void;
  onDelete?: (incident: IncidentItem) => void;
  onFilterSite?: (siteId: string) => void;
  loading?: boolean;
  tableState?: Partial<TableProps<IncidentItem>>;
  highlightedId?: string | null;
}

export function getIncidentEvidenceUrl(incident: IncidentItem): string {
  if (typeof window !== "undefined") {
    const cachedByIncident = sessionStorage.getItem(`ppe_incident_evidence_${incident.id}`);
    if (cachedByIncident) return resolveEvidenceUrl(cachedByIncident);
    if (incident.cameraId) {
      const cachedByCamera = sessionStorage.getItem(`ppe_camera_evidence_${incident.cameraId}`);
      if (cachedByCamera) return resolveEvidenceUrl(cachedByCamera);
    }
  }
  if (incident.snapshotUrl) return resolveEvidenceUrl(incident.snapshotUrl);
  const ev =
    incident.evidences?.find((e) => e.evidenceType === EVIDENCE_TYPE.SNAPSHOT) ||
    incident.evidences?.[0];
  if (ev?.url) return resolveEvidenceUrl(ev.url);
  if (ev?.storageKey) {
    return resolveEvidenceUrl(ev.storageKey);
  }
  return "";
}

export function IncidentTable({
  incidents,
  viewMode: controlledViewMode,
  history = false,
  onViewModeChange,
  onReview,
  onBatchReview,
  onBatchDispatch,
  onBatchResolve,
  onBatchClose,
  batchReviewPending = false,
  batchActionPending = false,
  onAssign,
  onResolve,
  onClose,
  onEdit,
  onDelete,
  onFilterSite,
  loading = false,
  tableState,
  highlightedId,
}: IncidentTableProps) {
  const { t, locale, dateTime } = useLocale();
  const can = useCan();
  const { user } = useAuth();
  const router = useRouter();
  const isVietnamese = locale === "vi-VN";
  const isOfficerRole = (user?.role || "").toUpperCase() === "SAFETY_OFFICER";
  const { getSiteName, getCameraCode, getCameraName } = useEntityLookup();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [internalViewMode, setInternalViewMode] = useState<IncidentViewMode>("table");
  const [collapsedCameras, setCollapsedCameras] = useState<Record<string, boolean>>({});

  const viewMode: IncidentViewMode = history ? "table" : controlledViewMode ?? internalViewMode;
  const setViewMode = (mode: IncidentViewMode) => {
    if (onViewModeChange) {
      onViewModeChange(mode);
    } else {
      setInternalViewMode(mode);
    }
  };

  const canBatchReview = !isOfficerRole && Boolean(onBatchReview) && can("PPE_INCIDENT_REVIEW");
  const canBatchDispatch = !isOfficerRole && Boolean(onBatchDispatch) && can("PPE_INCIDENT_MANAGE");
  const canBatchResolve = Boolean(onBatchResolve) && can("PPE_INCIDENT_UPDATE");
  const canBatchClose = !isOfficerRole && Boolean(onBatchClose) && can("PPE_INCIDENT_MANAGE");
  const canSelectRows =
    canBatchReview || canBatchDispatch || canBatchResolve || canBatchClose;
  const anyBatchPending = batchReviewPending || batchActionPending;

  const selectedIdSet = useMemo(() => {
    const set = new Set<string>();
    for (const [id, selected] of Object.entries(rowSelection)) {
      if (selected) set.add(id);
    }
    return set;
  }, [rowSelection]);

  const selectedIncidents = useMemo(
    () => incidents.filter((i) => selectedIdSet.has(i.id)),
    [incidents, selectedIdSet],
  );

  const pendingSelectedIds = useMemo(
    () => selectedIncidents.filter((i) => i.status === "PENDING_REVIEW").map((i) => i.id),
    [selectedIncidents],
  );

  const dispatchableSelectedItems = useMemo(
    () =>
      selectedIncidents.filter(
        (i) => i.status === "PENDING_REVIEW" || i.status === "CONFIRMED",
      ),
    [selectedIncidents],
  );

  const confirmedSelectedItems = useMemo(
    () =>
      selectedIncidents.filter(
        (i) =>
          i.status === "CONFIRMED" &&
          (!isOfficerRole || isIncidentAssignedToUser(i, user?.id)),
      ),
    [selectedIncidents, isOfficerRole, user?.id],
  );

  const resolvedSelectedItems = useMemo(
    () => selectedIncidents.filter((i) => i.status === "RESOLVED"),
    [selectedIncidents],
  );

  const allPagePendingIds = useMemo(
    () => incidents.filter((i) => i.status === "PENDING_REVIEW").map((i) => i.id),
    [incidents],
  );

  const allPageMyConfirmedIds = useMemo(
    () =>
      incidents
        .filter(
          (i) =>
            i.status === "CONFIRMED" &&
            (!isOfficerRole || isIncidentAssignedToUser(i, user?.id)),
        )
        .map((i) => i.id),
    [incidents, isOfficerRole, user?.id],
  );

  const cameraGroups = useMemo(
    () =>
      groupIncidentsByCamera(incidents, (inc) => {
        const code = inc.cameraCode || getCameraCode(inc.cameraId);
        const name = inc.cameraName || getCameraName(inc.cameraId);
        return name && name !== code ? `${code} (${name})` : code || inc.cameraId.slice(0, 8);
      }),
    [incidents, getCameraCode, getCameraName],
  );

  const personClusters = useMemo(
    () => clusterIncidentsByPerson(incidents),
    [incidents],
  );

  const toggleGroupSelection = (ids: string[]) => {
    if (ids.length === 0) return;
    setRowSelection((prev) => {
      const allSelected = ids.every((id) => Boolean(prev[id]));
      const next = { ...prev };
      for (const id of ids) {
        if (allSelected) {
          delete next[id];
        } else {
          next[id] = true;
        }
      }
      return next;
    });
  };

  const toggleSingleRow = (id: string) => {
    setRowSelection((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = true;
      }
      return next;
    });
  };

  const bulkActions = useMemo<TableBulkAction[]>(() => {
    const actions: TableBulkAction[] = [];

    if (canBatchDispatch && onBatchDispatch) {
      actions.push({
        id: "batch-dispatch",
        label: isVietnamese
          ? `Duyệt & Giao Officer (${dispatchableSelectedItems.length})`
          : `Confirm & Dispatch (${dispatchableSelectedItems.length})`,
        icon: <Send size={14} />,
        variant: "primary",
        disabled: dispatchableSelectedItems.length === 0 || anyBatchPending,
        onClick: async () => {
          if (dispatchableSelectedItems.length === 0) return;
          await onBatchDispatch(dispatchableSelectedItems);
          setRowSelection({});
        },
      });
    }

    if (canBatchReview && onBatchReview) {
      actions.push({
        id: "batch-confirm",
        label: isVietnamese
          ? `Xác nhận vi phạm (${pendingSelectedIds.length})`
          : `Confirm (${pendingSelectedIds.length})`,
        icon: <CheckCircle2 size={14} />,
        variant: "outline",
        disabled: pendingSelectedIds.length === 0 || anyBatchPending,
        onClick: async () => {
          if (pendingSelectedIds.length === 0) return;
          await onBatchReview(pendingSelectedIds, "CONFIRM");
          setRowSelection({});
        },
      });
      actions.push({
        id: "batch-false-positive",
        label: isVietnamese
          ? `Báo nhầm (${pendingSelectedIds.length})`
          : `Dismiss (${pendingSelectedIds.length})`,
        icon: <XCircle size={14} />,
        variant: "outline",
        disabled: pendingSelectedIds.length === 0 || anyBatchPending,
        onClick: async () => {
          if (pendingSelectedIds.length === 0) return;
          await onBatchReview(pendingSelectedIds, "REJECT");
          setRowSelection({});
        },
      });
    }

    if (canBatchResolve && onBatchResolve) {
      actions.push({
        id: "batch-resolve",
        label: isVietnamese
          ? `Báo cáo khắc phục (${confirmedSelectedItems.length})`
          : `Report Resolved (${confirmedSelectedItems.length})`,
        icon: <CheckCircle2 size={14} />,
        variant: canBatchDispatch ? "outline" : "primary",
        disabled: confirmedSelectedItems.length === 0 || anyBatchPending,
        onClick: async () => {
          if (confirmedSelectedItems.length === 0) return;
          await onBatchResolve(confirmedSelectedItems);
          setRowSelection({});
        },
      });
    }

    if (canBatchClose && onBatchClose) {
      actions.push({
        id: "batch-close",
        label: isVietnamese
          ? `Nghiệm thu & Đóng (${resolvedSelectedItems.length})`
          : `Accept & Close (${resolvedSelectedItems.length})`,
        icon: <Archive size={14} />,
        variant: "outline",
        disabled: resolvedSelectedItems.length === 0 || anyBatchPending,
        onClick: async () => {
          if (resolvedSelectedItems.length === 0) return;
          await onBatchClose(resolvedSelectedItems);
          setRowSelection({});
        },
      });
    }

    return actions;
  }, [
    canBatchDispatch,
    onBatchDispatch,
    canBatchReview,
    onBatchReview,
    canBatchResolve,
    onBatchResolve,
    canBatchClose,
    onBatchClose,
    isVietnamese,
    dispatchableSelectedItems,
    pendingSelectedIds,
    confirmedSelectedItems,
    resolvedSelectedItems,
    anyBatchPending,
  ]);

  const formatViolation = (type: string) => {
    switch (type) {
      case "NO_HELMET":
        return t("incidents.violation.noHelmet");
      case "NO_VEST":
        return t("incidents.violation.noVest");
      case "RESTRICTED_AREA":
        return t("incidents.violation.restrictedArea");
      case "MULTI_VIOLATION":
        return t("incidents.violation.multi");
      default:
        return type;
    }
  };

  const currentPage = (tableState?.pagination?.pageIndex ?? 0) + 1;
  const currentLimit = tableState?.pagination?.pageSize ?? 10;
  const totalCount = tableState?.rowCount ?? incidents.length;
  const totalPages =
    tableState?.pageCount ?? Math.max(1, Math.ceil(totalCount / Math.max(1, currentLimit)));

  return (
    <div className="space-y-3">
      {/* Thanh chip chọn nhanh theo Camera + Nút chuyển chế độ hiển thị (Bảng | Chia 2 cột | Gom theo Camera) */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/40 bg-surface/80 px-3.5 py-2.5 shadow-nm-sm">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {incidents.length > 0 ? (
            <>
              {canBatchReview && allPagePendingIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => toggleGroupSelection(allPagePendingIds)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 transition mr-1"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>
                    {isVietnamese
                      ? `Chọn chờ duyệt (${allPagePendingIds.length})`
                      : `Select Pending (${allPagePendingIds.length})`}
                  </span>
                </button>
              )}

              {isOfficerRole && canBatchResolve && allPageMyConfirmedIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => toggleGroupSelection(allPageMyConfirmedIds)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 transition mr-1"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>
                    {isVietnamese
                      ? `Chọn việc của tôi (${allPageMyConfirmedIds.length})`
                      : `Select My Tasks (${allPageMyConfirmedIds.length})`}
                  </span>
                </button>
              )}

              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
                <Camera className="h-3.5 w-3.5 text-primary" />
                <span>
                  {isVietnamese ? "Chọn nhanh theo Camera:" : "Quick select by Camera:"}
                </span>
              </span>

              {cameraGroups.map((grp) => {
                const targetIds = grp.items.map((i) => i.id);
                const selectedCount = targetIds.filter((id) => selectedIdSet.has(id)).length;
                const allSelected = selectedCount > 0 && selectedCount === targetIds.length;
                return (
                  <button
                    key={grp.cameraKey}
                    type="button"
                    disabled={!canSelectRows}
                    onClick={() => toggleGroupSelection(targetIds)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11px] font-semibold transition ${
                      allSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : selectedCount > 0
                          ? "border-primary/50 bg-primary/15 text-primary"
                          : "border-border/50 bg-background/70 text-foreground hover:border-primary/40 hover:text-primary"
                    } disabled:opacity-60`}
                    title={
                      isVietnamese
                        ? `Bấm để chọn/bỏ chọn ${grp.items.length} sự cố của ${grp.cameraLabel}`
                        : `Toggle ${grp.items.length} incidents from ${grp.cameraLabel}`
                    }
                  >
                    <span className="max-w-[160px] truncate">{grp.cameraLabel}</span>
                    <span
                      className={`rounded-md px-1.5 py-0.2 text-[10px] font-bold ${
                        allSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {selectedCount > 0 ? `${selectedCount}/` : ""}
                      {grp.items.length}
                    </span>
                  </button>
                );
              })}

              {selectedIdSet.size > 0 && (
                <button
                  type="button"
                  onClick={() => setRowSelection({})}
                  className="inline-flex items-center gap-1 rounded-xl border border-border/50 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-danger transition"
                >
                  <X className="h-3 w-3" />
                  <span>{isVietnamese ? `Bỏ chọn (${selectedIdSet.size})` : `Clear (${selectedIdSet.size})`}</span>
                </button>
              )}
            </>
          ) : (
            <span className="text-[11px] font-semibold text-muted-foreground">
              {isVietnamese ? "Chế độ hiển thị danh sách sự cố" : "Incident list view mode"}
            </span>
          )}
        </div>

        {/* Toggle chế độ Bảng <-> Chia 2 cột <-> Gom nhóm theo Camera */}
        {!history && <div
          role="group"
          aria-label={isVietnamese ? "Chọn chế độ hiển thị" : "Select display mode"}
          className="inline-flex items-center rounded-xl border border-border/50 bg-background/70 p-0.5 shadow-nm-inset shrink-0"
        >
          <button
            type="button"
            aria-pressed={viewMode === "table"}
            onClick={() => setViewMode("table")}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
              viewMode === "table"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="h-3.5 w-3.5" />
            <span>{isVietnamese ? "Bảng" : "Table"}</span>
          </button>
          <button
            type="button"
            aria-pressed={viewMode === "grouped"}
            onClick={() => setViewMode("grouped")}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
              viewMode === "grouped"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>
              {isVietnamese
                ? `Gom đa sự cố (${personClusters.length})`
                : `Grouped (${personClusters.length})`}
            </span>
          </button>
          <button
            type="button"
            aria-pressed={viewMode === "split"}
            onClick={() => setViewMode("split")}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
              viewMode === "split"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Columns2 className="h-3.5 w-3.5" />
            <span>{isVietnamese ? "Chia 2 cột" : "Split View"}</span>
          </button>
          <button
            type="button"
            aria-pressed={viewMode === "camera"}
            onClick={() => setViewMode("camera")}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
              viewMode === "camera"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>{isVietnamese ? "Gom theo Camera" : "Group by Camera"}</span>
          </button>
        </div>}
      </div>

      {viewMode === "grouped" ? (
        <div className="space-y-4">
          {tableState?.toolbar}

          {selectedIdSet.size > 0 && bulkActions.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-2.5 shadow-sm">
              <span className="text-xs font-bold text-foreground">
                {isVietnamese
                  ? `Đang chọn ${selectedIdSet.size} bản ghi sự cố`
                  : `${selectedIdSet.size} incident records selected`}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {bulkActions.map((act) => (
                  <Button
                    key={act.id}
                    type="button"
                    size="sm"
                    variant={act.variant === "primary" ? "primary" : "outline"}
                    disabled={act.disabled}
                    onClick={() => void act.onClick()}
                    className="gap-1.5 text-xs"
                  >
                    {act.icon}
                    <span>{act.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {personClusters.map((cluster) => {
              const allIds = cluster.incidentIds;
              const selectedInCluster = allIds.filter((id) =>
                selectedIdSet.has(id),
              ).length;
              const isAllSelected =
                selectedInCluster === allIds.length && allIds.length > 0;
              const isCollapsed = Boolean(collapsedCameras[`cl:${cluster.clusterId}`]);
              const primary = cluster.primary;
              const siteName = primary.siteName || getSiteName(primary.siteId);
              const cameraCode =
                primary.cameraCode || getCameraCode(primary.cameraId);
              const cameraName =
                primary.cameraName || getCameraName(primary.cameraId);
              const cameraLabel =
                cameraName && cameraName !== cameraCode
                  ? `${cameraCode} (${cameraName})`
                  : cameraCode || primary.cameraId.slice(0, 8);
              const dispatchable = cluster.items.filter(
                (i) => i.status === "PENDING_REVIEW" || i.status === "CONFIRMED",
              );
              const resolvedItems = cluster.items.filter(
                (i) => i.status === "RESOLVED",
              );

              return (
                <div
                  key={cluster.clusterId}
                  className="overflow-hidden rounded-2xl border border-border/50 bg-surface shadow-nm-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/30 bg-muted/20 px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {canSelectRows && (
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={() => toggleGroupSelection(allIds)}
                          className="h-4 w-4 rounded accent-primary cursor-pointer"
                          aria-label={`Select cluster ${cluster.clusterId}`}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setCollapsedCameras((prev) => ({
                            ...prev,
                            [`cl:${cluster.clusterId}`]: !prev[`cl:${cluster.clusterId}`],
                          }))
                        }
                        className="flex items-center gap-2 text-left min-w-0"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <Layers className="h-4 w-4 text-primary shrink-0" />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-bold text-foreground">
                              {formatViolation(cluster.effectiveViolationType)}
                            </span>
                            {cluster.rawCount > 1 && (
                              <span className="rounded-full bg-warning/15 px-2 py-0.5 font-mono text-[10px] font-extrabold text-warning">
                                {cluster.rawCount} {isVietnamese ? "lỗi gốc" : "raw"}
                              </span>
                            )}
                            {cluster.personTrackId !== null && (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                                Track #{cluster.personTrackId}
                              </span>
                            )}
                            <IncidentSeverityBadge severity={cluster.effectiveSeverity} />
                            <IncidentStatusBadge status={cluster.effectiveStatus} />
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                            <span>{siteName}</span>
                            <span>•</span>
                            <span className="font-semibold text-foreground/80">
                              {cameraLabel}
                            </span>
                            <span>•</span>
                            <span>
                              {new Date(cluster.latestDetectedAt).toLocaleString(locale)}
                            </span>
                            {cluster.isMultiViolation && cluster.violationCodes.length > 1 && (
                              <>
                                <span>•</span>
                                <span className="font-semibold text-warning">
                                  {cluster.violationCodes.map(formatViolation).join(" + ")}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {canBatchDispatch && onBatchDispatch && dispatchable.length > 0 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="primary"
                          disabled={anyBatchPending}
                          onClick={() => void onBatchDispatch(dispatchable)}
                          className="h-7 gap-1 px-2.5 text-[11px]"
                        >
                          <Send className="h-3 w-3" />
                          <span>
                            {isVietnamese
                              ? `Giao cụm (${dispatchable.length})`
                              : `Dispatch (${dispatchable.length})`}
                          </span>
                        </Button>
                      )}
                      {canBatchClose && onBatchClose && resolvedItems.length > 0 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={anyBatchPending}
                          onClick={() => void onBatchClose(resolvedItems)}
                          className="h-7 gap-1 px-2.5 text-[11px]"
                        >
                          <Archive className="h-3 w-3" />
                          <span>
                            {isVietnamese
                              ? `Đóng cụm (${resolvedItems.length})`
                              : `Close (${resolvedItems.length})`}
                          </span>
                        </Button>
                      )}
                      <Link
                        href={`/incidents/${primary.id}`}
                        className="inline-flex h-7 items-center gap-1 rounded-lg border border-border/50 px-2.5 text-[11px] font-semibold text-foreground hover:border-primary hover:text-primary transition"
                      >
                        <span>{isVietnamese ? "Chi tiết" : "Details"}</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div className="divide-y divide-border/20">
                      {cluster.items.map((incident) => {
                        const isSelected = selectedIdSet.has(incident.id);
                        const evidenceUrl = getIncidentEvidenceUrl(incident);
                        return (
                          <div
                            key={incident.id}
                            className={`flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 transition ${
                              incident.id === highlightedId
                                ? "bg-danger/10"
                                : isSelected
                                  ? "bg-primary/5"
                                  : "hover:bg-muted/15"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {canSelectRows && (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSingleRow(incident.id)}
                                  className="h-4 w-4 rounded accent-primary cursor-pointer shrink-0"
                                />
                              )}
                              <div className="relative flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/40 bg-slate-950/80">
                                {evidenceUrl ? (
                                  <img
                                    src={evidenceUrl}
                                    alt="Evidence"
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <Camera className="h-4 w-4 text-muted-foreground/60" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Link
                                    href={`/incidents/${incident.id}`}
                                    className="font-mono text-xs font-bold text-primary hover:underline"
                                  >
                                    #{incident.id.slice(0, 8)}
                                  </Link>
                                  <span className="text-xs font-semibold text-foreground">
                                    {formatViolation(incident.violationType)}
                                  </span>
                                  <IncidentSeverityBadge severity={incident.severity} />
                                  <IncidentStatusBadge status={incident.status} />
                                </div>
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {new Date(incident.detectedAt).toLocaleString(locale)} •{" "}
                                  {incident.description || formatViolation(incident.violationType)}
                                </p>
                              </div>
                            </div>
                            <Link
                              href={`/incidents/${incident.id}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-border/50 px-2.5 py-1 text-[11px] font-semibold text-foreground hover:border-primary hover:text-primary transition"
                            >
                              <span>{isVietnamese ? "Mở" : "Open"}</span>
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : viewMode === "split" ? (
        <div className="space-y-4">
          {tableState?.toolbar}

          {/* Thanh thao tác hàng loạt khi đang ở chế độ Chia 2 cột */}
          {selectedIdSet.size > 0 && bulkActions.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-2.5 shadow-sm">
              <span className="text-xs font-bold text-foreground">
                {isVietnamese
                  ? `Đang chọn ${selectedIdSet.size} sự cố`
                  : `${selectedIdSet.size} incidents selected`}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {bulkActions.map((act) => (
                  <Button
                    key={act.id}
                    type="button"
                    size="sm"
                    variant={act.variant === "primary" ? "primary" : "outline"}
                    disabled={act.disabled}
                    onClick={() => void act.onClick()}
                    className="gap-1.5 text-xs"
                  >
                    {act.icon}
                    <span>{act.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          <IncidentSplitView
            incidents={incidents}
            highlightedId={highlightedId}
            canSelectRows={canSelectRows}
            selectedIdSet={selectedIdSet}
            onToggleRowSelection={toggleSingleRow}
            loading={loading}
            fetching={Boolean(tableState?.fetching)}
            error={tableState?.error}
            onRetry={tableState?.onRetry}
            page={currentPage}
            limit={currentLimit}
            total={totalCount}
            totalPages={totalPages}
            onPageChange={(nextPage) =>
              tableState?.onPaginationChange?.({
                pageIndex: Math.max(0, nextPage - 1),
                pageSize: currentLimit,
              })
            }
            onLimitChange={(nextLimit) =>
              tableState?.onPaginationChange?.({
                pageIndex: 0,
                pageSize: nextLimit,
              })
            }
            onReview={onReview}
            onAssign={onAssign}
            onResolve={onResolve}
            onClose={onClose}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      ) : viewMode === "camera" ? (
        <div className="space-y-4">
          {tableState?.toolbar}

          {/* Thanh thao tác hàng loạt khi đang ở chế độ Gom theo Camera */}
          {selectedIdSet.size > 0 && bulkActions.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-2.5 shadow-sm">
              <span className="text-xs font-bold text-foreground">
                {isVietnamese
                  ? `Đang chọn ${selectedIdSet.size} sự cố`
                  : `${selectedIdSet.size} incidents selected`}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {bulkActions.map((act) => (
                  <Button
                    key={act.id}
                    type="button"
                    size="sm"
                    variant={act.variant === "primary" ? "primary" : "outline"}
                    disabled={act.disabled}
                    onClick={() => void act.onClick()}
                    className="gap-1.5 text-xs"
                  >
                    {act.icon}
                    <span>{act.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {cameraGroups.map((grp) => {
              const allIds = grp.items.map((i) => i.id);
              const selectedInGroup = allIds.filter((id) => selectedIdSet.has(id)).length;
              const isAllSelected = selectedInGroup === allIds.length && allIds.length > 0;
              const isCollapsed = Boolean(collapsedCameras[grp.cameraKey]);
              const siteName = grp.items[0]?.siteName || getSiteName(grp.items[0]?.siteId);

              return (
                <div
                  key={grp.cameraKey}
                  className="overflow-hidden rounded-2xl border border-border/50 bg-surface shadow-nm-sm"
                >
                  {/* Group Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/30 bg-muted/20 px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {canSelectRows && (
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={() => toggleGroupSelection(allIds)}
                          className="h-4 w-4 rounded accent-primary cursor-pointer"
                          aria-label={`Select all incidents for ${grp.cameraLabel}`}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setCollapsedCameras((prev) => ({
                            ...prev,
                            [grp.cameraKey]: !prev[grp.cameraKey],
                          }))
                        }
                        className="flex items-center gap-2 text-left min-w-0"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <Camera className="h-4 w-4 text-primary shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-foreground truncate">
                            {grp.cameraLabel}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {siteName} • {grp.items.length}{" "}
                            {isVietnamese ? "sự cố" : "incidents"}
                          </div>
                        </div>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {grp.pendingIds.length > 0 && (
                        <span className="rounded-lg bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                          {grp.pendingIds.length}{" "}
                          {isVietnamese ? "chờ duyệt" : "pending"}
                        </span>
                      )}
                      {grp.confirmedIds.length > 0 && (
                        <span className="rounded-lg bg-sky-500/15 px-2 py-0.5 text-[11px] font-bold text-sky-600 dark:text-sky-400">
                          {grp.confirmedIds.length}{" "}
                          {isVietnamese ? "đang xử lý" : "active"}
                        </span>
                      )}
                      {grp.resolvedIds.length > 0 && (
                        <span className="rounded-lg bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          {grp.resolvedIds.length}{" "}
                          {isVietnamese ? "chờ đóng" : "resolved"}
                        </span>
                      )}

                      {canBatchReview && onBatchReview && grp.pendingIds.length > 0 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={anyBatchPending}
                          onClick={() => void onBatchReview(grp.pendingIds, "CONFIRM")}
                          className="h-7 gap-1 px-2.5 text-[11px]"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          <span>
                            {isVietnamese
                              ? `Xác nhận nhóm (${grp.pendingIds.length})`
                              : `Confirm Group (${grp.pendingIds.length})`}
                          </span>
                        </Button>
                      )}

                      {canBatchDispatch && onBatchDispatch && grp.dispatchableIds.length > 0 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="primary"
                          disabled={anyBatchPending}
                          onClick={() =>
                            void onBatchDispatch(
                              grp.items.filter(
                                (i) => i.status === "PENDING_REVIEW" || i.status === "CONFIRMED",
                              ),
                            )
                          }
                          className="h-7 gap-1 px-2.5 text-[11px]"
                        >
                          <Send className="h-3 w-3" />
                          <span>
                            {isVietnamese
                              ? `Giao cả nhóm (${grp.dispatchableIds.length})`
                              : `Dispatch Group (${grp.dispatchableIds.length})`}
                          </span>
                        </Button>
                      )}

                      {canBatchClose && onBatchClose && grp.resolvedIds.length > 0 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={anyBatchPending}
                          onClick={() =>
                            void onBatchClose(
                              grp.items.filter((i) => i.status === "RESOLVED"),
                            )
                          }
                          className="h-7 gap-1 px-2.5 text-[11px]"
                        >
                          <Archive className="h-3 w-3" />
                          <span>
                            {isVietnamese
                              ? `Đóng nhóm (${grp.resolvedIds.length})`
                              : `Close Group (${grp.resolvedIds.length})`}
                          </span>
                        </Button>
                      )}

                      {canBatchResolve &&
                        !canBatchDispatch &&
                        onBatchResolve &&
                        grp.items.some(
                          (i) =>
                            i.status === "CONFIRMED" &&
                            (!isOfficerRole || isIncidentAssignedToUser(i, user?.id)),
                        ) && (
                          <Button
                            type="button"
                            size="sm"
                            variant="primary"
                            disabled={anyBatchPending}
                            onClick={() =>
                              void onBatchResolve(
                                grp.items.filter(
                                  (i) =>
                                    i.status === "CONFIRMED" &&
                                    (!isOfficerRole || isIncidentAssignedToUser(i, user?.id)),
                                ),
                              )
                            }
                            className="h-7 gap-1 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>
                              {isVietnamese
                                ? `Khắc phục nhóm của tôi`
                                : `Resolve My Group`}
                            </span>
                          </Button>
                        )}
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div className="divide-y divide-border/20">
                      {grp.items.map((incident) => {
                        const isSelected = selectedIdSet.has(incident.id);
                        const evidenceUrl = getIncidentEvidenceUrl(incident);
                        const assigneeName =
                          incident.assignments?.find((a) => a.status !== "COMPLETED")
                            ?.assignedToName || incident.assignments?.[0]?.assignedToName;
                        return (
                          <div
                            key={incident.id}
                            className={`flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 transition ${
                              incident.id === highlightedId
                                ? "bg-danger/10"
                                : isSelected
                                  ? "bg-primary/5"
                                  : "hover:bg-muted/15"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {canSelectRows && (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSingleRow(incident.id)}
                                  className="h-4 w-4 rounded accent-primary cursor-pointer shrink-0"
                                />
                              )}
                              <div className="relative flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/40 bg-slate-950/80">
                                {evidenceUrl ? (
                                  <img
                                    src={evidenceUrl}
                                    alt="Evidence"
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                      const target = e.currentTarget;
                                      if (!target.src.includes("/images/camera-live-evidence.jpg")) {
                                        target.src = "/images/camera-live-evidence.jpg";
                                      } else {
                                        target.style.display = "none";
                                      }
                                    }}
                                  />
                                ) : (
                                  <Camera className="h-4 w-4 text-muted-foreground/60" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Link
                                    href={`/incidents/${incident.id}`}
                                    className="font-mono text-xs font-bold text-primary hover:underline"
                                  >
                                    #{incident.id.slice(0, 8)}
                                  </Link>
                                  <span className="text-xs font-semibold text-foreground">
                                    {formatViolation(incident.violationType)}
                                  </span>
                                  <IncidentSeverityBadge severity={incident.severity} />
                                  <IncidentStatusBadge status={incident.status} />
                                  {assigneeName && (
                                    <span className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-muted/30 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                      <UserCheck className="h-3 w-3 text-primary" />
                                      <span>{assigneeName}</span>
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {new Date(incident.detectedAt).toLocaleString(locale)} •{" "}
                                  {incident.description || formatViolation(incident.violationType)}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <Link
                                href={`/incidents/${incident.id}`}
                                className="inline-flex items-center gap-1 rounded-lg border border-border/50 px-2.5 py-1 text-[11px] font-semibold text-foreground hover:border-primary hover:text-primary transition"
                              >
                                <span>{isVietnamese ? "Chi tiết" : "Details"}</span>
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <Table
          data={incidents}
          columns={[
            ...(canSelectRows
              ? [
                  {
                    id: "select",
                    header: () => <TableSelectionHeader />,
                    cell: ({ row }: { row: any }) => <TableSelectionRow row={row} />,
                    enableSorting: false,
                    size: 40,
                  },
                ]
              : []),
            {
              id: "id",
              header: t("incidents.table.incident"),
              accessorFn: (incident) => incident.id,
              enableSorting: false,
              cell: ({ row }) => {
                const incident = row.original;
                const evidenceUrl = getIncidentEvidenceUrl(incident);
                return (
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-11 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-950/80 border border-border/40">
                      {evidenceUrl ? (
                        <img
                          src={evidenceUrl}
                          alt="Evidence"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (!target.src.includes("/images/camera-live-evidence.jpg")) {
                              target.src = "/images/camera-live-evidence.jpg";
                            } else {
                              target.style.display = "none";
                            }
                          }}
                        />
                      ) : (
                        <Camera className="h-4 w-4 text-muted-foreground/60" />
                      )}
                    </div>
                    <div>
                      <Link
                        href={`/incidents/${incident.id}`}
                        className="font-mono text-xs font-bold text-primary hover:underline line-clamp-1"
                      >
                        #{incident.id.slice(0, 8)}
                      </Link>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 max-w-xs">
                        {incident.description || formatViolation(incident.violationType)}
                      </p>
                    </div>
                  </div>
                );
              },
            },
            {
              id: "violationType",
              header: t("incidents.table.violation"),
              accessorFn: (incident) => incident.violationType,
              enableSorting: false,
              cell: ({ row }) => (
                <span className="font-semibold text-xs text-foreground">
                  {formatViolation(row.original.violationType)}
                </span>
              ),
            },
            {
              id: "severity",
              header: t("incidents.table.severity"),
              accessorFn: (incident) => incident.severity,
              enableSorting: true,
              cell: ({ row }) => <IncidentSeverityBadge severity={row.original.severity} />,
            },
            {
              id: "siteId",
              header: t("incidents.table.location"),
              accessorFn: (incident) => incident.siteId,
              enableSorting: false,
              cell: ({ row }) => {
                const incident = row.original;
                const siteName = incident.siteName || getSiteName(incident.siteId);
                const cameraCode = incident.cameraCode || getCameraCode(incident.cameraId);
                const cameraName = incident.cameraName || getCameraName(incident.cameraId);
                return (
                  <div className="flex flex-col gap-0.5 text-xs">
                    {incident.siteId ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onFilterSite?.(incident.siteId)}
                          className="inline-flex items-center gap-1 font-semibold text-foreground hover:text-primary transition hover:underline text-left"
                          title={
                            isVietnamese
                              ? `Lọc danh sách theo công trường ${siteName}`
                              : `Filter by site ${siteName}`
                          }
                        >
                          <span className="line-clamp-1 max-w-[160px]">{siteName}</span>
                        </button>
                        <Link
                          href={`/sites/${incident.siteId}`}
                          className="text-muted-foreground hover:text-primary transition p-0.5"
                          title={
                            isVietnamese
                              ? `Mở trang chi tiết công trường ${siteName}`
                              : `Open site detail page ${siteName}`
                          }
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    ) : (
                      <span className="font-medium text-foreground line-clamp-1 max-w-[180px]">
                        {siteName}
                      </span>
                    )}
                    <Link
                      href={
                        incident.cameraId
                          ? `/cameras/${incident.cameraId}`
                          : `/cameras?search=${cameraCode}&view=wall`
                      }
                      className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground hover:text-primary transition hover:underline"
                      title={
                        isVietnamese
                          ? `Mở Camera AI Studio: ${cameraName}`
                          : `Open Camera AI Studio: ${cameraName}`
                      }
                    >
                      <span className="font-bold text-primary/90">{cameraCode}</span>
                      {cameraName && cameraName !== cameraCode && (
                        <span className="text-muted-foreground truncate max-w-[120px]">
                          ({cameraName})
                        </span>
                      )}
                    </Link>
                  </div>
                );
              },
            },
            {
              id: "detectedAt",
              header: t("incidents.table.detectedAt"),
              accessorFn: (incident) => incident.detectedAt,
              enableSorting: true,
              cell: ({ row }) => {
                const dateStr = new Date(row.original.detectedAt).toLocaleString(locale, {
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                });
                return (
                  <span className="font-mono text-xs text-muted-foreground">{dateStr}</span>
                );
              },
            },
            {
              id: "status",
              header: t("incidents.table.status"),
              accessorFn: (incident) => incident.status,
              enableSorting: true,
              cell: ({ row }) => {
                const incident = row.original;
                if (history) {
                  const closure = getIncidentClosure(incident);
                  return (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold">{t(closure.label)}</span>
                      {closure.date && (
                        <time dateTime={closure.date} className="text-xs text-muted-foreground">
                          {dateTime.format(new Date(closure.date))}
                        </time>
                      )}
                    </div>
                  );
                }
                const activeAssignee =
                  incident.assignments?.find((a) => a.status !== "COMPLETED") ||
                  incident.assignments?.[0];
                const assigneeName = activeAssignee?.assignedToName;
                const isMine = isIncidentAssignedToUser(incident, user?.id);

                return (
                  <div className="flex flex-col items-start gap-1">
                    <IncidentStatusBadge status={incident.status} />
                    {isMine ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                        <UserCheck className="h-3 w-3" />
                        <span>{isVietnamese ? "Việc của bạn" : "Assigned to you"}</span>
                      </span>
                    ) : assigneeName ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        <UserCheck className="h-3 w-3 text-primary" />
                        <span className="truncate max-w-[140px]">{assigneeName}</span>
                      </span>
                    ) : null}
                  </div>
                );
              },
            },
            {
              id: "actions",
              header: t("incidents.table.actions"),
              enableSorting: false,
              cell: ({ row }) => (
                <TableRowActions
                  row={row}
                  actions={[
                    {
                      id: "detail",
                      label: t("incidents.actions.viewDetail"),
                      onClick: (incident) => router.push("/incidents/" + incident.id),
                    },
                    {
                      id: "camera",
                      label: isVietnamese ? "Mở Video Wall" : "Open Video Wall",
                      onClick: (incident) =>
                        router.push(
                          "/cameras?search=" +
                            encodeURIComponent(
                              incident.cameraCode ||
                                getCameraCode(incident.cameraId) ||
                                incident.cameraId,
                            ) +
                            "&view=wall",
                        ),
                    },
                    {
                      id: "review",
                      label: t("incidents.actions.review"),
                      hidden: (incident) =>
                        !onReview ||
                        incident.status !== "PENDING_REVIEW" ||
                        !can("PPE_INCIDENT_REVIEW"),
                      onClick: (incident) => onReview?.(incident),
                    },
                    {
                      id: "assign",
                      label: t("incidents.actions.assign"),
                      hidden: (incident) =>
                        !onAssign ||
                        incident.status !== "CONFIRMED" ||
                        !can("PPE_INCIDENT_MANAGE"),
                      onClick: (incident) => onAssign?.(incident),
                    },
                    {
                      id: "resolve",
                      label: t("incidents.actions.resolve"),
                      hidden: (incident) =>
                        !onResolve ||
                        incident.status !== "CONFIRMED" ||
                        !can("PPE_INCIDENT_UPDATE") ||
                        (isOfficerRole && !isIncidentAssignedToUser(incident, user?.id)),
                      onClick: (incident) => onResolve?.(incident),
                    },
                    {
                      id: "close",
                      label: t("incidents.actions.close"),
                      hidden: (incident) =>
                        !onClose ||
                        (incident.status !== "RESOLVED" && incident.status !== "DISMISSED") ||
                        !can("PPE_INCIDENT_MANAGE"),
                      onClick: (incident) => onClose?.(incident),
                    },
                    {
                      id: "edit",
                      label: isVietnamese ? "Chỉnh sửa sự cố" : "Edit Incident",
                      hidden: (incident) =>
                        !onEdit ||
                        incident.status === "CLOSED" ||
                        !can("PPE_INCIDENT_UPDATE"),
                      onClick: (incident) => onEdit?.(incident),
                    },
                    {
                      id: "delete",
                      label: t("incidents.actions.delete"),
                      hidden: !onDelete || !can("PPE_INCIDENT_DELETE"),
                      variant: "danger",
                      onClick: (incident) => onDelete?.(incident),
                    },
                  ]}
                />
              ),
            },
          ]}
          loading={loading}
          getRowId={(row) => row.id}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          manualFiltering
          manualSorting
          manualPagination
          emptyMessage={t("incidents.table.empty")}
          getRowClassName={(incident) =>
            incident.id === highlightedId ? "bg-danger/10 ring-2 ring-inset ring-danger/40" : ""
          }
          {...tableState}
          features={{
            globalFilter: false,
            sorting: false,
            pagination: true,
            ...tableState?.features,
            rowSelection: canSelectRows,
          }}
        >
          <TableToolbar showSearch={false} actions={<TableRefresh />} />
          <TableBulkActions actions={bulkActions} />
          <TableContent />
          <TablePagination />
        </Table>
      )}
    </div>
  );
}
