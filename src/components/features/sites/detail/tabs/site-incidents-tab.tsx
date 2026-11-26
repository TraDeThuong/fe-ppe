"use client";

import { useEffect, useMemo, useState } from "react";
import type { RowSelectionState } from "@tanstack/react-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpDown,
  Calendar,
  Camera,
  CheckCircle,
  CheckCircle2,
  CheckSquare,
  Clock,
  ExternalLink,
  Eye,
  Layers,
  LayoutList,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Table2,
  UserPlus,
  X,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshIconButton } from "@/components/ui/refresh-action";
import { Modal } from "@/components/ui/modal";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "@/components/ui/segmented-control";
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
  type TableProps,
} from "@/components/ui/table";
import {
  AssignIncidentModal,
  CloseIncidentDialog,
  IncidentSeverityBadge,
  IncidentStatusBadge,
  ResolveIncidentModal,
  ReviewIncidentModal,
  getIncidentEvidenceUrl,
} from "@/components/features/incidents";
import { useCameras } from "@/hooks/cameras";
import {
  useAssignOfficer,
  useBatchReviewIncidents,
  useCloseIncident,
  useIncidentStatusCounts,
  useIncidents,
  useResolveIncident,
  useReviewIncident,
} from "@/hooks/incidents";
import { useSiteZones } from "@/hooks/sites";
import { useCan } from "@/hooks/use-can";
import { useDebounce } from "@/hooks/use-debounce";
import { useTableState } from "@/hooks/use-table-state";
import { mapTableSort } from "@/lib/table-utils";
import { useLocale } from "@/providers/locale-provider";
import type { IncidentItem, IncidentQueryParams, SiteItem } from "@/types";

export interface SiteIncidentsTabProps {
  site: SiteItem;
  initialZoneId?: string;
  initialCameraId?: string;
}

type IncidentsViewMode = "table" | "list";
type IncidentSortOption =
  | "detectedAt:desc"
  | "detectedAt:asc"
  | "severity:desc"
  | "status:asc";

const SORT_OPTION_MAP: Record<
  IncidentSortOption,
  { id: "detectedAt" | "severity" | "status"; desc: boolean }
> = {
  "detectedAt:desc": { id: "detectedAt", desc: true },
  "detectedAt:asc": { id: "detectedAt", desc: false },
  "severity:desc": { id: "severity", desc: true },
  "status:asc": { id: "status", desc: false },
};

const SELECT_CLASS =
  "w-full rounded-xl border border-border/40 bg-surface px-2.5 py-1.5 sm:py-2 text-xs font-medium text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:border-black/40 dark:bg-background/60 dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)] transition-colors";

