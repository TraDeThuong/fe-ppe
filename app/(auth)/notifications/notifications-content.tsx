"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  type NotificationStatKey,
} from "@/components/features/notifications";
import {
  useAllNotifications,
  useFilteredNotifications,
  useNotificationEnrichment,
  useVisualFingerprints,
  useUnreadCount,
  useMarkAsRead,
  useMarkManyAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
} from "@/hooks/notifications";
import { vietnamToday } from "@/lib/dashboard-data";
import {
  createDefaultIncidentPeriodFilter,
  filterItemsByDateRange,
  parseIncidentPeriodFromUrl,
  resolveIncidentPeriod,
  type IncidentPeriodFilter,
} from "@/lib/incident-period";
import { isNotificationRead } from "@/lib/notification-inbox";
import {
  groupNotificationsByPerson,
  groupNotificationsIntoSections,
  paginateNotificationClusters,
  selectVisualFingerprintCandidates,
  wrapFlatPersonClusters,
  type NotificationPersonCluster,
  type NotificationViewMode,
} from "@/lib/notification-grouping-engine";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useLocale } from "@/providers/locale-provider";
import type { NotificationItemDto, NotificationTemplateItemDto } from "@/types";

const GROUPING_PREFS_STORAGE_KEY = "ppe.notifications.grouping-prefs.v1";

const STAT_TO_URL: Record<NotificationStatKey, string> = {
  total: "total",
  unread: "unread",
  ppeAlerts: "ppe-alerts",
  resolved: "resolved",
};

const URL_TO_STAT: Record<string, NotificationStatKey> = {
  total: "total",
  unread: "unread",
  "ppe-alerts": "ppeAlerts",
  ppeAlerts: "ppeAlerts",
  resolved: "resolved",
};

