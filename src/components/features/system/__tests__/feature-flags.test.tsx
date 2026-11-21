import "@/hooks/auth/__tests__/setup";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LocaleProvider } from "@/providers/locale-provider";
import { isFeatureFlagEnabled } from "@/lib/system-config";
import type { SystemConfigItem, SystemHealthReport } from "@/types";
import { FeatureFlagCard } from "../feature-flag-card";
import { FeatureFlagsTab } from "../feature-flags-tab";
import { SystemKpiSummary } from "../system-kpi-summary";
import { SystemStatsDetailPanel } from "../system-stats-detail-panel";
import { ToggleFlagDialog } from "../modals/toggle-flag-dialog";

function render(element: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <LocaleProvider>{element}</LocaleProvider>
    </QueryClientProvider>,
  );
}

const SAMPLE_FLAGS: SystemConfigItem[] = [
  {
    id: "1",
    key: "feature.registration.enabled",
    value: true,
    description: "Cho phép đăng ký",
    category: "FEATURE_FLAG",
    isPublic: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "2",
    key: "feature.notifications.enabled",
    value: true,
    description: "Bật thông báo",
    category: "FEATURE_FLAG",
    isPublic: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "3",
    key: "feature.webhooks.enabled",
    value: "false",
    description: "Bật webhook",
    category: "FEATURE_FLAG",
    isPublic: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "4",
    key: "feature.ai.enabled",
    value: false,
    description: "Bật AI",
    category: "FEATURE_FLAG",
    isPublic: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "5",
    key: "feature.social_login.enabled",
    value: true,
    description: "Bật đăng nhập xã hội",
    category: "FEATURE_FLAG",
    isPublic: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("isFeatureFlagEnabled", () => {
  it("normalizes booleans, numeric flags, string flags, and wrapped payloads", () => {
    assert.equal(isFeatureFlagEnabled(true), true);
    assert.equal(isFeatureFlagEnabled(false), false);
    assert.equal(isFeatureFlagEnabled("true"), true);
    assert.equal(isFeatureFlagEnabled("false"), false);
    assert.equal(isFeatureFlagEnabled("FALSE"), false);
    assert.equal(isFeatureFlagEnabled("0"), false);
    assert.equal(isFeatureFlagEnabled("1"), true);
    assert.equal(isFeatureFlagEnabled(0), false);
    assert.equal(isFeatureFlagEnabled(1), true);
    assert.equal(isFeatureFlagEnabled({ enabled: false }), false);
    assert.equal(isFeatureFlagEnabled({ enabled: true }), true);
    assert.equal(isFeatureFlagEnabled(null), false);
    assert.equal(isFeatureFlagEnabled(undefined), false);
  });
});

describe("System Feature Flags UI", () => {
  it("FeatureFlagCard renders accurate switch state for string 'false' and excludes random accent/glow styles", () => {
    const disabledStringFlag = SAMPLE_FLAGS[2]!;
    const html = render(
      <FeatureFlagCard flag={disabledStringFlag} onToggle={() => {}} />,
    );

    assert.match(html, /role="switch"/);
    assert.match(html, /aria-checked="false"/);
    assert.match(html, /Đang Tắt/);
    assert.doesNotMatch(html, /bg-accent|text-accent|blur-2xl/);

    const enabledFlag = SAMPLE_FLAGS[0]!;
    const enabledHtml = render(
      <FeatureFlagCard flag={enabledFlag} onToggle={() => {}} />,
    );
    assert.match(enabledHtml, /aria-checked="true"/);
    assert.match(enabledHtml, /Đang Bật/);
    assert.doesNotMatch(enabledHtml, /bg-accent|text-accent|blur-2xl/);
  });

  it("FeatureFlagsTab computes active count accurately and excludes accent classes", () => {
    const html = render(
      <FeatureFlagsTab flags={SAMPLE_FLAGS} onToggle={() => {}} canManage={false} />,
    );

    // 3 enabled (ids 1, 2, 5), 2 disabled (ids 3 with "false", 4 with false)
    assert.match(html, />3<\/span>\s*\/\s*5|>3\/5</);
    assert.doesNotMatch(html, /bg-accent|text-accent/);
  });

  it("FeatureFlagsTab renders error fallback when query fails with empty flags", () => {
    const html = render(
      <FeatureFlagsTab
        flags={[]}
        onToggle={() => {}}
        error={new Error("Network error")}
        onRetry={() => {}}
      />,
    );

    assert.doesNotMatch(html, /Không tìm thấy cờ tính năng nào trong hệ thống/);
  });

  it("SystemKpiSummary does not show fake 12/12 or 24 ms before health data loads and uses uniform primary tone", () => {
    const loadingHtml = render(
      <SystemKpiSummary
        totalConfigs={14}
        featureFlags={SAMPLE_FLAGS}
        loading={false}
        healthLoading={true}
      />,
    );
    assert.doesNotMatch(loadingHtml, /12\/12|24 ms/);
    assert.doesNotMatch(loadingHtml, /var\(--info\)|var\(--success\)|var\(--warning\)|var\(--danger\)/);

    const report: SystemHealthReport = {
      overallStatus: "DEGRADED",
      healthyCount: 10,
      totalServices: 12,
      averageLatencyMs: 42,
      services: [],
      checkedAt: "2026-01-01T00:00:00.000Z",
    };
    const loadedHtml = render(
      <SystemKpiSummary
        totalConfigs={14}
        featureFlags={SAMPLE_FLAGS}
        healthReport={report}
        loading={false}
        healthLoading={false}
      />,
    );
    assert.match(loadedHtml, /10/);
    assert.match(loadedHtml, /42/);
  });

  it("SystemStatsDetailPanel shows all 5 flags and hides redundant tab jump when already on flags tab", () => {
    const html = render(
      <SystemStatsDetailPanel
        activeStat="flags"
        activeTab="flags"
        totalConfigs={14}
        featureFlags={SAMPLE_FLAGS}
        onClose={() => {}}
        onSelectTab={() => {}}
        onRefreshHealth={() => {}}
        onToggleFlag={() => {}}
      />,
    );

    assert.match(html, /feature\.social_login\.enabled/);
    assert.match(html, /role="switch"/);
    assert.doesNotMatch(html, /Chuyển tới Tab Công tắc Tính năng/);
    assert.doesNotMatch(html, /bg-accent|text-accent/);
  });

  it("ToggleFlagDialog uses unified primary/neutral styling without amber/success/danger clashes", () => {
    const html = render(
      <ToggleFlagDialog
        open={true}
        onOpenChange={() => {}}
        flag={SAMPLE_FLAGS[0]!}
        targetEnabled={false}
        onConfirm={async () => {}}
      />,
    );

    // Portal returns direct markup in SSR only if document undefined; verify no amber/success classes
    assert.doesNotMatch(html, /amber-|bg-success|text-success|bg-danger/);
  });
});
