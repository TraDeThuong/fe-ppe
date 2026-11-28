import { useEffect, useMemo, useRef, useState } from "react";
import { ReportHistoryList } from "@/components/features/reports/report-history-list";
import { ReportInlineViewer } from "@/components/features/reports/report-inline-viewer";
import { ReportTemplateCards } from "@/components/features/reports/report-template-cards";
import { ReportTypeOverviewStrip } from "@/components/features/reports/report-type-overview-strip";
import {
  ReportsArchiveKpiSummary,
  type ReportArchiveKpiKey,
} from "@/components/features/reports/reports-archive-kpi-summary";
import { useAuth } from "@/contexts/AuthContext";
import { useReportArchiveCounts, useReportHistory } from "@/hooks/reporting/use-report-history";
import { useReportTemplates } from "@/hooks/reporting/use-report-templates";
import { useCan } from "@/hooks/use-can";
import { canAccessGeneratedReport } from "@/lib/report-analytics-data";
import {
  countReportTemplates,
  resolveReportTypeFilter,
  toReportArchiveStats,
  type ReportTypeGroup,
} from "@/lib/report-archive";
import { toast } from "@/lib/toast";
import { useLocale } from "@/providers/locale-provider";
import type { ReportGenerationDto, ReportTemplateDto, SiteItem } from "@/types";

const HISTORY_PAGE_SIZE = 10;
const EMPTY_TEMPLATES: ReportTemplateDto[] = [];

const KPI_TYPE_GROUP: Partial<Record<ReportArchiveKpiKey, ReportTypeGroup>> = {
  periodic: "PERIODIC",
  specialized: "SPECIALIZED",
};

