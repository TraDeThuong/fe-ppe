"use client";

import { useRouter } from "next/navigation";
import {
  AlertOctagon,
  Building2,
  Camera,
  Edit2,
  Layers,
  MapPin,
  Phone,
  Shield,
  Trash2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteSafetyBadges } from "./site-safety-badges";
import { useLocale } from "@/providers/locale-provider";
import type { SiteItem } from "@/types";

export interface SiteCardGridProps {
  sites: SiteItem[];
  onManageZones: (site: SiteItem) => void;
  onSafetyConfig: (site: SiteItem) => void;
  onEdit: (site: SiteItem) => void;
  onDelete: (site: SiteItem) => void;
  loading?: boolean;
}

export function SiteCardGrid({
  sites,
  onManageZones,
  onSafetyConfig,
  onEdit,
  onDelete,
  loading = false,
}: SiteCardGridProps) {
  const router = useRouter();
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-64 animate-pulse rounded-2xl bg-surface-elevated/40" />
        ))}
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="rounded-2xl border border-border/30 bg-surface p-12 text-center">
        <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">{t("sites.table.empty")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {sites.map((site) => {
        const isActive = site.status === "ACTIVE";
        const zoneCount =
          site.zoneCount ?? site.zones?.length ?? site._count?.zones ?? 0;
        const restrictedCount =
          site.restrictedAreaCount ??
          site.restrictedAreas?.length ??
          site._count?.restrictedAreas ??
          0;
        const safetyConfig = site.safetyConfigs?.[0] || null;

        return (
          <div
            key={site.id}
            onClick={() => router.push(`/sites/${site.id}`)}
            className="group flex flex-col justify-between cursor-pointer rounded-xl sm:rounded-2xl border border-border/40 bg-surface p-3.5 sm:p-5 shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] transition-all duration-300 hover:-translate-y-1 sm:hover:-translate-y-1.5 hover:shadow-[8px_14px_24px_rgba(0,0,0,0.1),-6px_-6px_14px_rgba(255,255,255,0.9)] dark:border-black/60 dark:bg-card/90 dark:shadow-[5px_5px_14px_rgba(0,0,0,0.55)] dark:hover:border-black dark:hover:bg-card dark:hover:shadow-[0_20px_36px_rgba(0,0,0,0.9),8px_12px_24px_rgba(0,0,0,0.85)]"
          >
            <div className="space-y-2.5 sm:space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                  <span className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-primary/10 text-primary shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)] dark:bg-primary/15 dark:shadow-[inset_1px_1px_2px_rgba(0,0,0,0.4)]">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
                      {site.name}
                    </h4>
                    <span className="font-mono text-[11px] sm:text-xs font-semibold text-primary">
                      {site.code}
                    </span>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold shrink-0 ${
                    isActive
                      ? "border-primary/30 bg-primary/10 text-primary dark:border-primary/25"
                      : "border-border/50 bg-background/60 text-muted-foreground dark:border-black/50 dark:bg-background/80"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isActive ? "bg-primary animate-pulse" : "bg-muted-foreground/60"
                    }`}
                  />
                  {isActive
                    ? t("sites.status.active")
                    : site.status === "INACTIVE"
                      ? t("sites.status.inactive")
                      : t("sites.status.suspended")}
                </span>
              </div>

              {/* Address */}
              <div className="flex items-start gap-1.5 text-[11px] sm:text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground/70" />
                <span className="line-clamp-2">
                  {site.address || t("sites.card.noAddress")}
                </span>
              </div>

              {/* Personnel / Contact info */}
              {site.contactOfficers && site.contactOfficers.length > 0 ? (
                <div className="space-y-1 text-[11px] sm:text-xs text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1 font-semibold text-foreground">
                      <User className="h-3 w-3 text-primary shrink-0" />
                      <span>{site.contactOfficers[0].name}</span>
                      {site.contactOfficers[0].roleTitle && (
                        <span className="text-[10px] text-primary/80 font-normal">
                          ({site.contactOfficers[0].roleTitle})
                        </span>
                      )}
                    </span>

                    {site.contactOfficers[0].phones && site.contactOfficers[0].phones.length > 0 && (
                      <span className="flex items-center gap-1 font-mono text-[10.5px]">
                        <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span>{site.contactOfficers[0].phones.join(", ")}</span>
                      </span>
                    )}

                    {site.contactOfficers.length > 1 && (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9.5px] font-bold text-primary">
                        +{site.contactOfficers.length - 1} {isVietnamese ? "cán bộ khác" : "more officers"}
                      </span>
                    )}
                  </div>
                </div>
              ) : (site.contactPerson || site.contactPhone) ? (
                <div className="flex flex-wrap items-center gap-2.5 text-[11px] sm:text-xs text-muted-foreground">
                  {site.contactPerson && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{site.contactPerson}</span>
                    </span>
                  )}
                  {site.contactPhone && (
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="h-3 w-3" />
                      <span>{site.contactPhone}</span>
                    </span>
                  )}
                </div>
              ) : null}

              {/* Spatial Stats Badges Bar */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 rounded-xl border border-border/30 bg-surface-elevated/40 p-2 sm:p-2.5 text-[11px] sm:text-xs dark:border-black/50 dark:bg-background/50">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  <span>
                    <strong className="text-foreground">{zoneCount}</strong>{" "}
                    {t("sites.units.zones").toLowerCase()}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-muted-foreground">
                  <AlertOctagon className="h-3.5 w-3.5 text-accent" />
                  <span>
                    <strong className="text-foreground">{restrictedCount}</strong>{" "}
                    {t("sites.units.restricted").toLowerCase()}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-muted-foreground">
                  <Camera className="h-3.5 w-3.5 text-primary/80" />
                  <span>
                    <strong className="text-foreground">{site.cameraCount || 0}</strong>{" "}
                    {t("sites.units.cameras").toLowerCase()}
                  </span>
                </div>
              </div>

              {/* PPE Safety Rules Badges */}
              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("sites.card.ppeStandard")}
                </span>
                <SiteSafetyBadges config={safetyConfig} />
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-between border-t border-border/30 dark:border-black/40 pt-2.5 sm:pt-3.5 mt-2.5 sm:mt-4 gap-1.5 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onManageZones(site);
                  }}
                  className="flex items-center gap-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs h-7 sm:h-8 px-2 sm:px-2.5 text-primary hover:text-primary dark:border-black/60 dark:hover:border-black"
                >
                  <Layers className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span>{t("sites.card.zonesAndRestricted")}</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSafetyConfig(site);
                  }}
                  className="flex items-center gap-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs h-7 sm:h-8 px-2 sm:px-2.5 text-muted-foreground hover:text-foreground dark:border-black/60 dark:hover:border-black"
                >
                  <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-accent" />
                  <span>{t("sites.card.ppeRules")}</span>
                </Button>
              </div>

              <div className="flex items-center gap-1 sm:gap-1.5 ml-auto">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(site);
                  }}
                  aria-label={`${t("sites.actions.edit")} ${site.name}`}
                  title={`${t("sites.actions.edit")} ${site.name}`}
                  className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg border border-border/40 text-muted-foreground transition hover:border-primary hover:text-primary dark:border-black/50 dark:hover:border-black dark:bg-background/40"
                >
                  <Edit2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(site);
                  }}
                  aria-label={`${t("sites.actions.delete")} ${site.name}`}
                  title={`${t("sites.actions.delete")} ${site.name}`}
                  className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg border border-border/40 text-muted-foreground transition hover:border-primary hover:text-primary dark:border-black/50 dark:hover:border-black dark:bg-background/40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
