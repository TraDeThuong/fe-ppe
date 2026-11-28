"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, BellOff } from "lucide-react";
import {
  NotificationConsoleHeader,
  NotificationKpiSummary,
  NotificationTabs,
  NotificationFilterToolbar,
  NotificationList,
  NotificationSectionList,
  NotificationDetailPanel,
  NotificationPreferencesCard,
  NotificationTemplatesTab,
  NotificationEmailLogsTab,
  BroadcastNotificationModal,
  PreviewTemplateModal,
  TestSendTemplateModal,
  ConfirmDeleteNotificationModal,
  CreateNotificationTemplateModal,
  EditNotificationTemplateModal,
  DeleteNotificationTemplateDialog,
  CustomDispatchNotificationModal,
  useNotificationTabAccess,
  type NotificationTabKey,
  type NotificationFilterState,
} from "@/components/features/notifications";
import {
  NotificationArchiveButton,
  NotificationArchiveTab,
} from "@/components/features/notifications/notification-archive-controls";
import { useNotificationArchiveAccount } from "@/hooks/notifications/use-notification-archive";
import { usePublicConfig } from "@/hooks/auth";
import {
  useNotifications,
  useNotificationTotal,
  useNotificationEnrichment,
  useMarkAsRead,
  useMarkManyAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
} from "@/hooks/notifications";
import { vietnamToday } from "@/lib/dashboard-data";
import {
  createDefaultIncidentPeriodFilter,
  parseIncidentPeriodFromUrl,
  resolveIncidentPeriod,
  type IncidentPeriodFilter,
} from "@/lib/incident-period";
import {
  groupNotificationsByPerson,
  groupNotificationsIntoSections,
  type NotificationViewMode,
} from "@/lib/notification-grouping-engine";
import { NotificationPagination } from "@/components/features/notifications/notification-list";
import { NotificationMobileInbox } from "@/components/features/notifications/mobile";
import { useResponsiveVariant } from "@/hooks/use-media-query";
import { useRealtime } from "@/contexts/RealtimeContext";
import {
  getConfig,
  isFeatureFlagEnabled,
  SYSTEM_CONFIG_KEYS,
} from "@/lib/system-config";
import { useLocale } from "@/providers/locale-provider";
import type { NotificationItemDto, NotificationTemplateItemDto } from "@/types";

const GROUPING_PREFS_STORAGE_KEY = "ppe.notifications.grouping-prefs.v2";
const EMPTY_NOTIFICATIONS: NotificationItemDto[] = [];

