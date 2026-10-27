"use client";

import { useState } from "react";
import { Bell, Radio, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/features/app-shell/page-header";
import { Button } from "@/components/ui/button";
import {
  NotificationKpiSummary,
  NotificationTabs,
  NotificationFilterToolbar,
  NotificationList,
  NotificationPreferencesCard,
  NotificationTemplatesTab,
  NotificationEmailLogsTab,
  BroadcastNotificationModal,
  PreviewTemplateModal,
  TestSendTemplateModal,
  ConfirmDeleteNotificationModal,
  type NotificationTabKey,
  type NotificationFilterState,
} from "@/components/features/notifications";
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
} from "@/hooks/notifications";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useLocale } from "@/providers/locale-provider";
import type { NotificationItemDto, NotificationTemplateItemDto } from "@/types";

export default function NotificationsContent() {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const { user } = useAuth();
  const { isConnected } = useRealtime();

  // Tab navigation state
  const [activeTab, setActiveTab] = useState<NotificationTabKey>("inbox");

  // Filtering & Pagination
  const [page, setPage] = useState(1);
  const limit = 10;
  const [filter, setFilter] = useState<NotificationFilterState>({
    search: "",
    isRead: undefined,
    severity: undefined,
    channel: undefined,
  });

  // Queries
  const {
    data: notificationData,
    isLoading: isNotificationsLoading,
    isFetching: isNotificationsFetching,
    refetch: refetchNotifications,
  } = useNotifications({
    page,
    limit,
    search: filter.search || undefined,
    isRead: filter.isRead,
    severity: filter.severity,
    channel: filter.channel,
  });

  const { data: unreadCount = 0 } = useUnreadCount();

  // Mutations
  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();
  const deleteMutation = useDeleteNotification();

  // Modals state
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<NotificationTemplateItemDto | null>(null);
  const [testSendTemplate, setTestSendTemplate] = useState<NotificationTemplateItemDto | null>(null);
  const [deletingNotification, setDeletingNotification] = useState<NotificationItemDto | null>(null);

  // RBAC Broadcast Capability
  const role = user?.role || "";
  const permissions = user?.permissions || [];
  const canBroadcast =
    role === "ADMIN" ||
    role === "SUPER_ADMIN" ||
    role === "SAFETY_OFFICER" ||
    permissions.includes("NOTIFICATION_CREATE");

  const items = notificationData?.data || [];
  const meta = notificationData?.meta || {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  const hasActiveFilters = Boolean(
    filter.search ||
      filter.isRead !== undefined ||
      filter.severity ||
      filter.channel,
  );

  const handleFilterChange = (newFilter: NotificationFilterState) => {
    setFilter(newFilter);
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilter({
      search: "",
      isRead: undefined,
      severity: undefined,
      channel: undefined,
    });
    setPage(1);
  };

  const handleConfirmDelete = async () => {
    if (!deletingNotification) return;
    try {
      await deleteMutation.mutateAsync(deletingNotification.id);
      setDeletingNotification(null);
    } catch {
      // Toast handled by mutation
    }
  };

  return (
    <div className="space-y-6">
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
              {isConnected ? "Realtime SSE Active" : "SSE Connecting..."}
            </span>
          </div>
        }
        badgeIcon={Radio}
        breadcrumbs={[{ label: t("notifications.title") }]}
        actions={
          canBroadcast ? (
            <Button
              type="button"
              variant="primary"
              onClick={() => setIsBroadcastModalOpen(true)}
              className="flex items-center gap-2 font-bold shadow-[3px_3px_8px_var(--shadow-dark),-3px_-3px_8px_var(--shadow-light)]"
            >
              <Radio className="size-4" />
              <span>{isVietnamese ? "+ Phát thông báo" : "+ Broadcast Alert"}</span>
            </Button>
          ) : undefined
        }
      />

      {/* 2. Thẻ KPI Thống kê Neumorphism */}
      <NotificationKpiSummary
        notifications={items}
        totalCount={meta.total}
        unreadCount={unreadCount}
        variant="soft-extruded"
        loading={isNotificationsLoading}
      />

      {/* 3. Phân nhóm Tab (Inbox, Preferences, Templates, EmailLogs) */}
      <NotificationTabs
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === "inbox") {
            refetchNotifications();
          }
        }}
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

          <NotificationList
            items={items}
            total={meta.total}
            page={page}
            limit={limit}
            totalPages={meta.totalPages}
            isLoading={isNotificationsLoading}
            onPageChange={(p) => setPage(p)}
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
      )}

      {activeTab === "preferences" && (
        <NotificationPreferencesCard />
      )}

      {activeTab === "templates" && (
        <NotificationTemplatesTab
          onPreviewTemplate={(template) => setPreviewTemplate(template)}
          onTestSendTemplate={(template) => setTestSendTemplate(template)}
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
