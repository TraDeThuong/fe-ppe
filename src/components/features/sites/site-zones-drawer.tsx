"use client";

import { useState } from "react";
import { AlertOctagon, Layers } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ZoneListPanel } from "./zone-list-panel";
import { RestrictedAreaPanel } from "./restricted-area-panel";
import { useLocale } from "@/providers/locale-provider";
import type { SiteItem } from "@/types";

export interface SiteZonesDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site: SiteItem | null;
}

export function SiteZonesDrawer({
  open,
  onOpenChange,
  site,
}: SiteZonesDrawerProps) {
  const { t } = useLocale();

  const [activeTab, setActiveTab] = useState<"zones" | "restricted">("zones");

  if (!site) return null;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("sites.zonesDrawer.title")}
      description={t("sites.zonesDrawer.subtitle", { name: site.name })}
      icon={<Layers className="h-5 w-5 text-primary" />}
      size="lg"
    >
      <div className="space-y-4">
        {/* Site Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 rounded-xl border border-border/40 bg-surface/60 p-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-primary">
              {site.code}
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-xs font-semibold text-foreground truncate">
              {site.name}
            </span>
          </div>
          {site.address && (
            <span className="text-[11px] text-muted-foreground line-clamp-1 sm:max-w-xs">
              {site.address}
            </span>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center rounded-xl border border-border/40 bg-surface p-1 shadow-nm-inset">
          <button
            type="button"
            onClick={() => setActiveTab("zones")}
            className={`flex flex-1 items-center justify-center gap-1.5 sm:gap-2 rounded-lg py-2 px-2 text-xs font-semibold transition ${
              activeTab === "zones"
                ? "bg-surface-elevated text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-4 w-4 shrink-0" />
            <span className="truncate">{t("sites.zonesDrawer.tabZones")}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("restricted")}
            className={`flex flex-1 items-center justify-center gap-1.5 sm:gap-2 rounded-lg py-2 px-2 text-xs font-semibold transition ${
              activeTab === "restricted"
                ? "bg-surface-elevated text-accent shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <AlertOctagon className="h-4 w-4 shrink-0 text-accent" />
            <span className="truncate">{t("sites.zonesDrawer.tabRestricted")}</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="pt-1">
          {activeTab === "zones" ? (
            <ZoneListPanel siteId={site.id} />
          ) : (
            <RestrictedAreaPanel siteId={site.id} />
          )}
        </div>

        <div className="flex justify-end pt-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
