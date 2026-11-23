"use client";

import React from "react";
import {
  AlertCircle,
  Camera,
  LayoutGrid,
  List,
  MonitorPlay,
  Plus,
  RefreshCw,
  Server,
  Terminal,
} from "lucide-react";
import { NM } from "@/components/features/ai-test/nm-styles";
import { ConsoleRefreshButton } from "@/components/ui/refresh-action";
import { useLocale } from "@/providers/locale-provider";
import type { ModelInfo } from "@/types/ai-test.types";

export type CameraFleetViewMode = "grid" | "wall" | "table";

export interface CameraFleetHeaderProps {
  viewMode: CameraFleetViewMode;
  onViewModeChange: (mode: CameraFleetViewMode) => void;
  engineOnline: boolean;
  engineError: string | null;
  productionMode?: boolean;
  autoSyncEnabled?: boolean;
  maxSessions?: number;
  isSyncingLive?: boolean;
  onTriggerSync?: () => void;
  models: ModelInfo[];
  totalCameras: number;
  runningSessionsCount: number;
  isRefreshing: boolean;
  canCreateCamera: boolean;
  onRefreshAll: () => void;
  onCreateCamera: () => void;
}

export function CameraFleetHeader({
  viewMode,
  onViewModeChange,
  engineOnline,
  engineError,
  productionMode = false,
  autoSyncEnabled = false,
  maxSessions,
  isSyncingLive = false,
  onTriggerSync,
  models,
  totalCameras,
  runningSessionsCount,
  isRefreshing,
  canCreateCamera,
  onRefreshAll,
  onCreateCamera,
}: CameraFleetHeaderProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const defaultModel = models.find((m) => m.is_default) ?? models[0];

  const tabItems: {
    value: CameraFleetViewMode;
    index: string;
    label: string;
    caption: string;
    icon: React.ReactNode;
    badge?: string;
    useAccent?: boolean;
  }[] = [
    {
      value: "grid",
      index: "01",
      label: isVietnamese ? "Lưới Camera" : "Camera Grid",
      caption: isVietnamese
        ? "Theo dõi toàn đội hình & bật AI từng luồng"
        : "Monitor fleet & toggle per-stream AI",
      icon: <LayoutGrid className="size-4" />,
      badge: totalCameras > 0 ? String(totalCameras) : undefined,
      useAccent: false,
    },
    {
      value: "wall",
      index: "02",
      label: "Video Wall",
      caption: isVietnamese
        ? "Giám sát đa khung MJPEG thời gian thực"
        : "Real-time multi-pane MJPEG monitoring",
      icon: <MonitorPlay className="size-4" />,
      badge: runningSessionsCount > 0 ? `${runningSessionsCount} LIVE` : undefined,
      useAccent: true,
    },
    {
      value: "table",
      index: "03",
      label: isVietnamese ? "Bảng Danh Sách" : "Device Table",
      caption: isVietnamese
        ? "Quản lý thiết bị, nguồn stream & kết nối"
        : "Manage devices, stream sources & health",
      icon: <List className="size-4" />,
      badge: totalCameras > 0 ? String(totalCameras) : undefined,
      useAccent: false,
    },
  ];

  return (
    <section
      aria-label={isVietnamese ? "Tiêu đề trung tâm điều khiển Camera" : "Camera Fleet Console Header"}
      className={`relative overflow-hidden rounded-[24px] p-4 sm:rounded-[30px] sm:p-6 lg:p-7 transition-all duration-300 ${NM.chassis}`}
    >
      <div className="pointer-events-none absolute inset-x-10 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="relative space-y-6">
        {/* Layer 1: Identity & Right Action Modules */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div
              className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${NM.extruded}`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-md">
                <Camera className="size-5" />
              </div>
              <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-background shadow-sm">
                <span
                  className={`h-2 w-2 rounded-full ${
                    engineOnline
                      ? "bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
                      : "bg-accent/60"
                  }`}
                />
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                  {isVietnamese
                    ? "Trung Tâm Giám Sát Camera AI"
                    : "AI Camera Monitoring Center"}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                  Live Tracking Console
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>AI Live Engine</span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 font-mono text-xs font-semibold ${
                    engineOnline ? "text-primary" : "text-accent"
                  } ${NM.recessed}`}
                >
                  <Terminal className="size-3 text-accent" />
                  {engineOnline ? "AI Engine Online" : "AI Engine Offline"}
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 font-mono text-xs font-semibold ${
                    runningSessionsCount > 0 ? "text-accent" : "text-muted-foreground"
                  } ${NM.recessed}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      runningSessionsCount > 0
                        ? "animate-pulse bg-accent"
                        : "bg-muted-foreground/40"
                    }`}
                  />
                  {typeof maxSessions === "number"
                    ? `${runningSessionsCount}/${maxSessions} ${isVietnamese ? "luồng AI" : "AI streams"}`
                    : `${runningSessionsCount} ${isVietnamese ? "luồng đang AI Tracking" : "active AI streams"}`}
                </span>

                {productionMode && autoSyncEnabled && (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 font-mono text-xs font-semibold text-primary ${NM.recessed}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Auto-Sync 24/7
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right cluster: Active Model Pod + Refresh + Add Camera */}
          <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
            {defaultModel && (
              <div
                className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 ${NM.extruded}`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${NM.recessed}`}
                >
                  <Server className="size-4 text-accent" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Active Model
                    </span>
                    <span className="rounded-full bg-accent/15 px-1.5 text-[10px] font-extrabold text-accent">
                      {models.length}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="max-w-[130px] truncate text-sm font-extrabold text-foreground">
                      {defaultModel.name}
                    </span>
                    {typeof defaultModel.size_mb === "number" && (
                      <span className="shrink-0 font-mono text-[11px] font-semibold text-primary">
                        {defaultModel.size_mb.toFixed(1)} MB
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {onTriggerSync && (
              <button
                type="button"
                onClick={onTriggerSync}
                disabled={isSyncingLive || !engineOnline}
                title={
                  isVietnamese
                    ? "Kích hoạt đồng bộ ngay toàn bộ camera ONLINE từ Camera Service"
                    : "Sync all ONLINE cameras from Camera Service immediately"
                }
                className={`inline-flex h-11 sm:h-14 shrink-0 items-center gap-2 rounded-2xl px-4 text-xs font-bold uppercase tracking-wider text-primary disabled:opacity-50 ${NM.tactileBtn}`}
              >
                <RefreshCw
                  className={`size-4 ${isSyncingLive ? "animate-spin" : ""}`}
                />
                <span>
                  {isSyncingLive
                    ? isVietnamese
                      ? "Đang sync..."
                      : "Syncing..."
                    : "Sync 24/7"}
                </span>
              </button>
            )}

            <ConsoleRefreshButton
              onRefresh={onRefreshAll}
              isRefreshing={isRefreshing}
              subtitle={isVietnamese ? "Trạng thái" : "Status"}
            />

            {canCreateCamera && (
              <button
                type="button"
                onClick={onCreateCamera}
                className="inline-flex h-11 sm:h-14 shrink-0 cursor-pointer items-center gap-2 rounded-2xl bg-primary px-4 sm:px-5 text-xs font-extrabold uppercase tracking-wider text-primary-foreground shadow-[6px_6px_14px_rgba(0,0,0,0.16),-4px_-4px_10px_rgba(255,255,255,0.7),inset_1px_1px_1px_rgba(255,255,255,0.35)] dark:shadow-[6px_6px_14px_rgba(0,0,0,0.5)] transition-all hover:brightness-105 active:scale-[0.98]"
              >
                <Plus className="size-4" />
                <span>{isVietnamese ? "Thêm Camera" : "Add Camera"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Recessed Alert Tray when AI Engine Offline */}
        {!engineOnline && engineError && (
          <div className={`relative overflow-hidden rounded-2xl p-4 text-xs ${NM.recessed}`}>
            <div className="absolute inset-y-2.5 left-2 w-1 rounded-full bg-accent" />
            <div className="flex items-start gap-3 pl-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <AlertCircle className="size-4" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-foreground">
                  {isVietnamese ? "Không kết nối được" : "Cannot connect to"}{" "}
                  <span className="text-accent">AI Live Engine</span>
                </p>
                <p className="text-muted-foreground">
                  {isVietnamese ? (
                    <>
                      Danh sách camera từ DB vẫn hoạt động bình thường. Để xem luồng AI MJPEG và telemetry real-time, hãy khởi động dịch vụ AI Engine (
                      <code className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary">
                        AI_ENGINE_URL
                      </code>
                      ).
                    </>
                  ) : (
                    <>
                      The camera catalog from DB still works normally. To view live MJPEG AI streams and real-time telemetry, start the AI Engine service (
                      <code className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary">
                        AI_ENGINE_URL
                      </code>
                      ).
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Layer 2: Recessed Mechanical Switch Track */}
        <div
          role="tablist"
          aria-label={isVietnamese ? "Chuyển chế độ hiển thị Camera" : "Switch camera view mode"}
          className={`grid grid-cols-1 gap-3 rounded-[24px] p-2.5 md:grid-cols-3 ${NM.recessed}`}
        >
          {tabItems.map((tab) => {
            const isActive = viewMode === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onViewModeChange(tab.value)}
                className={`group relative flex cursor-pointer items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left transition-all duration-300 ${
                  isActive
                    ? `${NM.extruded} scale-[1.005]`
                    : "text-muted-foreground hover:bg-primary/[0.03]"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <div
                    className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${
                      isActive
                        ? tab.useAccent
                          ? "bg-accent text-accent-foreground shadow-sm"
                          : "bg-primary text-primary-foreground shadow-sm"
                        : `${NM.recessed} text-muted-foreground group-hover:text-primary`
                    }`}
                  >
                    {tab.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono text-[10px] font-bold ${
                          isActive ? "text-primary" : "text-muted-foreground/60"
                        }`}
                      >
                        {tab.index}
                      </span>
                      <span
                        className={`truncate text-sm font-bold ${
                          isActive
                            ? "text-foreground"
                            : "text-muted-foreground group-hover:text-foreground"
                        }`}
                      >
                        {tab.label}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">
                      {tab.caption}
                    </p>
                  </div>
                </div>

                {tab.badge && (
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${
                      tab.useAccent
                        ? "bg-accent/15 text-accent"
                        : "bg-primary/15 text-primary"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}

                {isActive && (
                  <span
                    className={`absolute bottom-0 left-1/2 h-[3px] w-14 -translate-x-1/2 rounded-t-full ${
                      tab.useAccent ? "bg-accent" : "bg-primary"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

