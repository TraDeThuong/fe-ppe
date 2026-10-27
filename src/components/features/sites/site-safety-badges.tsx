"use client";

import { AlertOctagon, Footprints, HardHat, Shield, Shirt } from "lucide-react";
import type { SiteSafetyConfigItem } from "@/types";

export interface SiteSafetyBadgesProps {
  config?: SiteSafetyConfigItem | null;
}

export function SiteSafetyBadges({ config }: SiteSafetyBadgesProps) {
  if (!config) {
    return (
      <span className="text-[11px] text-muted-foreground italic">
        Chưa thiết lập quy tắc PPE
      </span>
    );
  }

  const items = [
    { label: "Mũ bảo hộ", active: config.enableNoHelmet, icon: HardHat },
    { label: "Áo phản quang", active: config.enableNoVest, icon: Shirt },
    { label: "Vùng cấm", active: config.enableRestrictedArea, icon: AlertOctagon },
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
