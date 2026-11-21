"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bell, Radio, Send } from "lucide-react";
import { PageHeader } from "@/components/features/app-shell/page-header";
import { Button } from "@/components/ui/button";
import {
  NotificationKpiSummary,
  NotificationTabs,
  NotificationFilterToolbar,
  NotificationList,
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
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
} from "@/hooks/notifications";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useLocale } from "@/providers/locale-provider";
import type { NotificationItemDto, NotificationTemplateItemDto } from "@/types";

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

  // Filtering & Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [filter, setFilter] = useState<NotificationFilterState>({
    search: "",
    isRead: undefined,
    severity: undefined,
    channel: undefined,
    type: undefined,
    fromDate: undefined,
    toDate: undefined,
  });

  // Queries
  const {
    data: notificationData,
    isLoading: isNotificationsLoading,
    isFetching: isNotificationsFetching,
    error: notificationsError,
    refetch: refetchNotifications,
  } = useNotifications({
    page,
    limit,
    search: filter.search || undefined,
    isRead: filter.isRead,
    severity: filter.severity,
    channel: filter.channel,
    type: filter.type,
    fromDate: filter.fromDate,
    toDate: filter.toDate,
  });

  const { data: allNotifications = [] } = useAllNotifications();
  const { data: unreadCount = 0 } = useUnreadCount();

  // Mutations
  const markAsReadMutation = useMarkAsRead();
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

  const items = notificationData?.data || [];
  const meta = notificationData?.meta || {
    total: 0,
    page: 1,
    limit,
    totalPages: 1,
  };

  const selectedNotification = useMemo(
    () => items.find((item) => item.id === selectedNotificationId) ?? items[0] ?? null,
    [items, selectedNotificationId],
  );

  const hasActiveFilters = Boolean(
    filter.search ||
      filter.isRead !== undefined ||
      filter.severity ||
      filter.channel ||
      filter.type ||
      filter.fromDate ||
      filter.toDate,
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
      {/* 1. Header Trang & Trạng thái Realtime SSE */}
      <PageHeader
        icon={Bell}
        title={t("notifications.title")}
        description={t("notifications.description")}
        badge={
          <div className="flex items-center gap-2">
            <span
              className={`inline-block size-2 rounded-full ${
                isConnected
                  ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"
                  : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
              }`}
            />
            <span className="font-mono text-[11px] font-semibold text-foreground">
              {isConnected
                ? isVietnamese
                  ? "Luồng SSE Trực tuyến"
                  : "Realtime SSE Active"
                : isVietnamese
                  ? "Đang kết nối SSE..."
                  : "SSE Connecting..."}
            </span>
          </div>
        }
        badgeIcon={Radio}
        breadcrumbs={[{ label: t("notifications.title") }]}
        actions={
          canBroadcast ? (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Nút gửi thông báo tùy chỉnh / theo mẫu */}
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCustomDispatchModalOpen(true)}
                className="flex items-center gap-2 font-semibold shadow-[2px_2px_6px_var(--shadow-dark)]"
              >
                <Send className="size-4" />
                <span>{isVietnamese ? "Gửi thông báo tùy chỉnh" : "Custom Dispatch"}</span>
              </Button>

              {/* Nút phát thông báo khẩn cấp */}
              <Button
                type="button"
                variant="primary"
                onClick={() => setIsBroadcastModalOpen(true)}
                className="flex items-center gap-2 font-bold shadow-[3px_3px_8px_var(--shadow-dark),-3px_-3px_8px_var(--shadow-light)]"
              >
                <Radio className="size-4" />
                <span>{isVietnamese ? "+ Phát lệnh khẩn cấp" : "+ Broadcast Alert"}</span>
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* 2. Thẻ KPI Thống kê Neumorphism Tương tác (Sunken khi chọn + Khung chi tiết mở ra) */}
      <NotificationKpiSummary
        notifications={allNotifications}
        totalCount={allNotifications.length}
        unreadCount={unreadCount}
        variant="soft-extruded"
        loading={isNotificationsLoading}
        unavailable={!notificationData && !!notificationsError}
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
        unreadCount={unreadCount}
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
          />

          {!isNotificationsLoading && items.length === 0 ? (
            <NotificationList
              items={items}
              total={meta.total}
              page={meta.page}
              limit={limit}
              totalPages={meta.totalPages}
              isLoading={isNotificationsLoading}
              error={notificationsError}
              onRetry={() => void refetchNotifications()}
              onPageChange={(p) => setPage(p)}
              onLimitChange={handleLimitChange}
              onResetFilters={handleResetFilters}
              hasActiveFilters={hasActiveFilters}
            />
          ) : (
            <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
              <div className="xl:col-span-5">
                <NotificationList
                  items={items}
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
                  markingReadId={markAsReadMutation.isPending ? markAsReadMutation.variables : null}
                  onDelete={(id) => {
                    const target = items.find((item) => item.id === id);
                    if (target) setDeletingNotification(target);
                  }}
                  deletingId={deleteMutation.isPending ? deleteMutation.variables : null}
                  onResetFilters={handleResetFilters}
                  hasActiveFilters={hasActiveFilters}
                />
              </div>

              <div className="hidden xl:sticky xl:top-4 xl:col-span-7 xl:block">
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
                    onMarkAsRead={(id) => markAsReadMutation.mutate(id)}
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
                  onClose={() => setMobileDetailOpen(false)}
                  onMarkAsRead={(id) => markAsReadMutation.mutate(id)}
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
        <NotificationEmailLogsTab />
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
