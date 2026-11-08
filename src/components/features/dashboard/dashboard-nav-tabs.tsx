"use client";

import React, { useMemo } from "react";
import { LayoutDashboard, ShieldAlert, Cctv, Server } from "lucide-react";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "@/components/ui/segmented-control";
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

  const options = useMemo<SegmentedControlOption<DashboardTabKey>[]>(() => {
    const list: SegmentedControlOption<DashboardTabKey>[] = [
      {
        value: "overview",
        label: t("dashboard.tabs.overview"),
        icon: <LayoutDashboard className="size-4" />,
      },
    ];

    if (canViewSafety) {
      list.push({
        value: "safety",
        label: t("dashboard.tabs.safety"),
        icon: <ShieldAlert className="size-4" />,
        badge:
          typeof pendingCount === "number" && pendingCount > 0
            ? pendingCount
            : undefined,
        badgeColor:
          "bg-muted/70 text-foreground border border-border/40 dark:bg-white/[0.08] dark:border-white/[0.1]",
      });
    }

    if (canViewDevices) {
      list.push({
        value: "devices",
        label: t("dashboard.tabs.devices"),
        icon: <Cctv className="size-4" />,
        badge:
          typeof onlineCameras === "number" && typeof totalCameras === "number"
            ? `${onlineCameras}/${totalCameras}`
            : undefined,
        badgeColor:
          "bg-muted/70 text-foreground border border-border/40 dark:bg-white/[0.08] dark:border-white/[0.1]",
      });
    }

    if (canViewSystem) {
      list.push({
        value: "system",
        label: t("dashboard.tabs.system"),
        icon: <Server className="size-4" />,
        badge:
          typeof healthyServices === "number" && typeof totalServices === "number"
            ? `${healthyServices}/${totalServices}`
            : undefined,
        badgeColor:
          "bg-muted/70 text-foreground border border-border/40 dark:bg-white/[0.08] dark:border-white/[0.1]",
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

  return (
    <div className={`w-fit max-w-full ${className}`}>
      <SegmentedControl<DashboardTabKey>
        options={options}
        value={activeTab}
        onValueChange={onChangeTab}
        aria-label="Dashboard sub-navigation"
        size="md"
      />
    </div>
  );
}