export default function NotificationsContent() {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { isConnected } = useRealtime();
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

  // URL state synchronization for stats (giống hệt trang role)
  const statParam = searchParams.get("stat");
  const selectedStat = statParam && URL_TO_STAT[statParam] ? URL_TO_STAT[statParam] : null;

  const handleSelectStat = (stat: NotificationStatKey | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (stat) {
      params.set("stat", STAT_TO_URL[stat]);
    } else {
      params.delete("stat");
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  // Tab navigation state (derived directly from URL + RBAC access so back/forward/links always sync)
  const tabParam = searchParams.get("tab") as NotificationTabKey | null;
  const activeTab: NotificationTabKey =
    tabParam && allowedTabs.includes(tabParam) ? tabParam : "inbox";

  const handleTabChange = (tab: NotificationTabKey) => {
    if (!allowedTabs.includes(tab)) return;
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "inbox") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    if (tab === "inbox") {
      refetchNotifications();
    }
  };

  // Filtering, Client-side Smart Grouping & Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [viewMode, setViewMode] = useState<NotificationViewMode>("person");
  const [enableVisualDedup, setEnableVisualDedup] = useState(true);
  const [windowSeconds, setWindowSeconds] = useState(45);
  const [prefsHydrated, setPrefsHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(GROUPING_PREFS_STORAGE_KEY) || "null",
      ) as {
        viewMode?: NotificationViewMode;
        enableVisualDedup?: boolean;
        windowSeconds?: number;
      } | null;
      if (saved) {
        if (
          saved.viewMode &&
          ["flat", "person", "hour", "camera"].includes(saved.viewMode)
        ) {
          setViewMode(saved.viewMode);
        }
        if (typeof saved.enableVisualDedup === "boolean") {
          setEnableVisualDedup(saved.enableVisualDedup);
        }
        if (
          typeof saved.windowSeconds === "number" &&
          [30, 45, 120, 300].includes(saved.windowSeconds)
        ) {
          setWindowSeconds(saved.windowSeconds);
        }
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
        JSON.stringify({ viewMode, enableVisualDedup, windowSeconds }),
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [prefsHydrated, viewMode, enableVisualDedup, windowSeconds]);

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
      search: filter.search || undefined,
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
  const {
    data: filteredNotifications,
    isLoading: isNotificationsLoading,
    isFetching: isNotificationsFetching,
    error: notificationsError,
    refetch: refetchNotifications,
  } = useFilteredNotifications(filterQuery);

  const shouldEnrich = activeTab === "inbox" && viewMode !== "flat";
  const { signalsMap } = useNotificationEnrichment({
    enabled: shouldEnrich,
    maxIncidents: 200,
  });

  const { data: allNotifications = [] } = useAllNotifications();
  const { data: unreadCount = 0 } = useUnreadCount();

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

  const rawFilteredItems = filteredNotifications ?? [];

  const groupingOptions = useMemo(
    () => ({
      isVietnamese,
      trackWindowSeconds: windowSeconds,
      spatialWindowSeconds: Math.min(windowSeconds, 20),
      enableVisualDedup,
      visualWindowSeconds: Math.max(windowSeconds, 60),
      combinePersonInSections: true,
    }),
    [isVietnamese, windowSeconds, enableVisualDedup],
  );

  const visualCandidates = useMemo(
    () =>
      shouldEnrich && enableVisualDedup
        ? selectVisualFingerprintCandidates(rawFilteredItems, signalsMap, groupingOptions)
        : [],
    [shouldEnrich, enableVisualDedup, rawFilteredItems, signalsMap, groupingOptions],
  );

  const { fingerprintsMap, isComputing: isComputingVisual } = useVisualFingerprints(
    visualCandidates,
    shouldEnrich && enableVisualDedup,
  );

  const allPersonClusters = useMemo<NotificationPersonCluster[]>(() => {
    if (viewMode === "flat") {
      return wrapFlatPersonClusters(rawFilteredItems, undefined, isVietnamese);
    }
    return groupNotificationsByPerson(
      rawFilteredItems,
      signalsMap,
      fingerprintsMap,
      groupingOptions,
    );
  }, [viewMode, rawFilteredItems, signalsMap, fingerprintsMap, groupingOptions, isVietnamese]);

  const sections = useMemo(() => {
    if (viewMode !== "hour" && viewMode !== "camera") return [];
    return groupNotificationsIntoSections(
      rawFilteredItems,
      viewMode,
      signalsMap,
      fingerprintsMap,
      groupingOptions,
    );
  }, [viewMode, rawFilteredItems, signalsMap, fingerprintsMap, groupingOptions]);

  const periodNotifications = useMemo(
    () =>
      hasPeriodFilter
        ? filterItemsByDateRange(
            allNotifications,
            (item) => item.createdAt,
            periodFromDate,
            periodToDate,
          )
        : allNotifications,
    [allNotifications, hasPeriodFilter, periodFromDate, periodToDate],
  );

  const periodUnreadCount = useMemo(() => {
    if (!hasPeriodFilter) return unreadCount;
    let count = 0;
    for (const item of periodNotifications) {
      if (!isNotificationRead(item)) count += 1;
    }
    return count;
  }, [hasPeriodFilter, unreadCount, periodNotifications]);

  const allInboxClusters = useMemo<NotificationPersonCluster[]>(() => {
    if (viewMode === "flat") return [];
    return groupNotificationsByPerson(
      periodNotifications,
      signalsMap,
      fingerprintsMap,
      groupingOptions,
    );
  }, [viewMode, periodNotifications, signalsMap, fingerprintsMap, groupingOptions]);

  const kpiDualStats = useMemo(() => {
    if (viewMode === "flat" || periodNotifications.length === 0) {
      return { clustered: undefined, raw: undefined };
    }
    let rawPpe = 0;
    for (const item of periodNotifications) {
      if (
        item.type === "PPE_VIOLATION" ||
        item.severity === "CRITICAL" ||
        item.severity === "HIGH" ||
        item.title?.toLowerCase().includes("ppe") ||
        item.title?.toLowerCase().includes("bảo hộ")
      ) {
        rawPpe += 1;
      }
    }

    let unreadClusters = 0;
    let ppeClusters = 0;
    for (const cl of allInboxClusters) {
      if (cl.unreadCount > 0) unreadClusters += 1;
      const isPpe =
        cl.violationCodes.length > 0 ||
        cl.highestSeverity === "CRITICAL" ||
        cl.highestSeverity === "HIGH" ||
        cl.primary.type === "PPE_VIOLATION" ||
        cl.primary.title?.toLowerCase().includes("ppe") ||
        cl.primary.title?.toLowerCase().includes("bảo hộ");
      if (isPpe) ppeClusters += 1;
    }

    const totalClusters = allInboxClusters.length;
    return {
      clustered: {
        total: totalClusters,
        unread: unreadClusters,
        ppeAlerts: ppeClusters,
        resolved: Math.max(0, totalClusters - unreadClusters),
      },
      raw: {
        total: periodNotifications.length,
        unread: periodUnreadCount,
        ppeAlerts: rawPpe,
      },
    };
  }, [viewMode, periodNotifications, allInboxClusters, periodUnreadCount]);

  const pagedClusters = useMemo(
    () => paginateNotificationClusters(allPersonClusters, page, limit),
    [allPersonClusters, page, limit],
  );
  const visibleClusters = pagedClusters.data;
  const items = useMemo(
    () =>
      viewMode === "hour" || viewMode === "camera"
        ? rawFilteredItems
        : visibleClusters.flatMap((cluster) => cluster.items),
    [viewMode, rawFilteredItems, visibleClusters],
  );
  const meta = pagedClusters.meta;

  const selectedNotification = useMemo(
    () =>
      items.find((item) => item.id === selectedNotificationId) ??
      visibleClusters[0]?.primary ??
      items[0] ??
      null,
    [items, visibleClusters, selectedNotificationId],
  );

  const selectedCluster = useMemo(() => {
    if (!selectedNotification || viewMode === "flat") return null;
    const found = allPersonClusters.find((cl) =>
      cl.items.some((m) => m.id === selectedNotification.id),
    );
    return found && found.count > 1 ? found : null;
  }, [selectedNotification, viewMode, allPersonClusters]);

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
      {/* 1. Console Header Trang, Trạng thái Realtime SSE & Bộ lọc thời gian toàn trang */}
      <NotificationConsoleHeader
        isConnected={isConnected}
        isRefreshing={isNotificationsLoading || isNotificationsFetching}
        onRefresh={() => void refetchNotifications()}
        totalCount={periodNotifications.length}
        unreadCount={periodUnreadCount}
        canBroadcast={canBroadcast}
        onOpenCustomDispatch={() => setIsCustomDispatchModalOpen(true)}
        onOpenBroadcast={() => setIsBroadcastModalOpen(true)}
        periodFilter={periodFilter}
        resolvedPeriod={resolvedPeriod}
        today={today}
        onPeriodFilterChange={handlePeriodFilterChange}
      />

      {/* 2. Thẻ KPI Thống kê Neumorphism Tương tác (Sunken khi chọn + Khung chi tiết mở ra) */}
      <NotificationKpiSummary
        notifications={periodNotifications}
        totalCount={periodNotifications.length}
        unreadCount={periodUnreadCount}
        stats={kpiDualStats.clustered}
        rawStats={kpiDualStats.raw}
        variant="soft-extruded"
        loading={isNotificationsLoading}
        unavailable={!filteredNotifications && !!notificationsError}
        selectedStat={selectedStat}
        onSelectStat={handleSelectStat}
        onOpenBroadcast={canBroadcast ? () => setIsBroadcastModalOpen(true) : undefined}
        onOpenPreferences={() => handleTabChange("preferences")}
        onMarkAllAsRead={() => markAllAsReadMutation.mutate()}
        onMarkAsRead={(id) => markAsReadMutation.mutate(id)}
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
            onRefresh={() => refetchNotifications()}
            isRefreshing={isNotificationsFetching}
            viewMode={viewMode}
            onViewModeChange={(nextMode) => {
              setViewMode(nextMode);
              setPage(1);
            }}
            enableVisualDedup={enableVisualDedup}
            onToggleVisualDedup={() => setEnableVisualDedup((prev) => !prev)}
            isComputingVisual={isComputingVisual}
            windowSeconds={windowSeconds}
            onWindowSecondsChange={(sec) => {
              setWindowSeconds(sec);
              setPage(1);
            }}
            hideDateRange={true}
          />

          {!isNotificationsLoading && rawFilteredItems.length === 0 ? (
            <NotificationList
              items={[]}
              total={0}
              page={1}
              limit={limit}
              totalPages={1}
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
                  <NotificationSectionList
                    sections={sections}
                    totalRawItems={rawFilteredItems.length}
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
                ) : (
                  <NotificationList
                    items={items}
                    clusters={viewMode === "person" ? visibleClusters : undefined}
                    totalRawItems={rawFilteredItems.length}
                    total={meta.total}
                    page={meta.page}
                    limit={limit}
                    totalPages={meta.totalPages}
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

          {/* Responsive Detail Modal for Mobile/Tablet (< xl) */}
          {mobileDetailOpen && selectedNotification && (
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
        </div>
      )}

      {activeTab === "preferences" && (
        <NotificationPreferencesCard />
      )}

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
