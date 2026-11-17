"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { mapTableSort } from "@/lib/table-utils";
import { useTableState } from "@/hooks/use-table-state";
import { useDebounce } from "@/hooks/use-debounce";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
  UserCheck,
} from "lucide-react";
import { PageHeader } from "@/components/features/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useLocale } from "@/providers/locale-provider";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtime } from "@/contexts/RealtimeContext";
import { incidentKeys } from "@/hooks/incidents/incident.query-keys";
import { reportingKeys } from "@/hooks/reporting/reporting.query-keys";
import { toast } from "@/lib/toast";
import { incidentService } from "@/services/incident.service";
import {
  dispatchIncidentsWithSignal,
  resolveIncidentsWithReport,
} from "@/lib/incident-actions";
import {
  isIncidentAssignedToUser,
  runInBatches,
} from "@/lib/incident-workflow";
import {
  IncidentKpiSummary,
  IncidentFilterToolbar,
  IncidentTable,
  ReviewIncidentModal,
  AssignIncidentModal,
  ResolveIncidentModal,
  CloseIncidentDialog,
  CreateIncidentModal,
  EditIncidentModal,
  BatchDispatchModal,
  BatchResolveModal,
  type IncidentStatKey,
} from "@/components/features/incidents";
import {
  useIncidents,
  useIncidentStatusCounts,
  useCreateIncident,
  useUpdateIncident,
  useReviewIncident,
  useBatchReviewIncidents,
  useAssignOfficer,
  useResolveIncident,
  useCloseIncident,
  useDeleteIncident,
} from "@/hooks";
import { useCan } from "@/hooks/use-can";
import { useSite } from "@/contexts/SiteContext";
import type { IncidentItem, IncidentQueryParams } from "@/types";

const STAT_TO_URL: Record<IncidentStatKey, string> = {
  total: "total",
  pendingReview: "pending-review",
  critical: "critical",
  resolved: "resolved",
};

const URL_TO_STAT: Record<string, IncidentStatKey> = {
  total: "total",
  "pending-review": "pendingReview",
  pendingReview: "pendingReview",
  critical: "critical",
  resolved: "resolved",
};

