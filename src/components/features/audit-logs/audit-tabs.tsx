"use client";

import { FileText, Settings, ShieldAlert } from "lucide-react";
import { useLocale } from "@/providers/locale-provider";

export type AuditTabKey = "all" | "configChanges" | "incidentReviews";

export interface AuditTabsProps {
  activeTab: AuditTabKey;
  onTabChange: (tab: AuditTabKey) => void;
  totalCount: number;
  configChangesCount: number;
  incidentReviewsCount: number;
}

export function AuditTabs({
  activeTab,
  onTabChange,
  totalCount,
  configChangesCount,
  incidentReviewsCount,
}: AuditTabsProps) {
  const { t } = useLocale();

  const tabs: Array<{
    id: AuditTabKey;
    label: string;
    icon: typeof FileText;
    count?: number;
  }> = [
    {
      id: "all",
      label: t("audit.tabs.all"),
      icon: FileText,
      count: totalCount,
    },
    {
      id: "configChanges",
      label: t("audit.tabs.configChanges"),
      icon: Settings,
      count: configChangesCount,
    },
    {
      id: "incidentReviews",
      label: t("audit.tabs.incidentReviews"),
      icon: ShieldAlert,
      count: incidentReviewsCount,
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
                {tab.count.toLocaleString()}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
