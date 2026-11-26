import "@/hooks/auth/__tests__/setup";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LocaleProvider } from "@/providers/locale-provider";
import { SystemHealthCards } from "@/components/features/system/system-health-cards";
import { HelmetShowcase } from "../helmet-showcase";
import {
  DashboardHeroHeader,
  DashboardScopeFilterBar,
  DashboardKpiRibbon,
  DashboardLiveIncidents,
  DashboardAiStatusCard,
  DashboardQuickActions,
  DashboardOperationalSuite,
  DashboardPpeRadarChart,
  DashboardHourlyRiskChart,
  DashboardSeveritySlaChart,
  DashboardZoneRiskChart,
  DashboardViolationTrendsChart,
  DashboardNavTabs,
} from "../index";
import { DashboardExecutiveKpi } from "../dashboard-executive-kpi";
import { DashboardUsersOverviewCard } from "../dashboard-users-overview-card";
import { DashboardAuditMiniFeed } from "../dashboard-audit-mini-feed";
import { DashboardCronMiniCard } from "../dashboard-cron-mini-card";
import { DashboardChartExplainButton } from "../charts/dashboard-chart-explain-modal";
import {
  aggregateDashboard,
  buildDashboardAnalyticsFromReporting,
} from "@/lib/dashboard-data";
import type { AuthUser, IncidentItem } from "@/types";

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

const MOCK_USER: AuthUser = {
  id: "user-123",
  email: "safety.manager@ppe.local",
  fullName: "Nguyễn Văn An",
  role: "SAFETY_MANAGER",
  roleId: "role-1",
  permissions: [
    "PPE_REPORTING_READ",
    "PPE_INCIDENT_READ",
    "PPE_INCIDENT_REVIEW",
  ],
};

const MOCK_INCIDENT: IncidentItem = {
  id: "inc-001",
  siteId: "site-1",
  siteName: "Công trường Landmark",
  cameraId: "cam-1",
  cameraName: "CCTV Cổng Số 1",
  cameraCode: "CAM-GATE-01",
  violationType: "NO_HELMET",
  severity: "CRITICAL",
  status: "PENDING_REVIEW",
  detectedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  snapshotUrl: "https://minio.ppe.local/snapshots/inc-001.jpg",
};

