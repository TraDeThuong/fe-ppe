"use client";

import { AlertOctagon, Footprints, HardHat, Shield, Shirt } from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import type { SiteSafetyConfigItem } from "@/types";

export interface SiteSafetyBadgesProps {
  config?: SiteSafetyConfigItem | null;
}

export function SiteSafetyBadges({ config }: SiteSafetyBadgesProps) {
  const { t } = useLocale();

  if (!config) {
    return (
      <span className="text-[11px] text-muted-foreground italic">
        {t("sites.badges.notConfigured")}
      </span>
    );
  }

  const items = [
    { label: t("sites.safetyConfig.hardHat"), active: config.enableNoHelmet, icon: HardHat },
    { label: t("sites.safetyConfig.vest"), active: config.enableNoVest, icon: Shirt },
    { label: t("sites.safetyConfig.restrictedArea"), active: config.enableRestrictedArea, icon: AlertOctagon },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.map((item, idx) => (
        <span
          key={idx}
          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold transition ${
            item.active
              ? "bg-primary/10 text-primary border border-primary/20"
              : "bg-muted/30 text-muted-foreground/60 line-through"
          }`}
        >
          <item.icon className="h-3 w-3" />
          <span>{item.label}</span>
        </span>
      ))}
    </div>
  );
}
