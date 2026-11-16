"use client";

import React, { useMemo, useRef, type KeyboardEvent } from "react";
import { LayoutDashboard, ShieldAlert, Cctv, Server } from "lucide-react";
import { NM } from "@/components/features/ai-test/nm-styles";
import { useLocale } from "@/providers/locale-provider";

export type DashboardTabKey = "overview" | "safety" | "devices" | "system";

export interface DashboardNavTabsProps {
  activeTab: DashboardTabKey;
  onChangeTab: (tab: DashboardTabKey) => void;
  pendingCount?: number | null;
  onlineCameras?: number | null;
  totalCameras?: number | null;
  healthyServices?: number | null;
  totalServices?: number | null;
  canViewSafety?: boolean;
  canViewDevices?: boolean;
  canViewSystem?: boolean;
  className?: string;
}

interface DashboardTabItem {
  value: DashboardTabKey;
  index: string;
  label: string;
  caption: string;
  icon: React.ReactNode;
  badge?: string;
  useAccent?: boolean;
}

const GRID_COLUMNS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
};

export function DashboardNavTabs({
  activeTab,
  onChangeTab,
  pendingCount,
  onlineCameras,
  totalCameras,
  healthyServices,
  totalServices,
  canViewSafety = true,
  canViewDevices = true,
  canViewSystem = true,
  className = "",
}: DashboardNavTabsProps) {
  const { t } = useLocale();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const tabs = useMemo<DashboardTabItem[]>(() => {
    const list: DashboardTabItem[] = [
      {
        value: "overview",
        index: "01",
        label: t("dashboard.tabs.overview"),
        caption: t("dashboard.tabs.overviewDesc"),
        icon: <LayoutDashboard className="size-4" />,
        useAccent: false,
      },
    ];

    if (canViewSafety) {
      const hasPending = typeof pendingCount === "number" && pendingCount > 0;
      list.push({
        value: "safety",
        index: String(list.length + 1).padStart(2, "0"),
        label: t("dashboard.tabs.safety"),
        caption: t("dashboard.tabs.safetyDesc"),
        icon: <ShieldAlert className="size-4" />,
        badge: hasPending ? String(pendingCount) : undefined,
        useAccent: hasPending,
      });
    }

    if (canViewDevices) {
      list.push({
        value: "devices",
        index: String(list.length + 1).padStart(2, "0"),
        label: t("dashboard.tabs.devices"),
        caption: t("dashboard.tabs.devicesDesc"),
        icon: <Cctv className="size-4" />,
        badge:
          typeof onlineCameras === "number" && typeof totalCameras === "number"
            ? `${onlineCameras}/${totalCameras}`
            : undefined,
        useAccent: false,
      });
    }

    if (canViewSystem) {
      list.push({
        value: "system",
        index: String(list.length + 1).padStart(2, "0"),
        label: t("dashboard.tabs.system"),
        caption: t("dashboard.tabs.systemDesc"),
        icon: <Server className="size-4" />,
        badge:
          typeof healthyServices === "number" &&
          typeof totalServices === "number"
            ? `${healthyServices}/${totalServices}`
            : undefined,
        useAccent: false,
      });
    }

    return list;
  }, [
    t,
    canViewSafety,
    canViewDevices,
    canViewSystem,
    pendingCount,
    onlineCameras,
    totalCameras,
    healthyServices,
    totalServices,
  ]);

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (tabs.length <= 1) return;
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (index + 1) % tabs.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tabs.length - 1;
    }
    if (nextIndex === null) return;
    event.preventDefault();
    const target = tabs[nextIndex];
    if (target) {
      onChangeTab(target.value);
      tabRefs.current[nextIndex]?.focus();
    }
  };

  const gridColsClass = GRID_COLUMNS[tabs.length] ?? GRID_COLUMNS[4];

  return (
    <div
      role="tablist"
      aria-label="Dashboard sub-navigation"
      className={`grid w-full gap-2.5 rounded-[24px] p-2.5 ${gridColsClass} ${NM.recessed} ${className}`}
    >
      {tabs.map((tab, idx) => {
        const isActive = activeTab === tab.value;
        return (
          <button
            key={tab.value}
            ref={(node) => {
              tabRefs.current[idx] = node;
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChangeTab(tab.value)}
            onKeyDown={(event) => handleKeyDown(event, idx)}
            className={`group relative flex cursor-pointer items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
              isActive
                ? `${NM.extruded} scale-[1.005]`
                : "text-muted-foreground hover:bg-primary/[0.03]"
            }`}
          >
            <div className="flex min-w-0 items-center gap-3">
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
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-mono text-[10px] font-bold ${
                      isActive
                        ? tab.useAccent
                          ? "text-accent"
                          : "text-primary"
                        : "text-muted-foreground/60"
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
                className={`shrink-0 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-extrabold uppercase tracking-wider ${
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
  );
}
