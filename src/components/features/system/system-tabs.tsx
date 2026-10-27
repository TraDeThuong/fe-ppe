"use client";

import { Activity, Cpu, Info, Sliders } from "lucide-react";
import { useLocale } from "@/providers/locale-provider";

export type SystemTabKey = "flags" | "configs" | "health" | "platform";

export interface SystemTabsProps {
  activeTab: SystemTabKey;
  onTabChange: (tab: SystemTabKey) => void;
  flagsCount: number;
  configsCount: number;
}

export function SystemTabs({
  activeTab,
  onTabChange,
  flagsCount,
  configsCount,
}: SystemTabsProps) {
  const { t } = useLocale();

  const tabs: Array<{
    id: SystemTabKey;
    label: string;
    icon: typeof Cpu;
    count?: number;
  }> = [
    {
      id: "flags",
      label: t("system.tabs.featureFlags"),
      icon: Cpu,
      count: flagsCount,
    },
    {
      id: "configs",
      label: t("system.tabs.configs"),
      icon: Sliders,
      count: configsCount,
    },
    {
      id: "health",
      label: t("system.tabs.health"),
      icon: Activity,
    },
    {
      id: "platform",
      label: t("system.tabs.platform"),
      icon: Info,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border/40 pb-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
              isActive
                ? "bg-surface-elevated text-primary shadow-[inset_2px_2px_4px_rgba(0,0,0,0.15),inset_-2px_-2px_4px_rgba(255,255,255,0.05)] dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.4)]"
                : "text-muted-foreground hover:bg-surface-elevated/50 hover:text-foreground"
            }`}
          >
            <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
            <span>{tab.label}</span>
            {typeof tab.count === "number" && (
              <span
                className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "bg-surface text-muted-foreground"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
