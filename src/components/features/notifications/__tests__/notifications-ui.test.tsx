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
import { NotificationConsoleHeader } from "../notification-console-header";
import { NotificationTabs } from "../notification-tabs";
import { NotificationKpiSummary } from "../notification-kpi-summary";
import { NotificationEmailLogsTab } from "../notification-email-logs-tab";
import { NotificationList } from "../notification-list";
import { NotificationSectionList } from "../notification-section-list";
import { NotificationDetailPanel } from "../notification-detail-panel";
import { NotificationFilterToolbar } from "../notification-filter-toolbar";
import { NotificationPreferencesCard } from "../notification-preferences-card";
import { NotificationTemplatesTab } from "../notification-templates-tab";
import { NotificationTemplateCardList } from "../notification-template-card-list";
import { NotificationTemplateDetailPanel } from "../notification-template-detail-panel";
import { getChannelDisplay } from "../notification-meta-badges";
import {
  ZaloBotChannelCard,
  ZaloLinkCommandBox,
  computeZaloTokenDeadline,
  formatZaloCountdown,
  resolveZaloCardState,
} from "../zalo-bot-channel-card";
import {
  buildSampleVariables,
  interpolateTemplate,
  mergeNotificationTemplates,
} from "../notification-template-helpers";
import {
  groupNotificationsByPerson,
  groupNotificationsIntoSections,
} from "@/lib/notification-grouping-engine";
import type { NotificationEnrichedSignals } from "@/lib/notification-enrichment";
import type {
  MeDto,
  NotificationItemDto,
  NotificationPreferenceDto,
  ZaloBotStatusDto,
} from "@/types";

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

    const managerUser: MeDto = {
      ...SAFETY_MANAGER_USER,
      id: "u-mgr",
      role: "MANAGER",
      permissions: ["NOTIFICATION_READ", "NOTIFICATION_UPDATE"],
    };
    const managerHtml = renderNotifications(
      <NotificationTabs activeTab="emailLogs" onTabChange={() => {}} unreadCount={0} />,
      managerUser,
    );
    assert.ok(managerHtml.includes("Nhật ký gửi Email") || managerHtml.includes("Email Logs"));
  });

  it("renders NotificationConsoleHeader with SSE status, actions, and Day/Week/Month/Year/Custom time filter bar", () => {
    const html = renderNotifications(
      <NotificationConsoleHeader
        isConnected={true}
        isRefreshing={false}
        onRefresh={() => {}}
        totalCount={42}
        unreadCount={7}
        canBroadcast={true}
        onOpenCustomDispatch={() => {}}
        onOpenBroadcast={() => {}}
        today="2026-11-23"
        periodFilter={{
          mode: "week",
          anchorDate: "2026-11-23",
          customStart: "2026-11-17",
          customEnd: "2026-11-23",
        }}
        onPeriodFilterChange={() => {}}
      />,
      ADMIN_USER,
    );
    assert.ok(html.includes("42"));
    assert.ok(html.includes("7"));
    assert.ok(html.includes("Ngày"));
    assert.ok(html.includes("Tuần"));
    assert.ok(html.includes("Tháng"));
    assert.ok(html.includes("Năm"));
    assert.ok(html.includes("Khoảng thời gian"));
    assert.ok(html.includes("17/11/2026"));
    assert.ok(html.includes("23/11/2026"));
  });

  it("renders NotificationKpiSummary consistently with full inbox stats", () => {
    const html = renderNotifications(
      <NotificationKpiSummary
        notifications={SAMPLE_ITEMS}
        totalCount={SAMPLE_ITEMS.length}
        unreadCount={1}
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
      deliveredChannels: ["IN_APP", "EMAIL"],
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
    assert.ok(listText.includes("In-App"));
    assert.ok(listText.includes("Email"));
    assert.equal(listText.includes("[CRITICAL]"), false);

    const detailHtml = renderNotifications(
      <NotificationDetailPanel notification={ppeItem} />,
      ADMIN_USER,
    );
    const detailText = detailHtml.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, " ");
    assert.ok(detailText.includes("Không đội mũ bảo hộ"));
    assert.ok(detailText.includes("Landmark"));
    assert.ok(detailText.includes("CAM-01"));
    assert.ok(detailText.includes("In-App · Email"));
    assert.ok(detailHtml.includes('href="/incidents/inc-1"'));
  });

  it("renders NotificationFilterToolbar with inbox channels and view mode switcher", () => {
    const html = renderNotifications(
      <NotificationFilterToolbar
        filter={{ search: "" }}
        onFilterChange={() => {}}
        viewMode="person"
        onViewModeChange={() => {}}
      />,
      ADMIN_USER,
    );
    assert.ok(html.includes('role="group"'));
    assert.ok(html.includes('type="date"'));
    assert.ok(html.includes("Theo người") || html.includes("By person"));
    assert.ok(html.includes("Theo giờ") || html.includes("By hour"));
    assert.ok(html.includes("Theo camera") || html.includes("By camera"));
    assert.equal(html.includes("dHash"), false);
    // Hộp thư web (BE mặc định IN_APP + WEB) và Email; không tách WEB, không có WEBHOOK
    assert.ok(html.includes('<option value="all"'));
    assert.ok(html.includes('<option value="EMAIL"'));
    assert.ok(html.includes("Hộp thư trong ứng dụng") || html.includes("In-app inbox"));
    for (const channel of ["IN_APP", "WEB", "WEBHOOK"]) {
      assert.ok(!html.includes(`<option value="${channel}"`));
    }
  });

  it("renders In-App, Email and Zalo Bot cards (no Webhook) for personal channel preferences", () => {
    const html = renderNotifications(<NotificationPreferencesCard />, ADMIN_USER);
    assert.match(html, /<h3[^>]*>(Thông báo Web|Web Notifications) \(In-App\)<\/h3>/);
    assert.match(html, /<h3[^>]*>(Thư điện tử|Electronic Mail) \(Email\)<\/h3>/);
    assert.match(html, /<h3[^>]*>Zalo Bot<\/h3>/);
    assert.ok(html.includes('data-testid="zalo-bot-card"'));
    assert.ok(html.includes("xl:grid-cols-3"));
    assert.doesNotMatch(html, /<h3[^>]*>[^<]*Webhook/i);
    // Ghi chú dẫn sang trang Tích hợp (ADMIN có quyền → có link)
    assert.ok(html.includes('href="/integrations"'));
  });

  it("renders flat items as individual rows and renders synthesized Multi-Violation cluster cards in person mode", () => {
    const repeatedItems: NotificationItemDto[] = [
      {
        ...SAMPLE_ITEMS[0],
        id: "c-vest",
        incidentId: "inc-c-vest",
        severity: "MEDIUM",
        title: "Cảnh báo vi phạm PPE [MEDIUM]: NO_VEST tại Công trường",
        content: "Không mặc áo phản quang tại vị trí camera CAM-01.",
        createdAt: "2026-11-22T04:04:04Z",
        sentAt: "2026-11-22T04:04:04Z",
      },
      {
        ...SAMPLE_ITEMS[0],
        id: "c-helmet",
        incidentId: "inc-c-helmet",
        severity: "HIGH",
        title: "Cảnh báo vi phạm PPE [HIGH]: NO_HELMET tại Công trường",
        content: "Không đội mũ bảo hộ lao động tại vị trí camera CAM-01.",
        createdAt: "2026-11-22T04:04:02Z",
        sentAt: "2026-11-22T04:04:02Z",
      },
    ];

    // 1. Flat mode -> 2 separate articles
    const flatHtml = renderNotifications(
      <NotificationList
        items={repeatedItems}
        total={2}
        page={1}
        limit={5}
        totalPages={1}
      />,
      ADMIN_USER,
    );
    assert.equal((flatHtml.match(/<article\b/g) ?? []).length, 2);

    // 2. Person & Multi-Violation mode -> 1 synthesized multi-violation card showing BOTH violation badges
    const signals = new Map<string, NotificationEnrichedSignals>([
      [
        "inc-c-vest",
        {
          incidentId: "inc-c-vest",
          cameraId: "cam-1",
          cameraCode: "CAM-01",
          siteId: "site-1",
          siteName: "Công trường",
          detectedAtMs: Date.parse("2026-11-22T04:04:04Z"),
          violationType: "NO_VEST",
          severity: "MEDIUM",
          status: "PENDING_REVIEW",
          personTrackId: 7,
          personBox: { x: 0.2, y: 0.2, width: 0.2, height: 0.5 },
          evidenceId: "ev-1",
          evidenceChecksum: "sum-1",
          evidenceUrl: null,
        },
      ],
      [
        "inc-c-helmet",
        {
          incidentId: "inc-c-helmet",
          cameraId: "cam-1",
          cameraCode: "CAM-01",
          siteId: "site-1",
          siteName: "Công trường",
          detectedAtMs: Date.parse("2026-11-22T04:04:02Z"),
          violationType: "NO_HELMET",
          severity: "HIGH",
          status: "PENDING_REVIEW",
          personTrackId: 7,
          personBox: { x: 0.2, y: 0.2, width: 0.2, height: 0.5 },
          evidenceId: "ev-2",
          evidenceChecksum: "sum-2",
          evidenceUrl: null,
        },
      ],
    ]);
    const clusters = groupNotificationsByPerson(repeatedItems, signals, {
      isVietnamese: true,
    });
    const clusterHtml = renderNotifications(
      <NotificationList
        items={repeatedItems}
        clusters={clusters}
        totalRawItems={2}
        total={1}
        page={1}
        limit={10}
        totalPages={1}
        onMarkManyAsRead={() => {}}
      />,
      ADMIN_USER,
    );
    const plain = clusterHtml.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, " ");
    assert.ok(clusterHtml.includes('data-testid="notification-person-cluster"'));
    assert.ok(clusterHtml.includes('data-multi-violation="true"'));
    assert.ok(plain.includes("Không đội mũ bảo hộ"));
    assert.ok(plain.includes("Không mặc áo phản quang"));
    assert.ok(plain.includes("#7"));

    // 3. Hourly section list renders section header with breakdown
    const sections = groupNotificationsIntoSections(repeatedItems, "hour", signals, {
      isVietnamese: true,
    });
    const sectionHtml = renderNotifications(
      <NotificationSectionList
        sections={sections}
        totalRawItems={2}
        onMarkManyAsRead={() => {}}
      />,
      ADMIN_USER,
    );
    assert.ok(sectionHtml.includes('data-testid="notification-section-group"'));
  });

  it("merges predefined and backend notification templates and interpolates template-specific sample variables", () => {
    const merged = mergeNotificationTemplates(
      [
        {
          id: "db-override-1",
          code: "PPE_VIOLATION_ALERT",
          name: "Cảnh báo PPE tùy chỉnh",
          channel: "IN_APP",
          subjectTemplate: "Cảnh báo tại {{siteName}}",
          contentTemplate: "Camera {{cameraCode}} phát hiện {{violationType}}",
          status: "ACTIVE",
          createdAt: "2026-11-20T00:00:00Z",
          updatedAt: "2026-11-21T00:00:00Z",
        },
        {
          id: "db-custom-1",
          code: "CUSTOM_SITE_NOTICE",
          name: "Thông báo nội bộ công trường",
          channel: "EMAIL",
          subjectTemplate: "Tin nội bộ {{siteName}}",
          contentTemplate: "Xin chào {{userName}}, kiểm tra {{customField}}",
          status: "INACTIVE",
          createdAt: "2026-11-20T00:00:00Z",
          updatedAt: "2026-11-21T00:00:00Z",
        },
      ],
      true,
    );

    const ppeTpl = merged.find((t) => t.code === "PPE_VIOLATION_ALERT");
    const customTpl = merged.find((t) => t.code === "CUSTOM_SITE_NOTICE");
    const verifyTpl = merged.find((t) => t.code === "VERIFY_EMAIL");

    assert.ok(ppeTpl);
    assert.equal(ppeTpl.isSystem, true);
    assert.equal(ppeTpl.isVirtualDefault, false);
    assert.equal(ppeTpl.name, "Cảnh báo PPE tùy chỉnh");

    assert.ok(customTpl);
    assert.equal(customTpl.isSystem, false);
    assert.equal(customTpl.isVirtualDefault, false);

    assert.ok(verifyTpl);
    assert.equal(verifyTpl.isSystem, true);
    assert.equal(verifyTpl.isVirtualDefault, true);

    const vars = buildSampleVariables(customTpl);
    assert.equal(vars.customField, "[customField]");
    const rendered = interpolateTemplate(customTpl.contentTemplate, vars);
    assert.ok(rendered.includes("Lê Hoàng Nam"));
    assert.ok(rendered.includes("[customField]"));
  });

  it("renders NotificationTemplatesTab view mode switcher and split view master-detail layout", () => {
    const tableHtml = renderNotifications(
      <NotificationTemplatesTab
        defaultViewMode="table"
        onEditTemplate={() => {}}
      />,
      ADMIN_USER,
    );
    assert.ok(tableHtml.includes("Bảng") || tableHtml.includes("Table"));
    assert.ok(
      tableHtml.includes("Thẻ &amp; Chi tiết") ||
        tableHtml.includes("Cards &amp; Detail"),
    );

    const splitHtml = renderNotifications(
      <NotificationTemplatesTab
        defaultViewMode="split"
        onEditTemplate={() => {}}
        onTestSendTemplate={() => {}}
      />,
      ADMIN_USER,
    );
    assert.ok(
      splitHtml.includes('data-testid="notification-templates-split-view"'),
    );
    assert.ok(splitHtml.includes('data-testid="template-card-PPE_VIOLATION_ALERT"'));
    assert.ok(splitHtml.includes('data-testid="template-detail-panel"'));
  });

  it("renders NotificationTemplateCardList and NotificationTemplateDetailPanel in view and inline edit modes with RBAC", () => {
    const merged = mergeNotificationTemplates([], true);
    const emailTpl = merged.find((t) => t.code === "VERIFY_EMAIL")!;

    const cardListHtml = renderNotifications(
      <NotificationTemplateCardList
        templates={merged.slice(0, 3)}
        selectedCode={merged[0].code}
        onSelect={() => {}}
        onPlaySound={() => {}}
      />,
      ADMIN_USER,
    );
    assert.ok(cardListHtml.includes('aria-pressed="true"'));
    assert.ok(cardListHtml.includes(merged[0].code));

    // Read-only user: edit button must be hidden
    const readOnlyViewHtml = renderNotifications(
      <NotificationTemplateDetailPanel
        template={emailTpl}
        canEdit={false}
        mode="view"
        onModeChange={() => {}}
      />,
      SAFETY_MANAGER_USER,
    );
    assert.equal(
      readOnlyViewHtml.includes("Chỉnh sửa mẫu") ||
        readOnlyViewHtml.includes("Edit Template"),
      false,
    );
    assert.ok(readOnlyViewHtml.includes("VERIFY_EMAIL"));

    // Admin view mode: edit button visible
    const adminViewHtml = renderNotifications(
      <NotificationTemplateDetailPanel
        template={emailTpl}
        canEdit={true}
        mode="view"
        onModeChange={() => {}}
        onTestSend={() => {}}
      />,
      ADMIN_USER,
    );
    assert.ok(
      adminViewHtml.includes("Chỉnh sửa mẫu") ||
        adminViewHtml.includes("Edit Template"),
    );

    // Inline edit mode: form inputs, placeholder chips, live preview & save button rendered
    const editHtml = renderNotifications(
      <NotificationTemplateDetailPanel
        template={emailTpl}
        canEdit={true}
        mode="edit"
        onModeChange={() => {}}
      />,
      ADMIN_USER,
    );
    assert.ok(editHtml.includes('data-mode="edit"'));
    assert.ok(editHtml.includes("{{fullName}}"));
    assert.ok(
      editHtml.includes("Lưu thay đổi") || editHtml.includes("Save Changes"),
    );
    assert.ok(
      editHtml.includes("Xem trước trực tiếp khi gõ") ||
        editHtml.includes("Live Preview"),
    );
  });

  it("disables Test Send button when feature.notifications.enabled is false", () => {
    const merged = mergeNotificationTemplates([], true);
    const emailTpl = merged.find((t) => t.code === "VERIFY_EMAIL")!;

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    queryClient.setQueryData(["auth", "config"], {
      "feature.notifications.enabled": false,
    });

    const authValue: AuthContextValue = {
      user: ADMIN_USER,
      status: "authenticated",
      logout: async () => {},
      setUser: () => {},
    };
    const realtimeValue: RealtimeContextValue = {
      isConnected: true,
      lastAlert: null,
    };

    const html = renderToString(
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(
          AuthContext.Provider,
          { value: authValue },
          React.createElement(
            RealtimeContext.Provider,
            { value: realtimeValue },
            React.createElement(
              LocaleProvider,
              null,
              React.createElement(NotificationTemplateDetailPanel, {
                template: emailTpl,
                canEdit: true,
                mode: "view",
                onModeChange: () => {},
                onTestSend: () => {},
              }),
            ),
          ),
        ),
      ),
    );

    assert.ok(
      html.includes('disabled=""') &&
        (html.includes("Hệ thống gửi thông báo đang tạm tắt") ||
          html.includes("Notifications are currently disabled")),
    );
  });

  it("renders pause warning banner in NotificationPreferencesCard and disables dispatch buttons in NotificationConsoleHeader when feature.notifications.enabled is false", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    queryClient.setQueryData(["auth", "config"], {
      "feature.notifications.enabled": false,
    });

    const authValue: AuthContextValue = {
      user: SAFETY_MANAGER_USER,
      status: "authenticated",
      logout: async () => {},
      setUser: () => {},
    };
    const realtimeValue: RealtimeContextValue = {
      isConnected: true,
      lastAlert: null,
    };

    const prefsHtml = renderToString(
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(
          AuthContext.Provider,
          { value: authValue },
          React.createElement(
            RealtimeContext.Provider,
            { value: realtimeValue },
            React.createElement(
              LocaleProvider,
              null,
              React.createElement(NotificationPreferencesCard, {}),
            ),
          ),
        ),
      ),
    );

    assert.ok(
      prefsHtml.includes(
        "Hệ thống gửi thông báo và email tự động đang bị Quản trị viên tạm dừng. Các cảnh báo tự động, email và thao tác phát thông báo tạm thời bị vô hiệu hóa.",
      ) ||
        prefsHtml.includes(
          "Automated notifications and email dispatch are currently paused by the Administrator.",
        ),
    );

    const headerHtml = renderToString(
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(
          AuthContext.Provider,
          { value: authValue },
          React.createElement(
            RealtimeContext.Provider,
            { value: realtimeValue },
            React.createElement(
              LocaleProvider,
              null,
              React.createElement(NotificationConsoleHeader, {
                isConnected: true,
                isRefreshing: false,
                onRefresh: () => {},
                totalCount: 10,
                unreadCount: 2,
                canBroadcast: true,
                onOpenCustomDispatch: () => {},
                onOpenBroadcast: () => {},
              }),
            ),
          ),
        ),
      ),
    );

    assert.ok(headerHtml.includes('disabled=""'));
    assert.ok(
      headerHtml.includes(
        "Hệ thống gửi thông báo và email tự động đang bị Quản trị viên tạm dừng",
      ) ||
        headerHtml.includes(
          "Automated notifications and email dispatch are currently paused by Administrator",
        ),
    );
  });
});

