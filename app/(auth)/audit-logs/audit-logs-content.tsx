"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/features/app-shell/page-header";
import {
  AuditDetailDrawer,
  AuditFilterToolbar,
  AuditKpiSummary,
  AuditLogTable,
  AuditTabs,
  ExportAuditDialog,
  type AuditStatKey,
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

const STAT_TO_URL: Record<AuditStatKey, string> = {
  totalLogs: "total-logs",
  configChanges: "config-changes",
  incidentReviews: "incident-reviews",
  successRate: "success-rate",
};

const URL_TO_STAT: Record<string, AuditStatKey> = {
  "total-logs": "totalLogs",
  "config-changes": "configChanges",
  "incident-reviews": "incidentReviews",
  "success-rate": "successRate",
  totalLogs: "totalLogs",
  configChanges: "configChanges",
  incidentReviews: "incidentReviews",
  successRate: "successRate",
};

export default function AuditLogsContent() {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL state synchronization for stats
  const statParam = searchParams.get("stat");
  const selectedStat = statParam && URL_TO_STAT[statParam] ? URL_TO_STAT[statParam] : null;

  const handleSelectStat = (stat: AuditStatKey | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (stat) {
      params.set("stat", STAT_TO_URL[stat]);
    } else {
      params.delete("stat");
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  // URL state synchronization for tabs
  const tabParam = searchParams.get("tab") as AuditTabKey | null;
  const activeTab: AuditTabKey =
    tabParam === "configChanges" || tabParam === "incidentReviews" ? tabParam : "all";

  const handleTabChange = (tab: AuditTabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab !== "all") {
      params.set("tab", tab);
    } else {
      params.delete("tab");
    }
    setPage(1);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  // Filtering & Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [targetTypeFilter, setTargetTypeFilter] = useState("");
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
    page,
    limit,
    search: debouncedSearch || undefined,
    action: effectiveAction,
    targetType: targetTypeFilter || undefined,
    status: (statusFilter as AuditLogStatus) || undefined,
  });

  const { data: detailData, isLoading: isLoadingDetail } = useAuditDetail(selectedRecordId);
  const { mutateAsync: exportLogs, isPending: isExporting } = useExportAuditLogs();

  const totalLogsCount = summaryData?.totalLogs ?? logsData?.meta?.total ?? logsData?.items?.length ?? 0;
  const configChangesCount = summaryData?.configChangesCount ?? 0;
  const incidentReviewsCount = summaryData?.incidentReviewsCount ?? 0;

  const hasActiveFilters = Boolean(
    search ||
      actionFilter ||
      targetTypeFilter ||
      statusFilter ||
      activeTab !== "all",
  );

  const handleResetFilters = () => {
    setSearch("");
    setActionFilter("");
    setTargetTypeFilter("");
    setStatusFilter("");
    setPage(1);
    if (activeTab !== "all") {
      handleTabChange("all");
    }
  };

  const handleSelectRecord = (record: AuditLogItem) => {
    setSelectedRecordId(record.id);
  };

  const handleExecuteExport = async (params: ExportAuditParams) => {
    try {
      await exportLogs(params);
      toast.success(t("audit.export.success"));
    } catch {
      toast.error(
        isVietnamese
          ? "Không thể xuất file lúc này. Vui lòng thử lại sau."
          : "Unable to export logs at this time. Please try again later.",
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Trang & Huy hiệu An ninh WORM */}
      <PageHeader
        icon={ShieldCheck}
        title={t("auditLogs.title")}
        description={t("auditLogs.description")}
        badge={t("audit.badge")}
        badgeIcon={ShieldCheck}
      />

      {/* 2. Bento Grid 4 Thẻ KPI & Panel Chi Tiết Mở Rộng Dưới Thẻ */}
      <AuditKpiSummary
        summary={summaryData}
        logs={logsData?.items ?? []}
        totalLogsCount={totalLogsCount}
        loading={isLoadingSummary || isLoadingLogs}
        selectedStat={selectedStat}
        onSelectStat={handleSelectStat}
        onOpenExport={() => setExportModalOpen(true)}
        onSwitchTab={handleTabChange}
        onFilterStatus={(status) => {
          setStatusFilter(status);
          setPage(1);
        }}
        onFilterAction={(action) => {
          setActionFilter(action);
          setPage(1);
        }}
        onSelectRecord={handleSelectRecord}
      />

      {/* 3. Thanh Tab Phân Loại Nhanh (Tất cả, Đổi Cấu hình, Duyệt Sự cố) */}
      <AuditTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        totalCount={totalLogsCount}
        configChangesCount={configChangesCount}
        incidentReviewsCount={incidentReviewsCount}
      />

      {/* 4. Toolbar Lọc & Bảng Dữ Liệu Nhật Ký */}
      <div className="space-y-4">
        <AuditFilterToolbar
          search={search}
          onSearchChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          action={actionFilter}
          onActionChange={(val) => {
            setActionFilter(val);
            setPage(1);
          }}
          targetType={targetTypeFilter}
          onTargetTypeChange={(val) => {
            setTargetTypeFilter(val);
            setPage(1);
          }}
          status={statusFilter}
          onStatusChange={(val) => {
            setStatusFilter(val as AuditLogStatus | "");
            setPage(1);
          }}
          hasActiveFilters={hasActiveFilters}
          onResetFilters={handleResetFilters}
          onExport={() => setExportModalOpen(true)}
        />

        <AuditLogTable
          items={logsData?.items ?? []}
          onSelectRecord={handleSelectRecord}
          loading={isLoadingLogs}
          page={page}
          limit={limit}
          total={logsData?.meta?.total ?? totalLogsCount}
          totalPages={logsData?.meta?.totalPages ?? Math.max(1, Math.ceil(totalLogsCount / limit))}
          onPageChange={setPage}
          onLimitChange={(l) => {
            setLimit(l);
            setPage(1);
          }}
        />
      </div>

      {/* 5. Modals & Drawers */}
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
