"use client";

import React from "react";
import {
  Cpu,
  Film,
  Images,
  Radio,
  RefreshCw,
  Server,
  Terminal,
  AlertCircle,
  Layers,
} from "lucide-react";
import { NM } from "./nm-styles";
import { useLocale } from "@/providers/locale-provider";
import type { AiTestViewTab, ModelInfo } from "@/types/ai-test.types";

export interface AiTestHeaderProps {
  activeTab: AiTestViewTab;
  onTabChange: (tab: AiTestViewTab) => void;
  backendOnline: boolean;
  backendError: string | null;
  models: ModelInfo[];
  activeLiveCameraId: string | null;
  activeJobId: string | null;
  galleryCount: number;
  isRefreshing: boolean;
  onRefreshAll: () => void;
}

export function AiTestHeader({
  activeTab,
  onTabChange,
  backendOnline,
  backendError,
  models,
  activeLiveCameraId,
  activeJobId,
  galleryCount,
  isRefreshing,
  onRefreshAll,
}: AiTestHeaderProps) {
  const { t } = useLocale();
  const defaultModel = models.find((m) => m.is_default) ?? models[0];

  const tabItems: {
    value: AiTestViewTab;
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
      label: t("aiTest.header.tabs.live.label"),
      caption: t("aiTest.header.tabs.live.caption"),
      icon: <Radio className="size-4" />,
      badge: activeLiveCameraId ? t("aiTest.header.tabs.live.badgeOn") : undefined,
      useAccent: true,
    },
    {
      value: "player",
      index: "02",
      label: t("aiTest.header.tabs.player.label"),
      caption: t("aiTest.header.tabs.player.caption"),
      icon: <Film className="size-4" />,
      badge: activeJobId ? t("aiTest.header.tabs.player.badgeLoaded") : undefined,
      useAccent: false,
    },
    {
      value: "gallery",
      index: "03",
      label: t("aiTest.header.tabs.gallery.label"),
      caption: t("aiTest.header.tabs.gallery.caption"),
      icon: <Images className="size-4" />,
      badge: galleryCount > 0 ? String(galleryCount) : undefined,
      useAccent: true,
    },
  ];

  return (
    <section
      aria-label={t("aiTest.header.ariaLabel")}
      className={`relative overflow-hidden rounded-[30px] p-5 sm:p-7 transition-all duration-300 ${NM.chassis}`}
    >
      {/* Viền phản chiếu ánh sáng đỉnh khối */}
      <div className="pointer-events-none absolute inset-x-10 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="relative space-y-6">
        {/* =================================================================
            TẦNG 1: BRAND IDENTITY (TRÁI) & MODEL MODULE + REFRESH SWITCH (PHẢI)
           ================================================================= */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          {/* Cụm Nhận Diện Thương Hiệu & Endpoint */}
          <div className="flex items-start gap-4">
            {/* Khối Emblem Đúc Nổi 3D */}
            <div
              className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${NM.extruded}`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-md">
                <Cpu className="size-5" />
              </div>
              {/* Chấm LED trạng thái kết nối tinh tế ở góc icon */}
              <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-background shadow-sm">
                <span
                  className={`h-2 w-2 rounded-full ${
                    backendOnline
                      ? "bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
                      : "bg-accent/50"
                  }`}
                />
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                  {t("aiTest.header.title")}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                  <Layers className="size-3" />
                  {t("aiTest.header.consoleBadge")}
                </span>
              </div>

              {/* Trạng thái AI Engine */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{t("aiTest.header.connectionStatus")}</span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 font-mono text-xs font-semibold ${
                    backendOnline ? "text-primary" : "text-accent"
                  } ${NM.recessed}`}
                >
                  <Terminal className="size-3 text-accent" />
                  {backendOnline
                    ? t("aiTest.header.engineOnline")
                    : t("aiTest.header.engineOffline")}
                </span>
              </div>
            </div>
          </div>

          {/* Cụm Điều Khiển Bên Phải: Active Model Pod + Nút Làm Mới */}
          <div className="flex flex-wrap items-center gap-3.5 self-start lg:self-center">
            {/* Module Model AI Đúc Nổi */}
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
                      {t("aiTest.header.activeModel")}
                    </span>
                    <span className="rounded-full bg-accent/15 px-1.5 py-0.2 text-[10px] font-extrabold text-accent">
                      {models.length}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="truncate text-sm font-extrabold text-foreground">
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

            {/* Nút Làm Mới Trạng Thái dạng Công Tắc Vật Lý */}
            <button
              type="button"
              onClick={onRefreshAll}
              disabled={isRefreshing}
              className={`group inline-flex shrink-0 items-center gap-3 rounded-2xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-foreground disabled:opacity-60 cursor-pointer ${NM.tactileBtn}`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${NM.recessed}`}
              >
                <RefreshCw
                  className={`size-4 text-primary transition-transform duration-500 ${
                    isRefreshing ? "animate-spin" : "group-hover:rotate-90"
                  }`}
                />
              </span>
              <div className="text-left">
                <div className="leading-none">
                  {isRefreshing ? t("aiTest.header.syncing") : t("aiTest.header.refresh")}
                </div>
                <div className="mt-1 text-[10px] font-medium normal-case tracking-normal text-muted-foreground">
                  {t("aiTest.header.refreshSubtitle")}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* =================================================================
            KHAY CẢNH BÁO KHOÉT LÕM (CHỈ HIỆN KHI MẤT KẾT NỐI)
           ================================================================= */}
        {!backendOnline && backendError && (
          <div
            className={`relative overflow-hidden rounded-2xl p-4 text-xs ${NM.recessed}`}
          >
            <div className="absolute inset-y-2.5 left-2 w-1 rounded-full bg-accent" />
            <div className="flex items-start gap-3 pl-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <AlertCircle className="size-4" />
              </div>
              <div className="space-y-1.5">
                <p className="font-bold text-foreground">
                  {t("aiTest.header.offlineTitlePrefix")}{" "}
                  <span className="text-accent">AI Inference Engine</span>
                </p>
                <p className="leading-relaxed text-muted-foreground">
                  {t("aiTest.header.offlineDetailLabel")}{" "}
                  <span className="font-medium text-foreground">
                    {backendError}
                  </span>
                  {t("aiTest.header.offlineHintBefore")}{" "}
                  <code className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary">
                    AI_ENGINE_URL
                  </code>
                  {t("aiTest.header.offlineHintAfter")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================
            TẦNG 2: THANH CHUYỂN CHẾ ĐỘ CƠ HỌC (RECESSED MECHANICAL SWITCH TRACK)
           ================================================================= */}
        <div
          role="tablist"
          aria-label={t("aiTest.header.tabsAriaLabel")}
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
                className={`group relative flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left transition-all duration-300 cursor-pointer ${
                  isActive
                    ? `${NM.extruded} scale-[1.005]`
                    : "hover:bg-primary/[0.03] text-muted-foreground"
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Khối Icon Đúc Nổi */}
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

                  {/* Nhãn & Mô tả kỹ thuật */}
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
                        className={`truncate text-sm font-bold transition-colors ${
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

                {/* Badge trạng thái chỉ dùng Primary hoặc Accent */}
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

                {/* Thanh chỉ thị phát sáng dưới đáy nút đang chọn */}
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