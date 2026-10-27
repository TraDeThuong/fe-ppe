"use client";

import { useState } from "react";
import { BarChart3, FilePlus2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/features/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import {
  ReportKpiSummary,
  ReportFilterToolbar,
  ReportTrendChart,
  ReportViolationDonut,
  ReportCameraRanking,
  ReportTemplateCards,
  ReportHistoryTable,
  GenerateReportModal,
} from "@/components/features/reports";
import {
  useReportSummary,
  useViolationTrends,
  useViolationDistribution,
  useCameraRankings,
  useReportTemplates,
  useReportHistory,
  useGenerateReport,
  useSites,
} from "@/hooks";
import type { ReportTemplateDto, ReportingFilterParams } from "@/types";

export default function ReportsContent() {
  const { t } = useLocale();

  // Filter States
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [period, setPeriod] = useState("30d");

  const filterParams: ReportingFilterParams = {
    siteId: selectedSiteId || undefined,
  };

  // Queries
  const {
    data: summary,
    isLoading: isSummaryLoading,
    refetch: refetchSummary,
    isRefetching: isSummaryRefetching,
  } = useReportSummary(filterParams);

  const {
    data: trends = [],
    isLoading: isTrendsLoading,
    refetch: refetchTrends,
  } = useViolationTrends(filterParams);

  const {
    data: distribution = [],
    isLoading: isDistributionLoading,
    refetch: refetchDistribution,
  } = useViolationDistribution(filterParams);

  const {
    data: cameraRankings = [],
    isLoading: isRankingsLoading,
    refetch: refetchRankings,
  } = useCameraRankings({ ...filterParams, limit: 5 });

  const {
    data: templates = [],
    isLoading: isTemplatesLoading,
    refetch: refetchTemplates,
  } = useReportTemplates();

  const {
    data: historyResult,
    isLoading: isHistoryLoading,
    refetch: refetchHistory,
  } = useReportHistory();

  const history = historyResult?.items || [];

  const { data: sitesData } = useSites();
  const sites = sitesData?.items || [];

  // Mutations
  const generateMutation = useGenerateReport();

  // Modals state
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplateDto | null>(null);

  const handleOpenGenerate = (template?: ReportTemplateDto) => {
    setSelectedTemplate(template || null);
    setIsGenerateOpen(true);
  };

  const handleRefreshAll = () => {
    refetchSummary();
    refetchTrends();
    refetchDistribution();
    refetchRankings();
    refetchTemplates();
    refetchHistory();
  };

  const isRefetching = isSummaryRefetching;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        icon={BarChart3}
        title={t("reports.title")}
        description={t("reports.description")}
        badge="Analytics & Exports"
        badgeIcon={BarChart3}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={handleRefreshAll}
              disabled={isRefetching}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
              <span>{t("common.refresh")}</span>
            </Button>

            <Button
              variant="primary"
              onClick={() => handleOpenGenerate()}
              className="gap-1.5"
            >
              <FilePlus2 className="h-4 w-4" />
              <span>{t("reports.toolbar.generateBtn")}</span>
            </Button>
          </div>
        }
      />

      {/* Bento Console KPI Summary */}
      <ReportKpiSummary
        summary={summary}
        reportsCount={history.length}
        loading={isSummaryLoading}
      />

      {/* Filter Toolbar */}
      <ReportFilterToolbar
        sites={sites}
        selectedSiteId={selectedSiteId}
        onSiteChange={setSelectedSiteId}
        period={period}
        onPeriodChange={setPeriod}
        onGenerateClick={() => handleOpenGenerate()}
        onRefresh={handleRefreshAll}
        loading={isRefetching}
      />

      {/* 2-Column: Trends Line Chart (Left: 7-8 cols) & Violation Donut (Right: 4-5 cols) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <ReportTrendChart trends={trends} loading={isTrendsLoading} />
        </div>
        <div className="lg:col-span-4">
          <ReportViolationDonut distribution={distribution} loading={isDistributionLoading} />
        </div>
      </div>

      {/* Camera Hotspot Risk Rankings */}
      <ReportCameraRanking rankings={cameraRankings} loading={isRankingsLoading} />

      {/* Standardized Report Templates Cards */}
      <ReportTemplateCards
        templates={templates}
        onSelectTemplate={(tpl) => handleOpenGenerate(tpl)}
      />

      {/* Export History & Queue Table */}
      <ReportHistoryTable history={history} loading={isHistoryLoading} />

      {/* Generate Report Modal */}
      <GenerateReportModal
        open={isGenerateOpen}
        onOpenChange={setIsGenerateOpen}
        templates={templates}
        sites={sites}
        selectedTemplate={selectedTemplate}
        loading={generateMutation.isPending}
        onSubmit={async (dto) => {
          await generateMutation.mutateAsync(dto);
        }}
      />
    </div>
  );
}
