"use client";

import React from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Building2,
  Camera,
  Database,
  Edit2,
  Images,
  Layers,
  Radio,
  RefreshCw,
  Server,
  Terminal,
} from "lucide-react";
import { NM } from "@/components/features/ai-test/nm-styles";
import type { ModelInfo } from "@/types/ai-test.types";
import type { CameraItem } from "@/types";

export type CameraStudioTab = "live" | "gallery" | "incidents";

export interface CameraStudioHeaderProps {
  camera: CameraItem;
  siteName?: string;
  activeTab: CameraStudioTab;
  onTabChange: (tab: CameraStudioTab) => void;
  engineOnline: boolean;
  engineError: string | null;
  liveStatus?: string;
  models: ModelInfo[];
  activeModelName: string;
  galleryCount: number;
  incidentsCount: number;
  isRefreshing: boolean;
  canManage: boolean;
  onRefreshAll: () => void;
  onOpenPing: () => void;
  onOpenEdit: () => void;
}

export function CameraStudioHeader({
  camera,
  siteName,
  activeTab,
  onTabChange,
  engineOnline,
  engineError,
  liveStatus,
  models,
  activeModelName,
  galleryCount,
  incidentsCount,
  isRefreshing,
  canManage,
  onRefreshAll,
  onOpenPing,
  onOpenEdit,
}: CameraStudioHeaderProps) {
  const isDbOnline = camera.status === "ONLINE";
  const isLiveRunning = liveStatus === "running";

  const tabItems: {
    value: CameraStudioTab;
    index: string;
    label: string;
    caption: string;
    icon: React.ReactNode;
    badge?: string;
    useAccent?: boolean;
  }[] = [
    {
      value: "live",
      index: "01",
      label: "Live AI Monitor",
      caption: "Real-time MJPEG, Hot Config & Telemetry",
      icon: <Radio className="size-4" />,
      badge: isLiveRunning ? "LIVE" : "IDLE",
      useAccent: isLiveRunning,
    },
    {
      value: "gallery",
      index: "02",
      label: "Thư Viện Bằng Chứng",
      caption: "Before / After Inspection & Track Filter",
      icon: <Images className="size-4" />,
      badge: galleryCount > 0 ? String(galleryCount) : undefined,
      useAccent: true,
    },
    {
      value: "incidents",
      index: "03",
      label: "Sự Cố DB & Thiết Bị",
      caption: "Lịch sử Incident Service & Thông số mạng",
      icon: <Database className="size-4" />,
      badge: incidentsCount > 0 ? String(incidentsCount) : undefined,
      useAccent: false,
    },
  ];

  return (
    <section
      aria-label="Camera Live Studio Header"
      className={`relative overflow-hidden rounded-[30px] p-5 sm:p-7 transition-all duration-300 ${NM.chassis}`}
    >
      <div className="pointer-events-none absolute inset-x-10 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="relative space-y-6">
        {/* Layer 1: Breadcrumb + Identity (Left) & Model Pod + Actions (Right) */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <Link
              href="/cameras"
              title="Quay lại danh sách Camera"
              className={`mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-foreground hover:text-primary ${NM.tactileBtn}`}
            >
              <ArrowLeft className="size-5" />
            </Link>

            <div
              className={`relative hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl sm:flex ${NM.extruded}`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-md">
                <Camera className="size-5" />
              </div>
              <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-background shadow-sm">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isLiveRunning
                      ? "animate-pulse bg-accent shadow-[0_0_8px_hsl(var(--accent))]"
                      : engineOnline
                        ? "bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
                        : "bg-muted-foreground/50"
                  }`}
                />
              </span>
            </div>

            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-primary/15 px-2.5 py-0.5 font-mono text-xs font-extrabold text-primary">
                  {camera.code}
                </span>
                <h1 className="truncate text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                  {camera.name}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <Building2 className="size-3.5 text-primary" />
                  {siteName || camera.siteName || "Chưa gán công trường"}
                </span>
                {camera.zoneName && (
                  <span className="inline-flex items-center gap-1">
                    <Layers className="size-3.5 text-accent" />
                    {camera.zoneName}
                  </span>
                )}

                <span
                  className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-0.5 font-mono text-[11px] font-bold ${
                    isDbOnline ? "text-primary" : "text-muted-foreground"
                  } ${NM.recessed}`}
                >
                  DB: {camera.status}
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-0.5 font-mono text-[11px] font-bold ${
                    engineOnline ? "text-primary" : "text-accent"
                  } ${NM.recessed}`}
                >
                  <Terminal className="size-3 text-accent" />
                  {engineOnline ? "AI Engine Online" : "AI Engine Offline"}
                </span>
              </div>
            </div>
          </div>

          {/* Right cluster: Active Model Pod + Ping + Edit + Refresh */}
          <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
            <div className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 ${NM.extruded}`}>
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${NM.recessed}`}
              >
                <Server className="size-4 text-accent" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Model AI
                  </span>
                  <span className="rounded-full bg-accent/15 px-1.5 text-[10px] font-extrabold text-accent">
                    {models.length}
                  </span>
                </div>
                <div className="max-w-[140px] truncate text-sm font-extrabold text-foreground">
                  {activeModelName}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenPing}
              title="Kiểm tra kết nối mạng Camera (Ping)"
              className={`inline-flex h-12 items-center gap-2 rounded-2xl px-3.5 text-xs font-bold text-primary ${NM.tactileBtn}`}
            >
              <Activity className="size-4" />
              <span className="hidden sm:inline">Ping</span>
            </button>

            {canManage && (
              <button
                type="button"
                onClick={onOpenEdit}
                title="Chỉnh sửa thông tin Camera"
                className={`inline-flex h-12 items-center gap-2 rounded-2xl px-3.5 text-xs font-bold text-foreground hover:text-primary ${NM.tactileBtn}`}
              >
                <Edit2 className="size-4" />
                <span className="hidden sm:inline">Sửa</span>
              </button>
            )}

            <button
              type="button"
              onClick={onRefreshAll}
              disabled={isRefreshing}
              className={`group inline-flex h-12 shrink-0 items-center gap-2 rounded-2xl px-3.5 text-xs font-bold text-foreground disabled:opacity-60 ${NM.tactileBtn}`}
            >
              <RefreshCw
                className={`size-4 text-primary transition-transform duration-500 ${
                  isRefreshing ? "animate-spin" : "group-hover:rotate-90"
                }`}
              />
              <span className="hidden sm:inline">
                {isRefreshing ? "Đang tải" : "Làm mới"}
              </span>
            </button>
          </div>
        </div>

        {/* Recessed Warning when AI Engine Offline */}
        {!engineOnline && engineError && (
          <div className={`relative overflow-hidden rounded-2xl p-4 text-xs ${NM.recessed}`}>
            <div className="absolute inset-y-2.5 left-2 w-1 rounded-full bg-accent" />
            <div className="flex items-start gap-3 pl-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <AlertCircle className="size-4" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-foreground">
                  Chưa kết nối được tới <span className="text-accent">AI Live Engine</span>
                </p>
                <p className="text-muted-foreground">
                  Chi tiết: <span className="font-medium text-foreground">{engineError}</span>. Đảm bảo AI Service (<code className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary">AI_ENGINE_URL</code>) đang chạy để phát luồng MJPEG.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Layer 2: Recessed Mechanical Switch Track */}
        <div
          role="tablist"
          aria-label="Chuyển tab Camera Studio"
          className={`grid grid-cols-1 gap-3 rounded-[24px] p-2.5 md:grid-cols-3 ${NM.recessed}`}
        >
          {tabItems.map((tab) => {
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabChange(tab.value)}
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