export function SiteIncidentsTab({
  site,
  initialZoneId = "",
  initialCameraId = "",
}: SiteIncidentsTabProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const router = useRouter();
  const can = useCan();
  const canReadIncidents = can("PPE_INCIDENT_READ");
  const canReadCameras = can("PPE_CAMERA_READ");
  const canReadZones = can("PPE_ZONE_READ");
  const canReview = can("PPE_INCIDENT_REVIEW");
  const canUpdate = can("PPE_INCIDENT_UPDATE");
  const canManage = can("PPE_INCIDENT_MANAGE");

  // View & Filter state
  const [viewMode, setViewMode] = useState<IncidentsViewMode>("table");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string>("");
  const [violationFilter, setViolationFilter] = useState<string>("");
  const [cameraFilter, setCameraFilter] = useState<string>(initialCameraId);
  const [zoneFilter, setZoneFilter] = useState<string>(initialZoneId);
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Lifecycle modals state
  const [reviewTarget, setReviewTarget] = useState<IncidentItem | null>(null);
  const [resolveTarget, setResolveTarget] = useState<IncidentItem | null>(null);
  const [closeTarget, setCloseTarget] = useState<IncidentItem | null>(null);
  const [assignTarget, setAssignTarget] = useState<IncidentItem | null>(null);
  const [batchRejectOpen, setBatchRejectOpen] = useState(false);
  const [batchRejectNote, setBatchRejectNote] = useState("");
  const [batchRejectError, setBatchRejectError] = useState<string | null>(null);

  useEffect(() => {
    if (initialZoneId !== undefined) setZoneFilter(initialZoneId);
  }, [initialZoneId]);

  useEffect(() => {
    if (initialCameraId !== undefined) setCameraFilter(initialCameraId);
  }, [initialCameraId]);

  const { data: camerasData } = useCameras(
    { siteId: site.id, limit: 100 },
    { enabled: canReadCameras && Boolean(site.id) },
  );
  const { data: siteZones = [] } = useSiteZones(site.id, canReadZones);

  const cameras = useMemo(() => camerasData?.items ?? [], [camerasData?.items]);
  const zones = useMemo(
    () => (siteZones.length > 0 ? siteZones : site.zones || []),
    [siteZones, site.zones],
  );

  // Zone-to-camera mapping (since BE Incident has cameraId, not zoneId)
  const zoneCameras = useMemo(() => {
    if (!zoneFilter) return cameras;
    return cameras.filter((cam) => cam.zoneId === zoneFilter);
  }, [cameras, zoneFilter]);

  const zoneHasZeroCameras = Boolean(zoneFilter) && zoneCameras.length === 0;
  const isMultiCameraZoneFilter =
    Boolean(zoneFilter) && !cameraFilter && zoneCameras.length > 1;
  const effectiveCameraId =
    cameraFilter || (zoneFilter && zoneCameras.length === 1 ? zoneCameras[0].id : "");
  const effectiveCameraIds = useMemo(
    () =>
      zoneHasZeroCameras
        ? []
        : isMultiCameraZoneFilter
          ? zoneCameras.map((c) => c.id)
          : undefined,
    [zoneHasZeroCameras, isMultiCameraZoneFilter, zoneCameras],
  );

  const debouncedSearch = useDebounce(search, 350);
  const filterKey = `${site.id}:${debouncedSearch.trim()}:${statusFilter}:${severityFilter}:${violationFilter}:${cameraFilter}:${zoneFilter}:${fromDate}:${toDate}`;

  const tableState = useTableState(
    [{ id: "detectedAt", desc: true }],
    filterKey,
  );

  useEffect(() => {
    setRowSelection({});
  }, [filterKey]);

  const apiSorting = mapTableSort(
    tableState.sorting,
    {
      detectedAt: "detectedAt",
      createdAt: "createdAt",
      severity: "severity",
      status: "status",
    },
    { sortBy: "detectedAt", order: "desc" },
  );

  const queryParams: IncidentQueryParams = {
    siteId: site.id,
    page: tableState.pagination.pageIndex + 1,
    limit: tableState.pagination.pageSize,
    search: debouncedSearch.trim() || undefined,
    status: statusFilter || undefined,
    severity: severityFilter || undefined,
    violationType: violationFilter || undefined,
    cameraId: effectiveCameraId || undefined,
    cameraIds: effectiveCameraIds,
    fromDate: fromDate || undefined,
    toDate: toDate ? `${toDate}T23:59:59.999Z` : undefined,
    sortBy: apiSorting.sortBy,
    sortOrder: apiSorting.order,
  };

  const {
    data: incidentsData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useIncidents(queryParams, {
    enabled: canReadIncidents && Boolean(site.id) && !zoneHasZeroCameras,
  });

  const { data: statusCounts } = useIncidentStatusCounts(
    {
      siteId: site.id,
      cameraId: effectiveCameraId || undefined,
      cameraIds: effectiveCameraIds,
      fromDate: fromDate || undefined,
      toDate: toDate ? `${toDate}T23:59:59.999Z` : undefined,
    },
    { enabled: canReadIncidents && Boolean(site.id) },
  );

  const reviewMutation = useReviewIncident();
  const batchReviewMutation = useBatchReviewIncidents();
  const resolveMutation = useResolveIncident();
  const closeMutation = useCloseIncident();
  const assignMutation = useAssignOfficer();

  // Strictly enforce inc.siteId === site.id on client as well to guard against keepPreviousData cache bleed
  const rawIncidents = useMemo(
    () =>
      zoneHasZeroCameras
        ? []
        : (incidentsData?.items ?? []).filter(
            (inc) => !inc.siteId || inc.siteId === site.id,
          ),
    [zoneHasZeroCameras, incidentsData?.items, site.id],
  );

  const incidents = useMemo(() => {
    if (!isMultiCameraZoneFilter) return rawIncidents;
    const allowedCameraIds = new Set(zoneCameras.map((c) => c.id));
    return rawIncidents.filter((inc) => allowedCameraIds.has(inc.cameraId));
  }, [isMultiCameraZoneFilter, rawIncidents, zoneCameras]);

  const totalCount = zoneHasZeroCameras
    ? 0
    : incidentsData?.meta?.total ?? incidents.length;
  const totalPages = zoneHasZeroCameras
    ? 1
    : Math.max(
        1,
        incidentsData?.meta?.totalPages ??
          Math.ceil(totalCount / tableState.pagination.pageSize),
      );

  const pagedIncidents = incidents;

  const cameraLookup = useMemo(() => {
    const map = new Map<
      string,
      { code: string; name: string; zoneId?: string | null }
    >();
    for (const cam of cameras) {
      map.set(cam.id, { code: cam.code, name: cam.name, zoneId: cam.zoneId });
    }
    return map;
  }, [cameras]);

  const zoneLookup = useMemo(() => {
    const map = new Map<string, string>();
    for (const z of zones) {
      map.set(z.id, z.name);
    }
    return map;
  }, [zones]);

  // Batch review selected PENDING_REVIEW rows
  const pendingSelectedIds = useMemo(() => {
    const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);
    if (selectedIds.length === 0) return [];
    const pendingSet = new Set(
      pagedIncidents
        .filter((i) => i.status === "PENDING_REVIEW")
        .map((i) => i.id),
    );
    return selectedIds.filter((id) => pendingSet.has(id));
  }, [rowSelection, pagedIncidents]);

  const handleBatchConfirm = async () => {
    if (pendingSelectedIds.length === 0) return;
    await batchReviewMutation.mutateAsync({
      ids: pendingSelectedIds,
      action: "CONFIRM",
    });
    setRowSelection({});
  };

  const handleBatchRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBatchRejectError(null);
    const trimmed = batchRejectNote.trim();
    if (trimmed.length < 3) {
      setBatchRejectError(
        isVietnamese
          ? "Bắt buộc nhập lý do bác bỏ (tối thiểu 3 ký tự)."
          : "Rejection reason must be at least 3 characters.",
      );
      return;
    }
    await batchReviewMutation.mutateAsync({
      ids: pendingSelectedIds,
      action: "REJECT",
      resolutionNote: trimmed,
    });
    setRowSelection({});
    setBatchRejectNote("");
    setBatchRejectOpen(false);
  };

  const bulkActions = useMemo<TableBulkAction[]>(() => {
    if (!canReview) return [];
    return [
      {
        id: "confirm",
        label: isVietnamese
          ? `Xác nhận (${pendingSelectedIds.length})`
          : `Confirm (${pendingSelectedIds.length})`,
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        variant: "primary",
        disabled: pendingSelectedIds.length === 0 || batchReviewMutation.isPending,
        onClick: () => void handleBatchConfirm(),
      },
      {
        id: "reject",
        label: isVietnamese
          ? `Bác bỏ (${pendingSelectedIds.length})`
          : `Dismiss (${pendingSelectedIds.length})`,
        icon: <XCircle className="h-3.5 w-3.5" />,
        variant: "outline",
        disabled: pendingSelectedIds.length === 0 || batchReviewMutation.isPending,
        onClick: () => {
          setBatchRejectError(null);
          setBatchRejectOpen(true);
        },
      },
    ];
  }, [canReview, isVietnamese, pendingSelectedIds.length, batchReviewMutation.isPending]);

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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PENDING_REVIEW":
        return t("incidents.status.pendingReview");
      case "CONFIRMED":
        return t("incidents.status.confirmed");
      case "DISMISSED":
        return t("incidents.status.dismissed");
      case "RESOLVED":
        return t("incidents.status.resolved");
      case "CLOSED":
        return t("incidents.status.closed");
      default:
        return status;
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return t("incidents.severity.critical");
      case "HIGH":
        return t("incidents.severity.high");
      case "MEDIUM":
        return t("incidents.severity.medium");
      case "LOW":
        return t("incidents.severity.low");
      default:
        return severity;
    }
  };

  const resolveCameraDisplay = (incident: IncidentItem) => {
    const fromLookup = cameraLookup.get(incident.cameraId);
    const code = incident.cameraCode || fromLookup?.code || "";
    const name = incident.cameraName || fromLookup?.name || "";
    return {
      code: code || "Camera",
      name,
      zoneId: fromLookup?.zoneId || incident.zoneId,
    };
  };

  const resolveZoneName = (incident: IncidentItem) => {
    if (incident.zoneName) return incident.zoneName;
    const camZoneId = incident.zoneId || cameraLookup.get(incident.cameraId)?.zoneId;
    if (camZoneId) return zoneLookup.get(camZoneId) || "";
    return "";
  };

  const formatDetectedAt = (dateStr?: string) => {
    if (!dateStr) return isVietnamese ? "Vừa xong" : "Just now";
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) return dateStr;
    return parsed.toLocaleString(isVietnamese ? "vi-VN" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (statusFilter) count++;
    if (severityFilter) count++;
    if (violationFilter) count++;
    if (cameraFilter) count++;
    if (zoneFilter) count++;
    if (fromDate) count++;
    if (toDate) count++;
    return count;
  }, [
    search,
    statusFilter,
    severityFilter,
    violationFilter,
    cameraFilter,
    zoneFilter,
    fromDate,
    toDate,
  ]);

  const hasActiveFilters = activeFiltersCount > 0;

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("");
    setSeverityFilter("");
    setViolationFilter("");
    setCameraFilter("");
    setZoneFilter("");
    setFromDate("");
    setToDate("");
    tableState.resetPage();
  };

  const currentSortKey: IncidentSortOption = (() => {
    const first = tableState.sorting[0];
    if (first?.id === "detectedAt" && !first.desc) return "detectedAt:asc";
    if (first?.id === "severity") return "severity:desc";
    if (first?.id === "status") return "status:asc";
    return "detectedAt:desc";
  })();

  const handleSortSelect = (value: IncidentSortOption) => {
    const mapped = SORT_OPTION_MAP[value] ?? SORT_OPTION_MAP["detectedAt:desc"];
    tableState.onSortingChange([{ id: mapped.id, desc: mapped.desc }]);
  };

  const viewOptions: SegmentedControlOption<IncidentsViewMode>[] = [
    {
      value: "table",
      label: isVietnamese ? "Bảng" : "Table",
      icon: <Table2 className="size-3.5" aria-hidden="true" />,
    },
    {
      value: "list",
      label: isVietnamese ? "Danh sách" : "List",
      icon: <LayoutList className="size-3.5" aria-hidden="true" />,
    },
  ];

  const columns = useMemo<TableProps<IncidentItem>["columns"]>(() => {
    const cols: TableProps<IncidentItem>["columns"] = [];

    if (canReview) {
      cols.push({
        id: "select",
        header: () => <TableSelectionHeader />,
        cell: ({ row }) => <TableSelectionRow row={row} />,
        enableSorting: false,
        enableHiding: false,
      });
    }

    cols.push(
      {
        id: "id",
        header: t("incidents.table.incident"),
        accessorFn: (incident) => incident.id,
        enableSorting: false,
        cell: ({ row }) => {
          const incident = row.original;
          const evidenceUrl = getIncidentEvidenceUrl(incident);
          return (
            <div className="flex items-center gap-3 min-w-[210px]">
              <div className="relative flex h-11 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-950/80 border border-border/40">
                {evidenceUrl ? (
                  <img
                    src={evidenceUrl}
                    alt={incident.description || incident.violationType}
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
              <div className="min-w-0">
                <Link
                  href={`/incidents/${incident.id}`}
                  className="font-mono text-xs font-bold text-primary hover:underline line-clamp-1"
                >
                  #INC-{incident.id.slice(0, 8)}
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
          <span className="inline-flex items-center rounded-lg border border-border/40 bg-surface-elevated/60 px-2 py-0.5 text-xs font-semibold text-foreground whitespace-nowrap">
            {formatViolation(row.original.violationType)}
          </span>
        ),
      },
      {
        id: "cameraZone",
        header: isVietnamese ? "Camera & Phân khu" : "Camera & Zone",
        accessorFn: (incident) => incident.cameraId,
        enableSorting: false,
        cell: ({ row }) => {
          const incident = row.original;
          const cam = resolveCameraDisplay(incident);
          const zoneName = resolveZoneName(incident);
          return (
            <div className="flex flex-col gap-0.5 text-xs">
              <Link
                href={
                  incident.cameraId
                    ? `/cameras/${incident.cameraId}`
                    : `/cameras?search=${encodeURIComponent(cam.code)}&view=wall`
                }
                className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground hover:text-primary transition hover:underline"
              >
                <Camera className="h-3 w-3 text-primary/70 shrink-0" />
                <span className="font-bold text-primary/90">{cam.code}</span>
                {cam.name && cam.name !== cam.code && (
                  <span className="truncate max-w-[130px]">({cam.name})</span>
                )}
              </Link>
              {zoneName ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Layers className="h-3 w-3 text-accent/70 shrink-0" />
                  <span className="truncate max-w-[160px]">{zoneName}</span>
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground/60">
                  {isVietnamese ? "Chưa gắn phân khu" : "Unassigned zone"}
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: "severity",
        header: t("incidents.table.severity"),
        accessorFn: (incident) => incident.severity,
        enableSorting: true,
        cell: ({ row }) => <IncidentSeverityBadge severity={row.original.severity} />,
      },
      {
        id: "detectedAt",
        header: t("incidents.table.detectedAt"),
        accessorFn: (incident) => incident.detectedAt,
        enableSorting: true,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
            {formatDetectedAt(row.original.detectedAt || row.original.createdAt)}
          </span>
        ),
      },
      {
        id: "status",
        header: t("incidents.table.status"),
        accessorFn: (incident) => incident.status,
        enableSorting: true,
        cell: ({ row }) => <IncidentStatusBadge status={row.original.status} />,
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
                onClick: (inc) => router.push(`/incidents/${inc.id}`),
              },
              {
                id: "review",
                label: t("incidents.actions.review"),
                hidden: (inc) => !canReview || inc.status !== "PENDING_REVIEW",
                onClick: (inc) => setReviewTarget(inc),
              },
              {
                id: "assign",
                label: isVietnamese ? "Phân công cán bộ" : "Assign Officer",
                hidden: (inc) =>
                  !canManage ||
                  inc.status === "DISMISSED" ||
                  inc.status === "CLOSED",
                onClick: (inc) => setAssignTarget(inc),
              },
              {
                id: "resolve",
                label: isVietnamese ? "Đánh dấu khắc phục" : "Resolve Incident",
                hidden: (inc) => !canUpdate || inc.status !== "CONFIRMED",
                onClick: (inc) => setResolveTarget(inc),
              },
              {
                id: "close",
                label: isVietnamese ? "Nghiệm thu & Đóng" : "Close Record",
                hidden: (inc) => !canManage || inc.status !== "RESOLVED",
                onClick: (inc) => setCloseTarget(inc),
              },
              {
                id: "camera",
                label: isVietnamese ? "Mở Video Wall" : "Open Video Wall",
                onClick: (inc) => {
                  const cam = resolveCameraDisplay(inc);
                  router.push(
                    `/cameras?search=${encodeURIComponent(cam.code || inc.cameraId)}&view=wall`,
                  );
                },
              },
            ]}
          />
        ),
      },
    );

    return cols;
  }, [
    t,
    isVietnamese,
    router,
    canReview,
    canUpdate,
    canManage,
    cameraLookup,
    zoneLookup,
  ]);

  const selectedCameraLabel = useMemo(() => {
    if (!cameraFilter) return "";
    const cam = cameraLookup.get(cameraFilter);
    return cam ? `${cam.code}${cam.name ? ` - ${cam.name}` : ""}` : cameraFilter;
  }, [cameraFilter, cameraLookup]);

  const selectedZoneLabel = useMemo(() => {
    if (!zoneFilter) return "";
    return zoneLookup.get(zoneFilter) || zoneFilter;
  }, [zoneFilter, zoneLookup]);

  const isAllQuickActive = !statusFilter && !severityFilter;
  const isPendingQuickActive =
    statusFilter === "PENDING_REVIEW" && !severityFilter;
  const isCriticalQuickActive =
    severityFilter === "CRITICAL" && !statusFilter;
  const isResolvedQuickActive =
    statusFilter === "RESOLVED" && !severityFilter;

  return (
    <div className="space-y-4">
      {/* 1. Quick Status Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setStatusFilter("");
            setSeverityFilter("");
          }}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
            isAllQuickActive
              ? "border-primary/40 bg-primary/10 text-primary shadow-sm"
              : "border-border/40 bg-surface text-muted-foreground hover:text-foreground dark:border-black/50 dark:bg-card/80"
          }`}
        >
          <span>{isVietnamese ? "Tất cả sự cố" : "All Incidents"}</span>
          <span className="rounded-full bg-background/80 px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums">
            {statusCounts?.total ?? totalCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (isPendingQuickActive) {
              setStatusFilter("");
            } else {
              setStatusFilter("PENDING_REVIEW");
              setSeverityFilter("");
            }
          }}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
            isPendingQuickActive
              ? "border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-sm"
              : "border-border/40 bg-surface text-muted-foreground hover:text-foreground dark:border-black/50 dark:bg-card/80"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span>{t("incidents.status.pendingReview")}</span>
          <span className="rounded-full bg-background/80 px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums">
            {statusCounts?.pendingReview ?? 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (isCriticalQuickActive) {
              setSeverityFilter("");
            } else {
              setSeverityFilter("CRITICAL");
              setStatusFilter("");
            }
          }}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
            isCriticalQuickActive
              ? "border-danger/40 bg-danger/10 text-danger shadow-sm"
              : "border-border/40 bg-surface text-muted-foreground hover:text-foreground dark:border-black/50 dark:bg-card/80"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-danger" />
          <span>{t("incidents.severity.critical")}</span>
          <span className="rounded-full bg-background/80 px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums">
            {statusCounts?.critical ?? 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (isResolvedQuickActive) {
              setStatusFilter("");
            } else {
              setStatusFilter("RESOLVED");
              setSeverityFilter("");
            }
          }}
          title={
            isVietnamese
              ? "Lọc trạng thái Đã khắc phục (huy hiệu đếm gồm RESOLVED & CLOSED)"
              : "Filter RESOLVED incidents (badge counts RESOLVED + CLOSED)"
          }
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
            isResolvedQuickActive
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm"
              : "border-border/40 bg-surface text-muted-foreground hover:text-foreground dark:border-black/50 dark:bg-card/80"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>{t("incidents.status.resolved")}</span>
          <span className="rounded-full bg-background/80 px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums">
            {statusCounts?.resolved ?? 0}
          </span>
        </button>
      </div>

      {/* 2. Search, Filters & View Mode Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-surface p-3.5 sm:p-4 shadow-sm dark:border-black/60 dark:bg-card/90">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1 lg:max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                isVietnamese
                  ? "Tìm theo mô tả hoặc loại vi phạm (NO_HELMET, NO_VEST...)"
                  : "Search by description or violation type..."
              }
              aria-label={isVietnamese ? "Tìm kiếm sự cố" : "Search site incidents"}
              className="w-full rounded-xl border border-border/40 bg-surface pl-9.5 pr-8 py-2 text-xs sm:text-sm text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-black/40 dark:bg-background/60 dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)] placeholder:text-muted-foreground/60"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-muted-foreground hover:text-foreground"
                aria-label={isVietnamese ? "Xóa tìm kiếm" : "Clear search"}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2 shrink-0">
            {hasActiveFilters && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="h-8.5 gap-1.5 rounded-xl border-primary/30 px-2.5 text-xs font-semibold text-primary"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {t("incidents.toolbar.resetFilters") ||
                    (isVietnamese ? "Đặt lại" : "Reset")}
                </span>
                <Badge
                  variant="secondary"
                  size="sm"
                  className="font-mono text-[9px] px-1 py-0"
                >
                  {activeFiltersCount}
                </Badge>
              </Button>
            )}

            <SegmentedControl<IncidentsViewMode>
              options={viewOptions}
              value={viewMode}
              onValueChange={setViewMode}
              aria-label={
                isVietnamese ? "Chế độ hiển thị sự cố" : "Incidents view mode"
              }
              size="sm"
            />

            <Link
              href={`/incidents?siteId=${site.id}&siteName=${encodeURIComponent(site.name)}`}
              className="inline-flex h-8.5 items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/[0.08] px-2.5 sm:px-3 text-xs font-semibold text-primary hover:bg-primary/15 transition shadow-sm"
            >
              <span className="sm:hidden">
                {isVietnamese ? "Trang Sự cố" : "Incidents"}
              </span>
              <span className="hidden sm:inline">
                {isVietnamese
                  ? "Quản lý trên trang Sự cố"
                  : "Manage on Incidents"}
              </span>
              <ExternalLink className="h-3 w-3 shrink-0" />
            </Link>

            <RefreshIconButton
              onRefresh={() => refetch()}
              isRefreshing={isFetching}
              className="flex h-8.5 w-8.5 cursor-pointer items-center justify-center rounded-xl border border-border/40 text-muted-foreground hover:text-primary dark:border-black/40"
              title={isVietnamese ? "Làm mới sự cố" : "Refresh incidents"}
              ariaLabel={isVietnamese ? "Làm mới sự cố" : "Refresh incidents"}
              iconClassName="h-3.5 w-3.5"
            />
          </div>
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-border/20 text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground font-semibold pr-1 shrink-0">
            <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline">
              {t("incidents.toolbar.filtersLabel") ||
                (isVietnamese ? "Bộ lọc:" : "Filters:")}
            </span>
          </span>

          <div className="min-w-[125px] flex-1 sm:flex-initial">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label={isVietnamese ? "Lọc theo trạng thái" : "Filter by status"}
              className={SELECT_CLASS}
            >
              <option value="">{t("incidents.toolbar.allStatuses")}</option>
              <option value="PENDING_REVIEW">{t("incidents.status.pendingReview")}</option>
              <option value="CONFIRMED">{t("incidents.status.confirmed")}</option>
              <option value="RESOLVED">{t("incidents.status.resolved")}</option>
              <option value="CLOSED">{t("incidents.status.closed")}</option>
              <option value="DISMISSED">{t("incidents.status.dismissed")}</option>
            </select>
          </div>

          <div className="min-w-[115px] flex-1 sm:flex-initial">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              aria-label={isVietnamese ? "Lọc theo mức độ" : "Filter by severity"}
              className={SELECT_CLASS}
            >
              <option value="">{t("incidents.toolbar.allSeverities")}</option>
              <option value="CRITICAL">{t("incidents.severity.critical")}</option>
              <option value="HIGH">{t("incidents.severity.high")}</option>
              <option value="MEDIUM">{t("incidents.severity.medium")}</option>
              <option value="LOW">{t("incidents.severity.low")}</option>
            </select>
          </div>

          <div className="min-w-[130px] flex-1 sm:flex-initial">
            <select
              value={violationFilter}
              onChange={(e) => setViolationFilter(e.target.value)}
              aria-label={isVietnamese ? "Lọc theo loại vi phạm" : "Filter by violation type"}
              className={SELECT_CLASS}
            >
              <option value="">{t("incidents.toolbar.allViolations")}</option>
              <option value="NO_HELMET">{t("incidents.violation.noHelmet")}</option>
              <option value="NO_VEST">{t("incidents.violation.noVest")}</option>
              <option value="RESTRICTED_AREA">{t("incidents.violation.restrictedArea")}</option>
              <option value="MULTI_VIOLATION">{t("incidents.violation.multi")}</option>
            </select>
          </div>

          {zones.length > 0 && (
            <div className="min-w-[130px] flex-1 sm:flex-initial">
              <select
                value={zoneFilter}
                onChange={(e) => {
                  const nextZone = e.target.value;
                  setZoneFilter(nextZone);
                  // Clear camera selection if it doesn't belong to the newly chosen zone
                  if (nextZone && cameraFilter) {
                    const cam = cameraLookup.get(cameraFilter);
                    if (cam?.zoneId !== nextZone) {
                      setCameraFilter("");
                    }
                  }
                }}
                aria-label={isVietnamese ? "Lọc theo phân khu" : "Filter by zone"}
                className={SELECT_CLASS}
              >
                <option value="">
                  {isVietnamese
                    ? `Tất cả phân khu (${zones.length})`
                    : `All Zones (${zones.length})`}
                </option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {zoneCameras.length > 0 && (
            <div className="min-w-[130px] flex-1 sm:flex-initial">
              <select
                value={cameraFilter}
                onChange={(e) => setCameraFilter(e.target.value)}
                aria-label={isVietnamese ? "Lọc theo camera" : "Filter by camera"}
                className={SELECT_CLASS}
              >
                <option value="">
                  {isVietnamese
                    ? `Tất cả camera (${zoneCameras.length})`
                    : `All Cameras (${zoneCameras.length})`}
                </option>
                {zoneCameras.map((cam) => (
                  <option key={cam.id} value={cam.id}>
                    {cam.code}
                    {cam.name ? ` - ${cam.name}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Range */}
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0 hidden sm:block" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              aria-label={isVietnamese ? "Từ ngày" : "From date"}
              className="rounded-xl border border-border/40 bg-surface px-2 py-1.5 font-mono text-[11px] text-foreground focus:border-primary focus:outline-none dark:border-black/40 dark:bg-background/60"
            />
            <span className="text-muted-foreground">-</span>
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => setToDate(e.target.value)}
              aria-label={isVietnamese ? "Đến ngày" : "To date"}
              className="rounded-xl border border-border/40 bg-surface px-2 py-1.5 font-mono text-[11px] text-foreground focus:border-primary focus:outline-none dark:border-black/40 dark:bg-background/60"
            />
          </div>

          <div className="min-w-[135px] flex-1 sm:flex-initial sm:ml-auto">
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 hidden sm:block" />
              <select
                value={currentSortKey}
                onChange={(e) =>
                  handleSortSelect(e.target.value as IncidentSortOption)
                }
                aria-label={isVietnamese ? "Sắp xếp theo" : "Sort by"}
                className={SELECT_CLASS}
              >
                <option value="detectedAt:desc">
                  {isVietnamese ? "Mới nhất trước" : "Newest first"}
                </option>
                <option value="detectedAt:asc">
                  {isVietnamese ? "Cũ nhất trước" : "Oldest first"}
                </option>
                <option value="severity:desc">
                  {isVietnamese ? "Mức độ nghiêm trọng" : "Severity level"}
                </option>
                <option value="status:asc">
                  {isVietnamese ? "Theo trạng thái" : "By status"}
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 -mb-0.5">
            <span className="text-[11px] text-muted-foreground mr-1">
              {t("incidents.toolbar.activeFilters") ||
                (isVietnamese ? "Đang lọc:" : "Active:")}
            </span>

            {search.trim() && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-border/40 bg-background/80 px-2 py-0.5 text-[11px] text-foreground">
                <span className="font-semibold text-primary max-w-[140px] truncate">
                  &quot;{search}&quot;
                </span>
                <button type="button" onClick={() => setSearch("")} aria-label="Remove search filter">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {statusFilter && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-border/40 bg-background/80 px-2 py-0.5 text-[11px] text-foreground">
                <span className="font-semibold">{getStatusLabel(statusFilter)}</span>
                <button type="button" onClick={() => setStatusFilter("")} aria-label="Remove status filter">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {severityFilter && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-border/40 bg-background/80 px-2 py-0.5 text-[11px] text-foreground">
                <span className="font-semibold">{getSeverityLabel(severityFilter)}</span>
                <button type="button" onClick={() => setSeverityFilter("")} aria-label="Remove severity filter">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {violationFilter && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-border/40 bg-background/80 px-2 py-0.5 text-[11px] text-foreground">
                <span className="font-semibold">{formatViolation(violationFilter)}</span>
                <button type="button" onClick={() => setViolationFilter("")} aria-label="Remove violation filter">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {zoneFilter && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-2 py-0.5 text-[11px] text-primary">
                <span className="font-medium max-w-[150px] truncate">
                  {selectedZoneLabel} ({zoneCameras.length} cam)
                </span>
                <button type="button" onClick={() => setZoneFilter("")} aria-label="Remove zone filter">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {cameraFilter && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-2 py-0.5 text-[11px] text-primary">
                <span className="font-mono font-medium max-w-[150px] truncate">
                  {selectedCameraLabel}
                </span>
                <button type="button" onClick={() => setCameraFilter("")} aria-label="Remove camera filter">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {(fromDate || toDate) && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-border/40 bg-background/80 px-2 py-0.5 font-mono text-[11px] text-foreground">
                <span>
                  {fromDate || "..."} → {toDate || "..."}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setFromDate("");
                    setToDate("");
                  }}
                  aria-label="Remove date filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[11px] font-semibold text-primary hover:underline ml-auto"
            >
              {t("incidents.toolbar.clearAll") ||
                (isVietnamese ? "Xóa tất cả" : "Clear all")}
            </button>
          </div>
        )}
      </div>

      {/* 3. Content Area: Table Mode vs List Mode */}
      {viewMode === "table" ? (
        <Table<IncidentItem>
          data={pagedIncidents}
          columns={columns}
          loading={isLoading && !zoneHasZeroCameras}
          fetching={isFetching && !zoneHasZeroCameras}
          error={zoneHasZeroCameras ? null : error}
          onRetry={() => void refetch()}
          getRowId={(row) => row.id}
          filterKey={filterKey}
          manualFiltering
          manualSorting
          manualPagination
          rowCount={totalCount}
          pageCount={totalPages}
          pagination={tableState.pagination}
          onPaginationChange={tableState.onPaginationChange}
          sorting={tableState.sorting}
          onSortingChange={tableState.onSortingChange}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          emptyMessage={
            zoneHasZeroCameras
              ? isVietnamese
                ? "Phân khu này chưa có camera nào được gán."
                : "This zone has no cameras assigned yet."
              : hasActiveFilters
                ? isVietnamese
                  ? "Không có sự cố nào khớp với bộ lọc đang chọn."
                  : "No incidents match the selected filters."
                : t("incidents.table.empty")
          }
          features={{
            globalFilter: false,
            sorting: true,
            rowSelection: canReview,
            columnVisibility: true,
            pagination: true,
          }}
        >
          <TableToolbar
            showSearch={false}
            showColumnVisibility={true}
          />
          {canReview && <TableBulkActions actions={bulkActions} />}
          <TableContent />
          <TablePagination pageSizeOptions={[10, 20, 50]} />
        </Table>
      ) : (
        <div className="space-y-4">
          {isLoading && !zoneHasZeroCameras ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-2xl bg-surface-elevated/40"
                />
              ))}
            </div>
          ) : pagedIncidents.length === 0 && !error ? (
            <div className="rounded-2xl border border-border/30 bg-surface p-12 text-center dark:border-black/50 dark:bg-card/70">
              <CheckCircle className="mx-auto h-12 w-12 text-primary/40 mb-3" />
              <h4 className="text-sm font-bold text-foreground">
                {zoneHasZeroCameras
                  ? isVietnamese
                    ? "Phân khu chưa có camera giám sát"
                    : "No cameras in this zone"
                  : hasActiveFilters
                    ? isVietnamese
                      ? "Không tìm thấy sự cố phù hợp"
                      : "No matching incidents found"
                    : isVietnamese
                      ? "Không có sự cố vi phạm nào"
                      : "No safety violation incidents"}
              </h4>
              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className="mt-4 gap-1.5 rounded-xl text-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>
                    {t("incidents.toolbar.resetFilters") ||
                      (isVietnamese ? "Đặt lại bộ lọc" : "Reset filters")}
                  </span>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {pagedIncidents.map((incident) => {
                const cam = resolveCameraDisplay(incident);
                const zoneName = resolveZoneName(incident);
                const formattedDate = formatDetectedAt(
                  incident.detectedAt || incident.createdAt,
                );

                return (
                  <div
                    key={incident.id}
                    className="group flex flex-col justify-between gap-3 rounded-2xl border border-border/40 bg-surface p-3.5 sm:p-4 shadow-sm transition hover:border-primary/40 sm:flex-row sm:items-center dark:border-black/60 dark:bg-card/90"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="relative h-14 w-20 sm:h-16 sm:w-24 shrink-0 overflow-hidden rounded-xl bg-slate-950/80 border border-border/40 flex items-center justify-center">
                        {getIncidentEvidenceUrl(incident) ? (
                          <img
                            src={getIncidentEvidenceUrl(incident)}
                            alt={incident.description || incident.violationType}
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
                          <Camera className="h-5 w-5 text-muted-foreground/50" />
                        )}
                        <AlertTriangle className="pointer-events-none absolute h-5 w-5 text-muted-foreground/40 -z-10" />
                      </div>

                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/incidents/${incident.id}`}
                            className="font-mono text-xs font-bold text-primary hover:underline"
                          >
                            #INC-{incident.id.slice(0, 8)}
                          </Link>
                          <IncidentSeverityBadge severity={incident.severity} />
                          <IncidentStatusBadge status={incident.status} />
                          <span className="rounded-lg border border-border/40 bg-surface-elevated/70 px-2 py-0.5 text-[10px] font-semibold text-foreground">
                            {formatViolation(incident.violationType)}
                          </span>
                        </div>

                        <h4 className="text-xs sm:text-sm font-semibold text-foreground line-clamp-1">
                          {incident.description ||
                            formatViolation(incident.violationType)}
                        </h4>

                        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11px] text-muted-foreground">
                          <Link
                            href={`/cameras/${incident.cameraId}`}
                            className="flex items-center gap-1 hover:text-primary transition hover:underline"
                          >
                            <Camera className="h-3 w-3 text-primary/70 shrink-0" />
                            <span className="font-mono font-semibold">{cam.code}</span>
                            {cam.name && cam.name !== cam.code && (
                              <span className="truncate max-w-[140px]">({cam.name})</span>
                            )}
                          </Link>

                          {zoneName && (
                            <span className="flex items-center gap-1">
                              <Layers className="h-3 w-3 text-accent/70 shrink-0" />
                              <span>{zoneName}</span>
                            </span>
                          )}

                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                            <span>{formattedDate}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Lifecycle Actions */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0 justify-end pt-2 sm:pt-0 border-t border-border/20 sm:border-0">
                      {canReview && incident.status === "PENDING_REVIEW" && (
                        <button
                          type="button"
                          onClick={() => setReviewTarget(incident)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition shadow-sm"
                        >
                          <CheckSquare className="h-3.5 w-3.5 shrink-0" />
                          <span>{t("incidents.actions.review")}</span>
                        </button>
                      )}

                      {canManage &&
                        incident.status !== "DISMISSED" &&
                        incident.status !== "CLOSED" && (
                          <button
                            type="button"
                            onClick={() => setAssignTarget(incident)}
                            className="inline-flex items-center gap-1 rounded-xl border border-border/40 bg-surface-elevated px-2.5 py-1.5 text-xs font-semibold text-foreground hover:border-primary hover:text-primary transition"
                          >
                            <UserPlus className="h-3.5 w-3.5 shrink-0" />
                            <span>{isVietnamese ? "Phân công" : "Assign"}</span>
                          </button>
                        )}

                      {canUpdate && incident.status === "CONFIRMED" && (
                        <button
                          type="button"
                          onClick={() => setResolveTarget(incident)}
                          className="inline-flex items-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-500/20 transition"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          <span>{isVietnamese ? "Khắc phục" : "Resolve"}</span>
                        </button>
                      )}

                      {canManage && incident.status === "RESOLVED" && (
                        <button
                          type="button"
                          onClick={() => setCloseTarget(incident)}
                          className="inline-flex items-center gap-1 rounded-xl border border-border/40 bg-surface-elevated px-2.5 py-1.5 text-xs font-semibold text-foreground hover:border-primary transition"
                        >
                          <span>{isVietnamese ? "Đóng hồ sơ" : "Close"}</span>
                        </button>
                      )}

                      <Link
                        href={`/incidents/${incident.id}`}
                        className="flex items-center gap-1.5 rounded-xl border border-border/40 bg-surface-elevated px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary hover:text-primary transition shadow-sm"
                      >
                        <Eye className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>{isVietnamese ? "Chi tiết" : "Details"}</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {(totalCount > 0 || Boolean(error)) && (
            <Table
              data={[]}
              columns={[]}
              manualPagination
              rowCount={totalCount}
              pageCount={totalPages}
              pagination={tableState.pagination}
              onPaginationChange={tableState.onPaginationChange}
              loading={isLoading}
              fetching={isFetching}
              error={error}
              onRetry={() => void refetch()}
              features={{
                globalFilter: false,
                sorting: false,
                rowSelection: false,
                columnVisibility: false,
                pagination: true,
              }}
            >
              <TablePagination pageSizeOptions={[10, 20, 50]} />
            </Table>
          )}
        </div>
      )}

      {/* Quick Review Modal */}
      <ReviewIncidentModal
        open={Boolean(reviewTarget)}
        onOpenChange={(open) => {
          if (!open) setReviewTarget(null);
        }}
        incident={reviewTarget}
        loading={reviewMutation.isPending}
        onSubmit={async (id, payload) => {
          await reviewMutation.mutateAsync({ id, payload });
          setReviewTarget(null);
        }}
      />

      {/* Resolve Incident Modal */}
      <ResolveIncidentModal
        open={Boolean(resolveTarget)}
        onOpenChange={(open) => {
          if (!open) setResolveTarget(null);
        }}
        incident={resolveTarget}
        loading={resolveMutation.isPending}
        onSubmit={async (id, payload) => {
          await resolveMutation.mutateAsync({ id, payload });
          setResolveTarget(null);
        }}
      />

      {/* Close Incident Dialog */}
      <CloseIncidentDialog
        open={Boolean(closeTarget)}
        onOpenChange={(open) => {
          if (!open) setCloseTarget(null);
        }}
        incident={closeTarget}
        loading={closeMutation.isPending}
        onConfirm={async (id, payload) => {
          await closeMutation.mutateAsync({ id, payload });
          setCloseTarget(null);
        }}
      />

      {/* Assign Officer Modal */}
      <AssignIncidentModal
        open={Boolean(assignTarget)}
        onOpenChange={(open) => {
          if (!open) setAssignTarget(null);
        }}
        incident={assignTarget}
        loading={assignMutation.isPending}
        onSubmit={async (incidentId, payload) => {
          await assignMutation.mutateAsync({ incidentId, payload });
          setAssignTarget(null);
        }}
      />

      {/* Batch Reject Reason Modal (BE requires resolutionNote >= 3 chars) */}
      <Modal
        open={batchRejectOpen}
        onOpenChange={setBatchRejectOpen}
        title={
          isVietnamese
            ? `Bác bỏ hàng loạt ${pendingSelectedIds.length} sự cố`
            : `Dismiss ${pendingSelectedIds.length} Selected Incidents`
        }
        description={
          isVietnamese
            ? "Nhập lý do bác bỏ cảnh báo giả cho các sự cố đang chọn."
            : "Provide a dismissal reason for the selected alerts."
        }
        preventClose={batchReviewMutation.isPending}
        size="sm"
        footer={
          <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-2.5">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setBatchRejectOpen(false)}
              disabled={batchReviewMutation.isPending}
              className="w-full sm:w-auto"
            >
              {t("common.cancel")}
            </Button>
            <Button
              form="site-batch-reject-form"
              type="submit"
              variant="danger"
              disabled={batchReviewMutation.isPending}
              className="w-full sm:w-auto"
            >
              {isVietnamese ? "Xác nhận bác bỏ" : "Confirm Dismiss"}
            </Button>
          </div>
        }
      >
        <form id="site-batch-reject-form" onSubmit={handleBatchRejectSubmit} className="space-y-3">
          {batchRejectError && (
            <div className="rounded-xl border border-danger/30 bg-danger/10 p-2.5 text-xs text-danger break-words">
              {batchRejectError}
            </div>
          )}
          <textarea
            value={batchRejectNote}
            onChange={(e) => setBatchRejectNote(e.target.value)}
            rows={3}
            placeholder={
              isVietnamese
                ? "VD: Báo động giả do ánh sáng / góc khuất camera..."
                : "e.g.: False alarm caused by lighting / occlusion..."
            }
            className="w-full resize-none rounded-xl border border-border/40 bg-background p-3 text-xs sm:text-sm text-foreground focus:border-danger focus:outline-none"
            required
          />
        </form>
      </Modal>
    </div>
  );
}
