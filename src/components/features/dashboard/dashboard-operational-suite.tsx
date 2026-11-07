"use client";

import React, { useState } from "react";
import {
  Cctv,
  Clock,
  LayoutGrid,
  Radar,
  ShieldAlert,
} from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import type {
  CameraItem,
  CameraStatDto,
  IncidentItem,
  StatisticsSummaryDto,
  ViolationTypeStatDto,
  ZoneItem,
} from "@/types";
import { DashboardPpeRadarChart } from "./charts/dashboard-ppe-radar-chart";
import { DashboardHourlyRiskChart } from "./charts/dashboard-hourly-risk-chart";
import { DashboardSeveritySlaChart } from "./charts/dashboard-severity-sla-chart";
import { DashboardZoneRiskChart } from "./charts/dashboard-zone-risk-chart";

export type OperationalViewMode = "grid" | "radar" | "hourly" | "severity" | "cameras";

export interface DashboardOperationalSuiteProps {
  distribution?: ViolationTypeStatDto[];
  summary?: StatisticsSummaryDto | null;
  incidents?: IncidentItem[];
  cameras?: CameraItem[];
  cameraRankings?: CameraStatDto[];
  zones?: ZoneItem[];
  className?: string;
  loading?: boolean;
  onSelectCamera?: (cameraId: string) => void;
}

export function DashboardOperationalSuite({
  distribution = [],
  summary,
  incidents = [],
  cameras = [],
  cameraRankings = [],
  zones = [],
  className = "",
  loading = false,
  onSelectCamera,
}: DashboardOperationalSuiteProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const [viewMode, setViewMode] = useState<OperationalViewMode>("grid");

  const viewTabs: {
    id: OperationalViewMode;
    labelVi: string;
    labelEn: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: "grid",
      labelVi: "Tất cả (Lưới 2x2)",
      labelEn: "Overview (2x2 Grid)",
      icon: LayoutGrid,
    },
    {
      id: "radar",
      labelVi: "Radar 4 Quy Chuẩn AI",
      labelEn: "AI Safety Radar",
      icon: Radar,
    },
    {
      id: "hourly",
      labelVi: "Khung Giờ Thực Tế",
      labelEn: "Hourly Incidents",
      icon: Clock,
    },
    {
      id: "severity",
      labelVi: "Mức Rủi Ro & SLA",
      labelEn: "Severity & SLA",
      icon: ShieldAlert,
    },
    {
      id: "cameras",
      labelVi: "Điểm Nóng Camera",
      labelEn: "Camera Hotspots",
      icon: Cctv,
    },
  ];

  return (
    <section className={`space-y-4 ${className}`}>
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              {isVietnamese ? "ĐIỀU HÀNH TÁC CHIẾN" : "OPERATIONAL COMMAND"}
            </span>
          </div>

          <h3 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {isVietnamese ? "Phân Tích Tác Chiến An Toàn" : "Safety Operational Analytics"}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isVietnamese
              ? "Dữ liệu thực tế 100% từ Backend: Quy chuẩn AI, Khung giờ sự cố, MTTR SLA & Điểm nóng camera"
              : "100% real backend telemetry: AI rules, incident hourly timeline, MTTR SLA & camera hotspots"}
          </p>
        </div>

        {/* View Switcher Pills */}
        <div className="flex flex-wrap items-center gap-1 rounded-2xl bg-surface p-1.5 border border-border/40 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
          {viewTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = viewMode === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setViewMode(tab.id)}
                className={[
                  "flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer",
                  isActive
                    ? "bg-background text-primary shadow-[2px_2px_6px_var(--shadow-dark),-2px_-2px_6px_var(--shadow-light)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-elevated/40",
                ].join(" ")}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden md:inline">
                  {isVietnamese ? tab.labelVi : tab.labelEn}
                </span>
                <span className="md:hidden">
                  {tab.id === "grid" ? (isVietnamese ? "Lưới" : "Grid") : isVietnamese ? tab.labelVi.slice(0, 8) : tab.labelEn.slice(0, 8)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main View Content */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
          {/* 1. Radar 4 Real AI Rules */}
          <DashboardPpeRadarChart
            distribution={distribution}
            summary={summary}
            loading={loading}
            className="h-full min-h-[380px]"
          />

          {/* 2. Real Hourly Incidents */}
          <DashboardHourlyRiskChart
            incidents={incidents}
            loading={loading}
            className="h-full min-h-[380px]"
          />

          {/* 3. Real Severity & SLA */}
          <DashboardSeveritySlaChart
            incidents={incidents}
            meanTimeToResolveHours={summary?.meanTimeToResolveHours}
            loading={loading}
            className="h-full min-h-[380px]"
          />

          {/* 4. Real Cameras & Hotspots */}
          <DashboardZoneRiskChart
            cameras={cameras}
            cameraRankings={cameraRankings}
            zones={zones}
            onSelectCamera={onSelectCamera}
            loading={loading}
            className="h-full min-h-[380px]"
          />
        </div>
      ) : viewMode === "radar" ? (
        <div className="w-full">
          <DashboardPpeRadarChart
            distribution={distribution}
            summary={summary}
            loading={loading}
            className="w-full min-h-[440px]"
          />
        </div>
      ) : viewMode === "hourly" ? (
        <div className="w-full">
          <DashboardHourlyRiskChart
            incidents={incidents}
            loading={loading}
            className="w-full min-h-[440px]"
          />
        </div>
      ) : viewMode === "severity" ? (
        <div className="w-full">
          <DashboardSeveritySlaChart
            incidents={incidents}
            meanTimeToResolveHours={summary?.meanTimeToResolveHours}
            loading={loading}
            className="w-full min-h-[440px]"
          />
        </div>
      ) : (
        <div className="w-full">
          <DashboardZoneRiskChart
            cameras={cameras}
            cameraRankings={cameraRankings}
            zones={zones}
            onSelectCamera={onSelectCamera}
            loading={loading}
            className="w-full min-h-[440px]"
          />
        </div>
      )}
    </section>
  );
}
