import "@/hooks/auth/__tests__/setup";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LocaleProvider } from "@/providers/locale-provider";
import { CameraAiInspectorCard } from "../camera-ai-inspector-card";
import type { ComputedPersonTrack, ViolationEvent } from "../types";

function renderWithProviders(element: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  return renderToString(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(LocaleProvider, null, element),
    ),
  );
}

describe("CameraAiInspectorCard - Shared Table & Pagination & Filters", () => {
  const mockPersonTracks: ComputedPersonTrack[] = [
    {
      id: 1,
      frames: [1, 2, 3, 4, 5],
      okFrames: [1, 2, 3, 4, 5],
      noHelmetFrames: new Set(),
      noVestFrames: new Set(),
      unknownCount: 0,
    },
    {
      id: 2,
      frames: [10, 11, 12, 13, 14, 15],
      okFrames: [10, 11],
      noHelmetFrames: new Set([12, 13, 14]),
      noVestFrames: new Set(),
      unknownCount: 0,
    },
    {
      id: 3,
      frames: [20, 21, 22],
      okFrames: [20],
      noHelmetFrames: new Set(),
      noVestFrames: new Set([21, 22]),
      unknownCount: 0,
    },
    {
      id: 4,
      frames: [30, 31],
      okFrames: [],
      noHelmetFrames: new Set(),
      noVestFrames: new Set(),
      unknownCount: 2,
    },
  ];

  const mockViolations: ViolationEvent[] = [
    {
      event_id: "evt-001",
      camera_id: "cam-01",
      person: 2,
      violation_type: "no_helmet",
      start_t: 0.5,
      confirmed_t: 3.5,
      duration_s: 3.0,
      frame: 12,
    },
  ];

  it("renders empty state placeholder when personTracks is empty", () => {
    const html = renderWithProviders(
      <CameraAiInspectorCard
        currentEntry={null}
        personTracks={[]}
        allViolations={[]}
      />
    );

    assert.match(html, /Chưa tìm thấy người nào trong dữ liệu/);
    assert.doesNotMatch(html, /data-table-root/);
  });

  it("renders shared Table component with data-table-root, toolbar, filter panel and pagination when data exists", () => {
    const html = renderWithProviders(
      <CameraAiInspectorCard
        currentEntry={null}
        personTracks={mockPersonTracks}
        allViolations={mockViolations}
      />
    );

    // Shared Table root attribute
    assert.match(html, /data-table-root/);

    // TableToolbar search input & quick filters
    assert.match(html, /placeholder="Tìm theo mã người \(#id\), frame\.\.\."/);
    assert.match(html, /Tất cả/);
    assert.match(html, /Đủ bảo hộ/);
    assert.match(html, /Vi phạm/);

    // TableFilterPanel
    assert.match(html, /Bộ lọc/);

    // TableContent columns
    assert.match(html, /Người/);
    assert.match(html, /Xuất hiện/);
    assert.match(html, /Mũ bảo hộ/);
    assert.match(html, /Áo phản quang/);
    assert.match(html, /Đánh giá/);

    // Table rows with person info
    assert.match(html, /person #/);

    // Compliance verdict badges
    assert.match(html, /ĐỦ BẢO HỘ/);
    assert.match(html, /VI PHẠM XÁC NHẬN/);
    assert.match(html, /VI PHẠM DỰ KIẾN/);
    assert.match(html, /UNKNOWN/);

    // TablePagination controls
    assert.match(html, /Số dòng/);
    assert.match(html, /Trang/);
  });

  it("supports large worker lists with pagination and keeps records manageable", () => {
    // Generate 35 worker tracks
    const largeTrackList: ComputedPersonTrack[] = Array.from({ length: 35 }, (_, idx) => ({
      id: idx + 1,
      frames: [idx * 10 + 1, idx * 10 + 5],
      okFrames: [idx * 10 + 1, idx * 10 + 5],
      noHelmetFrames: new Set(),
      noVestFrames: new Set(),
      unknownCount: 0,
    }));

    const html = renderWithProviders(
      <CameraAiInspectorCard
        currentEntry={null}
        personTracks={largeTrackList}
        allViolations={[]}
      />
    );

    // Initial page size is 10, so only page 1 items are in the DOM, person #25 is on later pages
    assert.match(html, /person #(<!-- -->)?1</);
    assert.match(html, /person #(<!-- -->)?10</);
    assert.doesNotMatch(html, /person #(<!-- -->)?25</);

    // Pagination row counter shows total count
    assert.match(html, /35/);
  });
});
