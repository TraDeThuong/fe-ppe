"use client";

import { useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/features/app-shell/page-header";
import {
  AuditDetailDrawer,
  AuditFilterToolbar,
  AuditKpiSummary,
  AuditLogTable,
  AuditTabs,
  ExportAuditDialog,
  type AuditTabKey,
} from "@/components/features/audit-logs";
import {
  useAuditDetail,
  useAuditLogs,
  useAuditSummary,
  useDebounce,
  useExportAuditLogs,
} from "@/hooks";
import { useLocale } from "@/providers/locale-provider";
import { toast } from "@/lib/toast";
import type { AuditLogItem, AuditLogStatus, ExportAuditParams } from "@/types";

export default function AuditLogsContent() {
  const { t } = useLocale();

  const [activeTab, setActiveTab] = useState<AuditTabKey>("all");
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<AuditLogStatus | "">("");
  const debouncedSearch = useDebounce(search, 300);

  // Modals state
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Queries
  const { data: summaryData, isLoading: isLoadingSummary } = useAuditSummary();

  const effectiveAction = useMemo(() => {
    if (activeTab === "configChanges") return "UPDATE_CONFIG";
    if (activeTab === "incidentReviews") return "REVIEW_INCIDENT";
    return actionFilter || undefined;
  }, [activeTab, actionFilter]);

  const { data: logsData, isLoading: isLoadingLogs } = useAuditLogs({
    search: debouncedSearch || undefined,
    action: effectiveAction,
    status: (statusFilter as AuditLogStatus) || undefined,
    limit: 50,
  });

  const { data: detailData, isLoading: isLoadingDetail } = useAuditDetail(selectedRecordId);

  const { mutateAsync: exportLogs, isPending: isExporting } = useExportAuditLogs();

  const totalLogsCount = logsData?.meta?.total ?? logsData?.items?.length ?? 0;
  const configChangesCount = summaryData?.configChangesCount ?? 0;
  const incidentReviewsCount = summaryData?.incidentReviewsCount ?? 0;

  const handleSelectRecord = (record: AuditLogItem) => {
    setSelectedRecordId(record.id);
  };

  const handleExecuteExport = async (params: ExportAuditParams) => {
    try {
      await exportLogs(params);
      toast.success(t("audit.export.success"));
    } catch {
      toast.error("Không thể xuất file lúc này. Vui lòng thử lại sau.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ShieldCheck}
        title={t("auditLogs.title")}
        description={t("auditLogs.description")}
        badge={t("audit.badge")}
        badgeIcon={ShieldCheck}
      />

      <AuditKpiSummary
        summary={summaryData}
        totalLogsCount={totalLogsCount}
        loading={isLoadingSummary || isLoadingLogs}
      />

      <AuditTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        totalCount={totalLogsCount}
        configChangesCount={configChangesCount}
        incidentReviewsCount={incidentReviewsCount}
      />

      <div className="space-y-4">
        <AuditFilterToolbar
          search={search}
          onSearchChange={setSearch}
          action={actionFilter}
          onActionChange={setActionFilter}
          status={statusFilter}
          onStatusChange={(val) => setStatusFilter(val as AuditLogStatus | "")}
          onExport={() => setExportModalOpen(true)}
        />

        <AuditLogTable
          items={logsData?.items ?? []}
          onSelectRecord={handleSelectRecord}
          loading={isLoadingLogs}
        />
      </div>

      {/* Modals & Drawers */}
      <AuditDetailDrawer
        open={Boolean(selectedRecordId)}
        onOpenChange={(open) => !open && setSelectedRecordId(null)}
        detail={detailData ?? null}
        loading={isLoadingDetail}
      />

      <ExportAuditDialog
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        onExport={handleExecuteExport}
        loading={isExporting}
      />
    </div>
  );
}