// ============================================================================
// Zalo Bot (ZALO_BOT) — card liên kết & badge kênh
// ============================================================================

const ZALO_BINDING = {
  id: "b-1",
  userId: "u-admin",
  chatIdMasked: "1234****7890",
  chatType: "PRIVATE",
  displayName: "Nguyễn Văn A",
  linkedAt: "2026-11-28T10:00:00.000Z",
  updatedAt: "2026-11-28T10:00:00.000Z",
} as const;

function buildZaloStatus(overrides: Partial<ZaloBotStatusDto> = {}): ZaloBotStatusDto {
  return {
    botConfigured: true,
    botMode: "polling",
    botAccountName: "bot.example",
    canJoinGroups: true,
    linked: false,
    binding: null,
    ...overrides,
  };
}

function renderZaloCard(
  status: ZaloBotStatusDto | undefined,
  options: { user?: MeDto; preferences?: NotificationPreferenceDto[] } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: Infinity } },
  });
  if (status) queryClient.setQueryData(notificationKeys.zaloStatus(), status);
  if (options.preferences) {
    queryClient.setQueryData(notificationKeys.preferences(), options.preferences);
  }
  const authValue: AuthContextValue = {
    user: options.user ?? SAFETY_MANAGER_USER,
    status: "authenticated",
    logout: async () => {},
    setUser: () => {},
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
          { value: { isConnected: true, lastAlert: null } },
          React.createElement(LocaleProvider, null, React.createElement(ZaloBotChannelCard)),
        ),
      ),
    ),
  );
}