describe("Dashboard Components", () => {
  describe("DashboardHeroHeader", () => {
    it("renders user full name and role badge", () => {
      const html = renderWithProviders(
        <DashboardHeroHeader
          user={MOCK_USER}
          siteName="Công trường Landmark 81"
          isRealtimeConnected={true}
        />,
      );

      assert.ok(html.includes("Nguyễn Văn An"));
      assert.ok(html.includes("Công trường Landmark 81"));
      assert.ok(html.includes("Đã kết nối") || html.includes("Connected"));
    });

    it("displays disconnected indicator when isRealtimeConnected is false", () => {
      const html = renderWithProviders(
        <DashboardHeroHeader
          user={MOCK_USER}
          siteName={null}
          isRealtimeConnected={false}
        />,
      );

      assert.ok(html.includes("Mất kết nối") || html.includes("Disconnected"));
      assert.ok(
        html.includes("Toàn bộ công trường") || html.includes("All Sites"),
      );
    });

    it("renders unified card with quick actions, domain tabs, and scope filter bar", () => {
      const html = renderWithProviders(
        <DashboardHeroHeader
          user={MOCK_USER}
          siteName="Công trường Landmark 81"
          isRealtimeConnected={true}
          onRefresh={() => {}}
          pendingCount={5}
          canExportReports={true}
          onOpenExportReport={() => {}}
          activeTab="safety"
          onChangeTab={() => {}}
          onlineCameras={8}
          totalCameras={10}
          showFilterBar={true}
          sites={[{ id: "site-1", name: "Công trường Landmark 81" }]}
          siteId="site-1"
          onSiteChange={() => {}}
          canViewSites={true}
          periodState={{
            today: "2026-11-16",
            preset: "7d",
            setPreset: () => {},
            customStart: "2026-11-10",
            setCustomStart: () => {},
            customEnd: "2026-11-16",
            setCustomEnd: () => {},
            period: {
              startDate: "2026-11-10",
              endDate: "2026-11-16",
              fromDate: "2026-11-10T00:00:00+07:00",
              toDate: "2026-11-16T23:59:59+07:00",
              endExclusive: "2026-11-17T00:00:00+07:00",
            },
          }}
        />,
      );

      assert.ok(html.includes("Xuất báo cáo") || html.includes("Export report"));
      assert.ok(!html.includes("Video Wall"));
      assert.ok(!html.includes("Duyệt sự cố") && !html.includes("Review incidents"));
      assert.ok(html.includes("8/10"));
      assert.ok(html.includes("2026-11-10"));
      assert.ok(html.includes("2026-11-16"));
      assert.ok(html.includes("role=\"tablist\""));
    });
  });

  describe("DashboardScopeFilterBar", () => {
    it("renders custom date inputs and reset button when preset is custom", () => {
      const html = renderWithProviders(
        <DashboardScopeFilterBar
          sites={[{ id: "site-1", name: "Site A" }]}
          siteId="site-1"
          siteName="Site A"
          onSiteChange={() => {}}
          canViewSites={true}
          periodState={{
            today: "2026-11-16",
            preset: "custom",
            setPreset: () => {},
            customStart: "2026-11-01",
            setCustomStart: () => {},
            customEnd: "2026-11-15",
            setCustomEnd: () => {},
            period: {
              startDate: "2026-11-01",
              endDate: "2026-11-15",
              fromDate: "2026-11-01T00:00:00+07:00",
              toDate: "2026-11-15T23:59:59+07:00",
              endExclusive: "2026-11-16T00:00:00+07:00",
            },
          }}
        />,
      );

      assert.ok(html.includes("dashboard-period-from"));
      assert.ok(html.includes("dashboard-period-to"));
      assert.ok(html.includes("Đặt lại") || html.includes("Reset"));
      assert.ok(html.includes("2026-11-01"));
      assert.ok(html.includes("2026-11-15"));
    });
  });

  describe("DashboardKpiRibbon", () => {
    it("shows period totals and reviewed denominator, without safety claims", () => {
      const analytics = aggregateDashboard([
        ...Array.from({ length: 4 }, (_, i) => ({
          ...MOCK_INCIDENT,
          id: `pending-${i}`,
        })),
        ...Array.from({ length: 3 }, (_, i) => ({
          ...MOCK_INCIDENT,
          id: `confirmed-${i}`,
          status: "CONFIRMED",
        })),
        ...Array.from({ length: 2 }, (_, i) => ({
          ...MOCK_INCIDENT,
          id: `dismissed-${i}`,
          status: "DISMISSED",
        })),
        { ...MOCK_INCIDENT, id: "resolved", status: "RESOLVED" },
      ]);
      const html = renderWithProviders(
        <DashboardKpiRibbon
          total={10}
          analytics={analytics}
          pendingCount={180}
          totalCamerasCount={125}
          onlineCamerasCount={102}
          canViewReports
          canViewIncidents
          canViewCameras
        />,
      );
      assert.ok(html.includes("Tổng sự cố trong kỳ"));
      assert.ok(html.includes("102/125"));
      assert.ok(html.includes("180"));
      assert.ok(html.includes("33,3%"));
      assert.ok(html.includes("2 / 6"));
      assert.ok(html.includes("Hiện tại · mọi ngày"));
      assert.ok(!html.includes("Đạt chuẩn"));
    });
    it("does not invent zero percentages or personalized tasks", () => {
      const html = renderWithProviders(
        <DashboardKpiRibbon
          total={null}
          analytics={null}
          pendingCount={null}
          totalCamerasCount={null}
          onlineCamerasCount={null}
          canViewReports={false}
          canViewIncidents
          canViewCameras={false}
        />,
      );
      assert.ok(!html.includes("100%"));
      assert.ok(!html.includes("Việc của tôi"));
      assert.ok(!html.includes("Camera trực tuyến"));
      assert.ok(!html.includes("Tổng sự cố trong kỳ"));
    });
    it("distinguishes no reviews from an observed zero dismissal rate", () => {
      const props = {
        total: 0,
        pendingCount: 0,
        totalCamerasCount: 0,
        onlineCamerasCount: 0,
        canViewReports: true,
        canViewIncidents: true,
        canViewCameras: true,
      };
      const html = renderWithProviders(
        <DashboardKpiRibbon {...props} analytics={aggregateDashboard([])} />,
      );
      assert.ok(html.includes("Chưa có dữ liệu thẩm duyệt"));
      assert.ok(!html.includes("0%"));
    });
  });

  describe("DashboardLiveIncidents", () => {
    it("renders empty compliant message when there are no unresolved incidents", () => {
      const html = renderWithProviders(
        <DashboardLiveIncidents
          incidents={[
            { ...MOCK_INCIDENT, id: "resolved-1", status: "RESOLVED" },
            { ...MOCK_INCIDENT, id: "dismissed-1", status: "DISMISSED" },
          ]}
          loading={false}
        />,
      );

      assert.ok(
        html.includes("Không còn sự cố nào cần xử lý") ||
          html.includes("No unresolved incidents remaining"),
      );
    });

    it("renders incidents list with violation badges, camera name, positive CTA, and batch review controls", () => {
      const html = renderWithProviders(
        <DashboardLiveIncidents
          incidents={[MOCK_INCIDENT]}
          loading={false}
          canReview={true}
          isRealtimeConnected={true}
          onReview={() => {}}
          onBatchReview={async () => {}}
        />,
      );

      assert.ok(html.includes("Không đội mũ") || html.includes("No Helmet"));
      assert.ok(html.includes("CCTV Cổng Số 1"));
      assert.ok(html.includes("Duyệt nhanh") || html.includes("Quick Review"));
      assert.ok(html.includes("bg-primary"));
      assert.ok(html.includes("role=\"checkbox\""));
      assert.ok(html.includes("SSE Live"));
      assert.ok(!html.includes("ppe.violation.detected"));
    });

    it("renders more than 5 unresolved incidents and shows Resolve Now CTA for confirmed items", () => {
      const items: IncidentItem[] = [
        ...Array.from({ length: 6 }, (_, i) => ({
          ...MOCK_INCIDENT,
          id: `pending-${i + 1}`,
          cameraName: `Camera Pending ${i + 1}`,
          status: "PENDING_REVIEW",
        })),
        {
          ...MOCK_INCIDENT,
          id: "confirmed-1",
          cameraName: "Camera Confirmed 7",
          status: "CONFIRMED",
        },
      ];

      const html = renderWithProviders(
        <DashboardLiveIncidents
          incidents={items}
          totalPendingCount={6}
          totalConfirmedCount={1}
          canReview={true}
          canResolve={true}
          onReview={() => {}}
          onResolve={() => {}}
        />,
      );

      assert.ok(html.includes("Camera Pending 6"));
      assert.ok(html.includes("Camera Confirmed 7"));
      assert.ok(html.includes("Xử lý ngay") || html.includes("Resolve now"));
      assert.ok(html.includes("Cần xử lý ngay") || html.includes("Immediate action required"));
    });
  });

  describe("DashboardAiStatusCard", () => {
    it("renders YOLO11 model status, mAP, and latency", () => {
      const html = renderWithProviders(
        <DashboardAiStatusCard
          activeVersion={{
            id: "ver-1",
            modelId: "model-1",
            version: "v2.1.0",
            framework: "TensorRT / FP16",
            inputSize: "640x640",
            status: "ACTIVE",
            createdAt: "2026-01-01T00:00:00Z",
            metrics: {
              modelName: "YOLO11m-PPE (FP16)",
              mAP50: 0.932,
              latencyMs: 18,
              fps: 28,
            },
          }}
          loading={false}
        />,
      );

      assert.ok(html.includes("YOLO11m-PPE (FP16)"));
      assert.ok(html.includes("v2.1.0"));
      assert.ok(!html.includes("vv2.1.0"));
      assert.ok(!html.includes("Real-time metrics"));
      assert.ok(html.includes("93.2%"));
      assert.ok(html.includes("18ms"));
      assert.ok(html.includes("28 FPS"));
    });

    it("resolves model name from prop or BE model relation when metrics is null", () => {
      const fromProp = renderWithProviders(
        <DashboardAiStatusCard
          modelName="YOLOv11 Real-time PPE Detector"
          activeVersion={{
            id: "ver-2",
            modelId: "model-2",
            version: "1.0.0",
            modelPath: "models/yolo_ppe_v11.pt",
            framework: "PyTorch",
            inputSize: "640x640",
            status: "DEPLOYED",
            metrics: null,
            createdAt: "2026-01-01T00:00:00Z",
          }}
        />,
      );

      assert.ok(fromProp.includes("YOLOv11 Real-time PPE Detector"));
      assert.ok(fromProp.includes("v1.0.0"));

      const fromRelation = renderWithProviders(
        <DashboardAiStatusCard
          activeVersion={{
            id: "ver-3",
            modelId: "model-3",
            model: {
              id: "model-3",
              name: "PPE Detector Pro",
              code: "PPE_PRO",
            },
            version: "1.2.0",
            framework: "ONNX",
            inputSize: "640x640",
            status: "DEPLOYED",
            metrics: null,
            createdAt: "2026-01-01T00:00:00Z",
          }}
        />,
      );

      assert.ok(fromRelation.includes("PPE Detector Pro"));
      assert.ok(fromRelation.includes("v1.2.0"));
    });

    it("renders '--' without leading 'v' when no active model is deployed", () => {
      const html = renderWithProviders(
        <DashboardAiStatusCard activeVersion={null} />,
      );

      assert.ok(!html.includes("v--"));
      assert.ok(html.includes("--"));
    });
  });

  describe("DashboardQuickActions", () => {
    it("renders 4 quick action shortcuts", () => {
      const html = renderWithProviders(
        <DashboardQuickActions
          canExportReports={true}
          canReviewIncidents={true}
        />,
      );

      assert.ok(
        html.includes("Duyệt vi phạm tồn đọng") ||
          html.includes("Review Pending"),
      );
      assert.ok(html.includes("Mở Video Wall") || html.includes("Video Wall"));
      assert.ok(
        html.includes("Xuất báo cáo") ||
          html.includes("Generate Safety Report"),
      );
      assert.ok(html.includes("Cấu hình an toàn") || html.includes("Safety"));
    });
  });

  describe("HelmetShowcase", () => {
    it("renders PPE 3D MODEL badge and custom title", () => {
      const html = renderWithProviders(
        <HelmetShowcase
          title="Mô Hình PPE 3D"
          subtitle="Mũ bảo hộ tiêu chuẩn ANSI Z89.1"
        />,
      );

      assert.ok(html.includes("PPE 3D MODEL"));
      assert.ok(html.includes("Mô Hình PPE 3D"));
      assert.ok(html.includes("Mũ bảo hộ tiêu chuẩn ANSI Z89.1"));
      assert.ok(html.includes("ANSI Z89.1 Type 1 / Class E"));
    });

    it("hides the live PPE stats strip when ppeStats is undefined (no reporting permission)", () => {
      const html = renderWithProviders(
        <HelmetShowcase title="Mô Hình PPE 3D" subtitle="Mũ bảo hộ" />,
      );
      assert.ok(!html.includes("Số liệu giám sát PPE"));
      assert.ok(!html.includes("Tuân thủ PPE"));
    });

    it("Step 4 (4B): keeps the 3D helmet and shows real No-Helmet, No-Vest and PPE compliance stats", () => {
      const html = renderWithProviders(
        <HelmetShowcase
          title="Mô Hình PPE 3D"
          subtitle="Mũ bảo hộ"
          ppeStats={{
            noHelmetCount: 7,
            noVestCount: 3,
            complianceRate: 93.4,
            periodLabel: "Hôm nay",
          }}
        />,
      );
      assert.ok(html.includes("PPE 3D MODEL"));
      assert.ok(html.includes("Số liệu giám sát PPE"));
      assert.ok(html.includes("Không đội mũ"));
      assert.ok(html.includes("Không áo phản quang"));
      assert.ok(html.includes("Tuân thủ PPE"));
      assert.ok(html.includes("93,4%"));
      assert.ok(html.includes("Hôm nay"));
      assert.ok(html.includes("text-danger"));

      const emptyHtml = renderWithProviders(
        <HelmetShowcase title="Mô Hình PPE 3D" ppeStats={null} />,
      );
      assert.ok(emptyHtml.includes("Tuân thủ PPE"));
      assert.ok(emptyHtml.includes("—"));
      assert.ok(!/>0%</.test(emptyHtml));
    });
  });

  describe("Operational Suite & Charts", () => {
    const analytics = aggregateDashboard([
      { ...MOCK_INCIDENT, detectedAt: "2026-11-03T17:30:00Z" },
      {
        ...MOCK_INCIDENT,
        id: "other",
        violationType: "NEW_TYPE",
        severity: "NEW_LEVEL",
        status: "RESOLVED",
        detectedAt: "2026-11-03T03:00:00Z",
        resolvedAt: "2026-11-03T03:20:00Z",
      },
    ]);
    it("renders a count radar including unknown types, without compliance", () => {
      const html = renderWithProviders(
        <DashboardPpeRadarChart distribution={analytics.distribution} />,
      );
      assert.ok(html.includes("Radar số sự cố"));
      assert.ok(html.includes("Khác"));
      assert.ok(!html.includes("tuân thủ"));
      assert.ok(!html.replace(/<[^>]*>/g, "").includes("%"));
    });
    it("includes all 24 hours and the night shift", () => {
      const html = renderWithProviders(
        <DashboardHourlyRiskChart analytics={analytics} />,
      );
      assert.ok(html.includes("00:00: 1"));
      assert.ok(html.includes("23:00"));
      assert.ok(html.includes("Ca đêm"));
      assert.ok(html.includes("Giải thích"));
    });
    it("shows real duration samples and no SLA claims", () => {
      const html = renderWithProviders(
        <DashboardSeveritySlaChart analytics={analytics} />,
      );
      assert.ok(html.includes("20 phút"));
      assert.ok(html.includes("mẫu hợp lệ"));
      assert.ok(!html.includes("SLA"));
      assert.ok(html.includes("Giải thích"));
    });
    it("renders friendly empty state copy for hourly and severity charts when period has zero incidents", () => {
      const emptyAnalytics = aggregateDashboard([]);
      const hourlyHtml = renderWithProviders(
        <DashboardHourlyRiskChart analytics={emptyAnalytics} />,
      );
      assert.ok(hourlyHtml.includes("Chưa có sự cố vi phạm trong kỳ đang chọn"));
      assert.ok(hourlyHtml.includes("Ca sáng"));

      const severityHtml = renderWithProviders(
        <DashboardSeveritySlaChart analytics={emptyAnalytics} />,
      );
      assert.ok(severityHtml.includes("Không có sự cố phát sinh hoặc tồn đọng"));
      assert.ok(severityHtml.includes("Nguy cấp"));
    });
    it("does not invent online status or safety for an unknown camera and excludes dismissed from resolved", () => {
      const mixed = aggregateDashboard([
        { ...MOCK_INCIDENT, id: "cam-a-1", cameraId: "cam-a", status: "DISMISSED" },
        { ...MOCK_INCIDENT, id: "cam-b-1", cameraId: "cam-b", status: "RESOLVED" },
        { ...MOCK_INCIDENT, id: "cam-b-2", cameraId: "cam-b", status: "PENDING_REVIEW" },
      ]);
      const html = renderWithProviders(
        <DashboardZoneRiskChart
          cameras={[
            {
              id: "cam-zero",
              siteId: "site-1",
              name: "Camera Zero",
              code: "CAM-00",
              sourceType: "RTSP",
              streamUrl: "rtsp://example",
              status: "ONLINE",
              createdAt: "2026-11-03T00:00:00Z",
              updatedAt: "2026-11-03T00:00:00Z",
            },
          ]}
          cameraStats={mixed.cameras}
        />,
      );
      assert.ok(html.includes("Chưa có trạng thái"));
      assert.ok(!html.includes("An toàn"));
      assert.ok(html.includes("Giải thích"));
      // cam-a has 1 DISMISSED out of 1 total -> 0/1 resolved, not 1/1
      assert.ok(html.includes("0/1"));
      // cam-b (2 incidents) comes before cam-a (1 incident) and Camera Zero (0 incidents)
      assert.ok(html.indexOf("cam-b") < html.indexOf("cam-a"));
      assert.ok(html.indexOf("cam-a") < html.indexOf("Camera Zero"));
    });
    it("shows only active catalog cameras and collapses deleted camera IDs into one archived row when catalogComplete is true", () => {
      const mixed = aggregateDashboard([
        { ...MOCK_INCIDENT, id: "a1", cameraId: "cam-1", status: "RESOLVED" },
        { ...MOCK_INCIDENT, id: "a2", cameraId: "cam-1", status: "DISMISSED" },
        { ...MOCK_INCIDENT, id: "d1", cameraId: "deleted-uuid-1", status: "PENDING_REVIEW" },
        { ...MOCK_INCIDENT, id: "d2", cameraId: "deleted-uuid-2", status: "RESOLVED" },
      ]);
      const mkCam = (id: string, name: string) => ({
        id,
        siteId: "site-1",
        name,
        code: id.toUpperCase(),
        sourceType: "RTSP" as const,
        streamUrl: "rtsp://example",
        status: "ONLINE" as const,
        createdAt: "2026-11-03T00:00:00Z",
        updatedAt: "2026-11-03T00:00:00Z",
      });
      const html = renderWithProviders(
        <DashboardZoneRiskChart
          catalogComplete={true}
          cameras={[
            mkCam("cam-1", "Camera Cổng 1"),
            mkCam("cam-2", "Camera Kho 2"),
            mkCam("cam-3", "Camera Xưởng 3"),
          ]}
          cameraStats={mixed.cameras}
        />,
      );
      assert.ok(html.includes("Camera Cổng 1"));
      assert.ok(html.includes("Camera Kho 2"));
      assert.ok(html.includes("Camera Xưởng 3"));
      assert.ok(html.includes("3/3"));
      assert.ok(!html.includes("deleted-uuid-1"));
      assert.ok(!html.includes("deleted-uuid-2"));
      assert.ok(html.includes("Camera đã lưu trữ / xóa"));
      assert.ok(html.includes("1 bác bỏ"));
    });
    it("renders loading skeleton and incidentUnavailable notice without inventing zero incident counts", () => {
      const loadingHtml = renderWithProviders(
        <DashboardZoneRiskChart cameras={[]} cameraStats={[]} loading={true} />,
      );
      assert.ok(loadingHtml.includes('aria-busy="true"'));

      const unavailableHtml = renderWithProviders(
        <DashboardZoneRiskChart
          catalogComplete={true}
          cameras={[
            {
              id: "cam-1",
              siteId: "site-1",
              name: "Camera Cổng 1",
              code: "CAM-01",
              sourceType: "RTSP",
              streamUrl: "rtsp://example",
              status: "ONLINE",
              createdAt: "2026-11-03T00:00:00Z",
              updatedAt: "2026-11-03T00:00:00Z",
            },
          ]}
          cameraStats={[]}
          incidentUnavailable="Không tải được sự cố"
        />,
      );
      assert.ok(unavailableHtml.includes("Không tải được sự cố"));
      assert.ok(unavailableHtml.includes("Camera Cổng 1"));
      assert.ok(!unavailableHtml.includes("Không phát hiện vi phạm PPE"));

      const zeroHtml = renderWithProviders(
        <DashboardZoneRiskChart
          catalogComplete={true}
          cameras={[
            {
              id: "cam-1",
              siteId: "site-1",
              name: "Camera Cổng 1",
              code: "CAM-01",
              sourceType: "RTSP",
              streamUrl: "rtsp://example",
              status: "ONLINE",
              createdAt: "2026-11-03T00:00:00Z",
              updatedAt: "2026-11-03T00:00:00Z",
            },
          ]}
          cameraStats={[]}
          periodLabel="Hôm nay"
          preset="today"
          onChangePreset={() => {}}
        />,
      );
      assert.ok(zeroHtml.includes("Chưa phát hiện vi phạm PPE nào trong kỳ đang chọn."));
      assert.ok(zeroHtml.includes("Hôm nay"));
      assert.ok(zeroHtml.includes("7 ngày gần nhất"));
      assert.ok(!zeroHtml.includes("Vi phạm phát hiện"));
    });
    it("renders plain-language explanation modal content when opened and updates dynamically with live data", () => {
      const html = renderWithProviders(
        <DashboardChartExplainButton
          defaultOpen={true}
          content={{
            title: "Mức độ & thời gian xử lý",
            subtitle: "Mô tả ngắn",
            summary: "Trong 10 sự cố của kỳ, hiện còn 3 sự cố tồn đọng.",
            details: ["Ca Nguy cấp còn 1 vụ cần xử lý."],
            meaning: "Card này phản chiếu tồn đọng và tốc độ xử lý.",
          }}
        />,
      );
      assert.ok(html.includes("Tình hình hiện tại"));
      assert.ok(html.includes("Trong 10 sự cố của kỳ, hiện còn 3 sự cố tồn đọng."));
      assert.ok(html.includes("Card này đang phản chiếu gì?"));
      assert.ok(html.includes("max-w-[700px]"));

      const updated = renderWithProviders(
        <DashboardChartExplainButton
          defaultOpen={true}
          content={{
            title: "Phân bố sự cố theo giờ",
            subtitle: "Theo giờ Việt Nam",
            summary: "Trong kỳ có tổng cộng 25 sự cố.",
            details: [],
            meaning: "Tổng hợp theo 24h.",
          }}
        />,
      );
      assert.ok(updated.includes("Trong kỳ có tổng cộng 25 sự cố."));
      assert.ok(!updated.includes("Trong 10 sự cố của kỳ"));
    });
    it("renders streamlined 2-chart operational suite (Hourly + Severity & MTTR) without radar or cameras", () => {
      const html = renderWithProviders(
        <DashboardOperationalSuite analytics={analytics} />,
      );
      assert.ok(html.includes("Phân tích sự cố trong kỳ"));
      assert.ok(html.includes("Phân bố sự cố theo giờ"));
      assert.ok(html.includes("Mức độ &amp; thời gian xử lý"));
      assert.ok(!html.includes("Lưới 2x2"));
      assert.ok(!html.includes("Radar số sự cố"));
      assert.ok(!html.includes("Camera &amp; sự cố trong kỳ"));
    });
  });

  describe("Dashboard Navigation & Multi-Domain Executive Widgets", () => {
    it("renders the three PPE sub-navigation tabs with incident and camera badges", () => {
      const html = renderWithProviders(
        <DashboardNavTabs
          activeTab="overview"
          onChangeTab={() => {}}
          pendingCount={7}
          onlineCameras={4}
          totalCameras={4}
        />,
      );

      assert.ok(html.includes("Tổng quan") || html.includes("Overview"));
      assert.ok(html.includes("An toàn &amp; Sự cố") || html.includes("Safety &amp; Incidents") || html.includes("An toàn"));
      assert.ok(html.includes("Thiết bị &amp; AI") || html.includes("Cameras &amp; AI") || html.includes("Thiết bị"));
      assert.equal([...html.matchAll(/role="tab"/g)].length, 3);
      assert.ok(html.includes("7"));
      assert.ok(html.includes("4/4"));
    });

    it("renders 4 executive KPI pillars with real metrics", () => {
      const html = renderWithProviders(
        <DashboardExecutiveKpi
          totalIncidents={25}
          pendingCount={3}
          onlineCameras={8}
          totalCameras={10}
          aiModelVersion="YOLO11x active"
          totalUsers={42}
          activeUsers={38}
          twoFactorCount={35}
          healthyServices={12}
          totalServices={12}
          avgLatencyMs={18}
          systemStatus="HEALTHY"
        />,
      );

      assert.ok(html.includes("25"));
      assert.ok(html.includes("sự cố"));
      assert.ok(html.includes("3"));
      assert.ok(html.includes("8/10"));
      assert.ok(html.includes("YOLO11x active"));
      assert.ok(html.includes("42"));
      assert.ok(html.includes("12/12"));
      assert.ok(html.includes("18ms"));
    });

    it("renders the service health card without a link back to its own page", () => {
      const html = renderWithProviders(<SystemHealthCards onRefresh={() => {}} />);
      assert.ok(
        html.includes("Trạng thái Dịch vụ &amp; Hạ tầng") ||
          html.includes("Services &amp; Infrastructure Status") ||
          html.includes("Dịch vụ"),
      );
      assert.ok(!html.includes("/system?tab=health"));
    });

    it("renders clear status badges, filter pills, and recheck control for health report", () => {
      const html = renderWithProviders(
        <SystemHealthCards
          onRefresh={() => {}}
          healthReport={{
            overallStatus: "DEGRADED",
            healthyCount: 1,
            totalServices: 3,
            averageLatencyMs: 180,
            checkedAt: "2026-11-16T08:00:00.000Z",
            services: [
              {
                name: "MinIO S3 Object Storage",
                serviceCode: "minio-storage",
                port: 9000,
                endpoint: "http://localhost:9000/minio/health/live",
                type: "INFRASTRUCTURE",
                status: "DOWN",
                latencyMs: 2001,
                uptime: "--",
                lastChecked: "2026-11-16T08:00:00.000Z",
                details: { reason: "Failed to fetch" },
              },
              {
                name: "Reporting & Safety Analytics",
                serviceCode: "reporting-service",
                port: 8894,
                endpoint: "/reports/health",
                type: "SERVICE",
                status: "DEGRADED",
                latencyMs: 310,
                uptime: "1h 20m",
                lastChecked: "2026-11-16T08:00:00.000Z",
              },
              {
                name: "Identity & Core Auth",
                serviceCode: "identity-service",
                port: 9999,
                endpoint: "/health",
                type: "SERVICE",
                status: "HEALTHY",
                latencyMs: 8,
                uptime: "2d 4h",
                lastChecked: "2026-11-16T08:00:00.000Z",
              },
            ],
          }}
        />,
      );

      assert.ok(html.includes("Ổn định") || html.includes("Healthy"));
      assert.ok(html.includes("Chậm") || html.includes("Slow"));
      assert.ok(html.includes("Mất kết nối") || html.includes("Down"));
      assert.ok(html.includes("Cần chú ý") || html.includes("Issues"));
      assert.ok(html.includes("Kiểm tra lại") || html.includes("Recheck"));
      assert.ok(html.includes("1/3"));
      // Impact banner & actionable controls
      assert.ok(html.includes("Ảnh hưởng tới bạn"));
      assert.ok(html.includes("Vẫn hoạt động bình thường"));
      assert.ok(html.includes("Sao chép báo cáo gửi IT"));
    });

    it("hides misleading fast latency on DOWN services and tailors actions by role", () => {
      const report = {
        overallStatus: "DEGRADED" as const,
        healthyCount: 1,
        totalServices: 2,
        averageLatencyMs: 9,
        checkedAt: "2026-11-16T08:00:00.000Z",
        services: [
          {
            name: "AI YOLO Inference Engine",
            serviceCode: "ai-service",
            port: 8000,
            endpoint: "/api/models (:8000)",
            type: "SERVICE" as const,
            status: "DOWN" as const,
            latencyMs: 7,
            uptime: "--",
            lastChecked: "2026-11-16T08:00:00.000Z",
            details: {
              failureKind: "CONNECTION_REFUSED",
              reason: "Connection refused (ECONNREFUSED)",
            },
          },
          {
            name: "Identity & Core Auth",
            serviceCode: "identity-service",
            port: 9999,
            endpoint: "/health",
            type: "SERVICE" as const,
            status: "HEALTHY" as const,
            latencyMs: 11,
            uptime: "2d 4h",
            lastChecked: "2026-11-16T08:00:00.000Z",
          },
        ],
      };

      const userHtml = renderWithProviders(
        <SystemHealthCards
          onRefresh={() => {}}
          healthReport={report}
        />,
      );
      assert.ok(!userHtml.includes(">7ms<"));
      assert.ok(!userHtml.includes("Mở Kiểm thử AI"));
      assert.ok(userHtml.includes("Sao chép báo cáo gửi IT"));

      const adminHtml = renderWithProviders(
        <SystemHealthCards
          onRefresh={() => {}}
          healthReport={report}
          isAdmin
        />,
      );
      assert.ok(adminHtml.includes("Mở Kiểm thử AI"));
    });

    it("renders users overview card with title and management links", () => {
      const html = renderWithProviders(<DashboardUsersOverviewCard />);
      assert.ok(
        html.includes("Người dùng &amp; Phân quyền") ||
          html.includes("Users &amp; Access") ||
          html.includes("Người dùng"),
      );
      assert.ok(html.includes("/users"));
      assert.ok(html.includes("/roles"));
    });

    it("renders audit mini feed with title and view all link", () => {
      const html = renderWithProviders(<DashboardAuditMiniFeed />);
      assert.ok(
        html.includes("Nhật ký Hoạt động Gần nhất") ||
          html.includes("Recent Audit Activity") ||
          html.includes("Nhật ký"),
      );
      assert.ok(html.includes("/audit-logs"));
    });

    it("renders real successRate (or '--' when null) and permission guard for audit mini feed", () => {
      const emptyHtml = renderWithProviders(
        <DashboardAuditMiniFeed
          summaryOverride={{
            totalLogs: 0,
            configChangesCount: 0,
            incidentReviewsCount: 0,
            successRate: null,
            recentActivity: [],
          }}
        />,
      );
      assert.ok(emptyHtml.includes("--"));
      assert.ok(!emptyHtml.includes("100%"));

      const populatedHtml = renderWithProviders(
        <DashboardAuditMiniFeed
          summaryOverride={{
            totalLogs: 16,
            configChangesCount: 3,
            incidentReviewsCount: 5,
            successRate: 87.5,
            recentActivity: [
              {
                id: "log-fail",
                userId: "u-1",
                userName: "Trần Thanh Trà",
                action: "ACCOUNT_LOCKED",
                targetType: "USER",
                targetId: "u-1",
                status: "FAILED",
                errorMessage: "Too many failed attempts",
                createdAt: "2026-11-16T08:15:00.000Z",
              },
            ],
          }}
        />,
      );
      assert.ok(populatedHtml.includes("87.5%"));
      assert.ok(populatedHtml.includes("ACCOUNT_LOCKED"));
      assert.ok(populatedHtml.includes("bg-danger"));

      const deniedHtml = renderWithProviders(<DashboardAuditMiniFeed enabled={false} />);
      assert.ok(!deniedHtml.includes('href="/audit-logs"'));
      assert.ok(
        deniedHtml.includes("không có quyền") || deniedHtml.includes("do not have permission"),
      );
    });

    it("renders cron mini card with title and manage tasks link", () => {
      const html = renderWithProviders(<DashboardCronMiniCard />);
      assert.ok(
        html.includes("Tác vụ Lập lịch (Cron)") ||
          html.includes("Scheduled Tasks (Cron)") ||
          html.includes("Cron"),
      );
      assert.ok(html.includes("/scheduled-tasks"));
    });

    it("renders human-readable cron jobs, honest schedule badges, and quick actions when allowed", () => {
      const recentTimestamp = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const html = renderWithProviders(
        <DashboardCronMiniCard
          canReadOverride={true}
          canManageOverride={true}
          jobsOverride={[
            {
              name: "cleanup-audit-logs",
              cron: "0 2 * * *",
              description: "Dọn dẹp các bản ghi Audit Logs cũ hơn 30 ngày",
              isEnabled: true,
            },
            {
              name: "cleanup-expired-tokens",
              cron: "0 4 * * *",
              description: "Dọn token hết hạn",
              isEnabled: true,
            },
            {
              name: "weekly-summary-digest",
              cron: "0 8 * * 1",
              description: "Báo cáo tổng hợp tuần",
              isEnabled: false,
            },
          ]}
          auditItemsOverride={[
            {
              id: "audit-cron-1",
              userId: "admin-1",
              actorId: "admin-1",
              action: "TRIGGER_CRON_JOB",
              targetType: "CRON_JOB",
              targetId: "cleanup-audit-logs",
              status: "SUCCESS",
              details: { durationMs: 64, result: { deletedCount: 12 } },
              createdAt: recentTimestamp,
            },
          ]}
        />,
      );

      assert.ok(html.includes("Dọn audit log cũ"));
      assert.ok(html.includes("Báo cáo hoạt động hằng tuần"));
      assert.ok(html.includes("02:00 hàng ngày (UTC+7)"));
      assert.ok(html.includes("Tự động bật"));
      assert.ok(html.includes("Tạm tắt"));
      assert.equal(html.includes("Đang chạy"), false);
      assert.ok(html.includes("Vừa mới chạy"));
      assert.ok(html.includes("Đã xóa 12 nhật ký cũ"));
      assert.ok(html.includes("Cần bấm chạy"));
      assert.ok(html.includes("Chạy ngay"));
      assert.ok(html.includes("Chạy lại"));
      assert.ok(html.includes("64ms"));
    });

    it("renders permission message when user cannot read cron jobs", () => {
      const html = renderWithProviders(
        <DashboardCronMiniCard canReadOverride={false} />,
      );
      assert.ok(html.includes("CRON_JOB_READ"));
    });
  });

  describe("Step 1: Violation Trends Chart & Live AI Telemetry", () => {
    it("renders Day/Week/Month switcher and trend metrics when data exists", () => {
      const html = renderWithProviders(
        <DashboardViolationTrendsChart
          groupBy="DAY"
          onChangeGroupBy={() => {}}
          trendsWindow={{
            startDate: "2026-11-19",
            endDate: "2026-11-25",
            groupBy: "DAY",
            autoExpanded: true,
          }}
          trends={[
            {
              date: "2026-11-19",
              totalIncidents: 4,
              trueViolations: 3,
              falseAlarms: 1,
              resolvedCount: 2,
            },
            {
              date: "2026-11-25",
              totalIncidents: 8,
              trueViolations: 7,
              falseAlarms: 1,
              resolvedCount: 6,
            },
          ]}
        />,
      );

      assert.ok(html.includes("Xu hướng vi phạm an toàn"));
      assert.ok(html.includes("Ngày"));
      assert.ok(html.includes("Tuần"));
      assert.ok(html.includes("Tháng"));
      assert.ok(html.includes("2026-11-19 → 2026-11-25"));
      assert.ok(html.includes("12")); // totalDetected = 4 + 8
      assert.ok(html.includes("10")); // trueViolations = 3 + 7
    });

    it("renders live AI telemetry FPS, Latency, and sampled frames badge on DashboardAiStatusCard", () => {
      const html = renderWithProviders(
        <DashboardAiStatusCard
          modelName="YOLOv11-PPE"
          activeVersion={{
            id: "ver-1",
            modelId: "mod-1",
            version: "2.1.0",
            framework: "TENSORRT",
            inputSize: "640x640",
            status: "DEPLOYED",
            metrics: { mAP50: 0.942, fps: 40, latencyMs: 9 },
            createdAt: "2026-11-01T00:00:00Z",
          }}
          telemetry={{
            avgFps: 27.4,
            avgLatencyMs: 14.8,
            maxLatencyMs: 26,
            totalFrames: 12500,
            sampleDays: 3,
            source: "telemetry",
          }}
        />,
      );

      assert.ok(html.includes("14.8ms"));
      assert.ok(html.includes("27.4 FPS"));
      assert.ok(html.includes("94.2%"));
      assert.ok(html.includes("Telemetry thực tế"));
      assert.ok(!html.includes("Benchmark khai báo"));
    });
  });

  describe("Step 2: Live Incidents Inline Grouping Switcher & Reporting Analytics Charts", () => {
    it("renders inline Clustered | Raw grouping switcher inside DashboardLiveIncidents when onChangeGroupingMode is passed", () => {
      const html = renderWithProviders(
        <DashboardLiveIncidents
          incidents={[MOCK_INCIDENT]}
          groupingMode="clustered"
          onChangeGroupingMode={() => {}}
          canReview={true}
        />,
      );

      assert.ok(html.includes("Gom đa sự cố") || html.includes("Clustered"));
      assert.ok(html.includes("Bản ghi gốc") || html.includes("Raw"));
    });

    it("renders existing operational charts directly from buildDashboardAnalyticsFromReporting", () => {
      const emptySev = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
      const reportingAnalytics = buildDashboardAnalyticsFromReporting({
        summary: {
          totalIncidents: 14,
          openIncidents: 3,
          resolvedIncidents: 8,
          trueViolations: 2,
          falseAlarms: 1,
          falseAlarmRate: 9.09,
          complianceRate: 96.5,
          meanTimeToResolveHours: 0.4,
          periodStart: "2026-11-25",
          periodEnd: "2026-11-25",
          severityBreakdown: {
            CRITICAL: {
              count: 4,
              resolved: 3,
              targetSlaMinutes: 15,
              actualMttrMinutes: 14,
            },
            HIGH: {
              count: 10,
              resolved: 5,
              targetSlaMinutes: 30,
              actualMttrMinutes: 26,
            },
            MEDIUM: {
              count: 0,
              resolved: 0,
              targetSlaMinutes: 60,
              actualMttrMinutes: 0,
            },
            LOW: {
              count: 0,
              resolved: 0,
              targetSlaMinutes: 120,
              actualMttrMinutes: 0,
            },
          },
        },
        violations: [
          {
            violationType: "TOTAL_AGGREGATED",
            count: 0,
            percentage: 0,
            severityBreakdown: emptySev,
          },
          {
            violationType: "NO_HELMET",
            count: 10,
            percentage: 71.4,
            severityBreakdown: emptySev,
          },
          {
            violationType: "NO_VEST",
            count: 4,
            percentage: 28.6,
            severityBreakdown: emptySev,
          },
        ],
        hourlyRisk: {
          date: "2026-11-25",
          hourly: [
            {
              hour: 8,
              label: "08:00",
              shift: "MORNING",
              count: 9,
              riskLevel: "HIGH",
              severityBreakdown: emptySev,
            },
            {
              hour: 16,
              label: "16:00",
              shift: "AFTERNOON",
              count: 5,
              riskLevel: "MEDIUM",
              severityBreakdown: emptySev,
            },
          ],
          shifts: {
            morning: {
              name: "Ca sáng",
              timeRange: "06:00 - 14:00",
              totalIncidents: 9,
              criticalCount: 2,
              highCount: 7,
              mediumCount: 0,
              lowCount: 0,
              riskLevel: "HIGH",
            },
            afternoon: {
              name: "Ca chiều",
              timeRange: "14:00 - 22:00",
              totalIncidents: 5,
              criticalCount: 2,
              highCount: 3,
              mediumCount: 0,
              lowCount: 0,
              riskLevel: "MEDIUM",
            },
            night: {
              name: "Ca đêm",
              timeRange: "22:00 - 06:00",
              totalIncidents: 0,
              criticalCount: 0,
              highCount: 0,
              mediumCount: 0,
              lowCount: 0,
              riskLevel: "LOW",
            },
          },
          summary: {
            totalIncidents: 14,
            peakHour: 8,
            peakShift: "MORNING",
            riskLevel: "HIGH",
          },
        },
        cameraRankings: [
          {
            cameraId: "cam-1",
            cameraName: "CCTV Cổng Số 1",
            totalViolations: 14,
            confirmedCount: 2,
            resolvedCount: 8,
            falseAlarmCount: 1,
          },
        ],
      });

      const suiteHtml = renderWithProviders(
        <DashboardOperationalSuite analytics={reportingAnalytics} />,
      );
      const radarHtml = renderWithProviders(
        <DashboardPpeRadarChart distribution={reportingAnalytics.distribution} />,
      );

      assert.ok(suiteHtml.includes("08:00: 9"));
      assert.ok(suiteHtml.includes("24 phút")); // 0.4h * 60
      assert.ok(radarHtml.includes("Không đội mũ"));
      assert.ok(!radarHtml.includes("TOTAL_AGGREGATED"));
    });
  });

  describe("Step 3: D08 KPI Ribbon & Severity SLA Target Comparison", () => {
    it("displays resolved + MTTR, confirmed awaiting resolution, offline cameras, False Alert Rate, True Violations & Compliance Rate on DashboardKpiRibbon", () => {
      const reportingAnalytics = buildDashboardAnalyticsFromReporting({
        summary: {
          totalIncidents: 20,
          openIncidents: 4,
          resolvedIncidents: 10,
          trueViolations: 4,
          falseAlarms: 2,
          falseAlarmRate: 12.5,
          complianceRate: 93.4,
          meanTimeToResolveHours: 0.5,
          periodStart: "2026-11-25",
          periodEnd: "2026-11-25",
        },
      });

      const html = renderWithProviders(
        <DashboardKpiRibbon
          total={20}
          pendingCount={4}
          confirmedCount={4}
          onlineCamerasCount={8}
          totalCamerasCount={10}
          analytics={reportingAnalytics}
          canViewReports
          canViewIncidents
          canViewCameras
        />,
      );

      assert.ok(html.includes("Đã xử lý 10 ca · MTTR: 30 phút"));
      assert.ok(html.includes("4 ca xác nhận chờ khắc phục"));
      assert.ok(html.includes("2 ngoại tuyến · 80% hoạt động"));
      assert.ok(html.includes("Tỷ lệ cảnh báo sai"));
      assert.ok(html.includes("12,5%"));
      assert.ok(html.includes("14 vi phạm thực · Tuân thủ 93,4%"));
    });

    it("compares actual MTTR against target SLA thresholds (15p/30p/60p/120p) and flags overdue tiers on DashboardSeveritySlaChart", () => {
      const reportingAnalytics = buildDashboardAnalyticsFromReporting({
        summary: {
          totalIncidents: 10,
          openIncidents: 2,
          resolvedIncidents: 6,
          trueViolations: 1,
          falseAlarms: 1,
          falseAlarmRate: 12.5,
          complianceRate: 95,
          meanTimeToResolveHours: 0.35,
          periodStart: "2026-11-25",
          periodEnd: "2026-11-25",
          severityBreakdown: {
            CRITICAL: {
              count: 4,
              resolved: 3,
              targetSlaMinutes: 15,
              actualMttrMinutes: 22, // Breached 15m SLA
            },
            HIGH: {
              count: 6,
              resolved: 3,
              targetSlaMinutes: 30,
              actualMttrMinutes: 20, // Within 30m SLA
            },
            MEDIUM: {
              count: 0,
              resolved: 0,
              targetSlaMinutes: 60,
              actualMttrMinutes: 0,
            },
            LOW: {
              count: 0,
              resolved: 0,
              targetSlaMinutes: 120,
              actualMttrMinutes: 0,
            },
          },
        },
      });

      const html = renderWithProviders(
        <DashboardSeveritySlaChart analytics={reportingAnalytics} />,
      );

      assert.ok(html.includes("Ngưỡng SLA mục tiêu"));
      assert.ok(html.includes("15p · 30p · 60p · 120p"));
      assert.ok(html.includes("SLA 15p"));
      assert.ok(html.includes("SLA 30p"));
      assert.ok(html.includes("Quá SLA"));
    });

    it("Step 6: renders Active AI Model, FPS & Latency inside Tile 03 of DashboardKpiRibbon and supports 4-column DashboardQuickActions", () => {
      const reportingAnalytics = buildDashboardAnalyticsFromReporting({
        summary: {
          totalIncidents: 8,
          openIncidents: 1,
          resolvedIncidents: 5,
          trueViolations: 1,
          falseAlarms: 1,
          falseAlarmRate: 14.28,
          complianceRate: 96,
          meanTimeToResolveHours: 0.25,
          periodStart: "2026-11-25",
          periodEnd: "2026-11-25",
        },
      });

      const kpiHtml = renderWithProviders(
        <DashboardKpiRibbon
          total={8}
          pendingCount={1}
          onlineCamerasCount={10}
          totalCamerasCount={10}
          aiSummary={{
            modelLabel: "YOLOv11-PPE v2.1.0",
            avgFps: 28.5,
            avgLatencyMs: 14.2,
          }}
          analytics={reportingAnalytics}
          canViewReports
          canViewIncidents
          canViewCameras
        />,
      );

      assert.ok(kpiHtml.includes("10/10"));
      assert.ok(kpiHtml.includes("YOLOv11-PPE v2.1.0"));
      assert.ok(kpiHtml.includes("28,5 FPS"));
      assert.ok(kpiHtml.includes("14,2ms"));

      const actionsHtml = renderWithProviders(
        <DashboardQuickActions
          columns={4}
          canExportReports={true}
          canReviewIncidents={true}
        />,
      );
      assert.ok(actionsHtml.includes("xl:grid-cols-4"));
    });
  });
});
