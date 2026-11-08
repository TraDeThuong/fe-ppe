"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { mapTableSort } from "@/lib/table-utils";
import { useTableState } from "@/hooks/use-table-state";
import { useDebounce } from "@/hooks/use-debounce";
import { useQueryClient } from "@tanstack/react-query";
import {
  RefreshCw,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/features/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useLocale } from "@/providers/locale-provider";
import { useRealtime } from "@/contexts/RealtimeContext";
import { incidentKeys } from "@/hooks/incidents/incident.query-keys";
import {
  IncidentKpiSummary,
  IncidentFilterToolbar,
  IncidentTable,
  ReviewIncidentModal,
  AssignIncidentModal,
  ResolveIncidentModal,
  CloseIncidentDialog,
  type IncidentStatKey,
} from "@/components/features/incidents";
import {
  useIncidents,
  useReviewIncident,
  useAssignOfficer,
  useResolveIncident,
  useCloseIncident,
  useDeleteIncident,
} from "@/hooks";
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
  const { lastAlert, isConnected } = useRealtime();

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

  // Tự động làm mới dữ liệu thời gian thực khi AI Camera phát hiện vi phạm PPE mới
  useEffect(() => {
    if (!lastAlert) return;
    if (
      lastAlert.type === "notification:ppe_violation" ||
      lastAlert.type === "notification:new"
    ) {
      queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
      refetch();

      const alertData = lastAlert.data as Record<string, unknown> | undefined;
      const newId = (alertData?.incidentId as string) || (alertData?.id as string);
      if (newId) {
        setHighlightedIncidentId(newId);
        const timer = setTimeout(() => setHighlightedIncidentId(null), 8000);
        return () => clearTimeout(timer);
      }
    }
  }, [lastAlert, queryClient, refetch]);

  // Truy vấn overview (tối đa 100 sự cố của site/camera) để KPI summary hiển thị số liệu toàn diện chính xác
  const { data: statsOverviewData } = useIncidents({
    siteId: siteIdFilter || undefined,
    cameraId: cameraIdFilter || undefined,
    limit: 100,
    fromDate,
    toDate,

  });
  const overviewIncidents = statsOverviewData?.items || incidents;

  // Mutations
  const reviewMutation = useReviewIncident();
  const assignMutation = useAssignOfficer();
  const resolveMutation = useResolveIncident();
  const closeMutation = useCloseIncident();
  const deleteMutation = useDeleteIncident();

  // Modals state
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isResolveOpen, setIsResolveOpen] = useState(false);
  const [isCloseOpen, setIsCloseOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Actions
  const handleOpenReview = (incident: IncidentItem) => {
    setSelectedIncident(incident);
    setIsReviewOpen(true);
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

              variant="ghost"

              onClick={() => refetch()}

              disabled={isLoading || isRefetching}

              className="gap-2"

            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
              <span>{t("common.refresh")}</span>
            </Button>
          </div>
        }

      />

      {/* KPI Overview (Chuẩn Bento, click mở rộng khung chi tiết & tự động lọc bảng) */}
      <IncidentKpiSummary

        incidents={overviewIncidents}

        totalIncidentsCount={statsOverviewData?.meta?.total ?? overviewIncidents.length}

        loading={isLoading}

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

          incidents={incidents}

          loading={isLoading}

          highlightedId={highlightedIncidentId}

          onReview={handleOpenReview}

          onAssign={handleOpenAssign}

          onResolve={handleOpenResolve}

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
              rowSelection: false
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

        loading={assignMutation.isPending}

        onSubmit={async (incidentId, payload) => {
          await assignMutation.mutateAsync({ incidentId, payload });
        }}

      />

      <ResolveIncidentModal

        open={isResolveOpen}

        onOpenChange={setIsResolveOpen}

        incident={selectedIncident}

        loading={resolveMutation.isPending}

        onSubmit={async (id, payload) => {
          await resolveMutation.mutateAsync({ id, payload });
        }}

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
    </div>
  );
}
