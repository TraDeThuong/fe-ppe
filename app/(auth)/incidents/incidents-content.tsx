"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { PageSkeleton } from "@/components/features/app-shell/page-skeleton";
import {
  IncidentActionModals,
  IncidentAssignmentOverviewCard,
  IncidentConsoleHeader,
  IncidentListControlCard,
  IncidentKpiSummary,
  IncidentTable,
  type IncidentStatKey,
  type IncidentViewMode,
} from "@/components/features/incidents";
import { IncidentDispatchResultPanel } from "@/components/features/incidents/incident-dispatch-result-panel";
import { IncidentMobileView } from "@/components/features/incidents/mobile";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useSite } from "@/contexts/SiteContext";
import {
  useCloseIncident,
  useCreateIncident,
  useDeleteIncident,
  useHydratedIncidents,
  useIncidents,
  useIncidentStatusCounts,
  useReviewIncident,
  useUpdateIncident,
} from "@/hooks";
import { incidentKeys } from "@/hooks/incidents/incident.query-keys";
import { reportingKeys } from "@/hooks/reporting/reporting.query-keys";
import { useCan } from "@/hooks/use-can";
import { useDebounce } from "@/hooks/use-debounce";
import { useIsDesktop } from "@/hooks/use-media-query";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import { useTableState } from "@/hooks/use-table-state";
import { vietnamToday } from "@/lib/dashboard-data";
import {
  dispatchIncidentsWithSignal,
  resolveIncidentsWithReport,
} from "@/lib/incident-actions";
import {
  incidentWorkStatuses,
  resolveIncidentListScope,
  resolveZoneCameraIds,
  type IncidentListScope,
  type IncidentWorkStatus,
} from "@/lib/incident-list-scope";
import {
  createDefaultIncidentPeriodFilter,
  parseIncidentPeriodFromUrl,
  resolveIncidentPeriod,
  type IncidentPeriodFilter,
} from "@/lib/incident-period";
import { runInBatches } from "@/lib/incident-workflow";
import { mapTableSort } from "@/lib/table-utils";
import { toast } from "@/lib/toast";
import { useLocale } from "@/providers/locale-provider";
import { incidentService } from "@/services/incident.service";
import type { IncidentItem, IncidentQueryParams } from "@/types";
import { useIncidentBatchActions } from "./use-incident-batch-actions";

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
  // Chỉ render một bản theo khổ màn hình (nội dung luôn hiện sau khi xác thực xong ở client nên không bị nháy)
  const isDesktop = useIsDesktop();
  const { siteId: globalSiteId, setSiteId: setGlobalSiteId } = useSite();
  const { cameras, getSiteName, camerasLoading, camerasError, refetchCameras } = useEntityLookup();
  const { user, status: authStatus } = useAuth();
  const can = useCan();
  const canReadIncidents = authStatus === "authenticated" && can("PPE_INCIDENT_READ");
  const { lastAlert, isConnected } = useRealtime();
  const isOfficerRole = (user?.role || "").toUpperCase() === "SAFETY_OFFICER";
  const { scope, status: listStatus } = resolveIncidentListScope(
    (key) => searchParams.get(key),
    user?.role,
  );
  const isHistory = scope === "history";
  const listScopeKey = `${scope}:${listStatus ?? ""}`;

  const listSearchParams = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("scope", scope);
    return params;
  };

  const scopeSearchParams = (next: IncidentListScope, queue?: IncidentWorkStatus) => {
    const params = listSearchParams();
    params.set("scope", next);
    params.delete("status");
    params.delete("stat");
    if (queue) params.set("status", queue);
    return params;
  };

  const urlCameraId = searchParams.get("cameraId") || "";
  const urlZoneId = searchParams.get("zoneId") || "";
  const hasUrlSiteId = searchParams.has("siteId");
  const urlSiteId = searchParams.get("siteId") || "";
  const urlView = searchParams.get("view");
  const urlPeriod = searchParams.get("period");
  const urlFromDate = searchParams.get("fromDate");
  const urlToDate = searchParams.get("toDate");
  const urlAssignedTo = searchParams.get("assignedTo") || "";
  const urlAssignedToMe = searchParams.get("assignedToMe") === "true";

  const [today, setToday] = useState(() => vietnamToday());
  useEffect(() => {
    const syncToday = () => {
      if (!document.hidden) {
        const current = vietnamToday();
        setToday((prev) => (prev === current ? prev : current));
      }
    };
    document.addEventListener("visibilitychange", syncToday);
    window.addEventListener("focus", syncToday);
    return () => {
      document.removeEventListener("visibilitychange", syncToday);
      window.removeEventListener("focus", syncToday);
    };
  }, []);

  const [periodFilter, setPeriodFilter] = useState<IncidentPeriodFilter>(() =>
    parseIncidentPeriodFromUrl(
      { period: urlPeriod, fromDate: urlFromDate, toDate: urlToDate },
      vietnamToday(),
    ),
  );

  useEffect(() => {
    const parsed = parseIncidentPeriodFromUrl(
      { period: urlPeriod, fromDate: urlFromDate, toDate: urlToDate },
      today,
    );
    setPeriodFilter((prev) => {
      const prevResolved = resolveIncidentPeriod(prev);
      const parsedResolved = resolveIncidentPeriod(parsed);
      if (
        prev.mode === parsed.mode &&
        prevResolved.fromDate === parsedResolved.fromDate &&
        prevResolved.toDate === parsedResolved.toDate
      ) {
        return prev;
      }
      return parsed;
    });
  }, [urlPeriod, urlFromDate, urlToDate, today]);

  const resolvedPeriod = useMemo(
    () => resolveIncidentPeriod(periodFilter),
    [periodFilter],
  );
  const fromDate =
    resolvedPeriod.mode !== "all" && resolvedPeriod.isValid
      ? resolvedPeriod.fromDate
      : undefined;
  const toDate =
    resolvedPeriod.mode !== "all" && resolvedPeriod.isValid
      ? resolvedPeriod.toDate
      : undefined;

  const statParam = searchParams.get("stat");
  const selectedStat =
    statParam && URL_TO_STAT[statParam] ? URL_TO_STAT[statParam] : null;
  const [viewMode, setViewMode] = useState<IncidentViewMode>(
    urlView === "grouped" || urlView === "split" || urlView === "camera"
      ? urlView
      : "table",
  );

  const [pagination, setPagination] = useState({ scopeKey: listScopeKey, page: 1 });
  const page = pagination.scopeKey === listScopeKey ? pagination.page : 1;
  const setPage = (next: number) => setPagination({ scopeKey: listScopeKey, page: next });
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState(
    selectedStat === "critical" ? "CRITICAL" : "",
  );
  const [violationFilter, setViolationFilter] = useState("");
  const [siteIdFilter, setSiteIdFilter] = useState(
    hasUrlSiteId ? urlSiteId : globalSiteId || "",
  );
  const [zoneIdFilter, setZoneIdFilter] = useState(urlZoneId);
  const [cameraIdFilter, setCameraIdFilter] = useState(urlCameraId);
  const [assignedToMeFilter, setAssignedToMeFilter] = useState(urlAssignedToMe);
  const [highlightedIncidentId, setHighlightedIncidentId] = useState<string | null>(null);

  const changeListScope = (next: IncidentListScope, queue?: IncidentWorkStatus) => {
    setPage(1);
    router.replace(`${pathname}?${scopeSearchParams(next, queue)}`, { scroll: false });
  };
  const closedHistoryAction = {
    label: t("incidents.scope.openHistory"),
    href: `${pathname}?${scopeSearchParams("history")}`,
  };

  const handlePeriodFilterChange = (next: IncidentPeriodFilter) => {
    setPeriodFilter(next);
    setPage(1);
    const nextResolved = resolveIncidentPeriod(next);
    const params = listSearchParams();
    if (next.mode === "all") {
      params.delete("period");
      params.delete("fromDate");
      params.delete("toDate");
    } else if (nextResolved.isValid) {
      params.set("period", next.mode);
      if (nextResolved.fromDate) params.set("fromDate", nextResolved.fromDate);
      else params.delete("fromDate");
      if (nextResolved.toDate) params.set("toDate", nextResolved.toDate);
      else params.delete("toDate");
    } else {
      return;
    }
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };

  const handleViewModeChange = (mode: IncidentViewMode) => {
    setViewMode(mode);
    const params = listSearchParams();
    if (mode === "table") params.delete("view");
    else params.set("view", mode);
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };

  const handleSelectStat = (stat: IncidentStatKey | null) => {
    const nextScope = stat === "pendingReview" || stat === "resolved" ? "work" : "all";
    const params = scopeSearchParams(stat ? nextScope : scope);
    if (stat) params.set("stat", STAT_TO_URL[stat]);
    else if (scope === "work" && listStatus && listStatus !== "CLOSED") {
      params.set("status", listStatus);
    }
    setPage(1);
    setSeverityFilter(stat === "critical" ? "CRITICAL" : "");
    router.replace(`${pathname}?${params}`, { scroll: false });
  };

  const handleSiteFilterChange = (val: string) => {
    setSiteIdFilter(val);
    setZoneIdFilter("");
    setCameraIdFilter("");
    setPage(1);
    setGlobalSiteId(val || null);

    const params = listSearchParams();
    if (val) params.set("siteId", val);
    else params.set("siteId", "");
    params.delete("zoneId");
    params.delete("cameraId");
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };

  const handleZoneFilterChange = (val: string) => {
    setZoneIdFilter(val);
    if (val && cameraIdFilter) {
      const cam = cameras.find((c) => c.id === cameraIdFilter);
      if (cam && cam.zoneId !== val) {
        setCameraIdFilter("");
      }
    }
    setPage(1);
    const params = listSearchParams();
    if (val) params.set("zoneId", val);
    else params.delete("zoneId");
    if (val && cameraIdFilter) {
      const cam = cameras.find((c) => c.id === cameraIdFilter);
      if (cam && cam.zoneId !== val) params.delete("cameraId");
    }
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };

  useEffect(() => {
    const nextMode: IncidentViewMode =
      urlView === "grouped" || urlView === "split" || urlView === "camera"
        ? urlView
        : "table";
    setViewMode((prev) => (prev === nextMode ? prev : nextMode));
  }, [urlView]);

  useEffect(() => {
    let changed = false;
    if (urlCameraId !== cameraIdFilter) {
      setCameraIdFilter(urlCameraId);
      changed = true;
    }
    if (urlZoneId !== zoneIdFilter) {
      setZoneIdFilter(urlZoneId);
      changed = true;
    }
    const paramSite = hasUrlSiteId ? urlSiteId : globalSiteId || "";
    if (paramSite !== siteIdFilter) {
      setSiteIdFilter(paramSite);
      changed = true;
    }
    if (urlAssignedToMe !== assignedToMeFilter) {
      setAssignedToMeFilter(urlAssignedToMe);
      changed = true;
    }
    if (changed) setPage(1);
  }, [urlCameraId, urlZoneId, hasUrlSiteId, urlSiteId, urlAssignedToMe]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setSeverityFilter(statParam === "critical" ? "CRITICAL" : "");
  }, [statParam]);

  useEffect(() => {
    if (!searchParams.has("siteId") && (globalSiteId || "") !== siteIdFilter) {
      setSiteIdFilter(globalSiteId || "");
      setZoneIdFilter("");
      setCameraIdFilter("");
      setPage(1);
    }
  }, [globalSiteId, searchParams, siteIdFilter]);

  const zoneCameraIds = useMemo(() => {
    const ids = resolveZoneCameraIds(zoneIdFilter || undefined, cameras, siteIdFilter || undefined);
    return cameraIdFilter ? ids?.filter((id) => id === cameraIdFilter) : ids;
  }, [zoneIdFilter, cameras, siteIdFilter, cameraIdFilter]);
  const isZoneLoading = Boolean(zoneIdFilter && camerasLoading && cameras.length === 0);
  const zoneError = zoneIdFilter && cameras.length === 0 ? camerasError : null;
  const isZoneReady = !isZoneLoading && !zoneError;

  const tableState = useTableState(
    [{ id: "detectedAt", desc: true }],
    `${listScopeKey}:${search}:${severityFilter}:${violationFilter}:${siteIdFilter}:${zoneIdFilter}:${cameraIdFilter}:${fromDate}:${toDate}:${assignedToMeFilter}:${urlAssignedTo}`,
  );
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
  const debouncedSearch = useDebounce(search, 350);

  const queryParams: IncidentQueryParams = {
    page,
    limit,
    search: debouncedSearch.trim() || undefined,
    status: listStatus,
    severity: severityFilter || undefined,
    violationType: violationFilter || undefined,
    siteId: siteIdFilter || undefined,
    cameraId: cameraIdFilter || undefined,
    cameraIds: zoneCameraIds,
    assignedTo: urlAssignedTo || undefined,
    assignedToMe: assignedToMeFilter || undefined,
    fromDate,
    toDate,
    sortBy: apiSorting.sortBy,
    sortOrder: apiSorting.order,
    includeAssignments: true,
    ...(isHistory || listStatus === "RESOLVED" ? { includeAllAssignments: true } : {}),
  };

  // 1. Chỉ phát request lấy trang hiện tại của bảng (kèm assignments sẵn từ BE)
  const {
    data: incidentData,
    isLoading,
    isPlaceholderData,
    refetch,
    isRefetching,
    error,
  } = useIncidents(queryParams, { enabled: canReadIncidents && isZoneReady });
  const isListLoading = isZoneLoading || (isZoneReady && (isLoading || isPlaceholderData));

  const rawIncidents = useMemo(() => {
    if (!isZoneReady || isPlaceholderData) return [];
    const rows = incidentData?.items ?? [];
    return listStatus ? rows.filter((incident) => incident.status === listStatus) : rows;
  }, [incidentData?.items, isZoneReady, isPlaceholderData, listStatus]);

  const meta = !isZoneReady || isPlaceholderData ? undefined : incidentData?.meta;
  const lastPage = Math.max(1, meta?.totalPages ?? 1);
  const isUnfilteredList =
    !listStatus &&
    !queryParams.search &&
    !queryParams.severity &&
    !queryParams.violationType &&
    !queryParams.assignedToMe &&
    !queryParams.assignedTo;

  useEffect(() => {
    if (pagination.scopeKey !== listScopeKey || (meta && page > lastPage)) {
      setPagination({ scopeKey: listScopeKey, page: Math.min(page, lastPage) });
    }
  }, [lastPage, listScopeKey, meta, page, pagination.scopeKey]);

  // Debounce 1.5s cho SSE realtime
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

  // 2. Chỉ phát 1 request đếm nhanh /incidents/status-counts (7 trường từ BE, không còn 5-7 request limit=100)
  const {
    data: rawStatusCounts,
    isLoading: isStatusCountsLoading,
    isFetching: statusCountsFetching,
    refetch: refetchStatusCounts,
  } = useIncidentStatusCounts(
    {
      siteId: siteIdFilter || undefined,
      cameraId: cameraIdFilter || undefined,
      cameraIds: zoneCameraIds,
      fromDate,
      toDate,
    },
    { enabled: canReadIncidents && isZoneReady },
  );
  const statusCounts = isZoneReady ? rawStatusCounts : undefined;
  const statusCountsLoading = isZoneLoading || isStatusCountsLoading;

  // Enrich assignedToName trên client từ usersById (0 request N+1 /assignments vì BE đã trả mảng assignments)
  const { incidents, usersById, siteManagersBySiteId } = useHydratedIncidents(
    rawIncidents,
    { enabled: canReadIncidents, fetchMissingAssignments: false },
  );

  // RBAC chuẩn D08: SAFETY_OFFICER có PPE_INCIDENT_REVIEW được phép duyệt đơn lẻ & hàng loạt
  const canReviewIncident = can("PPE_INCIDENT_REVIEW");
  const canCreateIncident = can("PPE_INCIDENT_MANAGE");
  const canCloseIncident = can("PPE_INCIDENT_MANAGE");
  const canExportFeedback =
    !isOfficerRole && (can("PPE_AI_METRICS_READ") || can("PPE_INCIDENT_MANAGE"));

  const createMutation = useCreateIncident();
  const updateMutation = useUpdateIncident();
  const reviewMutation = useReviewIncident();
  const closeMutation = useCloseIncident(closedHistoryAction.href);
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
  const [isExportFeedbackOpen, setIsExportFeedbackOpen] = useState(false);
  const [singleActionPending, setSingleActionPending] = useState(false);

  const isRefreshingAll = isRefetching || statusCountsFetching;

  const handleRefreshAll = () => {
    if (!isZoneReady) {
      if (zoneError) void refetchCameras();
      return;
    }
    void Promise.all([refetch(), refetchStatusCounts()]);
  };

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

  const handleOpenReview = (incident: IncidentItem) => {
    setSelectedIncident(incident);
    setIsReviewOpen(true);
  };

  const batchActions = useIncidentBatchActions({
    closedHistoryAction,
    onIncidentsChanged: invalidateAllIncidentQueries,
  });
  const { dispatchResult, setDispatchResult } = batchActions;

  // Bộ xử lý bộ lọc dùng chung cho bản desktop (IncidentListControlCard) và mobile (IncidentMobileView)
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleCameraFilterChange = (val: string) => {
    setCameraIdFilter(val);
    setPage(1);
    const params = listSearchParams();
    if (val) params.set("cameraId", val);
    else params.delete("cameraId");
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };

  const handleSeverityFilterChange = (val: string) => {
    setSeverityFilter(val);
    setPage(1);
  };

  const handleViolationFilterChange = (val: string) => {
    setViolationFilter(val);
    setPage(1);
  };

  const handleAssignedToMeChange = (val: boolean) => {
    setAssignedToMeFilter(val);
    setPage(1);
    const params = listSearchParams();
    if (val) params.set("assignedToMe", "true");
    else params.delete("assignedToMe");
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };

  const handleResetFilters = () => {
    setPage(1);
    setSearch("");
    setSeverityFilter("");
    setViolationFilter("");
    setZoneIdFilter("");
    setCameraIdFilter("");
    setSiteIdFilter("");
    setAssignedToMeFilter(false);
    setGlobalSiteId(null);
    setPeriodFilter(createDefaultIncidentPeriodFilter(today));
    const params = new URLSearchParams({ scope, siteId: "" });
    if (scope === "work" && listStatus) params.set("status", listStatus);
    if (urlView) params.set("view", urlView);
    router.replace(`${pathname}?${params}`, { scroll: false });
  };

  /** Mobile: "Đặt lại" trong sheet Bộ lọc — giữ nguyên công trường (chọn ở thanh đầu trang) và hàng trạng thái. */
  const handleResetMobileSheetFilters = () => {
    setPage(1);
    setSeverityFilter("");
    setViolationFilter("");
    setZoneIdFilter("");
    setCameraIdFilter("");
    setAssignedToMeFilter(false);
    setPeriodFilter(createDefaultIncidentPeriodFilter(today));
    const params = listSearchParams();
    for (const key of ["zoneId", "cameraId", "assignedToMe", "period", "fromDate", "toDate", "stat"]) {
      params.delete(key);
    }
    if (scope === "work" && listStatus && listStatus !== "CLOSED") params.set("status", listStatus);
    router.replace(`${pathname}?${params}`, { scroll: false });
  };

  const renderListControls = (quickSelect: ReactNode) => (
    <IncidentListControlCard
      scope={scope}
      queue={listStatus}
      onScopeChange={changeListScope}
      search={search}
      onSearchChange={handleSearchChange}
      siteFilter={siteIdFilter}
      onSiteFilterChange={handleSiteFilterChange}
      zoneFilter={zoneIdFilter}
      onZoneFilterChange={handleZoneFilterChange}
      cameraIdFilter={cameraIdFilter}
      onCameraIdFilterChange={handleCameraFilterChange}
      severityFilter={severityFilter}
      onSeverityFilterChange={handleSeverityFilterChange}
      violationFilter={violationFilter}
      onViolationFilterChange={handleViolationFilterChange}
      assignedToMe={assignedToMeFilter}
      onAssignedToMeChange={handleAssignedToMeChange}
      onRefresh={handleRefreshAll}
      isRefreshing={isRefreshingAll}
      onResetFilters={handleResetFilters}
    >
      {quickSelect}
    </IncidentListControlCard>
  );

  if (!canReadIncidents) {
    return authStatus === "authenticated" ? (
      <p role="alert" className="rounded-2xl border border-border bg-surface p-4 text-sm">
        {t("incidents.scope.forbidden")}
      </p>
    ) : (
      <PageSkeleton variant="table" />
    );
  }

  return (
    <div className="space-y-5">
      {dispatchResult && (
        <IncidentDispatchResultPanel
          result={dispatchResult}
          onChange={setDispatchResult}
          onRetryFailed={async (ids) => {
            const fetched = await runInBatches(ids, 4, (id) =>
              incidentService.getIncidentById(id),
            );
            const eligible = fetched.succeeded.filter(
              (incident) =>
                incident.status === "PENDING_REVIEW" || incident.status === "CONFIRMED",
            );
            if (!eligible.length) {
              throw new Error(
                isVietnamese
                  ? "Không còn hồ sơ đủ điều kiện để giao lại."
                  : "No records remain eligible for assignment.",
              );
            }
            if (fetched.failed.length) {
              toast.error(
                isVietnamese
                  ? `${fetched.failed.length} hồ sơ chưa tải được; chưa đưa vào lần thử lại.`
                  : `${fetched.failed.length} records could not be loaded and are excluded from this retry.`,
              );
            }
            batchActions.onBatchDispatch(eligible);
          }}
        />
      )}

      {/* Mobile (< 768px): chip trạng thái · tìm kiếm + Lọc · danh sách thẻ */}
      {!isDesktop && (
      <div className="md:hidden">
        <IncidentMobileView
          scope={scope}
          queue={listStatus}
          onScopeChange={changeListScope}
          statusCounts={statusCounts}
          isOfficer={isOfficerRole}
          search={search}
          onSearchChange={handleSearchChange}
          today={today}
          filterValues={{
            periodFilter,
            siteFilter: siteIdFilter,
            zoneFilter: zoneIdFilter,
            cameraIdFilter,
            severityFilter,
            violationFilter,
            assignedToMe: assignedToMeFilter,
          }}
          filterHandlers={{
            onPeriodFilterChange: handlePeriodFilterChange,
            onZoneFilterChange: handleZoneFilterChange,
            onCameraIdFilterChange: handleCameraFilterChange,
            onSeverityFilterChange: handleSeverityFilterChange,
            onViolationFilterChange: handleViolationFilterChange,
            onAssignedToMeChange: handleAssignedToMeChange,
            onReset: handleResetMobileSheetFilters,
          }}
          incidents={incidents}
          loading={isListLoading}
          error={zoneError || error}
          onRetry={handleRefreshAll}
          highlightedId={highlightedIncidentId}
          page={page}
          totalPages={lastPage}
          onPageChange={setPage}
        />
      </div>
      )}

      {/* Desktop (≥ 768px): giữ nguyên */}
      {isDesktop && (
      <div className="hidden space-y-5 md:block">
      <IncidentConsoleHeader
        isConnected={isConnected}
        isRefreshing={isLoading || isRefreshingAll}
        onRefresh={handleRefreshAll}
        canCreateIncident={canCreateIncident}
        onCreateIncident={() => setIsCreateOpen(true)}
        canExportFeedback={canExportFeedback}
        onExportFeedback={() => setIsExportFeedbackOpen(true)}
        siteName={siteIdFilter ? getSiteName(siteIdFilter) : null}
        userRole={user?.role}
        criticalCount={
          statusCounts?.critical ??
          incidents.filter((i) => i.severity === "CRITICAL").length
        }
        periodFilter={periodFilter}
        resolvedPeriod={resolvedPeriod}
        today={today}
        onPeriodFilterChange={handlePeriodFilterChange}
      />

      <IncidentKpiSummary
        incidents={incidents}
        totalIncidentsCount={
          statusCounts?.total ??
          (isUnfilteredList ? meta?.total : undefined) ??
          incidents.length
        }
        statusCounts={statusCounts}
        loading={statusCountsLoading}
        detailLoading={isLoading}
        selectedStat={selectedStat}
        onSelectStat={handleSelectStat}
        onReview={canReviewIncident ? handleOpenReview : undefined}
        onAssign={isOfficerRole ? undefined : (inc) => {
          setSelectedIncident(inc);
          setIsAssignOpen(true);
        }}
        onResolve={(inc) => {
          setSelectedIncident(inc);
          setIsResolveOpen(true);
        }}
        onFilterStatus={(val) => {
          if (val === "CLOSED") changeListScope("history");
          else if (Object.hasOwn(incidentWorkStatuses, val)) {
            changeListScope("work", val as IncidentWorkStatus);
          } else changeListScope("all");
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

      {/* Thanh liên kết nhanh tới /incidents/assignments (tinh gọn từ Card 3 cột, dùng trực tiếp statusCounts) */}
      <IncidentAssignmentOverviewCard
        variant="compact"
        incidents={incidents}
        statusCounts={statusCounts}
        loading={statusCountsLoading}
        userRole={user?.role}
        userId={user?.id}
        usersById={usersById}
        siteManagersBySiteId={siteManagersBySiteId}
      />

      <div className="min-w-0 space-y-3">
        <IncidentTable
          key={`${user?.id}:${listScopeKey}`}
          incidents={incidents}
          renderListControls={renderListControls}
          viewMode={isHistory ? "table" : viewMode}
          history={isHistory}
          onViewModeChange={handleViewModeChange}
          loading={isListLoading}
          highlightedId={highlightedIncidentId}
          onReview={canReviewIncident && !isHistory ? handleOpenReview : undefined}
          onBatchReview={canReviewIncident && !isHistory ? batchActions.onBatchReview : undefined}
          onBatchDispatch={isOfficerRole || isHistory ? undefined : batchActions.onBatchDispatch}
          onBatchResolve={isHistory ? undefined : batchActions.onBatchResolve}
          onBatchClose={isOfficerRole || isHistory ? undefined : batchActions.onBatchClose}
          batchReviewPending={batchActions.modalProps.batchReviewPending}
          batchActionPending={batchActions.modalProps.batchActionPending}
          onAssign={
            isHistory
              ? undefined
              : (inc) => {
                  setSelectedIncident(inc);
                  setIsAssignOpen(true);
                }
          }
          onResolve={
            isHistory
              ? undefined
              : (inc) => {
                  setSelectedIncident(inc);
                  setIsResolveOpen(true);
                }
          }
          onClose={
            isHistory
              ? undefined
              : (inc) => {
                  setSelectedIncident(inc);
                  setIsCloseOpen(true);
                }
          }
          onEdit={
            isHistory
              ? undefined
              : (inc) => {
                  setSelectedIncident(inc);
                  setIsEditOpen(true);
                }
          }
          onDelete={
            isHistory
              ? undefined
              : (inc) => {
                  setSelectedIncident(inc);
                  setIsDeleteOpen(true);
                }
          }
          onFilterSite={handleSiteFilterChange}
          tableState={{
            ...tableState,
            manualPagination: true,
            manualFiltering: true,
            manualSorting: true,
            features: {
              sorting: true,
              globalFilter: false,
              rowSelection: !isHistory,
            },
            onSortingChange: (updater) => {
              tableState.onSortingChange(updater);
              setPage(1);
            },
            pagination: { pageIndex: page - 1, pageSize: limit },
            onPaginationChange: (update) => {
              const next =
                typeof update === "function"
                  ? update({ pageIndex: page - 1, pageSize: limit })
                  : update;
              setPage(next.pageIndex + 1);
              setLimit(next.pageSize);
            },
            rowCount: meta?.total ?? incidents.length,
            pageCount: meta ? lastPage : page,
            fetching: isRefreshingAll || isPlaceholderData,
            error: zoneError || error,
            onRetry: handleRefreshAll,
          }}
        />
      </div>
      </div>
      )}

      <IncidentActionModals
        selectedIncident={selectedIncident}
        defaultSiteId={siteIdFilter}
        canCloseIncident={canCloseIncident}
        isCreateOpen={isCreateOpen}
        onCreateOpenChange={setIsCreateOpen}
        createPending={createMutation.isPending}
        onSubmitCreate={async (payload) => {
          await createMutation.mutateAsync(payload);
        }}
        isEditOpen={isEditOpen}
        onEditOpenChange={setIsEditOpen}
        updatePending={updateMutation.isPending}
        onSubmitEdit={async (id, payload) => {
          await updateMutation.mutateAsync({ id, payload });
        }}
        isReviewOpen={isReviewOpen}
        onReviewOpenChange={setIsReviewOpen}
        reviewPending={reviewMutation.isPending}
        onSubmitReview={async (id, payload) => {
          await reviewMutation.mutateAsync({ id, payload });
        }}
        isAssignOpen={isAssignOpen}
        onAssignOpenChange={setIsAssignOpen}
        singleActionPending={singleActionPending}
        onSubmitAssign={async (_incidentId, payload) => {
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
            if (res.assignedCount > 0 && res.failedCount === 0) {
              toast.success(
                isVietnamese
                  ? `Đã phân công & phát tín hiệu xử lý cho sự cố #${selectedIncident.id.slice(0, 8)}.`
                  : `Dispatched incident #${selectedIncident.id.slice(0, 8)} to officer.`,
              );
            } else {
              const reason =
                res.failedItems[0]?.message ||
                (isVietnamese
                  ? "Không thể phân công sự cố cho cán bộ đã chọn."
                  : "Unable to dispatch incident to the selected officer.");
              toast.error(reason);
              throw new Error(reason);
            }
          } finally {
            setSingleActionPending(false);
          }
        }}
        isResolveOpen={isResolveOpen}
        onResolveOpenChange={setIsResolveOpen}
        onSubmitResolve={async (_id, payload) => {
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
        isCloseOpen={isCloseOpen}
        onCloseOpenChange={setIsCloseOpen}
        closePending={closeMutation.isPending}
        onSubmitClose={async (id, payload) => {
          await closeMutation.mutateAsync({ id, payload });
        }}
        isDeleteOpen={isDeleteOpen}
        onDeleteOpenChange={setIsDeleteOpen}
        deletePending={deleteMutation.isPending}
        onConfirmDelete={async () => {
          if (!selectedIncident) return;
          try {
            await deleteMutation.mutateAsync(selectedIncident.id);
            setIsDeleteOpen(false);
            setSelectedIncident(null);
          } catch {
            // Handled by hook
          }
        }}
        {...batchActions.modalProps}
        isExportFeedbackOpen={isExportFeedbackOpen}
        onExportFeedbackOpenChange={setIsExportFeedbackOpen}
        exportFilterScope={{
          siteId: siteIdFilter || undefined,
          cameraId: cameraIdFilter || undefined,
          cameraIds: zoneCameraIds,
          violationType: violationFilter || undefined,
          fromDate,
          toDate,
        }}
      />
    </div>
  );
}
