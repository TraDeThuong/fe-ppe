"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { HelpCircle, ShieldCheck } from "lucide-react";

import { ApiError } from "@/lib/axios";
import { mapTableSort } from "@/lib/table-utils";
import { useCan } from "@/hooks/use-can";
import { useTableState } from "@/hooks/use-table-state";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/features/app-shell/page-header";
import {
  AUDIT_SEARCH_MAX_LENGTH,
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
};

const URL_TO_STAT: Record<string, AuditStatKey> = {
  "total-logs": "totalLogs",
  "config-changes": "configChanges",
  totalLogs: "totalLogs",
  configChanges: "configChanges",
};

export default function AuditLogsContent() {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const can = useCan();
  const canExport = can("AUDIT_LOG_EXPORT");
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
      // Xóa actionFilter cũ khi chuyển sang tab nhóm CONFIG để tránh kết hợp bộ lọc mâu thuẫn -> 0 kết quả
      setActionFilter("");
    } else {
      params.delete("tab");
    }
    auditTableState.resetPage();
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  // Filtering state (phân trang và sắp xếp nằm trong auditTableState)
  const searchParam = searchParams.get("search");
  const [previousSearchParam, setPreviousSearchParam] = useState(searchParam);
  const [search, setSearch] = useState(() =>
    (searchParam ?? "").trim().slice(0, AUDIT_SEARCH_MAX_LENGTH),
  );
  const [actionFilter, setActionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<AuditLogStatus | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const auditTableState = useTableState(
    [{ id: "createdAt", desc: true }],
    `${search}:${actionFilter}:${statusFilter}:${startDate}:${endDate}:${activeTab}`,
  );
  if (previousSearchParam !== searchParam) {
    setPreviousSearchParam(searchParam);
    setSearch((searchParam ?? "").trim().slice(0, AUDIT_SEARCH_MAX_LENGTH));
    auditTableState.resetPage();
  }

  const apiSorting = mapTableSort(
    auditTableState.sorting,
    { createdAt: "createdAt", action: "action" },
    { sortBy: "createdAt", order: "desc" },
  );
  const normalizedSearch = search.trim();
  const debouncedSearch = useDebounce(normalizedSearch, 350);
  const isSearchPending = normalizedSearch !== debouncedSearch;
  const isDateRangeInvalid = Boolean(startDate && endDate && startDate > endDate);
  const canQueryLogs = !isDateRangeInvalid && !isSearchPending;

  // Modals state
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);

  // Queries
  const {
    data: summaryData,
    isLoading: isLoadingSummary,
    isFetching: isFetchingSummary,
    refetch: refetchSummary,
  } = useAuditSummary(
    { startDate: startDate || undefined, endDate: endDate || undefined },
    { enabled: !isDateRangeInvalid },
  );

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
  } = useAuditLogs(
    {
      sortBy: apiSorting.sortBy,
      order: apiSorting.order,
      page: auditTableState.pagination.pageIndex + 1,
      limit: auditTableState.pagination.pageSize,
      search: debouncedSearch || undefined,
      category: effectiveCategory,
      action: actionFilter || undefined,
      status: statusFilter || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    },
    { enabled: canQueryLogs },
  );

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
    auditTableState.resetPage();

    // Xóa ?search= và ?tab= trong cùng một lần replace: nếu gọi thêm handleTabChange,
    // lần replace đó dựng URL từ searchParams cũ và sẽ đưa ?search= trở lại.
    if (!searchParams.has("search") && !searchParams.has("tab")) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("search");
    params.delete("tab");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const handleSelectRecord = (record: AuditLogItem) => {
    setSelectedRecordId(record.id);
  };

  const handleExecuteExport = async (params: ExportAuditParams) => {
    try {
      await exportLogs(params);
      toast.success(t("audit.export.success"));
    } catch (err) {
      // Response lỗi của request tải file là Blob nên không đọc được mã lỗi; chỉ dựa vào status.
      const isForbidden = err instanceof ApiError && err.status === 403;
      toast.error(
        isForbidden
          ? t("audit.export.forbidden")
          : isVietnamese
            ? "Không thể xuất file lúc này. Vui lòng thử lại sau."
            : "Unable to export logs at this time. Please try again later.",
      );
      throw err;
    }
  };

  // undefined khi thiếu quyền -> toolbar và panel thống kê đều ẩn nút Export.
  const openExportDialog = canExport ? () => setExportModalOpen(true) : undefined;

  const toolbar = (
    <AuditFilterToolbar
      search={search}
      onSearchChange={(val) => {
        setSearch(val);
        auditTableState.resetPage();
      }}
      action={actionFilter}
      onActionChange={(val) => {
        setActionFilter(val);
        auditTableState.resetPage();
      }}
      actionDistribution={summaryData?.byAction}
      showQuickActionFilters={activeTab === "all"}
      status={statusFilter}
      onStatusChange={(val) => {
        setStatusFilter(val as AuditLogStatus | "");
        auditTableState.resetPage();
      }}
      startDate={startDate}
      onStartDateChange={(val) => {
        setStartDate(val);
        auditTableState.resetPage();
      }}
      endDate={endDate}
      onEndDateChange={(val) => {
        setEndDate(val);
        auditTableState.resetPage();
      }}
      isDateRangeInvalid={isDateRangeInvalid}
      totalCount={logsData?.meta?.total ?? totalLogsCount}
      hasActiveFilters={hasActiveFilters}
      onResetFilters={handleResetFilters}
      onExport={openExportDialog}
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
        totalLogsCount={totalLogsCount}
        loading={isLoadingSummary}
        selectedStat={selectedStat}
        onSelectStat={handleSelectStat}
        onOpenExport={openExportDialog}
        onSwitchTab={handleTabChange}
        onFilterAction={(action) => {
          setActionFilter(action);
          auditTableState.resetPage();
        }}
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
          tableState={{
            ...auditTableState,
            features: {
              sorting: true,
              globalFilter: false,
              rowSelection: false,
              pagination: !isDateRangeInvalid,
            },
            manualPagination: true,
            manualSorting: true,
            manualFiltering: true,
            rowCount: logsData?.meta?.total ?? 0,
            pageCount: logsData?.meta?.totalPages ?? 1,
            fetching: isFetchingLogs || isFetchingSummary || isSearchPending,
            error: logsError,
            onRetry: canQueryLogs
              ? () => {
                  void Promise.all([refetchLogs(), refetchSummary()]);
                }
              : undefined,
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
          search: normalizedSearch || undefined,
          action: actionFilter || undefined,
          status: statusFilter || undefined,
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
