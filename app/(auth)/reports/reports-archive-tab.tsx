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
import { useReportHistory } from "@/hooks/reporting/use-report-history";
import { useReportTemplates } from "@/hooks/reporting/use-report-templates";
import { useCan } from "@/hooks/use-can";
import { canAccessGeneratedReport, computeReportArchiveStats } from "@/lib/report-analytics-data";
import { toast } from "@/lib/toast";
import { useLocale } from "@/providers/locale-provider";
import type { ReportGenerationDto, ReportTemplateDto, SiteItem } from "@/types";

const HISTORY_PAGE_SIZE = 10;
const EMPTY_TEMPLATES: ReportTemplateDto[] = [];

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
  const [historyStatus, setHistoryStatus] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [archiveKpiFilter, setArchiveKpiFilter] = useState<ReportArchiveKpiKey | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  useEffect(() => {
    setReportsSiteId(siteIdParam);
    setHistoryPage(1);
  }, [siteIdParam]);

  const {
    data: templates = EMPTY_TEMPLATES,
    isFetching: isTemplatesFetching,
    refetch: refetchTemplates,
  } = useReportTemplates({
    enabled: enabled || loadTemplates,
  });

  const {
    data: historyResult,
    isLoading: isHistoryLoading,
    isFetching: isHistoryFetching,
    refetch: refetchHistory,
  } = useReportHistory(
    {
      page: historyPage,
      limit: HISTORY_PAGE_SIZE,
      reportType: historyType || undefined,
      status: historyStatus || undefined,
      siteId: reportsSiteId || undefined,
    },
    { enabled }
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
  const prevProcessingIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const items = historyResult?.items || [];
    const currentlyProcessing = new Set(
      items
        .filter((item) => item.status === "PENDING" || item.status === "PROCESSING")
        .map((item) => item.id)
    );

    for (const id of prevProcessingIdsRef.current) {
      if (!currentlyProcessing.has(id)) {
        const finished = items.find((item) => item.id === id);
        if (finished && finished.status === "COMPLETED") {
          const toastMsg = t("reports.queue.completedToast").replace(
            "{fileName}",
            finished.fileName || (locale === "vi-VN" ? "báo cáo mới" : "new report")
          );
          toast.success(toastMsg);
        }
      }
    }

    prevProcessingIdsRef.current = currentlyProcessing;
  }, [historyResult?.items, locale, t]);

  const isAdminUser = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const userSiteIds = useMemo(() => {
    const explicit = [
      ...(Array.isArray(user?.siteIds) ? user.siteIds : []),
      ...(user?.siteId ? [user.siteId] : []),
    ].filter(Boolean);
    if (explicit.length > 0) return Array.from(new Set(explicit));
    return sites.map((s) => s.id).filter(Boolean);
  }, [user?.siteIds, user?.siteId, sites]);

  const archiveStats = useMemo(
    () =>
      computeReportArchiveStats(
        history,
        templates,
        historyResult?.meta?.total,
      ),
    [history, templates, historyResult?.meta?.total],
  );

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
    setArchiveKpiFilter((prev) => (prev === key ? null : key));
    if (key === "all") {
      setHistoryType("");
      setHistoryStatus("");
      setHistoryPage(1);
    } else if (key === "periodic") {
      setHistoryType((prev) => (prev === "DAILY" ? "" : "DAILY"));
      setHistoryPage(1);
    } else if (key === "specialized") {
      setHistoryType((prev) =>
        prev === "VIOLATION_SUMMARY" ? "" : "VIOLATION_SUMMARY",
      );
      setHistoryPage(1);
    } else if (key === "templates") {
      document
        .getElementById("reports-templates-section")
        ?.scrollIntoView({ behavior: "smooth" });
    }
  };

  function refresh() {
    void Promise.all([refetchTemplates(), refetchHistory()]);
  }

  function selectHistorySite(siteId: string) {
    setReportsSiteId(siteId);
    setHistoryPage(1);
  }

  function selectHistoryType(type: string) {
    setHistoryType(type);
    setHistoryPage(1);
  }

  function selectHistoryStatus(status: string) {
    setHistoryStatus(status);
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
    selectedReport,
    setSelectedReportId,
    selectHistorySite,
    selectHistoryType,
    selectHistoryStatus,
    handleSelectArchiveKpi,
    refetchHistory,
    historyTotal: historyResult?.meta?.total ?? history.length,
    historyPageCount: Math.max(1, historyResult?.meta?.totalPages ?? 1),
    setHistoryPage,
    isHistoryLoading,
    isHistoryFetching,
    isRefreshing: isTemplatesFetching || isHistoryFetching,
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
  const {
    archiveStats,
    archiveKpiFilter,
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
    isHistoryFetching,
    isHistoryLoading,
    refetchHistory,
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
        loading={isHistoryLoading}
        activeFilter={archiveKpiFilter}
        onSelectCard={handleSelectArchiveKpi}
      />

      {/* Danh mục 5 Loại Báo cáo Hệ thống */}
      <ReportTypeOverviewStrip
        selectedType={historyType}
        onSelectType={selectHistoryType}
        countsByType={archiveStats.byType}
        totalCount={archiveStats.totalReports}
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
            fetching={isHistoryFetching}
            onRefresh={() => {
              void refetchHistory();
            }}
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
