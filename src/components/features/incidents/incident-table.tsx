"use client";

import { useContext, useMemo, useState, type ReactNode } from "react";
import type { RowSelectionState } from "@tanstack/react-table";
import Link from "next/link";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  Archive,
  CheckCircle2,
  ExternalLink,
  Send,
  UserCheck,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBulkActions,
  TableContent,
  TablePagination,
  TableRefresh,
  TableRowActions,
  TableSelectionHeader,
  TableSelectionRow,
  TableToolbar,
  type TableBulkAction,
  type TableProps,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { useCan } from "@/hooks/use-can";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import { clusterIncidentsByPerson } from "@/lib/incident-cluster-engine";
import { getIncidentClosure } from "@/lib/incident-list-scope";
import {
  groupIncidentsByCamera,
  isIncidentAssignedToUser,
} from "@/lib/incident-workflow";
import { useLocale } from "@/providers/locale-provider";
import type { IncidentItem } from "@/types";
import { IncidentSeverityBadge } from "./incident-severity-badge";
import { IncidentSplitView } from "./incident-split-view";
import { IncidentStatusBadge } from "./incident-status-badge";
import { IncidentCameraGroupsView } from "./table/incident-camera-groups-view";
import { IncidentGroupedClustersView } from "./table/incident-grouped-clusters-view";
import { IncidentListStatus } from "./table/incident-list-status";
import { IncidentQuickSelectBar } from "./table/incident-quick-select-bar";
import {
  incidentHasVideoEvidence,
  IncidentTelemetryChips,
  IncidentThumbnail,
} from "./table/incident-thumbnail";
import { getIncidentEvidenceUrl } from "./viewer/evidence-media-utils";

export type IncidentViewMode = "table" | "grouped" | "split" | "camera";

