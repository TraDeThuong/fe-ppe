"use client";

import React from "react";
import {
  BarChart3,
  FilePlus2,
  FileText,
  LayoutTemplate,
  Plus,
  RefreshCw,
} from "lucide-react";
import { NM } from "@/components/features/ai-test/nm-styles";
import { useLocale } from "@/providers/locale-provider";

export type ReportsPageTab = "analytics" | "reports";

export interface ReportsHeaderProps {
  activeTab: ReportsPageTab;
  onTabChange: (tab: ReportsPageTab) => void;
  totalIncidents: number;
  complianceRate: number;
  totalReports: number;
  activeTemplates: number;
  isRefreshing: boolean;
  canExportReports: boolean;
  onRefreshAll: () => void;
  onGenerateReport: () => void;
  onCreateTemplate: () => void;
}

export function ReportsHeader({
  activeTab,
  onTabChange,
  totalIncidents,
  complianceRate,
  totalReports,
  activeTemplates,
  isRefreshing,
  canExportReports,
  onRefreshAll,
  onGenerateReport,
  onCreateTemplate,
}: ReportsHeaderProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const tabItems: {
    value: ReportsPageTab;
    index: string;
    label: string;
    caption: string;
    icon: React.ReactNode;
    badge?: string;
    useAccent?: boolean;
  }[] = [
    {
      value: "analytics",
      index: "01",
      label: t("reports.tabs.analyticsLabel"),
      caption: t("reports.tabs.analyticsCaption"),
      icon: <BarChart3 className="size-4" />,
      badge: `${totalIncidents} ${isVietnamese ? "sự cố" : "incidents"}`,
      useAccent: false,
    },
    {
      value: "reports",
      index: "02",
      label: t("reports.tabs.reportsLabel"),
      caption: t("reports.tabs.reportsCaption"),
      icon: <FileText className="size-4" />,
      badge: `${totalReports} ${isVietnamese ? "tài liệu" : "docs"}`,
      useAccent: true,
    },
  ];

  return (
    <section
      aria-label={t("reports.title")}
      className={`relative overflow-hidden rounded-[24px] p-4 sm:rounded-[30px] sm:p-6 lg:p-7 transition-all duration-300 ${NM.chassis}`}
    >
      <div className="pointer-events-none absolute inset-x-10 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="relative space-y-6">
        {/* Layer 1: Identity & Action Modules */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div
              className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${NM.extruded}`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-md">
                {activeTab === "analytics" ? (
                  <BarChart3 className="size-5" />
                ) : (
                  <FileText className="size-5" />
                )}
              </div>
              <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-background shadow-sm">
                <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                  {t("reports.title")}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                  Analytics & Reports
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 font-mono text-xs font-semibold text-primary ${NM.recessed}`}
                >
                  <BarChart3 className="size-3 text-primary" />
                  {complianceRate.toFixed(1)}% {isVietnamese ? "tuân thủ" : "compliance"}
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 font-mono text-xs font-semibold text-accent ${NM.recessed}`}
                >
                  <FileText className="size-3 text-accent" />
                  {totalReports} {isVietnamese ? "hồ sơ đã xuất" : "reports exported"}
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 font-mono text-xs font-semibold text-foreground/80 ${NM.recessed}`}
                >
                  <LayoutTemplate className="size-3 text-primary" />
                  {activeTemplates} {isVietnamese ? "mẫu khả dụng" : "active templates"}
                </span>
              </div>
            </div>
          </div>

          {/* Right cluster: Refresh + Create Template + Generate Report */}
          <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
            <button
              type="button"
              onClick={onRefreshAll}
              disabled={isRefreshing}
              className={`group inline-flex shrink-0 items-center gap-2.5 rounded-2xl px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs font-bold uppercase tracking-wider text-foreground disabled:opacity-60 ${NM.tactileBtn}`}
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
              <span className="text-left leading-tight">
                <span className="block">
                  {isRefreshing
                    ? isVietnamese
                      ? "Đang đồng bộ"
                      : "Syncing"
                    : t("common.refresh")}
                </span>
                <span className="mt-0.5 block text-[10px] font-medium normal-case tracking-normal text-muted-foreground">
                  {isVietnamese ? "Dữ liệu" : "Metrics"}
                </span>
              </span>
            </button>

            {canExportReports && activeTab === "reports" && (
              <button
                type="button"
                onClick={onCreateTemplate}
                className={`inline-flex h-11 sm:h-14 shrink-0 items-center gap-2 rounded-2xl px-4 text-xs font-bold uppercase tracking-wider text-primary ${NM.tactileBtn}`}
              >
                <Plus className="size-4" />
                <span>{isVietnamese ? "Tạo mẫu mới" : "New Template"}</span>
              </button>
            )}

            {canExportReports && (
              <button
                type="button"
                onClick={onGenerateReport}
                className="inline-flex h-11 sm:h-14 shrink-0 cursor-pointer items-center gap-2 rounded-2xl bg-primary px-4 sm:px-5 text-xs font-extrabold uppercase tracking-wider text-primary-foreground shadow-[6px_6px_14px_rgba(0,0,0,0.16),-4px_-4px_10px_rgba(255,255,255,0.7),inset_1px_1px_1px_rgba(255,255,255,0.35)] dark:shadow-[6px_6px_14px_rgba(0,0,0,0.5)] transition-all hover:brightness-105 active:scale-[0.98]"
              >
                <FilePlus2 className="size-4" />
                <span>{t("reports.toolbar.generateBtn")}</span>
              </button>
            )}
          </div>
        </div>

        {/* Layer 2: Recessed Mechanical Switch Track */}
        <div
          role="tablist"
          aria-label={isVietnamese ? "Chuyển giữa Thống kê và Báo cáo" : "Switch between Analytics and Reports"}
          className={`grid grid-cols-1 gap-3 rounded-[24px] p-2.5 md:grid-cols-2 ${NM.recessed}`}
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
                className={`group relative flex cursor-pointer items-center justify-between gap-2.5 sm:gap-3 rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3.5 text-left transition-all duration-300 ${
                  isActive
                    ? `${NM.extruded} scale-[1.005]`
                    : "text-muted-foreground hover:bg-primary/[0.03]"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5 sm:gap-3.5">
                  <div
                    className={`relative flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${
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
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span
                        className={`font-mono text-[10px] font-bold ${
                          isActive ? "text-primary" : "text-muted-foreground/60"
                        }`}
                      >
                        {tab.index}
                      </span>
                      <span
                        className={`truncate text-xs sm:text-sm font-bold ${
                          isActive
                            ? "text-foreground"
                            : "text-muted-foreground group-hover:text-foreground"
                        }`}
                      >
                        {tab.label}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[10px] sm:text-[11px] font-medium text-muted-foreground">
                      {tab.caption}
                    </p>
                  </div>
                </div>

                {tab.badge && (
                  <span
                    className={`shrink-0 rounded-full px-2 sm:px-2.5 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider ${
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