function getSwitchTag(html: string): string {
  const match = html.match(/<button[^>]*role="switch"[^>]*>/);
  assert.ok(match, "Zalo card phải có công tắc kênh");
  return match[0];
}

describe("Zalo Bot channel (ZALO_BOT)", () => {
  it("adds zaloStatus query key under the notifications prefix", () => {
    assert.deepEqual(notificationKeys.zaloStatus(), ["notifications", "zalo", "status"]);
  });

  it("resolves card state from GET /zalo/status", () => {
    assert.equal(resolveZaloCardState(undefined), "loading");
    assert.equal(resolveZaloCardState(undefined, { isError: true }), "error");
    assert.equal(resolveZaloCardState(buildZaloStatus({ botConfigured: false })), "not_configured");
    assert.equal(resolveZaloCardState(buildZaloStatus({ botMode: "disabled" })), "not_configured");
    assert.equal(resolveZaloCardState(buildZaloStatus()), "not_linked");
    // linked=true nhưng thiếu binding → vẫn coi là chưa liên kết
    assert.equal(resolveZaloCardState(buildZaloStatus({ linked: true })), "not_linked");
    assert.equal(
      resolveZaloCardState(buildZaloStatus({ linked: true, binding: { ...ZALO_BINDING } })),
      "linked",
    );
  });

  it("formats countdown and computes token deadline from expiresInSeconds", () => {
    assert.equal(formatZaloCountdown(600), "10:00");
    assert.equal(formatZaloCountdown(65), "01:05");
    assert.equal(formatZaloCountdown(-3), "00:00");
    const token = {
      code: "PPE-A1B2C3D4E5F6",
      command: "/link PPE-A1B2C3D4E5F6",
      expiresAt: "2026-11-28T10:10:00.000Z",
      expiresInSeconds: 600,
      botAccountName: "bot.example",
      botConfigured: true,
    };
    assert.equal(computeZaloTokenDeadline(token, 1_000), 601_000);
    assert.equal(
      computeZaloTokenDeadline({ ...token, expiresInSeconds: 0 }, 1_000),
      Date.parse("2026-11-28T10:10:00.000Z"),
    );
  });

  it("renders the not-configured state with locked actions and admin guidance", () => {
    const html = renderZaloCard(buildZaloStatus({ botConfigured: false, botMode: "disabled" }));
    assert.ok(html.includes('data-state="not_configured"'));
    assert.ok(html.includes('data-testid="zalo-not-configured"'));
    assert.ok(
      html.includes("Quản trị viên") || html.includes("administrator"),
      "phải hướng dẫn liên hệ quản trị viên",
    );
    assert.ok(getSwitchTag(html).includes('disabled=""'));
    assert.ok(!html.includes("Tạo mã liên kết") && !html.includes("Create link code"));
  });

  it("renders the not-linked state with create-code button and private/group guidance", () => {
    const html = renderZaloCard(buildZaloStatus());
    assert.ok(html.includes('data-state="not_linked"'));
    assert.ok(html.includes("Tạo mã liên kết") || html.includes("Create link code"));
    assert.ok(html.includes("bot.example"));
    assert.ok(html.includes("Cá nhân") || html.includes("(Private)"));
    assert.ok(html.includes("(Nhóm)") || html.includes("(Group)"));
    // Chưa liên kết → không bật được kênh
    assert.ok(getSwitchTag(html).includes('disabled=""'));
    assert.ok(getSwitchTag(html).includes('aria-checked="false"'));

    const noGroupHtml = renderZaloCard(buildZaloStatus({ canJoinGroups: false }));
    assert.ok(!noGroupHtml.includes("(Nhóm)") && !noGroupHtml.includes("(Group)"));
  });

  it("renders the link command box with copy button, countdown and expired state", () => {
    const render = (remainingSeconds: number) =>
      renderNotifications(
        React.createElement(ZaloLinkCommandBox, {
          command: "/link PPE-A1B2C3D4E5F6",
          remainingSeconds,
          copied: false,
          onCopy: () => {},
          onRegenerate: () => {},
          regenerating: false,
        }),
        SAFETY_MANAGER_USER,
      );
    const active = render(599);
    assert.ok(active.includes("/link PPE-A1B2C3D4E5F6"));
    assert.ok(active.includes("09:59"));
    assert.ok(active.includes("Sao chép") || active.includes("Copy"));
    assert.ok(active.includes('role="timer"'));

    const expired = render(0);
    assert.ok(expired.includes("hết hạn") || expired.includes("expired"));
    assert.ok(expired.includes("Tạo mã mới") || expired.includes("New code"));
    assert.ok(!expired.includes('role="timer"'));
  });

  it("renders the linked state with binding info, switch, threshold, test and unlink actions", () => {
    const html = renderZaloCard(
      buildZaloStatus({ linked: true, binding: { ...ZALO_BINDING } }),
      {
        preferences: [
          {
            id: "p-zalo",
            userId: "u-sm",
            channel: "ZALO_BOT",
            enabled: true,
            severityThreshold: "CRITICAL",
            createdAt: "2026-11-28T10:00:00.000Z",
            updatedAt: "2026-11-28T10:00:00.000Z",
          },
        ],
      },
    );
    assert.ok(html.includes('data-state="linked"'));
    assert.ok(html.includes("Nguyễn Văn A"));
    assert.ok(html.includes("1234****7890"));
    assert.ok(html.includes(">Cá nhân<") || html.includes(">Private<"));
    const switchTag = getSwitchTag(html);
    assert.ok(switchTag.includes('aria-checked="true"'));
    assert.ok(!switchTag.includes('disabled=""'));
    for (const level of ["LOW", "NORMAL", "MEDIUM", "HIGH", "CRITICAL"]) {
      assert.ok(html.includes(`<option value="${level}"`));
    }
    assert.match(html, /<option value="CRITICAL" selected=""/);
    assert.ok(html.includes("Gửi tin nhắn thử") || html.includes("Send test message"));
    assert.ok(html.includes("Hủy liên kết") || html.includes("Unlink"));
    // Không phải admin → không có khu vực quản trị Webhook
    assert.ok(!html.includes("Quản trị Zalo Bot") && !html.includes("Zalo Bot administration"));
  });

  it("defaults ZALO_BOT preference to disabled + HIGH and shows Group badge for group bindings", () => {
    const html = renderZaloCard(
      buildZaloStatus({ linked: true, binding: { ...ZALO_BINDING, chatType: "GROUP", displayName: null } }),
      { preferences: [] },
    );
    assert.ok(getSwitchTag(html).includes('aria-checked="false"'));
    assert.match(html, /<option value="HIGH" selected=""/);
    assert.ok(html.includes(">Nhóm<") || html.includes(">Group<"));
    assert.ok(html.includes("Hội thoại Zalo") || html.includes("Zalo conversation"));
  });

  it("shows the admin webhook section only for NOTIFICATION_TEMPLATE_MANAGE", () => {
    const html = renderZaloCard(buildZaloStatus(), { user: ADMIN_USER });
    assert.ok(html.includes("Quản trị Zalo Bot") || html.includes("Zalo Bot administration"));
  });

  it("renders ZALO_BOT channel badge label", () => {
    assert.equal(getChannelDisplay("ZALO_BOT").label, "Zalo Bot");
    assert.notEqual(getChannelDisplay("ZALO_BOT").icon, getChannelDisplay("IN_APP").icon);
  });
});
