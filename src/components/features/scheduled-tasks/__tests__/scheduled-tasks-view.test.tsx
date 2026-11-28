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
import { CronKpiSummary } from "../cron-kpi-summary";
import { CronStatsDetailPanel } from "../cron-stats-detail-panel";

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
    scheduleLabel: "02:00 hàng ngày (UTC+7) từ API",
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
        onEdit={() => {}}
        onViewDetail={() => {}}
      />
    );

    const menuTriggers = html.match(/aria-haspopup="menu"/g) ?? [];
    assert.equal(menuTriggers.length, SAMPLE_JOBS.length);
    assert.match(html, /02:00 hàng ngày \(UTC\+7\) từ API/);
    assert.doesNotMatch(html, /min-w-56 flex-wrap/);
    assert.match(html, /Cần làm mới trước khi thử lại\./);
    assert.match(html, /data-clickable=""/);
    assert.match(html, /role="switch"[^>]*aria-checked="true"[^>]*aria-label="Tắt lịch: daily-summary-digest"/);
    assert.match(html, /role="switch"[^>]*aria-checked="false"[^>]*aria-label="Bật lịch: weekly-summary-digest"/);
    assert.match(html, /role="switch"[^>]*aria-label="Tắt lịch: cleanup-audit-logs"[^>]*disabled=""/);

    const readOnlyHtml = render(
      <CronJobTable
        jobs={SAMPLE_JOBS}
        allJobs={SAMPLE_JOBS}
        loading={false}
        fetching={false}
        error={null}
        filtered={false}
        canManage={false}
        blockedJobs={new Set()}
        onRetry={() => {}}
        onTrigger={() => {}}
        onToggle={() => {}}
        onEdit={() => {}}
        onViewDetail={() => {}}
      />
    );
    assert.doesNotMatch(readOnlyHtml, /role="switch"/);
  });

  it("CronJobCardGrid renders cards, conflict badge, recent execution, and disabled controls for blocked jobs", () => {
    const enabledJobs = SAMPLE_JOBS.map((job) => ({ ...job, isEnabled: true }));
    const html = render(
      <CronJobCardGrid
        jobs={enabledJobs}
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
        onEdit={() => {}}
        onViewDetail={() => {}}
      />
    );

    assert.match(html, /Dọn audit log cũ/);
    assert.match(html, /0 2 \* \* \*/);
    assert.match(html, /Vừa chạy \(145ms\)/);
    assert.match(html, /Trùng lịch/);
    assert.match(html, /02:00 hàng ngày \(UTC\+7\) từ API/);
    assert.match(html, /disabled=""[^>]*aria-label="Chỉnh sửa: Dọn audit log cũ"/);
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
        onEdit={() => {}}
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
        onEdit={() => {}}
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
        onEdit={() => {}}
        onResetFilters={() => {}}
      />
    );
    assert.match(emptyFilteredHtml, /Không có tác vụ phù hợp/);
    assert.match(emptyFilteredHtml, /Khôi phục bộ lọc/);
  });

  it("CronKpiSummary combines 3 stats into a single unified card without Scheduler Engine / UTC+7 stat", () => {
    const html = render(<CronKpiSummary jobs={SAMPLE_JOBS} />);

    assert.match(html, /data-testid="cron-kpi-total"/);
    assert.match(html, /data-testid="cron-kpi-enabled"/);
    assert.match(html, /data-testid="cron-kpi-disabled"/);
    assert.match(html, /Tổng tác vụ/);
    assert.match(html, /Lịch đang bật/);
    assert.match(html, /Lịch đang tắt/);
    assert.match(html, /67%/);
    assert.doesNotMatch(html, /Hạ tầng Scheduler/);
    assert.doesNotMatch(html, /UTC\+7/);
  });

  it("CronStatsDetailPanel shows scoped stats only, without duplicating job list or row actions", () => {
    for (const activeStat of ["total", "enabled", "disabled"] as const) {
      const html = render(
        <CronStatsDetailPanel activeStat={activeStat} jobs={SAMPLE_JOBS} onClose={() => {}} />
      );
      assert.doesNotMatch(html, /Chạy ngay/);
      assert.doesNotMatch(html, /Bật lịch|Tắt lịch/);
      assert.doesNotMatch(html, /Dọn audit log cũ/);
    }

    const enabledHtml = render(
      <CronStatsDetailPanel activeStat="enabled" jobs={SAMPLE_JOBS} onClose={() => {}} />
    );
    assert.match(enabledHtml, /2 \/ 3/);
    assert.match(enabledHtml, /67%/);
  });
});
