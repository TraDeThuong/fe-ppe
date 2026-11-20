"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { mapTableSort } from "@/lib/table-utils";
import { useTableState } from "@/hooks/use-table-state";
import { useDebounce } from "@/hooks/use-debounce";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
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
  type DispatchIncidentsResult,
} from "@/lib/incident-actions";
import { IncidentDispatchResultPanel } from "@/components/features/incidents/incident-dispatch-result-panel";
import { runInBatches } from "@/lib/incident-workflow";
import {
  IncidentConsoleHeader,
  IncidentKpiSummary,
  IncidentAssignmentOverviewCard,
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
  useHydratedIncidents,
  useIncidentStatusCounts,
  useNotifications,
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
import { useEntityLookup } from "@/hooks/use-entity-lookup";
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
  const { getSiteName } = useEntityLookup();
  const { user } = useAuth();
  const { lastAlert, isConnected } = useRealtime();
  const isOfficerRole = (user?.role || "").toUpperCase() === "SAFETY_OFFICER";

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
  const rawIncidents = useMemo(() => incidentData?.items || [], [incidentData?.items]);
  const meta = incidentData?.meta;

  // Tự động làm mới dữ liệu thời gian thực (debounce 1.5s để tránh bão request khi AI bắn nhiều cảnh báo liên tiếp)
  useEffect(() => {
    if (!lastAlert) return;
    if (
      lastAlert.type === "notification:ppe_violation" ||
      lastAlert.type === "notification:new"
    ) {
      const invalidateTimer = setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
      }, 1500);

      const alertData = lastAlert.data as Record<string, unknown> | undefined;
      const newId = (alertData?.incidentId as string) || (alertData?.id as string);
      let highlightTimer: ReturnType<typeof setTimeout> | undefined;
      if (newId) {
        setHighlightedIncidentId(newId);
        highlightTimer = setTimeout(() => setHighlightedIncidentId(null), 8000);
      }

      return () => {
        clearTimeout(invalidateTimer);
        if (highlightTimer) clearTimeout(highlightTimer);
      };
    }
  }, [lastAlert, queryClient]);

  // KPI summary nhẹ từ /incidents/status-counts
  const { data: statusCounts, isLoading: statusCountsLoading } =
    useIncidentStatusCounts({
      siteId: siteIdFilter || undefined,
      cameraId: cameraIdFilter || undefined,
      fromDate,
      toDate,
    });

  // Tải 100 bản ghi tổng quan cho Card Điều phối & KPI Breakdown (không polling nền 15s, chia sẻ cache với /incidents/assignments)
  const { data: statsOverviewData, isLoading: overviewLoading } = useIncidents(
    {
      page: 1,
      siteId: siteIdFilter || undefined,
      cameraId: cameraIdFilter || undefined,
      limit: 100,
      fromDate,
      toDate,
      sortBy: "detectedAt",
      sortOrder: "desc",
    },
    {
      staleTime: 60 * 1000,
      refetchInterval: false,
    },
  );
  const rawOverviewIncidents = useMemo(
    () => statsOverviewData?.items || rawIncidents,
    [statsOverviewData?.items, rawIncidents],
  );

  // Gom 1 lần hydrate duy nhất (ưu tiên các dòng đang hiện trên bảng trước, sau đó đến danh sách tổng quan)
  const combinedRawIncidents = useMemo(() => {
    const seen = new Set<string>();
    const merged: IncidentItem[] = [];
    for (const item of rawIncidents) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        merged.push(item);
      }
    }
    for (const item of rawOverviewIncidents) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        merged.push(item);
      }
    }
    return merged;
  }, [rawIncidents, rawOverviewIncidents]);

  const {
    incidents: hydratedCombinedIncidents,
    isHydratingAssignments: overviewHydrating,
    usersById,
    siteManagersBySiteId,
  } = useHydratedIncidents(combinedRawIncidents, {
    includeClosed: isOfficerRole,
  });

  const hydratedById = useMemo(
    () => new Map(hydratedCombinedIncidents.map((item) => [item.id, item])),
    [hydratedCombinedIncidents],
  );

  const incidents = useMemo(
    () => rawIncidents.map((item) => hydratedById.get(item.id) ?? item),
    [rawIncidents, hydratedById],
  );

  const overviewIncidents = useMemo(
    () => rawOverviewIncidents.map((item) => hydratedById.get(item.id) ?? item),
    [rawOverviewIncidents, hydratedById],
  );

  // Mutations
  const can = useCan();
  const canReadNotifications = can("NOTIFICATION_READ");
  const { data: notificationsData } = useNotifications(
    { page: 1, limit: 100, channel: "IN_APP" },
    { enabled: isOfficerRole && canReadNotifications },
  );
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
  const [dispatchResult, setDispatchResult] = useState<DispatchIncidentsResult | null>(null);
  const [batchResolveItems, setBatchResolveItems] = useState<IncidentItem[] | null>(null);
  const [batchCloseItems, setBatchCloseItems] = useState<IncidentItem[] | null>(null);
  const [batchCloseNote, setBatchCloseNote] = useState("");
  const [batchActionPending, setBatchActionPending] = useState(false);
  const [singleActionPending, setSingleActionPending] = useState(false);

  // Chỉ invalidate danh sách, bộ đếm & đúng các incidentId vừa bị tác động (không xóa sạch cache assignments của 100 hồ sơ khác)
  const invalidateAllIncidentQueries = (affectedIds?: readonly string[]) => {
    void queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
    void queryClient.invalidateQueries({ queryKey: incidentKeys.statusCountsRoot() });
    void queryClient.invalidateQueries({ queryKey: reportingKeys.all });
    if (affectedIds?.length) {
      for (const id of affectedIds) {
        void queryClient.invalidateQueries({ queryKey: incidentKeys.assignments(id) });
        void queryClient.invalidateQueries({ queryKey: incidentKeys.detail(id) });
      }
    }
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
        groupDispatch: true,
        managerId: user?.id,
        assignedTo: payload.assignedTo,
        note: payload.note,
        managerName: user?.fullName || user?.email || undefined,
      });
      setDispatchResult(res);
      invalidateAllIncidentQueries(batchDispatchItems.map((i) => i.id));
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
      invalidateAllIncidentQueries(batchResolveItems.map((i) => i.id));
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

  const handleBatchClose = (items: IncidentItem[]) => {
    if (items.length === 0) return;
    setBatchCloseItems(items);
    setBatchCloseNote("");
  };

  const handleConfirmBatchClose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchCloseItems || batchCloseItems.length === 0) return;
    setBatchActionPending(true);
    try {
      const closeNote =
        batchCloseNote.trim() ||
        (isVietnamese
          ? "Nghiệm thu và đóng hồ sơ sự cố an toàn (hàng loạt)"
          : "Batch accepted and closed safety incident records");
      const { succeeded, failed } = await runInBatches(batchCloseItems, 4, (inc) =>
        incidentService.closeIncident(inc.id, { closeNote }),
      );
      const closedIds = batchCloseItems.map((i) => i.id);
      setBatchCloseItems(null);
      setBatchCloseNote("");
      invalidateAllIncidentQueries(closedIds);
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
      {dispatchResult && <IncidentDispatchResultPanel result={dispatchResult} onChange={setDispatchResult} onRetryFailed={async (ids) => {
        const fetched = await runInBatches(ids, 4, (id) => incidentService.getIncidentById(id));
        const eligible = fetched.succeeded.filter((incident) => incident.status === "PENDING_REVIEW" || incident.status === "CONFIRMED");
        if (!eligible.length) throw new Error(isVietnamese ? "Không còn hồ sơ đủ điều kiện để giao lại." : "No records remain eligible for assignment.");
        if (fetched.failed.length) toast.error(isVietnamese ? `${fetched.failed.length} hồ sơ chưa tải được; chưa đưa vào lần thử lại.` : `${fetched.failed.length} records could not be loaded and are excluded from this retry.`);
        setBatchDispatchItems(eligible);
      }} />}
      {(fromDate || toDate) && <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/30 bg-surface p-3 text-xs">
        <span>{isVietnamese ? "Theo thời điểm phát hiện (giờ Việt Nam):" : "By detection time (Vietnam time):"} {fromDate && Number.isFinite(Date.parse(fromDate)) ? new Intl.DateTimeFormat(locale, { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "medium" }).format(new Date(fromDate)) : "—"} → {toDate && Number.isFinite(Date.parse(toDate)) ? new Intl.DateTimeFormat(locale, { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "medium" }).format(new Date(toDate)) : "—"}</span>
        <button type="button" className="font-semibold text-primary" onClick={() => { const params = new URLSearchParams(searchParams.toString()); params.delete("fromDate"); params.delete("toDate"); router.replace(`${pathname}?${params}`, { scroll: false }); }}>{isVietnamese ? "Bỏ lọc ngày" : "Clear date filter"}</button>
      </div>}
      {/* Console Header (đồng bộ /cameras và /dashboard) */}
      <IncidentConsoleHeader
        isConnected={isConnected}
        isRefreshing={isLoading || isRefetching}
        onRefresh={() => refetch()}
        canCreateIncident={canCreateIncident}
        onCreateIncident={() => setIsCreateOpen(true)}
        siteName={siteIdFilter ? getSiteName(siteIdFilter) : null}
        userRole={user?.role}
        criticalCount={
          statusCounts?.critical ??
          overviewIncidents.filter(
            (i) => i.severity === "CRITICAL" || i.severity === "HIGH",
          ).length
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

        onReview={isOfficerRole ? undefined : handleOpenReview}

        onAssign={isOfficerRole ? undefined : handleOpenAssign}

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

      {/* Card Tổng quan Điều phối & Công việc (Hiển thị chuyên biệt cho 3 phân quyền, click dẫn tới /incidents/assignments) */}
      <IncidentAssignmentOverviewCard
        incidents={overviewIncidents}
        loading={overviewLoading || (isOfficerRole && overviewHydrating)}
        userRole={user?.role}
        userId={user?.id}
        usersById={usersById}
        siteManagersBySiteId={siteManagersBySiteId}
        notifications={notificationsData?.data}
      />

      {/* Filter Toolbar (Thiết kế lại chuẩn Neumorphic, phân tầng Site -> Camera, có Chip lọc hoạt động) */}

      {/* Main Table */}
      <div className="min-w-0">
        <IncidentTable

          incidents={incidents}

          loading={isLoading}

          highlightedId={highlightedIncidentId}

          onReview={isOfficerRole ? undefined : handleOpenReview}

          onBatchReview={isOfficerRole ? undefined : handleBatchReview}

          onBatchDispatch={isOfficerRole ? undefined : (items) => setBatchDispatchItems(items)}

          onBatchResolve={(items) => setBatchResolveItems(items)}

          onBatchClose={isOfficerRole ? undefined : handleBatchClose}

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
            invalidateAllIncidentQueries([selectedIncident.id]);
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
            invalidateAllIncidentQueries([selectedIncident.id]);
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
        open={Boolean(batchCloseItems?.length)}
        onOpenChange={(open) => {
          if (!open) {
            setBatchCloseItems(null);
            setBatchCloseNote("");
          }
        }}
        title={
          isVietnamese
            ? `Nghiệm thu & Đóng hàng loạt (${batchCloseItems?.length ?? 0} hồ sơ)`
            : `Batch Accept & Close (${batchCloseItems?.length ?? 0} records)`
        }
        description={
          isVietnamese
            ? "Sau khi đóng, hồ sơ sự cố sẽ được khóa vĩnh viễn để lưu trữ kiểm toán an toàn."
            : "Once closed, incident records are permanently locked for safety audit archiving."
        }
      >
        <form onSubmit={handleConfirmBatchClose} className="space-y-4 pt-2">
          <textarea
            rows={3}
            value={batchCloseNote}
            onChange={(e) => setBatchCloseNote(e.target.value)}
            placeholder={
              isVietnamese
                ? "Ghi chú nghiệm thu (tùy chọn): Đã kiểm tra ảnh hiện trường sau khắc phục đạt yêu cầu..."
                : "Acceptance note (optional): Verified field remediation evidence..."
            }
            className="w-full rounded-xl border border-border/50 bg-background p-3 text-xs text-foreground focus:border-primary focus:outline-none"
          />
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setBatchCloseItems(null)}
              disabled={batchActionPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={batchActionPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isVietnamese
                ? `Xác nhận Đóng (${batchCloseItems?.length ?? 0})`
                : `Confirm Close (${batchCloseItems?.length ?? 0})`}
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
