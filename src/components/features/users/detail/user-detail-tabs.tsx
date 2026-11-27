"use client";

import { useMemo } from "react";
import {
  User,
  Building2,
  Laptop,
  Activity,
} from "lucide-react";
import { useLocale } from "@/providers/locale-provider";

export type UserDetailTabKey =
  | "overview"
  | "sites"
  | "sessions"
  | "audit";

export interface UserDetailTabsProps {
  activeTab: UserDetailTabKey;
  onTabChange: (tab: UserDetailTabKey) => void;
  sitesCount?: number;
  canReadSites?: boolean;
  canReadAudit?: boolean;
  className?: string;
}

export function UserDetailTabs({
  activeTab,
  onTabChange,
  sitesCount = 0,
  canReadSites = true,
  canReadAudit = true,
  className = "",
}: UserDetailTabsProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const tabs = useMemo(() => {
    const items: Array<{
      key: UserDetailTabKey;
      label: string;
      icon: typeof User;
      badge?: string;
      hidden?: boolean;
    }> = [
      {
        key: "overview",
        label: isVietnamese ? "Tổng quan hồ sơ" : "Profile Overview",
        icon: User,
      },
      {
        key: "sites",
        label: isVietnamese ? "Công trường được gán" : "Assigned Sites",
        icon: Building2,
        badge: sitesCount > 0 ? `${sitesCount}` : undefined,
        hidden: !canReadSites,
      },
      {
        key: "sessions",
        label: isVietnamese ? "Phiên & Thiết bị" : "Sessions & Devices",
        icon: Laptop,
      },
      {
        key: "audit",
        label: isVietnamese ? "Nhật ký kiểm toán" : "Audit Trail",
        icon: Activity,
        hidden: !canReadAudit,
      },
    ];

    return items.filter((item) => !item.hidden);
  }, [sitesCount, canReadSites, canReadAudit, isVietnamese]);

  return (
    <div
      className={[
        "flex items-center gap-1.5 p-1.5 rounded-2xl overflow-x-auto select-none",
        "border border-white/80 dark:border-white/5 bg-background dark:bg-card",
        "shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]",
        "dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.35),inset_-1px_-1px_3px_rgba(255,255,255,0.025)]",
        className,
      ].join(" ")}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={[
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer",
              isActive
                ? [
                    "border border-primary/30 bg-primary/10 text-primary",
                    "shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_rgba(255,255,255,0.9)]",
                    "dark:shadow-[2px_2px_5px_rgba(0,0,0,0.4),-1px_-1px_3px_rgba(255,255,255,0.02)]",
                  ].join(" ")
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
            ].join(" ")}
          >
            <Icon size={14} className={isActive ? "text-primary" : "text-muted-foreground"} />
            <span>{tab.label}</span>

            {tab.badge !== undefined && (
              <span
                className={[
                  "px-1.5 py-0.2 rounded-md font-mono text-[10px] font-bold",
                  isActive
                    ? "bg-primary/20 text-primary"
                    : "bg-muted/60 text-muted-foreground",
                ].join(" ")}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