export function useReportsArchive({
  enabled,
  loadTemplates,
  siteIdParam,
  sites,
}: {
  enabled: boolean;
  loadTemplates: boolean;
  siteIdParam: string;
  sites: SiteItem[];
}) {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const can = useCan();
  const canReadReports = can("PPE_REPORTING_READ");
  const [reportsSiteId, setReportsSiteId] = useState(() => siteIdParam);
  const [historyType, setHistoryType] = useState("");
  // Highlight the KPI shortcut until a filter is changed directly in the strip or list.
  const [archiveKpiFilter, setArchiveKpiFilter] = useState<ReportArchiveKpiKey | null>(null);
  const [historyStatus, setHistoryStatus] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  useEffect(() => {
    setReportsSiteId(siteIdParam);
    setArchiveKpiFilter(null);
    setHistoryPage(1);
  }, [siteIdParam]);

  const {
    data: templatesData,
    isLoading: isTemplatesLoading,
    isFetching: isTemplatesFetching,
    isError: isTemplatesError,
    refetch: refetchTemplates,
  } = useReportTemplates({
    enabled: enabled || loadTemplates,
  });
  const templates = templatesData ?? EMPTY_TEMPLATES;
  // undefined khi danh sách mẫu chưa tải → header ẩn badge "mẫu khả dụng" thay vì hiện 0.
  const templateCounts = useMemo(() => countReportTemplates(templatesData), [templatesData]);

  // "" | 1 loại → gửi thẳng reportType; 1 nhóm → gọi riêng từng loại rồi gộp đúng trang.
  const { reportType, reportTypes } = resolveReportTypeFilter(historyType);
  const {
    data: historyResult,
    isLoading: isHistoryLoading,
    isFetching: isHistoryFetching,
    isPlaceholderData: isHistoryPlaceholder,
    refetch: refetchHistory,
  } = useReportHistory(
    {
      page: historyPage,
      limit: HISTORY_PAGE_SIZE,
      reportType,
      status: historyStatus || undefined,
      siteId: reportsSiteId || undefined,
    },
    { enabled, reportTypes }
  );

  // Số đếm của cả cơ sở (không theo trang/bộ lọc), chỉ tải khi mở tab Báo cáo.
  const archiveCountsQuery = useReportArchiveCounts(
    { siteId: reportsSiteId || undefined },
    { enabled },
  );
  const refetchArchiveCounts = archiveCountsQuery.refetch;
  const isHistoryRefreshing = isHistoryFetching || archiveCountsQuery.isFetching;
  const archiveStats = useMemo(
    () => toReportArchiveStats(archiveCountsQuery.data),
    [archiveCountsQuery.data],
  );

  const sitesById = useMemo(() => new Map(sites.map((site) => [site.id, site])), [sites]);

  // Enrich History with Real Site Names
  const history = useMemo(() => {
    const items = historyResult?.items || [];
    return items.map((item) => ({
      ...item,
      siteName:
        item.siteName ||
        (item.siteId ? (sitesById.get(item.siteId)?.name || item.siteId.slice(0, 8)) : undefined),
    }));
  }, [historyResult, sitesById]);

  // Auto-toast notification when queued report finishes
  const historyScope = JSON.stringify([reportsSiteId, historyType, historyStatus, historyPage]);
  const prevProcessing = useRef<{ scope: string; ids: Set<string> } | null>(null);

  useEffect(() => {
    if (!enabled || !historyResult || isHistoryPlaceholder) {
      prevProcessing.current = null;
      return;
    }

    const previous = prevProcessing.current;
    const items = historyResult.items;
    const currentlyProcessing = new Set<string>();
    let statusChanged = false;
    for (const item of items) {
      if (item.status === "PENDING" || item.status === "PROCESSING") {
        currentlyProcessing.add(item.id);
      } else if (previous?.scope === historyScope && previous.ids.has(item.id)) {
        statusChanged = true;
        if (item.status !== "COMPLETED") continue;
        const toastMsg = t("reports.queue.completedToast").replace(
          "{fileName}",
          item.fileName || (locale === "vi-VN" ? "báo cáo mới" : "new report"),
        );
        toast.success(toastMsg);
      }
    }

    // With a status filter, a report can leave the page as soon as it changes status.
    if (previous?.scope === historyScope && historyStatus) {
      statusChanged ||= [...previous.ids].some((id) => !currentlyProcessing.has(id));
    }
    prevProcessing.current = { scope: historyScope, ids: currentlyProcessing };
    if (statusChanged) void refetchArchiveCounts();
  }, [
    enabled,
    historyResult,
    historyScope,
    historyStatus,
    isHistoryPlaceholder,
    locale,
    t,
    refetchArchiveCounts,
  ]);

  const isAdminUser = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const userSiteIds = useMemo(() => {
    const explicit = [
      ...(Array.isArray(user?.siteIds) ? user.siteIds : []),
      ...(user?.siteId ? [user.siteId] : []),
    ].filter(Boolean);
    if (explicit.length > 0) return Array.from(new Set(explicit));
    return sites.map((s) => s.id).filter(Boolean);
  }, [user?.siteIds, user?.siteId, sites]);

  // Auto-select first accessible completed report (or first item) for inline preview
  useEffect(() => {
    if (history.length === 0) {
      if (selectedReportId !== null) setSelectedReportId(null);
      return;
    }
    const stillExists = history.some((item) => item.id === selectedReportId);
    if (stillExists) return;

    const preferred =
      history.find(
        (item) =>
          item.status === "COMPLETED" &&
          canAccessGeneratedReport(item, user?.id, isAdminUser, {
            canReadReports,
            siteIds: userSiteIds,
          }),
      ) || history[0];
    setSelectedReportId(preferred?.id ?? null);
  }, [history, selectedReportId, user?.id, isAdminUser, canReadReports, userSiteIds]);

  const selectedReport = useMemo(
    () => history.find((item) => item.id === selectedReportId) ?? null,
    [history, selectedReportId],
  );

  const handleSelectArchiveKpi = (key: ReportArchiveKpiKey) => {
    if (key === "templates") {
      document
        .getElementById("reports-templates-section")
        ?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    const group = KPI_TYPE_GROUP[key];
    if (group) {
      const toggleOff = historyType === group;
      setHistoryType(toggleOff ? "" : group);
      setArchiveKpiFilter(toggleOff ? null : key);
    } else {
      setHistoryType("");
      setHistoryStatus("");
      setArchiveKpiFilter(null);
    }
    setHistoryPage(1);
  };

  function refresh() {
    void refetchTemplates();
    refreshHistory();
  }

  function refreshHistory() {
    void Promise.all([
      refetchHistory({ cancelRefetch: false }),
      refetchArchiveCounts({ cancelRefetch: false }),
    ]);
  }

  function selectHistorySite(siteId: string) {
    setReportsSiteId(siteId);
    setArchiveKpiFilter(null);
    setHistoryPage(1);
  }

  function selectHistoryType(type: string) {
    setHistoryType(type);
    setArchiveKpiFilter(null);
    setHistoryPage(1);
  }

  function selectHistoryStatus(status: string) {
    setHistoryStatus(status);
    setArchiveKpiFilter(null);
    setHistoryPage(1);
  }

  return {
    sites,
    reportsSiteId,
    historyType,
    historyStatus,
    historyPage,
    archiveKpiFilter,
    history,
    templates,
    archiveStats,
    isArchiveStatsLoading: archiveCountsQuery.isLoading,
    hasArchiveStatsError: archiveCountsQuery.isError && !archiveCountsQuery.isFetching,
    templateCounts,
    isTemplatesLoading,
    hasTemplateCountsError: isTemplatesError && !isTemplatesFetching,
    selectedReport,
    setSelectedReportId,
    selectHistorySite,
    selectHistoryType,
    selectHistoryStatus,
    handleSelectArchiveKpi,
    refreshHistory,
    historyTotal: historyResult?.meta?.total ?? history.length,
    historyPageCount: Math.max(1, historyResult?.meta?.totalPages ?? 1),
    setHistoryPage,
    isHistoryLoading,
    isHistoryRefreshing,
    isRefreshing: isTemplatesFetching || isHistoryRefreshing,
    currentUserId: user?.id,
    isAdminUser,
    canReadReports,
    userSiteIds,
    refresh,
  };
}

export function ReportsArchiveTab({
  archive,
  canExportReports,
  onGenerate,
  onOpenPreview,
  onCreateTemplate,
  onDeleteTemplate,
}: {
  archive: ReturnType<typeof useReportsArchive>;
  canExportReports: boolean;
  onGenerate: (template?: ReportTemplateDto) => void;
  onOpenPreview: (report: ReportGenerationDto) => void;
  onCreateTemplate: () => void;
  onDeleteTemplate: (template: ReportTemplateDto) => void;
}) {
  const { t } = useLocale();
  const {
    archiveStats,
    archiveKpiFilter,
    isArchiveStatsLoading,
    hasArchiveStatsError,
    templateCounts,
    isTemplatesLoading,
    hasTemplateCountsError,
    canReadReports,
    currentUserId,
    handleSelectArchiveKpi,
    history,
    historyPage,
    historyPageCount,
    historyStatus,
    historyTotal,
    historyType,
    isAdminUser,
    isHistoryLoading,
    isHistoryRefreshing,
    refreshHistory,
    reportsSiteId,
    selectedReport,
    selectHistorySite,
    selectHistoryStatus,
    selectHistoryType,
    setHistoryPage,
    setSelectedReportId,
    sites,
    templates,
    userSiteIds,
  } = archive;

  const countErrors = [
    hasArchiveStatsError ? t("reports.archive.countsError") : "",
    hasTemplateCountsError ? t("reports.archive.templatesError") : "",
  ].filter(Boolean);

  const handleQuickGenerateForType = (reportType: string) => {
    const active = templates.filter(
      (tpl) => !tpl.status || tpl.status.toUpperCase() === "ACTIVE",
    );
    const match = active.find((tpl) => {
      const code = tpl.code.toUpperCase();
      if (reportType === "DAILY") return code.includes("DAILY");
      if (reportType === "WEEKLY") return code.includes("WEEKLY");
      if (reportType === "MONTHLY") return code.includes("MONTHLY");
      if (reportType === "VIOLATION_SUMMARY") return code.includes("VIOLATION");
      if (reportType === "AI_PERFORMANCE") return code.includes("AI");
      return false;
    });
    onGenerate(match || active[0]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* KPI riêng cho Tab Báo cáo */}
      <ReportsArchiveKpiSummary
        stats={archiveStats}
        loading={isArchiveStatsLoading}
        templateCounts={templateCounts}
        templatesLoading={isTemplatesLoading}
        activeFilter={archiveKpiFilter}
        onSelectCard={handleSelectArchiveKpi}
      />

      {countErrors.length > 0 && (
        <p role="status" className="px-1 text-xs font-medium text-destructive">
          {countErrors.join(" ")} {t("reports.archive.refreshHint")}
        </p>
      )}

      {/* Danh mục 5 Loại Báo cáo Hệ thống */}
      <ReportTypeOverviewStrip
        selectedType={historyType}
        onSelectType={selectHistoryType}
        countsByType={archiveStats?.byType}
        totalCount={archiveStats?.totalReports}
        countsLoading={isArchiveStatsLoading}
        templates={templates}
        canExportReports={canExportReports}
        onQuickGenerateForType={handleQuickGenerateForType}
      />

      {/* Master-Detail Workspace: Danh sách Hồ sơ (4 cols) + Trình xem Trực tiếp (8 cols) */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 items-stretch">
        <div className="xl:col-span-4">
          <ReportHistoryList
            history={history}
            selectedReportId={selectedReport?.id ?? null}
            onSelectReport={(report) => setSelectedReportId(report.id)}
            loading={isHistoryLoading}
            fetching={isHistoryRefreshing}
            onRefresh={refreshHistory}
            sites={sites}
            selectedSiteId={reportsSiteId}
            onSiteChange={selectHistorySite}
            selectedType={historyType}
            onTypeChange={selectHistoryType}
            selectedStatus={historyStatus}
            onStatusChange={selectHistoryStatus}
            page={historyPage}
            pageCount={historyPageCount}
            total={historyTotal}
            onPageChange={setHistoryPage}
            currentUserId={currentUserId}
            isAdmin={isAdminUser}
            canReadReports={canReadReports}
            userSiteIds={userSiteIds}
          />
        </div>

        <div className="xl:col-span-8">
          <ReportInlineViewer
            report={selectedReport}
            currentUserId={currentUserId}
            isAdmin={isAdminUser}
            canReadReports={canReadReports}
            userSiteIds={userSiteIds}
            onOpenModalPreview={onOpenPreview}
          />
        </div>
      </div>

      {/* Danh mục Mẫu Báo cáo Tiêu chuẩn */}
      <section
        id="reports-templates-section"
        className="border-t border-border/40 pt-6"
      >
        <ReportTemplateCards
          templates={templates}
          canExport={canExportReports}
          onSelectTemplate={onGenerate}
          onCreateTemplate={canExportReports ? onCreateTemplate : undefined}
          onDeleteTemplate={canExportReports ? onDeleteTemplate : undefined}
        />
      </section>
    </div>
  );
}
