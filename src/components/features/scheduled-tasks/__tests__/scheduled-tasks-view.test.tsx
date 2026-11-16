import "@/hooks/auth/__tests__/setup";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LocaleProvider } from "@/providers/locale-provider";
import type { CronJobItem } from "@/types/cron.types";
import { CronToolbar } from "../cron-toolbar";
import { CronJobTable } from "../cron-job-table";
import { CronJobCardGrid } from "../cron-job-card-grid";

function render(element: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <LocaleProvider>{element}</LocaleProvider>
    </QueryClientProvider>
  );
}

const SAMPLE_JOBS: CronJobItem[] = [
  {
    name: "cleanup-audit-logs",
    cron: "0 2 * * *",
    description: "Dọn dẹp audit logs cũ hơn thời gian lưu trữ.",
    isEnabled: true,
  },
  {
    name: "daily-summary-digest",
    cron: "0 8 * * *",
    description: "Tổng hợp báo cáo hoạt động hằng ngày.",
    isEnabled: true,
  },
  {
    name: "weekly-summary-digest",
    cron: "0 8 * * 1",
    description: "Tổng hợp báo cáo hoạt động hằng tuần.",
    isEnabled: false,
  },
];

describe("Scheduled Tasks views", () => {
  it("CronToolbar renders view mode segmented control for table and card", () => {
    const html = render(
      <CronToolbar
        search=""
        onSearchChange={() => {}}
        filter="all"
        onFilterChange={() => {}}
        viewMode="card"
        onViewModeChange={() => {}}
        totalCount={3}
        visibleCount={3}
        enabledCount={2}
        disabledCount={1}
      />
    );

    assert.match(html, /role="tablist"/);
    assert.match(html, />Bảng</);
    assert.match(html, />Thẻ</);
    assert.match(html, /role="tab" aria-selected="true"[^>]*>.*?Thẻ/);
  });

  it("CronJobTable uses single TableRowActions dropdown trigger instead of inline action cluster", () => {
    const html = render(
      <CronJobTable
        jobs={SAMPLE_JOBS}
        allJobs={SAMPLE_JOBS}
        loading={false}
        fetching={false}
        error={null}
        filtered={false}
        canManage={true}
        blockedJobs={new Set(["cleanup-audit-logs"])}
        onRetry={() => {}}
        onTrigger={() => {}}
        onToggle={() => {}}
        onViewDetail={() => {}}
      />
    );

    const menuTriggers = html.match(/aria-haspopup="menu"/g) ?? [];
    assert.equal(menuTriggers.length, SAMPLE_JOBS.length);
    assert.doesNotMatch(html, /min-w-56 flex-wrap/);
    assert.match(html, /Cần làm mới trước khi thử lại\./);
    assert.match(html, /data-clickable=""/);
  });

  it("CronJobCardGrid renders cards, conflict badge, recent execution, and disabled controls for blocked jobs", () => {
    const html = render(
      <CronJobCardGrid
        jobs={SAMPLE_JOBS}
        allJobs={SAMPLE_JOBS}
        recentExecutions={{
          "cleanup-audit-logs": {
            timestamp: new Date().toISOString(),
            success: true,
            durationMs: 145,
          },
        }}
        loading={false}
        fetching={false}
        error={null}
        filtered={false}
        canManage={true}
        blockedJobs={new Set(["cleanup-audit-logs"])}
        onRetry={() => {}}
        onTrigger={() => {}}
        onToggle={() => {}}
        onViewDetail={() => {}}
      />
    );

    assert.match(html, /Dọn audit log cũ/);
    assert.match(html, /0 2 \* \* \*/);
    assert.match(html, /Vừa chạy \(145ms\)/);
    assert.match(html, /Trùng lịch \(08:00 T2\)/);
    assert.match(html, /Cần làm mới trước khi thử lại\./);
    assert.match(html, /disabled=""[^>]*aria-label="Chạy ngay: cleanup-audit-logs"/);
  });

  it("CronJobCardGrid handles loading, error retry, and filtered empty states", () => {
    const loadingHtml = render(
      <CronJobCardGrid
        jobs={[]}
        loading={true}
        fetching={false}
        error={null}
        filtered={false}
        canManage={true}
        blockedJobs={new Set()}
        onRetry={() => {}}
        onTrigger={() => {}}
        onToggle={() => {}}
      />
    );
    assert.match(loadingHtml, /aria-busy="true"/);
    assert.match(loadingHtml, /animate-pulse/);

    const errorHtml = render(
      <CronJobCardGrid
        jobs={[]}
        loading={false}
        fetching={false}
        error={new Error("network")}
        filtered={false}
        canManage={true}
        blockedJobs={new Set()}
        onRetry={() => {}}
        onTrigger={() => {}}
        onToggle={() => {}}
      />
    );
    assert.match(errorHtml, /role="alert"/);
    assert.match(errorHtml, /Thử lại/);

    const emptyFilteredHtml = render(
      <CronJobCardGrid
        jobs={[]}
        loading={false}
        fetching={false}
        error={null}
        filtered={true}
        canManage={true}
        blockedJobs={new Set()}
        onRetry={() => {}}
        onTrigger={() => {}}
        onToggle={() => {}}
        onResetFilters={() => {}}
      />
    );
    assert.match(emptyFilteredHtml, /Không có tác vụ phù hợp/);
    assert.match(emptyFilteredHtml, /Khôi phục bộ lọc/);
  });
});