export interface IncidentTableProps {
  incidents: IncidentItem[];
  renderListControls?: (quickSelect: ReactNode) => ReactNode;
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

export { getIncidentEvidenceUrl };

export function IncidentTable({
  incidents,
  renderListControls,
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
  const router = useContext(AppRouterContext);
  const isVietnamese = locale === "vi-VN";
  const isOfficerRole = (user?.role || "").toUpperCase() === "SAFETY_OFFICER";
  const { getSiteName, getCameraCode, getCameraName } = useEntityLookup();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [internalViewMode, setInternalViewMode] = useState<IncidentViewMode>("table");
  const [collapsedCameras, setCollapsedCameras] = useState<Record<string, boolean>>({});

  const viewMode: IncidentViewMode = history ? "table" : controlledViewMode ?? internalViewMode;
  const setViewMode = (mode: IncidentViewMode) => {
    if (onViewModeChange) onViewModeChange(mode);
    else setInternalViewMode(mode);
  };

  // Mở đúng quyền Human Review cho mọi tài khoản có PPE_INCIDENT_REVIEW (gồm cả SAFETY_OFFICER theo D08)
  const canBatchReview = Boolean(onBatchReview) && can("PPE_INCIDENT_REVIEW");
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

  const personClusters = useMemo(() => clusterIncidentsByPerson(incidents), [incidents]);

  const toggleGroupSelection = (ids: string[]) => {
    if (ids.length === 0) return;
    setRowSelection((prev) => {
      const allSelected = ids.every((id) => Boolean(prev[id]));
      const next = { ...prev };
      for (const id of ids) {
        if (allSelected) delete next[id];
        else next[id] = true;
      }
      return next;
    });
  };

  const toggleSingleRow = (id: string) => {
    setRowSelection((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
  };

  const toggleCollapseKey = (key: string) => {
    setCollapsedCameras((prev) => ({ ...prev, [key]: !prev[key] }));
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
        variant: canBatchDispatch ? "outline" : "primary",
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
        variant: canBatchDispatch || canBatchReview ? "outline" : "primary",
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
  const showEmptyMessage = incidents.length === 0 && !loading && !tableState?.error;
  const emptyMessage = t("incidents.table.empty");
  const emptyResultSummary = viewMode === "table"
    ? (isVietnamese ? "0 bản ghi" : "0 records")
    : emptyMessage;
  const showGroupedStatus =
    incidents.length === 0 && (viewMode === "grouped" || viewMode === "camera");

  const quickSelectBar = (
    <IncidentQuickSelectBar
      hasIncidents={incidents.length > 0}
      emptyMessage={showEmptyMessage ? emptyResultSummary : undefined}
      isVietnamese={isVietnamese}
      history={history}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      personClustersCount={personClusters.length}
      canSelectRows={canSelectRows}
      canBatchReview={canBatchReview}
      isOfficerRole={isOfficerRole}
      canBatchResolve={canBatchResolve}
      allPagePendingIds={allPagePendingIds}
      allPageMyConfirmedIds={allPageMyConfirmedIds}
      cameraGroups={cameraGroups}
      selectedIdSet={selectedIdSet}
      onToggleGroupSelection={toggleGroupSelection}
      onClearSelection={() => setRowSelection({})}
    />
  );

  return (
    <div className="space-y-3">
      {renderListControls ? renderListControls(quickSelectBar) : quickSelectBar}

      {showEmptyMessage && viewMode !== "table" ? (
        tableState?.toolbar
      ) : showGroupedStatus ? (
        <>
          {tableState?.toolbar}
          <IncidentListStatus
            loading={loading}
            error={tableState?.error}
            onRetry={tableState?.onRetry}
          />
        </>
      ) : viewMode === "grouped" ? (
        <IncidentGroupedClustersView
          toolbar={tableState?.toolbar}
          personClusters={personClusters}
          selectedIdSet={selectedIdSet}
          bulkActions={bulkActions}
          canSelectRows={canSelectRows}
          canBatchDispatch={canBatchDispatch}
          canBatchClose={canBatchClose}
          anyBatchPending={anyBatchPending}
          isVietnamese={isVietnamese}
          locale={locale}
          highlightedId={highlightedId}
          collapsedMap={collapsedCameras}
          onToggleCollapse={toggleCollapseKey}
          onToggleGroupSelection={toggleGroupSelection}
          onToggleSingleRow={toggleSingleRow}
          onBatchDispatch={onBatchDispatch}
          onBatchClose={onBatchClose}
          getSiteName={getSiteName}
          getCameraCode={getCameraCode}
          getCameraName={getCameraName}
          formatViolation={formatViolation}
        />
      ) : viewMode === "split" ? (
        <div className="space-y-4">
          {tableState?.toolbar}

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
        <IncidentCameraGroupsView
          toolbar={tableState?.toolbar}
          cameraGroups={cameraGroups}
          selectedIdSet={selectedIdSet}
          bulkActions={bulkActions}
          canSelectRows={canSelectRows}
          canBatchReview={canBatchReview}
          canBatchDispatch={canBatchDispatch}
          canBatchResolve={canBatchResolve}
          canBatchClose={canBatchClose}
          anyBatchPending={anyBatchPending}
          isOfficerRole={isOfficerRole}
          currentUserId={user?.id}
          isVietnamese={isVietnamese}
          locale={locale}
          highlightedId={highlightedId}
          collapsedMap={collapsedCameras}
          onToggleCollapse={toggleCollapseKey}
          onToggleGroupSelection={toggleGroupSelection}
          onToggleSingleRow={toggleSingleRow}
          onBatchReview={onBatchReview}
          onBatchDispatch={onBatchDispatch}
          onBatchResolve={onBatchResolve}
          onBatchClose={onBatchClose}
          getSiteName={getSiteName}
          formatViolation={formatViolation}
        />
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
                    <IncidentThumbnail
                      src={evidenceUrl}
                      hasVideo={incidentHasVideoEvidence(incident)}
                    />
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Link
                          href={`/incidents/${incident.id}`}
                          className="line-clamp-1 font-mono text-xs font-bold text-primary hover:underline"
                        >
                          #{incident.id.slice(0, 8)}
                        </Link>
                        <IncidentTelemetryChips incident={incident} />
                      </div>
                      <p className="line-clamp-1 max-w-xs text-[11px] text-muted-foreground">
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
                <span className="text-xs font-semibold text-foreground">
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
                          className="inline-flex items-center gap-1 text-left font-semibold text-foreground transition hover:text-primary hover:underline"
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
                          className="p-0.5 text-muted-foreground transition hover:text-primary"
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
                      <span className="line-clamp-1 max-w-[180px] font-medium text-foreground">
                        {siteName}
                      </span>
                    )}
                    <Link
                      href={
                        incident.cameraId
                          ? `/cameras/${incident.cameraId}`
                          : `/cameras?search=${cameraCode}&view=wall`
                      }
                      className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground transition hover:text-primary hover:underline"
                      title={
                        isVietnamese
                          ? `Mở Camera AI Studio: ${cameraName}`
                          : `Open Camera AI Studio: ${cameraName}`
                      }
                    >
                      <span className="font-bold text-primary/90">{cameraCode}</span>
                      {cameraName && cameraName !== cameraCode && (
                        <span className="max-w-[120px] truncate text-muted-foreground">
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
                        <span className="max-w-[140px] truncate">{assigneeName}</span>
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
                      onClick: (incident) => router?.push("/incidents/" + incident.id),
                    },
                    {
                      id: "camera",
                      label: isVietnamese ? "Mở Video Wall" : "Open Video Wall",
                      onClick: (incident) =>
                        router?.push(
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
          emptyMessage={emptyMessage}
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
          <TableToolbar
            showSearch={false}
            showRowCount={!showEmptyMessage}
            actions={<TableRefresh />}
          />
          <TableBulkActions actions={bulkActions} />
          <TableContent />
          <TablePagination />
        </Table>
      )}
    </div>
  );
}
