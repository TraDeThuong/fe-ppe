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
} from "../index";
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
  permissions: ["PPE_REPORTING_READ", "PPE_INCIDENT_READ", "PPE_INCIDENT_REVIEW"],
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
        />
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
        />
      );

      assert.ok(html.includes("Mất kết nối") || html.includes("Disconnected"));
      assert.ok(html.includes("Toàn bộ công trường") || html.includes("All Sites"));
    });
  });

  describe("DashboardKpiRibbon", () => {
    it("renders 4 executive KPI cards when canViewReports = true", () => {
      const html = renderWithProviders(
        <DashboardKpiRibbon
          summary={{
            totalIncidents: 45,
            openIncidents: 8,
            resolvedIncidents: 37,
            trueViolations: 40,
            falseAlarms: 5,
            falseAlarmRate: 3.5,
            complianceRate: 94.2,
            meanTimeToResolveHours: 1.2,
          }}
          pendingCount={8}
          totalCamerasCount={10}
          onlineCamerasCount={9}
          loading={false}
          canViewReports={true}
        />
      );

      assert.ok(html.includes("94.2%"));
      assert.ok(html.includes("8"));
      assert.ok(html.includes("9/10"));
      assert.ok(html.includes("3.5%"));
    });

    it("renders personalized tasks view when canViewReports = false", () => {
      const html = renderWithProviders(
        <DashboardKpiRibbon
          pendingCount={3}
          totalCamerasCount={5}
          onlineCamerasCount={5}
          loading={false}
          canViewReports={false}
          userAssignedCount={2}
        />
      );

      assert.ok(html.includes("Vi phạm được phân công") || html.includes("Assigned"));
      assert.ok(html.includes("5/5"));
    });
  });

  describe("DashboardLiveIncidents", () => {
    it("renders empty compliant message when there are no incidents", () => {
      const html = renderWithProviders(
        <DashboardLiveIncidents incidents={[]} loading={false} />
      );

      assert.ok(html.includes("Không có vi phạm nào gần đây") || html.includes("No recent violations"));
    });

    it("renders incidents list with violation badges and camera name", () => {
      const html = renderWithProviders(
        <DashboardLiveIncidents
          incidents={[MOCK_INCIDENT]}
          loading={false}
          canReview={true}
          onReview={() => {}}
        />
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
        />
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
        />
      );

      assert.ok(html.includes("Duyệt vi phạm tồn đọng") || html.includes("Review Pending"));
      assert.ok(html.includes("Mở Video Wall") || html.includes("Video Wall"));
      assert.ok(html.includes("Xuất báo cáo") || html.includes("Generate Safety Report"));
      assert.ok(html.includes("Cấu hình an toàn") || html.includes("Safety"));
    });
  });

  describe("HelmetShowcase", () => {
    it("renders PPE 3D MODEL badge and custom title", () => {
      const html = renderWithProviders(
        <HelmetShowcase
          title="Mô Hình PPE 3D"
          subtitle="Mũ bảo hộ tiêu chuẩn ANSI Z89.1"
        />
      );

      assert.ok(html.includes("PPE 3D MODEL"));
      assert.ok(html.includes("Mô Hình PPE 3D"));
      assert.ok(html.includes("Mũ bảo hộ tiêu chuẩn ANSI Z89.1"));
      assert.ok(html.includes("ANSI Z89.1 Type 1 / Class E"));
    });
  });

  describe("Operational Suite & Charts", () => {
    it("renders DashboardPpeRadarChart with 4 real AI rules and average score", () => {
      const html = renderWithProviders(
        <DashboardPpeRadarChart
          distribution={[
            {
              violationType: "NO_HELMET",
              count: 8,
              percentage: 50,
              severityBreakdown: { LOW: 0, MEDIUM: 3, HIGH: 5, CRITICAL: 0 },
            },
            {
              violationType: "NO_VEST",
              count: 5,
              percentage: 31.25,
              severityBreakdown: { LOW: 1, MEDIUM: 4, HIGH: 0, CRITICAL: 0 },
            },
            {
              violationType: "RESTRICTED_AREA",
              count: 2,
              percentage: 12.5,
              severityBreakdown: { LOW: 0, MEDIUM: 0, HIGH: 1, CRITICAL: 1 },
            },
            {
              violationType: "MULTI_VIOLATION",
              count: 1,
              percentage: 6.25,
              severityBreakdown: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 1 },
            },
          ]}
          summary={{
            totalIncidents: 16,
            openIncidents: 4,
            resolvedIncidents: 12,
            trueViolations: 15,
            falseAlarms: 1,
            falseAlarmRate: 6.25,
            complianceRate: 92.5,
            meanTimeToResolveHours: 0.8,
          }}
        />
      );
      assert.ok(html.includes("Mũ bảo hộ") || html.includes("Safety Helmet"));
      assert.ok(html.includes("Áo phản quang") || html.includes("High-Vis Vest"));
      assert.ok(html.includes("Vùng nguy hiểm") || html.includes("Hazard Zone"));
      assert.ok(html.includes("Radar tuân thủ an toàn") || html.includes("Safety Compliance Radar"));
    });

    it("renders DashboardHourlyRiskChart with real incident items and shifts", () => {
      const html = renderWithProviders(
        <DashboardHourlyRiskChart
          incidents={[
            { ...MOCK_INCIDENT, id: "inc-1", detectedAt: "2026-11-03T10:15:00.000Z" },
            { ...MOCK_INCIDENT, id: "inc-2", detectedAt: "2026-11-03T14:30:00.000Z" },
          ]}
        />
      );
      assert.ok(html.includes("Ca sáng") || html.includes("Ca Sáng") || html.includes("Morning"));
      assert.ok(html.includes("Ca chiều") || html.includes("Ca Chiều") || html.includes("Afternoon"));
      assert.ok(html.includes("Ca đêm") || html.includes("Ca Đêm") || html.includes("Night"));
      assert.ok(html.includes("10h") || html.includes("10:00"));
    });

    it("renders DashboardSeveritySlaChart with 4 severity levels and MTTR metrics", () => {
      const html = renderWithProviders(
        <DashboardSeveritySlaChart
          incidents={[
            { ...MOCK_INCIDENT, severity: "CRITICAL", status: "PENDING_REVIEW" },
            { ...MOCK_INCIDENT, severity: "HIGH", status: "RESOLVED" },
          ]}
          meanTimeToResolveHours={0.5}
        />
      );
      assert.ok(html.includes("Nguy cấp") || html.includes("Critical"));
      assert.ok(html.includes("Nghiêm trọng") || html.includes("High Risk"));
      assert.ok(html.includes("Trung bình") || html.includes("Medium Risk"));
      assert.ok(html.includes("Đạt SLA"));
    });

    it("renders DashboardZoneRiskChart with cameras and violation rankings", () => {
      const html = renderWithProviders(
        <DashboardZoneRiskChart
          cameras={[
            {
              id: "cam-1",
              name: "Camera Cổng Số 1",
              code: "CAM-GATE-01",
              status: "ONLINE",
              siteId: "site-1",
              location: "Cổng chính",
              sourceType: "RTSP",
              streamUrl: "rtsp://camera.ppe.local/gate1",
              createdAt: "2026-01-01T00:00:00Z",
              updatedAt: "2026-01-01T00:00:00Z",
            },
          ]}
          cameraRankings={[
            {
              cameraId: "cam-1",
              cameraName: "Camera Cổng Số 1",
              totalViolations: 6,
              confirmedCount: 6,
              falseAlarmCount: 0,
              resolvedCount: 4,
            },
          ]}
        />
      );
      assert.ok(html.includes("CAM-GATE-01") || html.includes("Camera Cổng Số 1"));
      assert.ok(html.includes("Camera"));
      assert.ok(html.includes("ONLINE") || html.includes("Trực tuyến") || html.includes("Đang hoạt động"));
    });

    it("renders DashboardOperationalSuite with switcher tabs and real data", () => {
      const html = renderWithProviders(
        <DashboardOperationalSuite
          distribution={[]}
          incidents={[MOCK_INCIDENT]}
        />
      );
      assert.ok(html.includes("Phân Tích Tác Chiến An Toàn") || html.includes("Safety Operational"));
      assert.ok(html.includes("Lưới 2x2") || html.includes("Overview"));
      assert.ok(html.includes("Radar"));
      assert.ok(html.includes("Khung Giờ") || html.includes("Hourly"));
    });
  });
});
