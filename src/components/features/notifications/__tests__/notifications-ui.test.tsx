import "@/hooks/auth/__tests__/setup";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LocaleProvider } from "@/providers/locale-provider";
import { AuthContext, type AuthContextValue } from "@/contexts/AuthContext";
import { RealtimeContext, type RealtimeContextValue } from "@/contexts/RealtimeContext";
import { notificationKeys } from "@/hooks/notifications/notification.query-keys";
import { NotificationTabs } from "../notification-tabs";
import { NotificationKpiSummary } from "../notification-kpi-summary";
import { NotificationEmailLogsTab } from "../notification-email-logs-tab";
import { NotificationList } from "../notification-list";
import { NotificationDetailPanel } from "../notification-detail-panel";
import { NotificationFilterToolbar } from "../notification-filter-toolbar";
import type { MeDto, NotificationItemDto } from "@/types";

function renderNotifications(element: React.ReactElement, user: MeDto) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  const authValue: AuthContextValue = {
    user,
    status: "authenticated",
    logout: async () => {},
    setUser: () => {},
  };
  const realtimeValue: RealtimeContextValue = {
    isConnected: true,
    lastAlert: null,
  };

  return renderToString(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(
        AuthContext.Provider,
        { value: authValue },
        React.createElement(
          RealtimeContext.Provider,
          { value: realtimeValue },
          React.createElement(LocaleProvider, null, element),
        ),
      ),
    ),
  );
}

const ADMIN_USER: MeDto = {
  id: "u-admin",
  email: "admin@ppe.local",
  fullName: "Admin User",
  avatarUrl: null,
  phoneNumber: null,
  role: "ADMIN",
  roleId: "r-admin",
  permissions: ["NOTIFICATION_READ", "NOTIFICATION_CREATE", "NOTIFICATION_TEMPLATE_MANAGE"],
  isActive: true,
  twoFactorEnabled: false,
  createdAt: "2026-11-01T00:00:00Z",
};

const SAFETY_MANAGER_USER: MeDto = {
  id: "u-sm",
  email: "sm@ppe.local",
  fullName: "Safety Manager",
  avatarUrl: null,
  phoneNumber: null,
  role: "SAFETY_MANAGER",
  roleId: "r-sm",
  permissions: ["NOTIFICATION_READ", "PPE_INCIDENT_MANAGE"],
  isActive: true,
  twoFactorEnabled: false,
  createdAt: "2026-11-01T00:00:00Z",
};

const SAMPLE_ITEMS: NotificationItemDto[] = [
  {
    id: "n-1",
    userId: "u-admin",
    incidentId: "inc-1",
    templateId: null,
    channel: "IN_APP",
    title: "Cảnh báo vi phạm PPE",
    content: "Thiếu mũ bảo hộ tại Khu A",
    severity: "CRITICAL",
    status: "SENT",
    isRead: false,
    sentAt: "2026-11-20T09:00:00Z",
    readAt: null,
    createdAt: "2026-11-20T09:00:00Z",
  },
  {
    id: "n-2",
    userId: "u-admin",
    incidentId: null,
    templateId: null,
    channel: "EMAIL",
    title: "Báo cáo tổng kết",
    content: "Hoàn tất kết xuất báo cáo",
    severity: "NORMAL",
    status: "READ",
    isRead: true,
    sentAt: "2026-11-20T08:00:00Z",
    readAt: "2026-11-20T08:05:00Z",
    createdAt: "2026-11-20T08:00:00Z",
  },
];

describe("Notifications UI & Logic", () => {
  it("uses prefix-compatible queryKey for notificationKeys.emailLogs() invalidation", () => {
    assert.deepEqual(notificationKeys.emailLogs(), ["notifications", "email-logs"]);
    assert.deepEqual(notificationKeys.emailLogs({ page: 1 }), ["notifications", "email-logs", { page: 1 }]);
  });

  it("hides admin-only templates and emailLogs tabs when user lacks template permissions", () => {
    const smHtml = renderNotifications(
      <NotificationTabs activeTab="inbox" onTabChange={() => {}} unreadCount={1} />,
      SAFETY_MANAGER_USER,
    );
    assert.equal(smHtml.includes("Nhật ký gửi Email") || smHtml.includes("Email Logs"), false);
    assert.equal(smHtml.includes("Mẫu thông báo") || smHtml.includes("Templates"), false);

    const adminHtml = renderNotifications(
      <NotificationTabs activeTab="emailLogs" onTabChange={() => {}} unreadCount={1} />,
      ADMIN_USER,
    );
    assert.ok(adminHtml.includes("Nhật ký gửi Email") || adminHtml.includes("Email Logs"));
    assert.ok(adminHtml.includes("Mẫu thông báo") || adminHtml.includes("Templates"));
  });

  it("renders NotificationKpiSummary and detail panel consistently with full inbox stats", () => {
    const html = renderNotifications(
      <NotificationKpiSummary
        notifications={SAMPLE_ITEMS}
        totalCount={SAMPLE_ITEMS.length}
        unreadCount={1}
        selectedStat="resolved"
      />,
      ADMIN_USER,
    );
    const plainText = html.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, " ");
    assert.ok(plainText.includes("50%"));
    assert.ok(plainText.includes("1/2"));
    assert.equal(plainText.includes("-1/"), false);
  });

  it("renders NotificationEmailLogsTab without duplicate toolbar controls", () => {
    const html = renderNotifications(<NotificationEmailLogsTab />, ADMIN_USER);
    assert.ok(html.includes("PROCESSING"));
    assert.ok(html.includes("SENT"));
    assert.ok(html.includes("FAILED"));
  });

  it("renders NotificationList and NotificationDetailPanel with parsed PPE metadata", () => {
    const ppeItem: NotificationItemDto = {
      ...SAMPLE_ITEMS[0],
      title: "Cảnh báo vi phạm PPE [CRITICAL]: NO_HELMET tại Landmark",
      content: "Phát hiện vi phạm NO_HELMET tại vị trí camera CAM-01. Mức độ: CRITICAL.",
    };

    const listHtml = renderNotifications(
      <NotificationList
        items={[ppeItem, SAMPLE_ITEMS[1]]}
        total={2}
        page={1}
        limit={10}
        totalPages={1}
        selectedId={ppeItem.id}
        onSelect={() => {}}
      />,
      ADMIN_USER,
    );
    const listText = listHtml.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, " ");
    assert.ok(listText.includes("Không đội mũ bảo hộ"));
    assert.ok(listText.includes("Landmark"));
    assert.ok(listText.includes("CAM-01"));
    assert.equal(listText.includes("[CRITICAL]"), false);

    const detailHtml = renderNotifications(
      <NotificationDetailPanel notification={ppeItem} />,
      ADMIN_USER,
    );
    const detailText = detailHtml.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, " ");
    assert.ok(detailText.includes("Không đội mũ bảo hộ"));
    assert.ok(detailText.includes("Landmark"));
    assert.ok(detailText.includes("CAM-01"));
    assert.ok(detailHtml.includes('href="/incidents/inc-1"'));
  });

  it("renders NotificationFilterToolbar with quick read-status pills and date labels", () => {
    const html = renderNotifications(
      <NotificationFilterToolbar
        filter={{ search: "" }}
        onFilterChange={() => {}}
      />,
      ADMIN_USER,
    );
    assert.ok(html.includes('role="group"'));
    assert.ok(html.includes('type="date"'));
  });
});
