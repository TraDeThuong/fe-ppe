"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Camera,
  Layers,
  Shield,
  Users,
} from "lucide-react";
import { useLocale } from "@/providers/locale-provider";

export type SiteDetailTabKey =
  | "cameras"
  | "incidents"
  | "zones"
  | "safety-rules"
  | "analytics"
  | "personnel";

export interface SiteDetailTabsProps {
  activeTab: SiteDetailTabKey;
  onTabChange: (tab: SiteDetailTabKey) => void;
  cameraCount?: number;
  pendingIncidentsCount?: number;
  zoneCount?: number;
  officersCount?: number;
  className?: string;
}

interface TabItemConfig {
  key: SiteDetailTabKey;
  labelShort: string;
  labelFull: string;
  icon: typeof Camera;
  badge?: number;
  badgeTone?: "default" | "danger" | "primary";
}

export function SiteDetailTabs({
  activeTab,
  onTabChange,
  cameraCount = 0,
  pendingIncidentsCount = 0,
  zoneCount = 0,
  officersCount = 0,
  className = "",
}: SiteDetailTabsProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const tabs: TabItemConfig[] = useMemo(
    () => [
      {
        key: "cameras",
        labelShort: t("sites.detail.tabs.camerasShort"),
        labelFull: t("sites.detail.tabs.cameras"),
        icon: Camera,
        badge: cameraCount > 0 ? cameraCount : undefined,
        badgeTone: "primary",
      },
      {
        key: "incidents",
        labelShort: t("sites.detail.tabs.incidentsShort"),
        labelFull: t("sites.detail.tabs.incidents"),
        icon: AlertTriangle,
        badge: pendingIncidentsCount > 0 ? pendingIncidentsCount : undefined,
        badgeTone: "danger",
      },
      {
        key: "zones",
        labelShort: t("sites.detail.tabs.zonesShort"),
        labelFull: t("sites.detail.tabs.zones"),
        icon: Layers,
        badge: zoneCount > 0 ? zoneCount : undefined,
        badgeTone: "default",
      },
      {
        key: "safety-rules",
        labelShort: t("sites.detail.tabs.safetyRulesShort"),
        labelFull: t("sites.detail.tabs.safetyRules"),
        icon: Shield,
      },
      {
        key: "analytics",
        labelShort: t("sites.detail.tabs.analyticsShort"),
        labelFull: t("sites.detail.tabs.analytics"),
        icon: BarChart3,
      },
      {
        key: "personnel",
        labelShort: t("sites.detail.tabs.personnelShort"),
        labelFull: t("sites.detail.tabs.personnel"),
        icon: Users,
        badge: officersCount > 0 ? officersCount : undefined,
        badgeTone: "default",
      },
    ],
    [t, cameraCount, pendingIncidentsCount, zoneCount, officersCount]
  );

  // Check scroll overflows for fade indicator
  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [tabs]);

  // Scroll active tab into view smoothly
  useEffect(() => {
    if (activeTabRef.current && scrollContainerRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
      setTimeout(checkScroll, 300);
    }
  }, [activeTab]);

  return (
    <nav
      aria-label={
        isVietnamese
          ? "Thanh chuyển đổi chức năng công trường"
          : "Site management navigation tabs"
      }
      className={`relative ${className}`}
    >
      {/* Neumorphic Recessed Track */}
      <div
        className="
          relative rounded-2xl p-1 sm:p-1.5
          border border-white/70 bg-surface/90
          shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_rgba(255,255,255,0.75)]
          dark:border-white/5 dark:bg-card/80
          dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.35),inset_-1px_-1px_4px_rgba(255,255,255,0.025)]
        "
      >
        {/* Scrollable buttons row */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="
            flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none scroll-smooth
            py-0.5 px-0.5
          "
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                ref={isSelected ? activeTabRef : undefined}
                role="tab"
                aria-selected={isSelected}
                onClick={() => onTabChange(tab.key)}
                className={`
                  group relative flex shrink-0 items-center gap-1.5 sm:gap-2
                  h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-xl
                  text-xs font-semibold select-none
                  transition-all duration-200 outline-none
                  ${
                    isSelected
                      ? "bg-card text-primary font-bold shadow-[var(--nm-raised-sm)] border border-border/50 dark:border-white/10"
                      : "border border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30 active:translate-y-px"
                  }
                  focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1
                `}
              >
                {/* Subtle top reflection when active */}
                {isSelected && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/10"
                  />
                )}

                {/* Tab Icon */}
                <Icon
                  className={`
                    size-3.5 sm:size-4 shrink-0 transition-transform duration-200
                    ${isSelected ? "text-primary scale-105" : "text-muted-foreground group-hover:text-foreground"}
                  `}
                />

                {/* Responsive Label: Short on xs, Full on sm+ */}
                <span className="sm:hidden tracking-tight">{tab.labelShort}</span>
                <span className="hidden sm:inline tracking-tight">{tab.labelFull}</span>

                {/* Badge Indicator */}
                {tab.badge !== undefined && (
                  <span
                    className={`
                      inline-flex items-center justify-center rounded-full px-1.5 py-0.5
                      text-[10px] font-mono font-bold leading-none tabular-nums
                      ${
                        tab.badgeTone === "danger"
                          ? "bg-danger/10 text-danger border border-danger/25"
                          : isSelected
                          ? "bg-primary/15 text-primary border border-primary/25"
                          : "bg-muted-foreground/15 text-muted-foreground group-hover:text-foreground"
                      }
                    `}
                  >
                    {tab.badge}
                  </span>
                )}

                {/* Active Underline Pill */}
                {isSelected && (
                  <span
                    aria-hidden="true"
                    className="
                      absolute bottom-0.5 left-1/2 -translate-x-1/2
                      h-[2.5px] w-5 rounded-full bg-primary
                      shadow-[0_0_8px_color-mix(in_srgb,var(--primary)_50%,transparent)]
                    "
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Left fade overflow indicator */}
        {canScrollLeft && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-1.5 left-1.5 w-6 rounded-l-xl bg-gradient-to-r from-surface to-transparent dark:from-card"
          />
        )}

        {/* Right fade overflow indicator */}
        {canScrollRight && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-1.5 right-1.5 w-6 rounded-r-xl bg-gradient-to-l from-surface to-transparent dark:from-card"
          />
        )}
      </div>
    </nav>
  );
}
