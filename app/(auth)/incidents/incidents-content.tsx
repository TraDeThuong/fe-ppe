"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Radio,
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

  // URL state synchronization for stats
  const statParam = searchParams.get("stat");
  const selectedStat = statParam && URL_TO_STAT[statParam] ? URL_TO_STAT[statParam] : null;

  // Filter States: Ưu tiên giá trị từ URL, nếu không có URL thì lấy từ Header globalSiteId
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(
    selectedStat === "pendingReview"
      ? "PENDING_REVIEW"
      : selectedStat === "resolved"
      ? "RESOLVED"
      : ""
  );
  const [severityFilter, setSeverityFilter] = useState(
    selectedStat === "critical" ? "CRITICAL" : ""
  );
  const [violationFilter, setViolationFilter] = useState("");
  const [cameraIdFilter, setCameraIdFilter] = useState(urlCameraId);
  const [siteIdFilter, setSiteIdFilter] = useState(urlSiteId || globalSiteId || "");
  const [highlightedIncidentId, setHighlightedIncidentId] = useState<string | null>(null);

  // Đồng bộ chọn thẻ KPI với bộ lọc bảng
  const handleSelectStat = (stat: IncidentStatKey | null) => {
    const params = new URLSearchParams(searchParams.toString());
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
      params.delete("siteId");
    }
    params.delete("cameraId");
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };

  // Sync state khi searchParams của URL thay đổi (Back / Forward navigation)
  useEffect(() => {
    const paramCamera = searchParams.get("cameraId") || "";
    setCameraIdFilter(paramCamera);
    const paramSite = searchParams.get("siteId") || "";
    if (paramSite !== siteIdFilter) {
      setSiteIdFilter(paramSite);
    }
  }, [searchParams]);

  // Đồng bộ với Global Site Selector khi người dùng đổi site từ Header
  useEffect(() => {
    if (!searchParams.get("siteId") && globalSiteId && globalSiteId !== siteIdFilter) {
      setSiteIdFilter(globalSiteId);
      setCameraIdFilter("");
      setPage(1);
    }
  }, [globalSiteId, searchParams, siteIdFilter]);

  // Query Params
  const queryParams: IncidentQueryParams = {
    page,
    limit,
    search: search.trim() || undefined,
    status: statusFilter || undefined,
    severity: severityFilter || undefined,
    violationType: violationFilter || undefined,
    siteId: siteIdFilter || undefined,
    cameraId: cameraIdFilter || undefined,
    sortBy: "detectedAt",
    sortOrder: "desc",
  };

  const { data: incidentData, isLoading, refetch, isRefetching } = useIncidents(queryParams);
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

  return (
    <div className="space-y-6">
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
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                isConnected
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
                className={`h-2 w-2 rounded-full ${
                  isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
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
      <IncidentFilterToolbar
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
          handleSiteFilterChange("");
          handleSelectStat(null);
        }}
      />

      {/* Main Table */}
      <div className="rounded-2xl border border-border/40 bg-surface p-3.5 sm:p-4 shadow-sm">
        <IncidentTable
          incidents={incidents}
          loading={isLoading}
          highlightedId={highlightedIncidentId}
          onReview={handleOpenReview}
          onAssign={handleOpenAssign}
          onResolve={handleOpenResolve}
          onDelete={handleOpenDelete}
          onFilterSite={handleSiteFilterChange}
        />

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-border/40">
            <p className="text-xs text-muted-foreground">
              {t("common.showing")} {(meta.page - 1) * meta.limit + 1} -{" "}
              {Math.min(meta.page * meta.limit, meta.total)} / {meta.total} {t("incidents.title")}
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Previous</span>
              </Button>

              <span className="text-xs font-medium text-foreground px-2">
                {page} / {meta.totalPages}
              </span>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((prev) => Math.min(prev + 1, meta.totalPages))}
                disabled={page >= meta.totalPages}
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next</span>
              </Button>
            </div>
          </div>
        )}
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
