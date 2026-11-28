"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GenerateReportModal } from "@/components/features/reports/generate-report-modal";
import { ReportPreviewModal } from "@/components/features/reports/report-preview-modal";
import type { ReportStatKey } from "@/components/features/reports/report-stats-detail-panel";
import { CreateReportTemplateModal } from "@/components/features/reports/report-template-actions-modals";
import { ReportsHeader, type ReportsPageTab } from "@/components/features/reports/reports-header";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useGenerateReport } from "@/hooks/reporting/use-generate-report";
import { useCreateReportTemplate, useDeleteReportTemplate } from "@/hooks/reporting/use-report-templates";
import { useSitesCatalog } from "@/hooks/sites/use-sites";
import { useCan } from "@/hooks/use-can";
import { validateReportPeriod } from "@/lib/report-analytics-data";
import { useLocale } from "@/providers/locale-provider";
import { reportingService } from "@/services/reporting.service";
import type { ReportGenerationDto, ReportTemplateDto, SiteItem } from "@/types";
import { ReportsAnalyticsTab, useReportsAnalytics } from "./reports-analytics-tab";
import { ReportsArchiveTab, useReportsArchive } from "./reports-archive-tab";

const EMPTY_SITES: SiteItem[] = [];

const STAT_TO_URL: Record<ReportStatKey, string> = {
  totalViolations: "violations",
  complianceRate: "compliance",
  mttr: "mttr",
  pendingReview: "pending",
};

const URL_TO_STAT: Record<string, ReportStatKey> = {
  violations: "totalViolations",
  "total-violations": "totalViolations",
  totalViolations: "totalViolations",
  compliance: "complianceRate",
  "compliance-rate": "complianceRate",
  complianceRate: "complianceRate",
  mttr: "mttr",
  pending: "pendingReview",
  "pending-review": "pendingReview",
  pendingReview: "pendingReview",
};

export default function ReportsContent() {
  const { t, locale } = useLocale();
  const can = useCan();
  const canExportReports = can("PPE_REPORTING_EXPORT");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isArchiveTab = searchParams.get("tab") === "reports";
  const activeTab: ReportsPageTab = isArchiveTab ? "reports" : "analytics";
  const siteIdParam = searchParams.get("siteId")?.trim() || "";
  const statParam = searchParams.get("stat");
  const selectedStat =
    statParam && Object.hasOwn(URL_TO_STAT, statParam) ? URL_TO_STAT[statParam] : null;

  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplateDto | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewReport, setPreviewReport] = useState<ReportGenerationDto | null>(null);
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [deleteTemplateTarget, setDeleteTemplateTarget] =
    useState<ReportTemplateDto | null>(null);

  const generateMutation = useGenerateReport();
  const createTemplateMutation = useCreateReportTemplate();
  const deleteTemplateMutation = useDeleteReportTemplate();

  const { data: sites = EMPTY_SITES } = useSitesCatalog({ enabled: can("PPE_SITE_READ") });
  const analytics = useReportsAnalytics({ enabled: !isArchiveTab, siteIdParam, sites });
  const archive = useReportsArchive({
    enabled: isArchiveTab,
    loadTemplates: isGenerateOpen || isCreateTemplateOpen,
    siteIdParam,
    sites,
  });
  const activeView = isArchiveTab ? archive : analytics;

  function replaceQuery(params: URLSearchParams) {
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function handleTabChange(nextTab: ReportsPageTab) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextTab === "reports") {
      params.set("tab", "reports");
      params.delete("stat");
    } else {
      params.delete("tab");
    }
    replaceQuery(params);
  }

  function handleSelectStat(stat: ReportStatKey | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (stat) {
      params.set("stat", STAT_TO_URL[stat]);
    } else {
      params.delete("stat");
    }
    replaceQuery(params);
  }

  function handleOpenGenerate(template?: ReportTemplateDto) {
    setSelectedTemplate(template ?? null);
    setIsGenerateOpen(true);
  }

  function handleOpenPreview(report: ReportGenerationDto) {
    setPreviewReport(report);
    setIsPreviewOpen(true);
  }

  function handleOpenCreateTemplate() {
    setIsCreateTemplateOpen(true);
  }

  return (
    <div className="space-y-6">
      <ReportsHeader
        activeTab={activeTab}
        onTabChange={handleTabChange}
        totalIncidents={analytics.summary?.totalIncidents}
        complianceRate={analytics.summary?.complianceRate}
        totalReports={archive.archiveStats?.totalReports}
        activeTemplates={archive.templateCounts?.active}
        isRefreshing={activeView.isRefreshing}
        canExportReports={canExportReports}
        onRefreshAll={activeView.refresh}
        onGenerateReport={() => handleOpenGenerate()}
        onCreateTemplate={handleOpenCreateTemplate}
      />

      {isArchiveTab ? (
        <ReportsArchiveTab
          archive={archive}
          canExportReports={canExportReports}
          onGenerate={handleOpenGenerate}
          onOpenPreview={handleOpenPreview}
          onCreateTemplate={handleOpenCreateTemplate}
          onDeleteTemplate={setDeleteTemplateTarget}
        />
      ) : (
        <ReportsAnalyticsTab
          analytics={analytics}
          selectedStat={selectedStat}
          onSelectStat={handleSelectStat}
        />
      )}

      {/* Generate Report Modal */}
      <GenerateReportModal
        open={isGenerateOpen}
        onOpenChange={setIsGenerateOpen}
        templates={archive.templates}
        sites={sites}
        selectedTemplate={selectedTemplate}
        defaultSiteId={isArchiveTab ? archive.reportsSiteId || analytics.selectedSiteId : analytics.selectedSiteId}
        defaultStartDate={analytics.startDate}
        defaultEndDate={analytics.endDate}
        loading={generateMutation.isPending}
        validatePeriod={validateReportPeriod}
        onSubmit={async (dto) => {
          const createdReport = await generateMutation.mutateAsync(dto);
          setIsGenerateOpen(false);
          if (createdReport) {
            archive.setSelectedReportId(createdReport.id);
            handleTabChange("reports");
            try {
              await reportingService.downloadReportFile(createdReport);
            } catch (err) {
              console.error("Auto-download failed:", err);
            }
          }
        }}
      />

      {/* Report Preview Modal */}
      <ReportPreviewModal
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        report={previewReport}
        onDownload={(report) => reportingService.downloadReportFile(report)}
      />

      <CreateReportTemplateModal
        open={isCreateTemplateOpen}
        onOpenChange={setIsCreateTemplateOpen}
        loading={createTemplateMutation.isPending}
        onSubmit={(dto) => createTemplateMutation.mutateAsync(dto)}
      />

      <ConfirmDialog
        open={Boolean(deleteTemplateTarget)}
        onClose={() => setDeleteTemplateTarget(null)}
        onConfirm={async () => {
          if (!deleteTemplateTarget) return;
          await deleteTemplateMutation.mutateAsync(deleteTemplateTarget.id);
          setDeleteTemplateTarget(null);
        }}
        variant="danger"
        loading={deleteTemplateMutation.isPending}
        title={locale === "vi-VN" ? "Xóa mẫu báo cáo?" : "Delete report template?"}
        description={deleteTemplateTarget?.name || ""}
        confirmText={t("common.delete")}
      />
    </div>
  );
}
