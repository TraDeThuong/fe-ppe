import "@/hooks/auth/__tests__/setup";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LocaleProvider } from "@/providers/locale-provider";
import {
  DashboardHeroHeader,
  DashboardKpiRibbon,
  DashboardLiveIncidents,
  DashboardAiStatusCard,
  DashboardQuickActions,
  HelmetShowcase,
  DashboardOperationalSuite,
  DashboardPpeRadarChart,
  DashboardHourlyRiskChart,
  DashboardSeveritySlaChart,
  DashboardZoneRiskChart,
  DashboardNavTabs,
  DashboardExecutiveKpi,
  DashboardSystemStatusCard,
  DashboardUsersOverviewCard,
  DashboardAuditMiniFeed,
  DashboardCronMiniCard,
} from "../index";
import { aggregateDashboard } from "@/lib/dashboard-data";
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
    it("renders empty compliant message when there are no incidents", () => {
      const html = renderWithProviders(
        <DashboardLiveIncidents incidents={[]} loading={false} />,
      );

      assert.ok(
        html.includes("Không có vi phạm nào gần đây") ||
          html.includes("No recent violations"),
      );
    });

    it("renders incidents list with violation badges and camera name", () => {
      const html = renderWithProviders(
        <DashboardLiveIncidents
          incidents={[MOCK_INCIDENT]}
          loading={false}
          canReview={true}
          onReview={() => {}}
        />,
      );

      assert.ok(html.includes("Không đội mũ") || html.includes("No Helmet"));
      assert.ok(html.includes("CCTV Cổng Số 1"));
      assert.ok(html.includes("Duyệt nhanh") || html.includes("Quick Review"));
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
      assert.ok(html.includes("93.2%"));
      assert.ok(html.includes("18ms"));
      assert.ok(html.includes("28 FPS"));
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
    });
    it("shows real duration samples and no SLA claims", () => {
      const html = renderWithProviders(
        <DashboardSeveritySlaChart analytics={analytics} />,
      );
      assert.ok(html.includes("20 phút"));
      assert.ok(html.includes("mẫu hợp lệ"));
      assert.ok(!html.includes("SLA"));
    });
    it("does not invent online status or safety for an unknown camera", () => {
      const html = renderWithProviders(
        <DashboardZoneRiskChart cameraStats={analytics.cameras} />,
      );
      assert.ok(html.includes("Chưa có trạng thái"));
      assert.ok(!html.includes("An toàn"));
      assert.ok(!html.includes("Trực tuyến"));
    });
    it("renders the suite with period analytics", () => {
      const html = renderWithProviders(
        <DashboardOperationalSuite analytics={analytics} />,
      );
      assert.ok(html.includes("Phân tích sự cố trong kỳ"));
      assert.ok(html.includes("Lưới 2x2"));
      assert.ok(html.includes("Radar"));
    });
  });

  describe("Dashboard Navigation & Multi-Domain Executive Widgets", () => {
    it("renders sub-navigation tabs with correct badges", () => {
      const html = renderWithProviders(
        <DashboardNavTabs
          activeTab="overview"
          onChangeTab={() => {}}
          pendingCount={7}
          onlineCameras={4}
          totalCameras={4}
          healthyServices={12}
          totalServices={12}
        />,
      );

      assert.ok(html.includes("Tổng quan") || html.includes("Overview"));
      assert.ok(html.includes("An toàn &amp; Sự cố") || html.includes("Safety &amp; Incidents") || html.includes("An toàn"));
      assert.ok(html.includes("Thiết bị &amp; AI") || html.includes("Cameras &amp; AI") || html.includes("Thiết bị"));
      assert.ok(html.includes("Người dùng &amp; Hệ thống") || html.includes("Users &amp; System") || html.includes("Người dùng"));
      assert.ok(html.includes("7"));
      assert.ok(html.includes("4/4"));
      assert.ok(html.includes("12/12"));
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

    it("renders system status card with title and view details link", () => {
      const html = renderWithProviders(<DashboardSystemStatusCard />);
      assert.ok(
        html.includes("Trạng thái Dịch vụ &amp; Hạ tầng") ||
          html.includes("Services &amp; Infrastructure Status") ||
          html.includes("Dịch vụ"),
      );
      assert.ok(html.includes("/system"));
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

    it("renders cron mini card with title and manage tasks link", () => {
      const html = renderWithProviders(<DashboardCronMiniCard />);
      assert.ok(
        html.includes("Tác vụ Lập lịch (Cron)") ||
          html.includes("Scheduled Tasks (Cron)") ||
          html.includes("Cron"),
      );
      assert.ok(html.includes("/scheduled-tasks"));
    });
  });
});
