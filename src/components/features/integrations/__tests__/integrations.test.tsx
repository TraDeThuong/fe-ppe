import "@/hooks/auth/__tests__/setup";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext, type AuthContextValue } from "@/contexts/AuthContext";
import { LocaleProvider } from "@/providers/locale-provider";
import {
  SUPPORTED_WEBHOOK_EVENTS,
  type ApiKeyItemDto,
  type MeDto,
  type WebhookEndpointDto,
} from "@/types";
import { ApiKeysTab, formatMinDatetimeLocal } from "../api-keys-tab";
import { IntegrationKpiSummary } from "../integration-kpi-summary";
import {
  MAX_JOB_DATA_KEYS,
  MAX_JOB_STRING_LENGTH,
  parseAndValidateFlatJobData,
} from "../job-trigger-playground";
import { SUGGESTED_EVENTS, WebhooksTab } from "../webhooks-tab";

function renderWithAuth(
  element: React.ReactElement,
  user: Partial<MeDto> | null = null,
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const authValue: AuthContextValue = {
    user: user
      ? ({
          id: "u-1",
          email: "user@smartppe.vn",
          fullName: "Test User",
          avatarUrl: null,
          phoneNumber: null,
          role: "SAFETY_MANAGER",
          roleId: "r-1",
          permissions: [],
          isActive: true,
          twoFactorEnabled: false,
          createdAt: "2026-01-01T00:00:00.000Z",
          ...user,
        } as MeDto)
      : null,
    status: user ? "authenticated" : "unauthenticated",
    setUser: () => {},
    logout: async () => {},
  };

  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={authValue}>
        <LocaleProvider>{element}</LocaleProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe("Integrations review fixes", () => {
  it("parseAndValidateFlatJobData validates flat JSON, max 50 keys, and string <= 1000 chars", () => {
    const valid = parseAndValidateFlatJobData(
      JSON.stringify({
        siteCode: "SITE-01",
        workers: 42,
        urgent: true,
        note: null,
      }),
    );
    assert.deepEqual(valid, {
      siteCode: "SITE-01",
      workers: 42,
      urgent: true,
      note: null,
    });

    // Rejects array root
    assert.throws(
      () => parseAndValidateFlatJobData("[1, 2, 3]"),
      /JSON phẳng|flat JSON/i,
    );

    // Rejects nested object or array values
    assert.throws(
      () =>
        parseAndValidateFlatJobData(
          JSON.stringify({ nested: { a: 1 } }),
        ),
      /nguyên thủy|primitive/i,
    );
    assert.throws(
      () =>
        parseAndValidateFlatJobData(
          JSON.stringify({ list: ["a", "b"] }),
        ),
      /nguyên thủy|primitive/i,
    );

    // Rejects > 50 keys
    const tooManyKeys: Record<string, number> = {};
    for (let i = 0; i < MAX_JOB_DATA_KEYS + 1; i++) {
      tooManyKeys[`k_${i}`] = i;
    }
    assert.throws(
      () => parseAndValidateFlatJobData(JSON.stringify(tooManyKeys)),
      /50/,
    );

    // Rejects string > 1000 characters
    const longString = "x".repeat(MAX_JOB_STRING_LENGTH + 1);
    assert.throws(
      () =>
        parseAndValidateFlatJobData(
          JSON.stringify({ description: longString }),
        ),
      /1000/,
    );
  });

  it("formatMinDatetimeLocal returns a future YYYY-MM-DDTHH:mm local datetime string", () => {
    const base = new Date(2026, 10, 27, 14, 5, 0);
    const formatted = formatMinDatetimeLocal(base);
    assert.equal(formatted, "2026-11-27T14:06");
  });

  it("ApiKeysTab disables toggle button on expired API keys while keeping active keys toggleable", () => {
    const items: ApiKeyItemDto[] = [
      {
        id: "k-expired",
        name: "Expired ERP Key",
        prefix: "ak_live_exp1",
        permissions: ["PPE_INCIDENT_READ"],
        isActive: true,
        expiresAt: "2020-01-01T00:00:00.000Z",
        createdAt: "2019-01-01T00:00:00.000Z",
      },
    ];

    const html = renderWithAuth(
      <ApiKeysTab
        apiKeys={items}
        onCreate={async () => ({
          id: "k-new",
          name: "New",
          key: "ak_live_secret",
          prefix: "ak_live_new",
          permissions: [],
          createdAt: "2026-01-01T00:00:00.000Z",
        })}
        onToggle={async () => {}}
        onDelete={async () => {}}
      />,
      {
        role: "SAFETY_MANAGER",
        permissions: ["API_KEY_READ", "API_KEY_MANAGE"],
      },
    );

    assert.match(html, /Hết hạn|Expired/);
    assert.match(
      html,
      /disabled=""[^>]*title="Không thể bật\/tắt API Key đã hết hạn"|title="Không thể bật\/tắt API Key đã hết hạn"[^>]*disabled=""/,
    );
  });

  it("WebhooksTab syncs SUGGESTED_EVENTS with BE and shows warning + disables actions when webhooksEnabled is false", () => {
    assert.deepEqual(SUGGESTED_EVENTS, SUPPORTED_WEBHOOK_EVENTS);

    const webhooks: WebhookEndpointDto[] = [
      {
        id: "wh-1",
        url: "https://example.com/hook",
        events: ["*", "ppe.incident.created"],
        isActive: true,
        description: "Test sink",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        secretMasked: "whsec_123456...",
      },
    ];

    const html = renderWithAuth(
      <WebhooksTab
        webhooks={webhooks}
        webhooksEnabled={false}
        onCreate={async () => ({
          ...webhooks[0]!,
          secret: "whsec_plain_secret_value",
        })}
        onUpdate={async () => {}}
        onDelete={async () => {}}
        onTestPing={async () => ({ deliveryId: "d-1", message: "ok" })}
        onRetryDelivery={async () => {}}
      />,
      {
        role: "SAFETY_MANAGER",
        permissions: ["WEBHOOK_READ", "WEBHOOK_MANAGE"],
      },
    );

    assert.match(html, /data-testid="webhooks-disabled-banner"/);
    assert.match(html, /feature\.webhooks\.enabled = OFF/);
    assert.match(
      html,
      /disabled=""[^>]*title="Tính năng Webhook hiện đang tạm khóa bởi quản trị viên"|title="Tính năng Webhook hiện đang tạm khóa bởi quản trị viên"[^>]*disabled=""/,
    );
    // Khớp BE: tạo/sửa endpoint không bị chặn bởi cờ, chỉ Test Ping/Retry bị khóa.
    const addButton = html.match(/<button[^>]*data-testid="webhook-add-button"[^>]*>/)?.[0];
    assert.ok(addButton, "Add Webhook button should render");
    assert.doesNotMatch(addButton, /disabled=""/);
  });

  it("IntegrationKpiSummary hides unauthorized KPI cards instead of displaying zeros", () => {
    const noneHtml = renderWithAuth(
      <IntegrationKpiSummary
        apiKeys={[]}
        webhooks={[]}
        canReadApiKeys={false}
        canReadWebhooks={false}
      />,
    );
    assert.equal(noneHtml, "");

    const onlyWebhooksHtml = renderWithAuth(
      <IntegrationKpiSummary
        apiKeys={[]}
        webhooks={[]}
        canReadApiKeys={false}
        canReadWebhooks={true}
      />,
    );
    assert.doesNotMatch(onlyWebhooksHtml, /API Keys Hoạt động|Active API Keys/);
    assert.match(onlyWebhooksHtml, /Webhook Đang bật|Active Webhooks/);

    const onlyApiKeysHtml = renderWithAuth(
      <IntegrationKpiSummary
        apiKeys={[]}
        webhooks={[]}
        canReadApiKeys={true}
        canReadWebhooks={false}
      />,
    );
    assert.match(onlyApiKeysHtml, /API Keys Hoạt động|Active API Keys/);
    assert.doesNotMatch(onlyApiKeysHtml, /Webhook Đang bật|Active Webhooks/);
  });
});