export default function NotificationsContent() {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const archiveAccount = useNotificationArchiveAccount();
  // Mobile (< 768px) dùng hộp thư gọn; desktop giữ nguyên. Lúc hydrate cả hai cùng có mặt, CSS chọn bản hiện.
  const { showMobile, showDesktop } = useResponsiveVariant();

  const { isConnected } = useRealtime();
  const { data: publicConfig } = usePublicConfig();
  const notificationsEnabled = isFeatureFlagEnabled(
    getConfig(publicConfig, SYSTEM_CONFIG_KEYS.notificationsEnabled, true),
  );
  const {
    canBroadcast,
    canManageTemplates,
    allowedTabs,
  } = useNotificationTabAccess();

  // Header time period filter state (đồng bộ với URL & tác động toàn trang)
  const urlPeriod = searchParams.get("period");
  const urlFromDate = searchParams.get("fromDate");
  const urlToDate = searchParams.get("toDate");

  const [today, setToday] = useState(() => vietnamToday());
  useEffect(() => {
    const syncToday = () => {
      if (!document.hidden) {
        const current = vietnamToday();
        setToday((prev) => (prev === current ? prev : current));
      }
    };
    document.addEventListener("visibilitychange", syncToday);
    window.addEventListener("focus", syncToday);
    return () => {
      document.removeEventListener("visibilitychange", syncToday);
      window.removeEventListener("focus", syncToday);
    };
  }, []);

  const [periodFilter, setPeriodFilter] = useState<IncidentPeriodFilter>(() =>
    parseIncidentPeriodFromUrl(
      { period: urlPeriod, fromDate: urlFromDate, toDate: urlToDate },
      vietnamToday(),
    ),
  );

  useEffect(() => {
    const parsed = parseIncidentPeriodFromUrl(
      { period: urlPeriod, fromDate: urlFromDate, toDate: urlToDate },
      today,
    );
    setPeriodFilter((prev) => {
      const prevResolved = resolveIncidentPeriod(prev);
      const parsedResolved = resolveIncidentPeriod(parsed);
      if (
        prev.mode === parsed.mode &&
        prevResolved.fromDate === parsedResolved.fromDate &&
        prevResolved.toDate === parsedResolved.toDate
      ) {
        return prev;
      }
      return parsed;
    });
  }, [urlPeriod, urlFromDate, urlToDate, today]);

  const resolvedPeriod = useMemo(
    () => resolveIncidentPeriod(periodFilter),
    [periodFilter],
  );
  const periodFromDate =
    resolvedPeriod.mode !== "all" && resolvedPeriod.isValid
      ? resolvedPeriod.fromDate
      : undefined;
  const periodToDate =
    resolvedPeriod.mode !== "all" && resolvedPeriod.isValid
      ? resolvedPeriod.toDate
      : undefined;
  const hasPeriodFilter = Boolean(periodFromDate || periodToDate);

  const handlePeriodFilterChange = (next: IncidentPeriodFilter) => {
    setPeriodFilter(next);
    setPage(1);
    const nextResolved = resolveIncidentPeriod(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next.mode === "all") {
      params.delete("period");
      params.delete("fromDate");
      params.delete("toDate");
    } else if (nextResolved.isValid) {
      params.set("period", next.mode);
      if (nextResolved.fromDate) params.set("fromDate", nextResolved.fromDate);
      else params.delete("fromDate");
      if (nextResolved.toDate) params.set("toDate", nextResolved.toDate);
      else params.delete("toDate");
    } else {
      return;
    }
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };

  // Tab navigation state (derived directly from URL + RBAC access so back/forward/links always sync)
  const tabParam = searchParams.get("tab") as NotificationTabKey | null;
  const activeTab: NotificationTabKey =
    tabParam && allowedTabs.includes(tabParam) ? tabParam : "inbox";

  const handleTabChange = (tab: NotificationTabKey) => {
    if (!allowedTabs.includes(tab)) return;
    setMobileDetailOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "inbox") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  // Filtering and server-side pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const listScope = JSON.stringify([activeTab, periodFromDate, periodToDate]);
  const [previousListScope, setPreviousListScope] = useState(listScope);
  if (previousListScope !== listScope) {
    setPreviousListScope(listScope);
    setPage(1);
  }
  const [viewMode, setViewMode] = useState<NotificationViewMode>("flat");
  const [prefsHydrated, setPrefsHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(GROUPING_PREFS_STORAGE_KEY) || "null",
      ) as {
        viewMode?: NotificationViewMode;
      } | null;
      if (
        saved?.viewMode &&
        ["flat", "person", "hour", "camera"].includes(saved.viewMode)
      ) {
        setViewMode(saved.viewMode);
      }
    } catch {
      // Ignore storage access errors
    } finally {
      setPrefsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!prefsHydrated) return;
    try {
      localStorage.setItem(
        GROUPING_PREFS_STORAGE_KEY,
        JSON.stringify({ viewMode }),
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [prefsHydrated, viewMode]);

  const [filter, setFilter] = useState<NotificationFilterState>({
    search: "",
    isRead: undefined,
    severity: undefined,
    channel: undefined,
    type: undefined,
    fromDate: undefined,
    toDate: undefined,
  });

  const filterQuery = useMemo(
    () => ({
      search: filter.search.trim() || undefined,
      isRead: filter.isRead,
      severity: filter.severity,
      channel: filter.channel,
      type: filter.type,
      fromDate: periodFromDate ?? filter.fromDate,
      toDate: periodToDate ?? filter.toDate,
    }),
    [filter, periodFromDate, periodToDate],
  );

  // Queries
  const isListTab = activeTab === "inbox" || activeTab === "archive";
  const notificationsQuery = useNotifications({
    ...filterQuery,
    page,
    limit,
    archived: activeTab === "archive",
  }, { enabled: isListTab });
  const {
    data: notificationsPage,
    isLoading: isNotificationsLoading,
    isFetching: isNotificationsFetching,
    error: notificationsError,
    refetch: refetchNotifications,
  } = notificationsQuery;

  const meta = notificationsPage?.meta;
  const lastPage = meta ? Math.max(1, meta.totalPages) : undefined;
  useEffect(() => {
    if (lastPage !== undefined && !isNotificationsFetching && page > lastPage) {
      setPage(lastPage);
    }
  }, [lastPage, isNotificationsFetching, page]);

  const items = notificationsPage?.data ?? EMPTY_NOTIFICATIONS;
  const period = { fromDate: periodFromDate, toDate: periodToDate };
  const totalQuery = useNotificationTotal(period);
  const unreadQuery = useNotificationTotal({ ...period, isRead: false });
  const alertsQuery = useNotificationTotal({ ...period, type: "ALERT" });
  const periodTotal = totalQuery.data;
  const periodUnreadCount = unreadQuery.data;
  const periodAlertCount = alertsQuery.data;
  const isStatsLoading = totalQuery.isLoading || unreadQuery.isLoading || alertsQuery.isLoading;

  const handleRefresh = () => {
    if (isListTab) void refetchNotifications();
    void Promise.all([totalQuery.refetch(), unreadQuery.refetch(), alertsQuery.refetch()]);
  };

  const hasGroupableIncidentItems = useMemo(() => {
    let incidentCount = 0;
    for (const item of items) {
      if (item.incidentId) {
        incidentCount += 1;
        if (incidentCount >= 2) return true;
      }
    }
    return viewMode === "camera" && incidentCount >= 1;
  }, [items, viewMode]);

  const shouldEnrich =
    activeTab === "inbox" && viewMode !== "flat" && hasGroupableIncidentItems;
  const { signalsMap } = useNotificationEnrichment({
    enabled: shouldEnrich,
    maxIncidents: 100,
  });

  // Mutations
  const markAsReadMutation = useMarkAsRead();
  const markManyAsReadMutation = useMarkManyAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();
  const deleteMutation = useDeleteNotification();

  // Modals state
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [isCustomDispatchModalOpen, setIsCustomDispatchModalOpen] = useState(false);
  const [isCreateTemplateModalOpen, setIsCreateTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplateItemDto | null>(null);
  const [deletingTemplateInfo, setDeletingTemplateInfo] = useState<{
    template: NotificationTemplateItemDto;
    isSystem: boolean;
  } | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<NotificationTemplateItemDto | null>(null);
  const [testSendTemplate, setTestSendTemplate] = useState<NotificationTemplateItemDto | null>(null);
  const [deletingNotification, setDeletingNotification] = useState<NotificationItemDto | null>(null);
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  useEffect(() => {
    if (isListTab && notificationsPage && selectedNotificationId &&
      !items.some((item) => item.id === selectedNotificationId)) {
      setSelectedNotificationId(null);
      setMobileDetailOpen(false);
    }
  }, [isListTab, notificationsPage, items, selectedNotificationId]);

  const groupingOptions = useMemo(() => ({ isVietnamese }), [isVietnamese]);

  const personClusters = useMemo(
    () => activeTab === "inbox" && viewMode === "person"
      ? groupNotificationsByPerson(items, signalsMap, groupingOptions)
      : undefined,
    [activeTab, viewMode, items, signalsMap, groupingOptions],
  );

  const sections = useMemo(() => {
    if (activeTab !== "inbox" || (viewMode !== "hour" && viewMode !== "camera")) return [];
    return groupNotificationsIntoSections(items, viewMode, signalsMap, groupingOptions);
  }, [activeTab, viewMode, items, signalsMap, groupingOptions]);

  const selectedNotification =
    items.find((item) => item.id === selectedNotificationId) ??
    personClusters?.[0]?.primary ??
    sections[0]?.clusters[0]?.primary ??
    items[0] ??
    null;

  const sectionClusters = useMemo(() => sections.flatMap((section) => section.clusters), [sections]);
  const selectedCluster = selectedNotification
    ? (personClusters ?? sectionClusters).find((cluster) =>
        cluster.count > 1 && cluster.items.some((item) => item.id === selectedNotification.id),
      )
    : undefined;

  const showMobileDetail = mobileDetailOpen && selectedNotification?.id === selectedNotificationId;

  const hasActiveFilters = Boolean(
    filter.search ||
      filter.isRead !== undefined ||
      filter.severity ||
      filter.channel ||
      filter.type ||
      filter.fromDate ||
      filter.toDate ||
      hasPeriodFilter,
  );

  const handleFilterChange = (newFilter: NotificationFilterState) => {
    setFilter(newFilter);
    setPage(1);
  };

  const handleLimitChange = (nextLimit: number) => {
    setLimit(nextLimit);
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilter({
      search: "",
      isRead: undefined,
      severity: undefined,
      channel: undefined,
      type: undefined,
      fromDate: undefined,
      toDate: undefined,
    });
    handlePeriodFilterChange(createDefaultIncidentPeriodFilter(today));
    setPage(1);
  };

  const handleSelectNotification = (item: NotificationItemDto) => {
    setSelectedNotificationId(item.id);
    if (typeof window !== "undefined" && !window.matchMedia("(min-width: 1280px)").matches) {
      setMobileDetailOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingNotification) return;
    try {
      const deletedId = deletingNotification.id;
      await deleteMutation.mutateAsync(deletedId);
      setDeletingNotification(null);
      if (selectedNotificationId === deletedId) {
        setSelectedNotificationId(null);
        setMobileDetailOpen(false);
      }
    } catch {
      // Toast handled by mutation
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 pb-10">
      {/* Mobile (< 768px): chip đọc/chưa đọc · tìm kiếm + Lọc + ⋯ · danh sách gọn */}
      {showMobile && (
        <div className="md:hidden">
          <NotificationMobileInbox
            activeTab={activeTab}
            allowedTabs={allowedTabs}
            onTabChange={handleTabChange}
            items={items}
            loading={isNotificationsLoading}
            error={notificationsError}
            onRetry={() => void refetchNotifications()}
            page={meta?.page ?? page}
            totalPages={meta?.totalPages ?? 1}
            onPageChange={setPage}
            filter={filter}
            onFilterChange={handleFilterChange}
            hasActiveFilters={hasActiveFilters}
            onResetFilters={handleResetFilters}
            periodFilter={periodFilter}
            today={today}
            onPeriodFilterChange={handlePeriodFilterChange}
            totalCount={periodTotal}
            unreadCount={periodUnreadCount}
            notificationsEnabled={notificationsEnabled}
            onMarkAsRead={(id) => markAsReadMutation.mutate(id)}
            onMarkAllRead={() => markAllAsReadMutation.mutate()}
            isMarkingAllRead={markAllAsReadMutation.isPending}
            onOpenDetail={handleSelectNotification}
            canBroadcast={canBroadcast}
            onOpenBroadcast={() => {
              if (!notificationsEnabled) return;
              setIsBroadcastModalOpen(true);
            }}
            onOpenCustomDispatch={() => {
              if (!notificationsEnabled) return;
              setIsCustomDispatchModalOpen(true);
            }}
          />
        </div>
      )}

      {/* Desktop (≥ 768px): giữ nguyên */}
      {showDesktop && (
      <div className="hidden flex-col gap-6 md:flex">
      {/* 1. Console Header Trang, Trạng thái Realtime SSE & Bộ lọc thời gian toàn trang */}
      <NotificationConsoleHeader
        isConnected={isConnected}
        isRefreshing={isNotificationsFetching || totalQuery.isFetching || unreadQuery.isFetching || alertsQuery.isFetching}
        onRefresh={handleRefresh}
        totalCount={periodTotal ?? 0}
        unreadCount={periodUnreadCount ?? 0}
        canBroadcast={canBroadcast}
        notificationsEnabled={notificationsEnabled}
        onOpenCustomDispatch={() => {
          if (!notificationsEnabled) return;
          setIsCustomDispatchModalOpen(true);
        }}
        onOpenBroadcast={() => {
          if (!notificationsEnabled) return;
          setIsBroadcastModalOpen(true);
        }}
        periodFilter={periodFilter}
        resolvedPeriod={resolvedPeriod}
        today={today}
        onPeriodFilterChange={handlePeriodFilterChange}
      />

      {/* 1b. Banner cảnh báo toàn trang khi Hệ thống thông báo bị Quản trị viên tạm dừng */}
      {!notificationsEnabled && (
        <div
          role="alert"
          data-testid="notifications-disabled-banner"
          className="relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-warning/35 bg-gradient-to-r from-warning/15 via-surface/95 to-warning/10 p-4 text-xs shadow-[6px_6px_16px_var(--shadow-dark),-6px_-6px_16px_var(--shadow-light)] sm:flex-row sm:items-center sm:justify-between sm:rounded-3xl sm:p-5 dark:border-warning/30 dark:bg-card/95"
        >
          <div className="flex items-start gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-warning/30 bg-warning/15 text-warning shadow-[3px_3px_8px_var(--shadow-dark),-3px_-3px_8px_var(--shadow-light)]">
              <BellOff className="size-5" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-warning/35 bg-warning/15 px-2.5 py-0.5 font-mono text-[10px] font-extrabold uppercase tracking-wider text-warning">
                  <AlertTriangle className="size-3" />
                  <span>
                    {isVietnamese
                      ? "Tạm dừng toàn hệ thống"
                      : "System-wide Pause"}
                  </span>
                </span>
              </div>
              <p className="text-xs font-bold leading-relaxed text-foreground sm:text-sm">
                {isVietnamese
                  ? "Hệ thống gửi thông báo và email tự động đang bị Quản trị viên tạm dừng. Các cảnh báo tự động, email và thao tác phát thông báo tạm thời bị vô hiệu hóa."
                  : "Automated notifications and email dispatch are currently paused by the Administrator. Automated alerts, emails, and manual dispatch actions are temporarily disabled."}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {isVietnamese
                  ? "Bạn vẫn có thể tra cứu lịch sử hộp thư thông báo cũ và tùy chỉnh cấu hình nhận tin cá nhân để áp dụng khi hệ thống hoạt động trở lại."
                  : "You can still browse historical inbox records and adjust personal preferences for when the notification system is re-enabled."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Thẻ KPI Thống kê Neumorphism đồng đều, ổn định theo bộ lọc kỳ thời gian */}
      <NotificationKpiSummary
        stats={periodTotal !== undefined && periodUnreadCount !== undefined && periodAlertCount !== undefined
          ? { total: periodTotal, unread: periodUnreadCount, ppeAlerts: periodAlertCount, resolved: periodTotal - periodUnreadCount }
          : undefined}
        variant="soft-extruded"
        loading={isStatsLoading}
        unavailable={!isStatsLoading && (periodTotal === undefined || periodUnreadCount === undefined || periodAlertCount === undefined)}
      />

      {/* 3. Phân nhóm Tab (Hộp thư, Cài đặt & Âm thanh, Mẫu thông báo, Nhật ký Email) */}
      <NotificationTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        unreadCount={periodUnreadCount}
      />

      {/* 4. Nội dung chi tiết theo từng Tab */}
      {activeTab === "inbox" && (
        <div className="space-y-4">
          <NotificationFilterToolbar
            filter={filter}
            onFilterChange={handleFilterChange}
            onMarkAllRead={() => markAllAsReadMutation.mutate()}
            isMarkingAllRead={markAllAsReadMutation.isPending}
            archiveAction={archiveAccount && (
              <NotificationArchiveButton key={archiveAccount} />
            )}
            onRefresh={() => refetchNotifications()}
            isRefreshing={isNotificationsFetching}
            viewMode={viewMode}
            onViewModeChange={(nextMode) => {
              setViewMode(nextMode);
              setPage(1);
            }}
            hideDateRange={true}
          />

          {!isNotificationsLoading && items.length === 0 ? (
            <NotificationList
              items={[]}
              total={meta?.total}
              page={meta?.page ?? page}
              limit={meta?.limit ?? limit}
              totalPages={meta?.totalPages}
              isLoading={isNotificationsLoading}
              error={notificationsError}
              onRetry={() => void refetchNotifications()}
              onPageChange={(p) => setPage(p)}
              onLimitChange={handleLimitChange}
              onResetFilters={handleResetFilters}
              hasActiveFilters={hasActiveFilters}
            />
          ) : (
            <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
              <div className="xl:col-span-4">
                {viewMode === "hour" || viewMode === "camera" ? (
                  <>
                    <NotificationSectionList
                      sections={sections}
                      totalRawItems={items.length}
                      isLoading={isNotificationsLoading}
                      error={notificationsError}
                      onRetry={() => void refetchNotifications()}
                      selectedId={selectedNotification?.id ?? null}
                      onSelect={handleSelectNotification}
                      onMarkAsRead={(id) => markAsReadMutation.mutate(id)}
                      onMarkManyAsRead={(ids) => markManyAsReadMutation.mutate(ids)}
                      isMarkingManyRead={markManyAsReadMutation.isPending}
                      markingReadId={markAsReadMutation.isPending ? markAsReadMutation.variables : null}
                      onDelete={(id) => {
                        const target = items.find((item) => item.id === id);
                        if (target) setDeletingNotification(target);
                      }}
                      deletingId={deleteMutation.isPending ? deleteMutation.variables : null}
                      onResetFilters={handleResetFilters}
                      hasActiveFilters={hasActiveFilters}
                    />
                    {items.length > 0 && meta && (
                      <NotificationPagination
                        page={meta.page}
                        limit={meta.limit}
                        totalPages={meta.totalPages}
                        onPageChange={setPage}
                        onLimitChange={handleLimitChange}
                      />
                    )}
                  </>
                ) : (
                  <NotificationList
                    items={items}
                    clusters={personClusters}
                    total={meta?.total}
                    page={meta?.page ?? page}
                    limit={meta?.limit ?? limit}
                    totalPages={meta?.totalPages}
                    isLoading={isNotificationsLoading}
                    error={notificationsError}
                    onRetry={() => void refetchNotifications()}
                    onPageChange={(p) => setPage(p)}
                    onLimitChange={handleLimitChange}
                    selectedId={selectedNotification?.id ?? null}
                    onSelect={handleSelectNotification}
                    onMarkAsRead={(id) => markAsReadMutation.mutate(id)}
                    onMarkManyAsRead={(ids) => markManyAsReadMutation.mutate(ids)}
                    isMarkingManyRead={markManyAsReadMutation.isPending}
                    markingReadId={markAsReadMutation.isPending ? markAsReadMutation.variables : null}
                    onDelete={(id) => {
                      const target = items.find((item) => item.id === id);
                      if (target) setDeletingNotification(target);
                    }}
                    deletingId={deleteMutation.isPending ? deleteMutation.variables : null}
                    onResetFilters={handleResetFilters}
                    hasActiveFilters={hasActiveFilters}
                  />
                )}
              </div>

              <div className="hidden xl:sticky xl:top-4 xl:col-span-8 xl:block">
                {isNotificationsLoading ? (
                  <div className="space-y-4 rounded-3xl border border-border/30 bg-background p-6 shadow-[8px_8px_20px_var(--shadow-dark),-8px_-8px_20px_var(--shadow-light)]">
                    <div className="flex items-center gap-3">
                      <div className="size-11 rounded-2xl bg-muted/40 animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-48 rounded bg-muted/40 animate-pulse" />
                        <div className="h-5 w-3/4 rounded bg-muted/30 animate-pulse" />
                      </div>
                    </div>
                    <div className="h-24 rounded-2xl bg-muted/20 animate-pulse" />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="h-16 rounded-xl bg-muted/20 animate-pulse" />
                      <div className="h-16 rounded-xl bg-muted/20 animate-pulse" />
                      <div className="h-16 rounded-xl bg-muted/20 animate-pulse" />
                      <div className="h-16 rounded-xl bg-muted/20 animate-pulse" />
                    </div>
                  </div>
                ) : (
                  <NotificationDetailPanel
                    notification={selectedNotification}
                    cluster={selectedCluster}
                    onSelectClusterMember={(member) => setSelectedNotificationId(member.id)}
                    onMarkAsRead={(id) => markAsReadMutation.mutate(id)}
                    onMarkManyAsRead={(ids) => markManyAsReadMutation.mutate(ids)}
                    isMarkingManyRead={markManyAsReadMutation.isPending}
                    isMarkingRead={
                      markAsReadMutation.isPending &&
                      markAsReadMutation.variables === selectedNotification?.id
                    }
                    onDelete={(id) => {
                      const target = items.find((item) => item.id === id);
                      if (target) setDeletingNotification(target);
                    }}
                    isDeleting={
                      deleteMutation.isPending &&
                      deleteMutation.variables === selectedNotification?.id
                    }
                  />
                )}
              </div>
            </div>
          )}

        </div>
      )}
      </div>
      )}

      {/* Responsive Detail Modal for Mobile/Tablet (< xl) — dùng chung cho mobile và tablet */}
      {activeTab === "inbox" && showMobileDetail && selectedNotification && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm xl:hidden"
          onClick={() => setMobileDetailOpen(false)}
        >
          <div
            className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <NotificationDetailPanel
              notification={selectedNotification}
              cluster={selectedCluster}
              onSelectClusterMember={(member) => setSelectedNotificationId(member.id)}
              onClose={() => setMobileDetailOpen(false)}
              onMarkAsRead={(id) => markAsReadMutation.mutate(id)}
              onMarkManyAsRead={(ids) => markManyAsReadMutation.mutate(ids)}
              isMarkingManyRead={markManyAsReadMutation.isPending}
              isMarkingRead={
                markAsReadMutation.isPending &&
                markAsReadMutation.variables === selectedNotification.id
              }
              onDelete={(id) => {
                const target = items.find((item) => item.id === id);
                if (target) setDeletingNotification(target);
              }}
              isDeleting={
                deleteMutation.isPending &&
                deleteMutation.variables === selectedNotification.id
              }
            />
          </div>
        </div>
      )}

      {activeTab === "archive" && archiveAccount && (
        <div className="space-y-4">
          <NotificationFilterToolbar
            filter={filter}
            onFilterChange={handleFilterChange}
            onRefresh={() => refetchNotifications()}
            isRefreshing={isNotificationsFetching}
            hideDateRange
          />
          <NotificationArchiveTab
            key={archiveAccount}
            query={notificationsQuery}
            onPageChange={setPage}
            onLimitChange={handleLimitChange}
            hasActiveFilters={hasActiveFilters}
            onResetFilters={handleResetFilters}
          />
        </div>
      )}

      {activeTab === "preferences" && <NotificationPreferencesCard />}

      {activeTab === "templates" && (
        <NotificationTemplatesTab
          onPreviewTemplate={(template) => setPreviewTemplate(template)}
          onTestSendTemplate={(template) => setTestSendTemplate(template)}
          onCreateTemplate={canManageTemplates ? () => setIsCreateTemplateModalOpen(true) : undefined}
          onEditTemplate={canManageTemplates ? (template) => setEditingTemplate(template) : undefined}
          onDeleteTemplate={
            canManageTemplates
              ? (template, isSystem) => setDeletingTemplateInfo({ template, isSystem })
              : undefined
          }
        />
      )}

      {activeTab === "emailLogs" && (
        <NotificationEmailLogsTab
          fromDate={periodFromDate}
          toDate={periodToDate}
        />
      )}

      {/* 5. Modals & Dialogs Tương tác Nghiệp vụ */}
      <BroadcastNotificationModal
        open={isBroadcastModalOpen}
        onOpenChange={setIsBroadcastModalOpen}
      />

      <CustomDispatchNotificationModal
        open={isCustomDispatchModalOpen}
        onOpenChange={setIsCustomDispatchModalOpen}
      />

      <CreateNotificationTemplateModal
        open={isCreateTemplateModalOpen}
        onOpenChange={setIsCreateTemplateModalOpen}
      />

      <EditNotificationTemplateModal
        open={Boolean(editingTemplate)}
        onOpenChange={(open) => !open && setEditingTemplate(null)}
        template={editingTemplate}
      />

      <DeleteNotificationTemplateDialog
        open={Boolean(deletingTemplateInfo)}
        onOpenChange={(open) => !open && setDeletingTemplateInfo(null)}
        template={deletingTemplateInfo?.template || null}
        isSystemTemplate={deletingTemplateInfo?.isSystem || false}
      />

      <PreviewTemplateModal
        open={Boolean(previewTemplate)}
        onOpenChange={(open) => !open && setPreviewTemplate(null)}
        template={previewTemplate}
      />

      <TestSendTemplateModal
        open={Boolean(testSendTemplate)}
        onOpenChange={(open) => !open && setTestSendTemplate(null)}
        template={testSendTemplate}
      />

      <ConfirmDeleteNotificationModal
        open={Boolean(deletingNotification)}
        onClose={() => setDeletingNotification(null)}
        onConfirm={handleConfirmDelete}
        notification={deletingNotification}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