export default function IncidentsContent() {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { siteId: globalSiteId, setSiteId: setGlobalSiteId } = useSite();
  const { user } = useAuth();
  const { lastAlert, isConnected } = useRealtime();
  const isOfficerRole = (user?.role || "").toUpperCase() === "SAFETY_OFFICER";
  const [assignedToMeOnly, setAssignedToMeOnly] = useState(false);

  const urlCameraId = searchParams.get("cameraId") || "";
  const urlSiteId = searchParams.get("siteId") || "";
  const fromDate = searchParams.get("fromDate") || undefined;
  const toDate = searchParams.get("toDate") || undefined;

  // URL state synchronization for stats
  const statParam = searchParams.get("stat");
  const statusParam = searchParams.get("status");
  const selectedStat = statParam && URL_TO_STAT[statParam] ? URL_TO_STAT[statParam] : null;

  // Filter States: Ưu tiên giá trị từ URL, nếu không có URL thì lấy từ Header globalSiteId
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("status") || (selectedStat === "pendingReview"
      ? "PENDING_REVIEW"
      : selectedStat === "resolved"
        ? "RESOLVED"
        : "")
  );
  const [severityFilter, setSeverityFilter] = useState(
    selectedStat === "critical" ? "CRITICAL" : ""
  );
  const [violationFilter, setViolationFilter] = useState("");
  const [cameraIdFilter, setCameraIdFilter] = useState(urlCameraId);
  const [siteIdFilter, setSiteIdFilter] = useState(searchParams.has("siteId") ? urlSiteId : globalSiteId || "");
  const [highlightedIncidentId, setHighlightedIncidentId] = useState<string | null>(null);

  // Đồng bộ chọn thẻ KPI với bộ lọc bảng
  const handleSelectStat = (stat: IncidentStatKey | null) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("status");
    if (stat) {
      params.set("stat", STAT_TO_URL[stat]);
    } else {
      params.delete("stat");
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });

    // Tự động lọc bảng theo thẻ KPI được click để dữ liệu hiển thị tức thì, nhất quán
    setPage(1);
    if (stat === "pendingReview") {
      setStatusFilter("PENDING_REVIEW");
      setSeverityFilter("");
    } else if (stat === "critical") {
      setStatusFilter("");
      setSeverityFilter("CRITICAL");
    } else if (stat === "resolved") {
      setStatusFilter("RESOLVED");
      setSeverityFilter("");
    } else {
      // total hoặc null (thu gọn)
      setStatusFilter("");
      setSeverityFilter("");
    }
  };

  // Chuyển đổi công trường: đồng bộ cả state, URL lẫn Header Global SiteContext
  const handleSiteFilterChange = (val: string) => {
    setSiteIdFilter(val);
    setCameraIdFilter("");
    setPage(1);

    // Đồng bộ đồng thời với Header (nếu val rỗng thì chọn Tất cả công trường)
    setGlobalSiteId(val || null);

    const params = new URLSearchParams(searchParams.toString());
    if (val) {
      params.set("siteId", val);
    } else {
      params.set("siteId", "");
    }
    params.delete("cameraId");
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };

  // Sync state khi searchParams của URL thay đổi (Back / Forward navigation)
  useEffect(() => {
    const paramCamera = searchParams.get("cameraId") || "";
    setCameraIdFilter(paramCamera);
    const paramSite = searchParams.has("siteId") ? searchParams.get("siteId") || "" : globalSiteId || "";
    if (paramSite !== siteIdFilter) {
      setSiteIdFilter(paramSite);
    }
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    setStatusFilter(statusParam || (statParam === "pending-review" || statParam === "pendingReview" ? "PENDING_REVIEW" : statParam === "resolved" ? "RESOLVED" : ""));
    setSeverityFilter(statParam === "critical" ? "CRITICAL" : "");
    setPage(1);
  }, [statusParam, statParam]);

  // Đồng bộ với Global Site Selector khi người dùng đổi site từ Header
  useEffect(() => {
    if (!searchParams.has("siteId") && (globalSiteId || "") !== siteIdFilter) {
      setSiteIdFilter(globalSiteId || "");
      setCameraIdFilter("");
      setPage(1);
    }
  }, [globalSiteId, searchParams, siteIdFilter]);

  const tableState = useTableState([{ id: "detectedAt", desc: true }], `${search}:${statusFilter}:${severityFilter}:${violationFilter}:${siteIdFilter}:${cameraIdFilter}:${fromDate}:${toDate}`);
  const apiSorting = mapTableSort(tableState.sorting, { detectedAt: "detectedAt", createdAt: "createdAt", severity: "severity", status: "status" }, { sortBy: "detectedAt", order: "desc" });
  const debouncedSearch = useDebounce(search, 350);
  // Query Params
  const queryParams: IncidentQueryParams = {
    page,
    limit,
    search: debouncedSearch.trim() || undefined,
    status: statusFilter || undefined,
    severity: severityFilter || undefined,
    violationType: violationFilter || undefined,
    siteId: siteIdFilter || undefined,
    cameraId: cameraIdFilter || undefined,
    fromDate,
    toDate,
    sortBy: apiSorting.sortBy,
    sortOrder: apiSorting.order,

  };

  const { data: incidentData, isLoading, refetch, isRefetching, error } = useIncidents(queryParams);
  const incidents = incidentData?.items || [];
  const meta = incidentData?.meta;

  const displayedIncidents = useMemo(() => {
    if (!assignedToMeOnly || !user?.id) return incidents;
    return incidents.filter((inc) => isIncidentAssignedToUser(inc, user.id));
  }, [assignedToMeOnly, incidents, user?.id]);

  // Tự động làm mới dữ liệu thời gian thực khi AI Camera phát hiện vi phạm PPE mới
  useEffect(() => {
    if (!lastAlert) return;
    if (
      lastAlert.type === "notification:ppe_violation" ||
      lastAlert.type === "notification:new"
    ) {
      queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });

      const alertData = lastAlert.data as Record<string, unknown> | undefined;
      const newId = (alertData?.incidentId as string) || (alertData?.id as string);
      if (newId) {
        setHighlightedIncidentId(newId);
        const timer = setTimeout(() => setHighlightedIncidentId(null), 8000);
        return () => clearTimeout(timer);
      }
    }
  }, [lastAlert, queryClient]);

  // KPI summary nhẹ từ /incidents/status-counts (không fetch 100 bản ghi dư thừa khi chưa mở rộng)
  const { data: statusCounts, isLoading: statusCountsLoading } =
    useIncidentStatusCounts({
      siteId: siteIdFilter || undefined,
      cameraId: cameraIdFilter || undefined,
      fromDate,
      toDate,
    });

  // Chỉ lazy-load 100 bản ghi chi tiết khi người dùng mở rộng một thẻ KPI để xem breakdown
  const { data: statsOverviewData, isLoading: overviewLoading } = useIncidents(
    {
      siteId: siteIdFilter || undefined,
      cameraId: cameraIdFilter || undefined,
      limit: 100,
      fromDate,
      toDate,
    },
    { enabled: Boolean(selectedStat) },
  );
  const overviewIncidents = statsOverviewData?.items || incidents;

  // Mutations
  const can = useCan();
  const canCreateIncident = can("PPE_INCIDENT_MANAGE");
  const canCloseIncident = can("PPE_INCIDENT_MANAGE");
  const createMutation = useCreateIncident();
  const updateMutation = useUpdateIncident();
  const reviewMutation = useReviewIncident();
  const batchReviewMutation = useBatchReviewIncidents();
  const closeMutation = useCloseIncident();
  const deleteMutation = useDeleteIncident();

  // Modals state
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isResolveOpen, setIsResolveOpen] = useState(false);
  const [isCloseOpen, setIsCloseOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [batchRejectIds, setBatchRejectIds] = useState<string[] | null>(null);
  const [batchRejectNote, setBatchRejectNote] = useState("");
  const [batchRejectError, setBatchRejectError] = useState<string | null>(null);
  const [batchDispatchItems, setBatchDispatchItems] = useState<IncidentItem[] | null>(null);
  const [batchResolveItems, setBatchResolveItems] = useState<IncidentItem[] | null>(null);
  const [batchActionPending, setBatchActionPending] = useState(false);
  const [singleActionPending, setSingleActionPending] = useState(false);

  const invalidateAllIncidentQueries = () => {
    void queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
    void queryClient.invalidateQueries({ queryKey: incidentKeys.statusCountsRoot() });
    void queryClient.invalidateQueries({ queryKey: reportingKeys.all });
  };

  // Actions
  const handleOpenReview = (incident: IncidentItem) => {
    setSelectedIncident(incident);
    setIsReviewOpen(true);
  };

  const handleBatchReview = async (
    ids: string[],
    action: "CONFIRM" | "REJECT"
  ) => {
    if (action === "REJECT") {
      setBatchRejectIds(ids);
      setBatchRejectNote("");
      setBatchRejectError(null);
      return;
    }
    try {
      await batchReviewMutation.mutateAsync({ ids, action });
    } catch {
      // Handled by onError in hook
    }
  };

  const handleConfirmBatchReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchRejectIds || batchRejectIds.length === 0) return;
    const trimmed = batchRejectNote.trim();
    if (trimmed.length < 3) {
      setBatchRejectError(
        isVietnamese
          ? "Vui lòng nhập lý do bác bỏ (tối thiểu 3 ký tự)."
          : "Please provide a dismissal reason (at least 3 characters).",
      );
      return;
    }
    try {
      await batchReviewMutation.mutateAsync({
        ids: batchRejectIds,
        action: "REJECT",
        resolutionNote: trimmed,
      });
      setBatchRejectIds(null);
      setBatchRejectNote("");
      setBatchRejectError(null);
    } catch {
      // Handled by onError in hook
    }
  };

  const handleOpenAssign = (incident: IncidentItem) => {
    setSelectedIncident(incident);
    setIsAssignOpen(true);
  };

  const handleOpenResolve = (incident: IncidentItem) => {
    setSelectedIncident(incident);
    setIsResolveOpen(true);
  };

  const handleOpenClose = (incident: IncidentItem) => {
    setSelectedIncident(incident);
    setIsCloseOpen(true);
  };

  const handleConfirmBatchDispatch = async (payload: {
    assignedTo: string;
    note?: string;
  }) => {
    if (!batchDispatchItems || batchDispatchItems.length === 0) return;
    setBatchActionPending(true);
    try {
      const res = await dispatchIncidentsWithSignal({
        incidents: batchDispatchItems,
        assignedTo: payload.assignedTo,
        note: payload.note,
        managerName: user?.fullName || user?.email || undefined,
      });
      invalidateAllIncidentQueries();
      if (res.assignedCount > 0) {
        toast.success(
          isVietnamese
            ? `Đã duyệt & giao ${res.assignedCount} sự cố cho cán bộ${res.signalSent ? " (đã gửi 1 tín hiệu điều phối)" : ""}.`
            : `Confirmed & dispatched ${res.assignedCount} incidents${res.signalSent ? " (1 signal sent)" : ""}.`,
        );
      }
      if (res.failedCount > 0) {
        toast.error(
          isVietnamese
            ? `${res.failedCount} sự cố chưa thể phân công.`
            : `${res.failedCount} incidents failed to assign.`,
        );
      }
      setBatchDispatchItems(null);
    } finally {
      setBatchActionPending(false);
    }
  };

  const handleConfirmBatchResolve = async (payload: {
    resolutionNote: string;
    afterFixFile?: File | null;
    closeImmediately?: boolean;
  }) => {
    if (!batchResolveItems || batchResolveItems.length === 0) return;
    setBatchActionPending(true);
    try {
      const res = await resolveIncidentsWithReport({
        incidents: batchResolveItems,
        resolutionNote: payload.resolutionNote,
        afterFixFile: payload.afterFixFile,
        closeImmediately: payload.closeImmediately,
        officerName: user?.fullName || user?.email || undefined,
      });
      invalidateAllIncidentQueries();
      if (res.resolvedCount > 0) {
        toast.success(
          res.closedCount > 0
            ? isVietnamese
              ? `Đã khắc phục & đóng ${res.closedCount} sự cố.`
              : `Resolved & closed ${res.closedCount} incidents.`
            : isVietnamese
              ? `Đã báo cáo khắc phục ${res.resolvedCount} sự cố${res.reportSignalSent ? " và gửi tín hiệu tới Quản lý" : ""}.`
              : `Reported remediation for ${res.resolvedCount} incidents.`,
        );
      }
      if (res.failedCount > 0) {
        toast.error(
          isVietnamese
            ? `${res.failedCount} sự cố chưa thể cập nhật (kiểm tra quyền phân công).`
            : `${res.failedCount} incidents failed to resolve.`,
        );
      }
      setBatchResolveItems(null);
    } finally {
      setBatchActionPending(false);
    }
  };

  const handleBatchClose = async (items: IncidentItem[]) => {
    if (items.length === 0) return;
    setBatchActionPending(true);
    try {
      const { succeeded, failed } = await runInBatches(items, 4, (inc) =>
        incidentService.closeIncident(inc.id, {}),
      );
      invalidateAllIncidentQueries();
      if (succeeded.length > 0) {
        toast.success(
          isVietnamese
            ? `Đã nghiệm thu và đóng ${succeeded.length} hồ sơ sự cố.`
            : `Accepted and closed ${succeeded.length} incidents.`,
        );
      }
      if (failed.length > 0) {
        toast.error(
          isVietnamese
            ? `${failed.length} sự cố chưa thể đóng.`
            : `${failed.length} incidents failed to close.`,
        );
      }
    } finally {
      setBatchActionPending(false);
    }
  };

  const handleOpenEdit = (incident: IncidentItem) => {
    setSelectedIncident(incident);
    setIsEditOpen(true);
  };

  const handleOpenDelete = (incident: IncidentItem) => {
    setSelectedIncident(incident);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedIncident) return;
    try {
      await deleteMutation.mutateAsync(selectedIncident.id);
      setIsDeleteOpen(false);
      setSelectedIncident(null);
    } catch {
      // Handled by onError in hook
    }
  };

  const toolbar = (<IncidentFilterToolbar

    search={search}

    onSearchChange={(val) => {
      setSearch(val);
      setPage(1);
    }}

    siteFilter={siteIdFilter}

    onSiteFilterChange={handleSiteFilterChange}

    cameraIdFilter={cameraIdFilter}

    onCameraIdFilterChange={(val) => {
      setCameraIdFilter(val);
      setPage(1);
      const params = new URLSearchParams(searchParams.toString());
      if (val) {
        params.set("cameraId", val);
      } else {
        params.delete("cameraId");
      }
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    }}

    statusFilter={statusFilter}

    onStatusFilterChange={(val) => {
      setStatusFilter(val);
      setPage(1);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("stat");
      if (val) params.set("status", val); else params.delete("status");
      router.replace(`${pathname}?${params}`, { scroll: false });
    }}

    severityFilter={severityFilter}

    onSeverityFilterChange={(val) => {
      setSeverityFilter(val);
      setPage(1);
    }}

    violationFilter={violationFilter}

    onViolationFilterChange={(val) => {
      setViolationFilter(val);
      setPage(1);
    }}

    onRefresh={() => refetch()}

    isRefreshing={isRefetching}

    onResetFilters={() => {
      setPage(1);
      setSearch("");
      setStatusFilter("");
      setSeverityFilter("");
      setViolationFilter("");
      setCameraIdFilter("");
      setSiteIdFilter("");
      setGlobalSiteId(null);
      router.replace(`${pathname}?siteId=`, { scroll: false });
    }}

  />);

  return (
    <div className="space-y-6">
      {(fromDate || toDate) && <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/30 bg-surface p-3 text-xs">
        <span>{isVietnamese ? "Theo thời điểm phát hiện (giờ Việt Nam):" : "By detection time (Vietnam time):"} {fromDate && Number.isFinite(Date.parse(fromDate)) ? new Intl.DateTimeFormat(locale, { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "medium" }).format(new Date(fromDate)) : "—"} → {toDate && Number.isFinite(Date.parse(toDate)) ? new Intl.DateTimeFormat(locale, { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "medium" }).format(new Date(toDate)) : "—"}</span>
        <button type="button" className="font-semibold text-primary" onClick={() => { const params = new URLSearchParams(searchParams.toString()); params.delete("fromDate"); params.delete("toDate"); router.replace(`${pathname}?${params}`, { scroll: false }); }}>{isVietnamese ? "Bỏ lọc ngày" : "Clear date filter"}</button>
      </div>}
      {/* Page Header */}
      <PageHeader

        icon={ShieldAlert}

        title={t("incidents.title")}

        description={t("incidents.description")}

        badge={isVietnamese ? "Giám sát An toàn PPE" : "PPE Safety Monitoring"}

        badgeIcon={ShieldAlert}

        actions={
          <div className="flex items-center gap-2">
            <span
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${isConnected
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                }`}
              title={
                isConnected
                  ? (isVietnamese ? "Đang kết nối nhận diện vi phạm tự động thời gian thực" : "Connected to realtime incident detection stream")
                  : (isVietnamese ? "Đang duy trì kiểm tra định kỳ (15s)" : "Maintaining polling (15s)")
              }
            >
              <span
                className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                  }`}
              />
              <span className="font-mono text-[11px]">
                {isConnected ? "Realtime Active" : "Polling (15s)"}
              </span>
            </span>
            <Button
              type="button"
              variant={assignedToMeOnly ? "primary" : "outline"}
              onClick={() => setAssignedToMeOnly((v) => !v)}
              className="gap-1.5"
              title={
                isVietnamese
                  ? "Lọc các sự cố đang được phân công cho tài khoản của bạn"
                  : "Filter incidents assigned to your account"
              }
            >
              <UserCheck className="h-4 w-4" />
              <span>
                {isOfficerRole
                  ? isVietnamese
                    ? "Việc được giao cho tôi"
                    : "Assigned to Me"
                  : isVietnamese
                    ? "Việc của tôi"
                    : "My Tasks"}
              </span>
            </Button>
            <Button

              variant="ghost"

              onClick={() => refetch()}

              disabled={isLoading || isRefetching}

              className="gap-2"

            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
              <span>{t("common.refresh")}</span>
            </Button>
            {canCreateIncident && (
              <Button
                variant="primary"
                onClick={() => setIsCreateOpen(true)}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>{isVietnamese ? "Báo cáo Sự cố" : "Report Incident"}</span>
              </Button>
            )}
          </div>
        }

      />

      {/* KPI Overview (Chuẩn Bento, click mở rộng khung chi tiết & tự động lọc bảng) */}
      <IncidentKpiSummary

        incidents={overviewIncidents}

        totalIncidentsCount={meta?.total ?? overviewIncidents.length}

        statusCounts={statusCounts}

        loading={statusCountsLoading}

        detailLoading={overviewLoading}

        selectedStat={selectedStat}

        onSelectStat={handleSelectStat}

        onReview={handleOpenReview}

        onAssign={handleOpenAssign}

        onResolve={handleOpenResolve}

        onFilterStatus={(val) => {
          setStatusFilter(val);
          setPage(1);
        }}

        onFilterSeverity={(val) => {
          setSeverityFilter(val);
          setPage(1);
        }}

        onFilterViolation={(val) => {
          setViolationFilter(val);
          setPage(1);
        }}

        onFilterSite={handleSiteFilterChange}

      />

      {/* Filter Toolbar (Thiết kế lại chuẩn Neumorphic, phân tầng Site -> Camera, có Chip lọc hoạt động) */}

      {/* Main Table */}
      <div className="min-w-0">
        <IncidentTable

          incidents={displayedIncidents}

          loading={isLoading}

          highlightedId={highlightedIncidentId}

          onReview={handleOpenReview}

          onBatchReview={handleBatchReview}

          onBatchDispatch={(items) => setBatchDispatchItems(items)}

          onBatchResolve={(items) => setBatchResolveItems(items)}

          onBatchClose={handleBatchClose}

          batchReviewPending={batchReviewMutation.isPending}

          batchActionPending={batchActionPending}

          onAssign={handleOpenAssign}

          onResolve={handleOpenResolve}

          onClose={handleOpenClose}

          onEdit={handleOpenEdit}

          onDelete={handleOpenDelete}

          onFilterSite={handleSiteFilterChange}

          tableState={{
            ...tableState,
            manualPagination: true,
            manualFiltering: true,
            manualSorting: true,
            features: {
              sorting: true,
              globalFilter: false,
              rowSelection: true
            },
            pagination: { pageIndex: page - 1, pageSize: limit },
            onPaginationChange: update => {
              const next = typeof update === "function" ? update({ pageIndex: page - 1, pageSize: limit }) : update;
              setPage(next.pageIndex + 1);
              setLimit(next.pageSize);
            },
            rowCount: meta?.total ?? incidents.length,
            pageCount: meta?.totalPages ?? 1,
            fetching: isRefetching,
            error,
            onRetry: () => {
              void refetch();
            },
            toolbar
          }}

        />

        {/* Pagination */}

      </div>

      {/* Modals & Dialogs */}
      <ReviewIncidentModal

        open={isReviewOpen}

        onOpenChange={setIsReviewOpen}

        incident={selectedIncident}

        loading={reviewMutation.isPending}

        onSubmit={async (id, payload) => {
          await reviewMutation.mutateAsync({ id, payload });
        }}

      />

      <AssignIncidentModal

        open={isAssignOpen}

        onOpenChange={setIsAssignOpen}

        incident={selectedIncident}

        loading={singleActionPending}

        onSubmit={async (_incidentId, payload) => {
          if (!selectedIncident) return;
          const targetId = payload.assignedTo || payload.assignedToUserId || "";
          setSingleActionPending(true);
          try {
            const res = await dispatchIncidentsWithSignal({
              incidents: [selectedIncident],
              assignedTo: targetId,
              note: payload.note,
              managerName: user?.fullName || user?.email || undefined,
            });
            invalidateAllIncidentQueries();
            if (res.assignedCount > 0) {
              toast.success(
                isVietnamese
                  ? `Đã phân công & phát tín hiệu xử lý cho sự cố #${selectedIncident.id.slice(0, 8)}.`
                  : `Dispatched incident #${selectedIncident.id.slice(0, 8)} to officer.`,
              );
            }
          } finally {
            setSingleActionPending(false);
          }
        }}

      />

      <ResolveIncidentModal

        open={isResolveOpen}

        onOpenChange={setIsResolveOpen}

        incident={selectedIncident}

        loading={singleActionPending}

        canClose={canCloseIncident}

        onSubmit={async (_id, payload) => {
          if (!selectedIncident) return;
          setSingleActionPending(true);
          try {
            const res = await resolveIncidentsWithReport({
              incidents: [selectedIncident],
              resolutionNote: payload.resolutionNote,
              afterFixFile: payload.afterFixFile,
              closeImmediately: payload.closeImmediately,
              officerName: user?.fullName || user?.email || undefined,
            });
            invalidateAllIncidentQueries();
            if (res.resolvedCount > 0) {
              toast.success(
                res.closedCount > 0
                  ? isVietnamese
                    ? "Đã xác nhận khắc phục và đóng hồ sơ sự cố."
                    : "Incident resolved and closed."
                  : isVietnamese
                    ? "Đã gửi báo cáo khắc phục tới Quản lý chờ nghiệm thu."
                    : "Remediation report sent to Manager.",
              );
            } else if (res.failedCount > 0) {
              throw new Error(
                isVietnamese
                  ? "Không thể báo cáo khắc phục (kiểm tra quyền phân công)."
                  : "Unable to resolve incident.",
              );
            }
          } finally {
            setSingleActionPending(false);
          }
        }}

      />

      <BatchDispatchModal
        open={Boolean(batchDispatchItems?.length)}
        onOpenChange={(open) => {
          if (!open) setBatchDispatchItems(null);
        }}
        incidents={batchDispatchItems || []}
        loading={batchActionPending}
        onSubmit={handleConfirmBatchDispatch}
      />

      <BatchResolveModal
        open={Boolean(batchResolveItems?.length)}
        onOpenChange={(open) => {
          if (!open) setBatchResolveItems(null);
        }}
        incidents={batchResolveItems || []}
        loading={batchActionPending}
        canClose={canCloseIncident}
        onSubmit={handleConfirmBatchResolve}
      />

      <CloseIncidentDialog

        open={isCloseOpen}

        onOpenChange={setIsCloseOpen}

        incident={selectedIncident}

        loading={closeMutation.isPending}

        onConfirm={async (id, payload) => {
          await closeMutation.mutateAsync({ id, payload });
        }}

      />

      <Dialog
        open={Boolean(batchRejectIds?.length)}
        onOpenChange={(open) => {
          if (!open) {
            setBatchRejectIds(null);
            setBatchRejectNote("");
            setBatchRejectError(null);
          }
        }}
        title={
          isVietnamese
            ? `Bác bỏ hàng loạt (${batchRejectIds?.length ?? 0} sự cố)`
            : `Batch Dismiss (${batchRejectIds?.length ?? 0} incidents)`
        }
        description={
          isVietnamese
            ? "Bắt buộc nhập lý do bác bỏ (tối thiểu 3 ký tự) theo quy chuẩn kiểm toán an toàn."
            : "A dismissal reason (minimum 3 characters) is required for safety audit compliance."
        }
      >
        <form onSubmit={handleConfirmBatchReject} className="space-y-4 pt-2">
          {batchRejectError && (
            <p className="rounded-xl border border-danger/30 bg-danger/10 p-2.5 text-xs text-danger">
              {batchRejectError}
            </p>
          )}
          <textarea
            rows={3}
            value={batchRejectNote}
            onChange={(e) => setBatchRejectNote(e.target.value)}
            placeholder={
              isVietnamese
                ? "Ví dụ: Ánh sáng phản chiếu / nhận diện nhầm vật thể..."
                : "Example: Light reflection / false object detection..."
            }
            className="w-full rounded-xl border border-border/50 bg-background p-3 text-xs text-foreground focus:border-primary focus:outline-none"
          />
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setBatchRejectIds(null)}
              disabled={batchReviewMutation.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={batchReviewMutation.isPending}
            >
              {isVietnamese ? "Xác nhận bác bỏ" : "Confirm Dismiss"}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog

        open={isDeleteOpen}

        onOpenChange={setIsDeleteOpen}

        title={t("incidents.actions.delete")}

        description={
          isVietnamese
            ? `Bạn có chắc chắn muốn xóa vĩnh viễn sự cố vi phạm #${selectedIncident?.id.slice(0, 8)}? Hành động này không thể hoàn tác.`
            : `Are you sure you want to permanently delete incident #${selectedIncident?.id.slice(0, 8)}? This action cannot be undone.`
        }

      >
        <div className="flex items-center justify-end gap-3 pt-4">
          <Button

            type="button"

            variant="ghost"

            onClick={() => setIsDeleteOpen(false)}

            disabled={deleteMutation.isPending}

          >
            {t("common.cancel")}
          </Button>
          <Button

            type="button"

            variant="danger"

            onClick={handleDeleteConfirm}

            disabled={deleteMutation.isPending}

            className="gap-2"

          >
            <Trash2 className="h-4 w-4" />
            {t("common.delete")}
          </Button>
        </div>
      </Dialog>

      <CreateIncidentModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        defaultSiteId={siteIdFilter}
        loading={createMutation.isPending}
        onSubmit={async (payload) => {
          await createMutation.mutateAsync(payload);
        }}
      />

      <EditIncidentModal
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        incident={selectedIncident}
        loading={updateMutation.isPending}
        onSubmit={async (id, payload) => {
          await updateMutation.mutateAsync({ id, payload });
        }}
      />
    </div>
  );
}
