"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { HelpCircle, ShieldCheck } from "lucide-react";

import { mapTableSort } from "@/lib/table-utils";
import { useTableState } from "@/hooks/use-table-state";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/features/app-shell/page-header";
import {
  AuditDetailDrawer,
  AuditFilterToolbar,
  AuditHelpDialog,
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
  failed: "failed",
};

const URL_TO_STAT: Record<string, AuditStatKey> = {
  "total-logs": "totalLogs",
  "config-changes": "configChanges",
  failed: "failed",
  totalLogs: "totalLogs",
  configChanges: "configChanges",
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

  // URL state synchronization for tabs
  const tabParam = searchParams.get("tab");
  const activeTab: AuditTabKey = tabParam === "configChanges" ? "configChanges" : "all";

  // Clean obsolete/invalid URL query parameters (e.g. ?stat=success-rate or ?tab=incidentReviews)
  useEffect(() => {
    const hasInvalidStat = Boolean(statParam && !URL_TO_STAT[statParam]);
    const hasInvalidTab = Boolean(tabParam && tabParam !== "configChanges" && tabParam !== "all");
    if (!hasInvalidStat && !hasInvalidTab) return;

    const params = new URLSearchParams(searchParams.toString());
    if (hasInvalidStat) params.delete("stat");
    if (hasInvalidTab) params.delete("tab");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [statParam, tabParam, searchParams, pathname, router]);

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
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<AuditLogStatus | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const auditTableState = useTableState(
    [{ id: "createdAt", desc: true }],
    `${search}:${actionFilter}:${statusFilter}:${startDate}:${endDate}:${activeTab}`,
  );
  const apiSorting = mapTableSort(
    auditTableState.sorting,
    { createdAt: "createdAt", action: "action" },
    { sortBy: "createdAt", order: "desc" },
  );
  const debouncedSearch = useDebounce(search, 350);

  // Modals state
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);

  // Queries
  const { data: summaryData, isLoading: isLoadingSummary } = useAuditSummary({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const effectiveCategory = useMemo(() => {
    if (activeTab === "configChanges") return "CONFIG";
    return undefined;
  }, [activeTab]);

  const {
    data: logsData,
    isLoading: isLoadingLogs,
    isFetching: isFetchingLogs,
    error: logsError,
    refetch: refetchLogs,
  } = useAuditLogs({
    sortBy: apiSorting.sortBy,
    order: apiSorting.order,
    page,
    limit,
    search: debouncedSearch || undefined,
    category: effectiveCategory,
    action: actionFilter || undefined,
    status: (statusFilter as AuditLogStatus) || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const { data: detailData, isLoading: isLoadingDetail } = useAuditDetail(selectedRecordId);
  const { mutateAsync: exportLogs, isPending: isExporting } = useExportAuditLogs();

  const hasToolbarFilters = Boolean(
    search || actionFilter || statusFilter || startDate || endDate,
  );
  const hasActiveFilters = Boolean(hasToolbarFilters || activeTab !== "all");

  const totalLogsCount =
    summaryData?.totalLogs ??
    (activeTab === "all" && !hasToolbarFilters ? logsData?.meta?.total : undefined) ??
    0;
  const configChangesCount = summaryData?.configChangesCount ?? 0;

  const handleResetFilters = () => {
    setSearch("");
    setActionFilter("");
    setStatusFilter("");
    setStartDate("");
    setEndDate("");
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

  const toolbar = (
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
      actionDistribution={summaryData?.byAction}
      showQuickActionFilters={activeTab === "all"}
      status={statusFilter}
      onStatusChange={(val) => {
        setStatusFilter(val as AuditLogStatus | "");
        setPage(1);
      }}
      startDate={startDate}
      onStartDateChange={(val) => {
        setStartDate(val);
        setPage(1);
      }}
      endDate={endDate}
      onEndDateChange={(val) => {
        setEndDate(val);
        setPage(1);
      }}
      totalCount={logsData?.meta?.total ?? totalLogsCount}
      hasActiveFilters={hasActiveFilters}
      onResetFilters={handleResetFilters}
      onExport={() => setExportModalOpen(true)}
    />
  );

  return (
    <div className="space-y-6">
      {/* 1. Header Trang & Huy hiệu An ninh WORM */}
      <PageHeader
        icon={ShieldCheck}
        title={t("auditLogs.title")}
        description={t("auditLogs.description")}
        badge={t("audit.badge")}
        badgeIcon={ShieldCheck}
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setHelpModalOpen(true)}
            className="gap-1.5 rounded-xl text-xs font-semibold text-primary border-primary/30 hover:bg-primary/10"
          >
            <HelpCircle className="h-4 w-4" />
            <span>{t("audit.help.button")}</span>
          </Button>
        }
      />

      {/* 2. Unified 2-in-1 Bento Card & Panel Chi Tiết Mở Rộng */}
      <AuditKpiSummary
        summary={summaryData}
        logs={logsData?.items ?? []}
        totalLogsCount={totalLogsCount}
        loading={isLoadingSummary}
        selectedStat={selectedStat}
        selectedAction={actionFilter}
        onSelectStat={handleSelectStat}
        onOpenExport={() => setExportModalOpen(true)}
        onOpenHelp={() => setHelpModalOpen(true)}
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

      {/* 3. Thanh Tab Phân Loại Nhanh (Tất cả Nhật ký, Thay đổi Cấu hình) */}
      <AuditTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        totalCount={totalLogsCount}
        configChangesCount={configChangesCount}
      />

      {/* 4. Toolbar Lọc & Bảng Dữ Liệu Nhật Ký */}
      <div className="space-y-4">
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
          tableState={{
            ...auditTableState,
            features: {
              sorting: true,
              globalFilter: false,
              rowSelection: false,
            },
            manualPagination: true,
            manualSorting: true,
            manualFiltering: true,
            pagination: { pageIndex: page - 1, pageSize: limit },
            onPaginationChange: (update) => {
              const next =
                typeof update === "function"
                  ? update({ pageIndex: page - 1, pageSize: limit })
                  : update;
              setPage(next.pageIndex + 1);
              setLimit(next.pageSize);
            },
            rowCount: logsData?.meta?.total ?? 0,
            pageCount: logsData?.meta?.totalPages ?? 1,
            fetching: isFetchingLogs,
            error: logsError,
            onRetry: () => {
              void refetchLogs();
            },
            toolbar,
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
        activeFilters={{
          category: effectiveCategory,
          search: debouncedSearch || undefined,
          action: actionFilter || undefined,
          status: (statusFilter as AuditLogStatus) || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }}
        loading={isExporting}
      />

      <AuditHelpDialog
        open={helpModalOpen}
        onOpenChange={setHelpModalOpen}
      />
    </div>
  );
}
