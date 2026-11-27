"use client";

import { useMemo, useState } from "react";
import {
  AlertOctagon,
  ChevronRight,
  Layers,
  Loader2,
  X,
} from "lucide-react";
import { useCan } from "@/hooks/use-can";
import { useLocale } from "@/providers/locale-provider";
import { useAllRestrictedAreas, useAllZones } from "@/hooks/sites";
import type { SiteItem } from "@/types";
import type { SiteZonesTab } from "./site-zones-drawer";

export type SiteStatKey = "totalZones" | "restrictedAreas";

export interface SiteStatsDetailPanelProps {
  activeStat: SiteStatKey;
  sites: SiteItem[];
  onClose: () => void;
  onManageZones?: (site: SiteItem, tab?: SiteZonesTab) => void;
}

export function SiteStatsDetailPanel({
  activeStat,
  sites,
  onClose,
  onManageZones,
}: SiteStatsDetailPanelProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const can = useCan();
  const canReadZones = can("PPE_ZONE_READ");
  const canReadRestricted = can("PPE_RESTRICTED_AREA_READ");

  // Selected filters
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>("ALL");

  // Lazy queries when opening panel (gated by RBAC)
  const isZonesActive = activeStat === "totalZones";
  const isRestrictedActive = activeStat === "restrictedAreas";

  const { data: fetchedZones = [], isLoading: isZonesLoading } = useAllZones(
    undefined,
    isZonesActive && canReadZones,
  );

  const { data: fetchedRestricted = [], isLoading: isRestrictedLoading } =
    useAllRestrictedAreas(undefined, isRestrictedActive && canReadRestricted);

  // Map sites for fast lookup
  const sitesMap = useMemo(() => {
    return new Map<string, SiteItem>(sites.map((s) => [s.id, s]));
  }, [sites]);

  // Nút ở đầu panel mở drawer của công trường đang lọc; khi xem "Tất cả" thì lấy công trường đầu tiên.
  const headerTargetSite = sitesMap.get(selectedSiteFilter) ?? sites[0];

  const totalZones = sites.reduce(
    (acc, s) =>
      acc +
      (s.zoneCount ??
        (s.zones ? s.zones.length : undefined) ??
        s._count?.zones ??
        0),
    0,
  );
  const totalRestricted = sites.reduce(
    (acc, s) =>
      acc +
      (s.restrictedAreaCount ??
        (s.restrictedAreas ? s.restrictedAreas.length : undefined) ??
        s._count?.restrictedAreas ??
        0),
    0,
  );

  // Flattened zones (ưu tiên site.zones nếu có, fallback sang fetchedZones)
  const allZones = useMemo(() => {
    const embeddedZones = sites.flatMap((site) =>
      (site.zones || []).map((z) => ({
        ...z,
        siteName: site.name,
        siteCode: site.code,
        site,
      })),
    );
    if (embeddedZones.length > 0) return embeddedZones;

    return fetchedZones.map((z) => {
      const parentSite = sitesMap.get(z.siteId) || (z.site as any) || {
        id: z.siteId,
        name: z.site?.name || t("sites.detail.site"),
        code: z.site?.code || "SITE",
        status: "ACTIVE",
        createdAt: z.createdAt,
        updatedAt: z.updatedAt,
      };
      return {
        ...z,
        siteName: z.site?.name || parentSite.name || "",
        siteCode: z.site?.code || parentSite.code || "",
        site: parentSite,
      };
    });
  }, [sites, fetchedZones, sitesMap, t]);

  const filteredZones = useMemo(() => {
    if (selectedSiteFilter === "ALL") return allZones;
    return allZones.filter((z) => z.siteId === selectedSiteFilter);
  }, [allZones, selectedSiteFilter]);

  // Flattened restricted areas (ưu tiên site.restrictedAreas nếu có, fallback sang fetchedRestricted)
  const allRestricted = useMemo(() => {
    const embeddedRestricted = sites.flatMap((site) =>
      (site.restrictedAreas || []).map((a) => ({
        ...a,
        siteName: site.name,
        siteCode: site.code,
        site,
      })),
    );
    if (embeddedRestricted.length > 0) return embeddedRestricted;

    return fetchedRestricted.map((a) => {
      const parentSite = sitesMap.get(a.siteId) || (a.site as any) || {
        id: a.siteId,
        name: a.site?.name || t("sites.detail.site"),
        code: a.site?.code || "SITE",
        status: "ACTIVE",
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      };
      return {
        ...a,
        zoneName: a.zone?.name || a.zoneName,
        siteName: a.site?.name || parentSite.name || "",
        siteCode: a.site?.code || parentSite.code || "",
        site: parentSite,
      };
    });
  }, [sites, fetchedRestricted, sitesMap, t]);

  const filteredRestricted = useMemo(() => {
    if (selectedSiteFilter === "ALL") return allRestricted;
    return allRestricted.filter((a) => a.siteId === selectedSiteFilter);
  }, [allRestricted, selectedSiteFilter]);

  const computedTotalZones = Math.max(
    totalZones,
    allZones.length,
    fetchedZones.length,
  );
  const computedTotalRestricted = Math.max(
    totalRestricted,
    allRestricted.length,
    fetchedRestricted.length,
  );

  return (
    <div
      className={`relative overflow-hidden rounded-[24px] sm:rounded-[30px] border bg-background p-1.5 shadow-[10px_10px_24px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light)] transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${
        activeStat === "restrictedAreas"
          ? "border-accent/40 dark:border-accent/30"
          : "border-white/80 dark:border-white/10"
      }`}
    >
      {/* INNER MACHINED BEZEL SHELL */}
      <div className="relative overflow-hidden rounded-[20px] sm:rounded-[25px] border border-[var(--shadow-dark)]/15 bg-background/95 p-4 sm:p-6">
        {/* 1. Tactical Micro-Grid Background */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.055] [background-image:radial-gradient(hsl(var(--primary))_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_at_top_left,black_30%,transparent_80%)]"
        />

        {/* 2. Top Specular Laser Rim (Primary <-> Accent) */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-10 top-0 h-[2px] rounded-full bg-gradient-to-r from-transparent to-transparent ${
            activeStat === "restrictedAreas" ? "via-accent" : "via-primary"
          }`}
        />

        {/* 3. Dual Ambient Plasma Orbs */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute -left-14 -top-14 h-40 w-40 rounded-full blur-3xl ${
            activeStat === "restrictedAreas" ? "bg-accent/18" : "bg-primary/15"
          }`}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-accent/15 blur-3xl"
        />

        {/* ================= HEADER TOOLBAR ================= */}
        <div className="relative mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--shadow-dark)]/20 pb-3.5">
          <div className="flex items-center gap-3 min-w-0">
            {/* Multi-tier Neumorphic Icon Pod */}
            <div
              className={`flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl border shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)] ${
                activeStat === "restrictedAreas"
                  ? "border-accent/35 bg-gradient-to-br from-accent/20 to-primary/10 text-accent"
                  : "border-white/80 bg-gradient-to-br from-primary/15 to-accent/15 text-primary dark:border-white/10"
              }`}
            >
              {activeStat === "totalZones" && (
                <Layers className="h-4.5 w-4.5 sm:h-5 sm:w-5" strokeWidth={2.2} />
              )}
              {activeStat === "restrictedAreas" && (
                <AlertOctagon
                  className="h-4.5 w-4.5 sm:h-5 sm:w-5"
                  strokeWidth={2.2}
                />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black tracking-tight text-foreground truncate">
                  {activeStat === "totalZones" &&
                    t("sites.detail.totalZonesTitle")}
                  {activeStat === "restrictedAreas" &&
                    t("sites.detail.restrictedTitle")}
                </h3>

                {/* Recessed Digital Counter Pill */}
                <span
                  className={`inline-flex items-center rounded-full bg-background px-2.5 py-0.5 font-mono text-[11px] font-black tabular-nums shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] ${
                    activeStat === "restrictedAreas"
                      ? "text-accent"
                      : "text-primary"
                  }`}
                >
                  {activeStat === "totalZones" && `${computedTotalZones}`}
                  {activeStat === "restrictedAreas" &&
                    `${computedTotalRestricted}`}
                </span>
              </div>

              <p className="mt-0.5 text-[11px] sm:text-xs font-medium text-muted-foreground truncate hidden sm:block">
                {activeStat === "totalZones" && t("sites.detail.totalZonesDesc")}
                {activeStat === "restrictedAreas" &&
                  t("sites.detail.restrictedDesc")}
              </p>
            </div>
          </div>

          {/* Tactile Action Controls & Close */}
          <div className="flex items-center gap-2 shrink-0">
            {activeStat === "totalZones" && canReadZones && headerTargetSite && onManageZones && (
              <button
                type="button"
                onClick={() => onManageZones(headerTargetSite, "zones")}
                className="inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-full border border-primary/30 bg-background px-3.5 text-[11px] sm:text-xs font-extrabold text-primary shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] transition-all hover:-translate-y-0.5 hover:border-transparent hover:bg-gradient-to-r hover:from-primary hover:to-accent hover:text-primary-foreground hover:shadow-[0_4px_14px_hsl(var(--primary)/0.35)] cursor-pointer"
              >
                <Layers className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {t("sites.detail.manageZonesBtn")}
                </span>
              </button>
            )}

            {activeStat === "restrictedAreas" && canReadRestricted && headerTargetSite && onManageZones && (
              <button
                type="button"
                onClick={() => onManageZones(headerTargetSite, "restricted")}
                className="inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-full border border-accent/35 bg-background px-3.5 text-[11px] sm:text-xs font-extrabold text-accent shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] transition-all hover:-translate-y-0.5 hover:bg-accent hover:text-white hover:shadow-[0_4px_14px_hsl(var(--accent)/0.35)] cursor-pointer"
              >
                <AlertOctagon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {t("sites.zonesDrawer.tabRestricted")}
                </span>
              </button>
            )}

            {/* Extruded Circular Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-white/75 bg-background text-muted-foreground shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] transition-all hover:scale-105 hover:text-foreground active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] cursor-pointer dark:border-white/10"
              aria-label={t("sites.detail.closeAria")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── 1. NỘI DUNG: PHÂN BỔ PHÂN KHU (ZONES) ────────────────────────────────── */}
        {activeStat === "totalZones" && (
          <div className="relative space-y-3">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1 text-[11px] font-bold text-muted-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
                <Layers className="h-3.5 w-3.5 text-primary" />
                <span>
                  <strong className="font-mono text-foreground">
                    {filteredZones.length}
                  </strong>{" "}
                  {t("sites.units.zones")} ({sites.length}{" "}
                  {isVietnamese ? "công trường" : "sites"})
                </span>
              </span>

              <select
                value={selectedSiteFilter}
                onChange={(e) => setSelectedSiteFilter(e.target.value)}
                className="max-w-full rounded-full border border-white/60 bg-background px-3.5 py-1.5 text-xs font-bold text-foreground shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] focus:border-primary focus:outline-none dark:border-white/10"
              >
                <option value="ALL">
                  {isVietnamese ? "Tất cả công trường" : "All sites"}
                </option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            {isZonesLoading ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/40 bg-background/70 p-8 text-xs font-semibold text-muted-foreground shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)]">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>
                  {isVietnamese
                    ? "Đang tải danh sách phân khu..."
                    : "Loading zones..."}
                </span>
              </div>
            ) : filteredZones.length === 0 ? (
              <div className="rounded-2xl border border-white/40 bg-background/70 p-6 text-center text-xs font-medium text-muted-foreground shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)]">
                {t("sites.detail.noZones")}
              </div>
            ) : (
              <div className="rounded-[20px] border border-white/40 bg-background/70 p-2.5 shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_var(--shadow-light)] dark:border-white/5">
                <div className="max-h-[280px] overflow-y-auto pr-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {filteredZones.map((zone) => (
                      <div
                        key={zone.id}
                        className="group/zone flex items-center justify-between rounded-2xl border border-white/75 bg-background p-3 shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 dark:border-white/10"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 text-primary shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]">
                            <Layers className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-extrabold text-foreground truncate group-hover/zone:text-primary transition-colors">
                              {zone.name}
                            </p>
                            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-primary font-bold">
                                {zone.code}
                              </span>
                              <span>•</span>
                              <span className="truncate max-w-[130px] font-medium">
                                {zone.siteName}
                              </span>
                            </div>
                          </div>
                        </div>

                        {canReadZones && onManageZones && (
                          <button
                            type="button"
                            onClick={() => onManageZones(zone.site, "zones")}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/60 bg-background text-muted-foreground shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] transition-all group-hover/zone:border-primary/30 group-hover/zone:text-primary cursor-pointer dark:border-white/10"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 2. NỘI DUNG: VÙNG CẤM NGUY HIỂM (RESTRICTED) ─────────────────────────── */}
        {activeStat === "restrictedAreas" && (
          <div className="relative space-y-3">
            {/* Site Filter */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1 text-[11px] font-bold text-muted-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
                <AlertOctagon className="h-3.5 w-3.5 text-accent" />
                <span>
                  <strong className="font-mono text-foreground">
                    {filteredRestricted.length}
                  </strong>{" "}
                  {isVietnamese ? "vùng cấm" : "restricted areas"}
                </span>
              </span>

              <select
                value={selectedSiteFilter}
                onChange={(e) => setSelectedSiteFilter(e.target.value)}
                className="rounded-full border border-white/60 bg-background px-3.5 py-1.5 text-xs font-bold text-foreground shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] focus:border-accent focus:outline-none dark:border-white/10"
              >
                <option value="ALL">
                  {isVietnamese ? "Tất cả công trường" : "All sites"}
                </option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {isRestrictedLoading ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/40 bg-background/70 p-8 text-xs font-semibold text-muted-foreground shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)]">
                <Loader2 className="h-4 w-4 animate-spin text-accent" />
                <span>
                  {isVietnamese
                    ? "Đang tải danh sách vùng cấm..."
                    : "Loading restricted areas..."}
                </span>
              </div>
            ) : filteredRestricted.length === 0 ? (
              <div className="rounded-2xl border border-white/40 bg-background/70 p-6 text-center text-xs font-medium text-muted-foreground shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)]">
                {t("sites.detail.noRestricted")}
              </div>
            ) : (
              <div className="rounded-[20px] border border-white/40 bg-background/70 p-2.5 shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_var(--shadow-light)] dark:border-white/5">
                <div className="max-h-[280px] overflow-y-auto pr-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {filteredRestricted.map((area) => (
                      <div
                        key={area.id}
                        className="group/area relative overflow-hidden flex items-center justify-between rounded-2xl border border-accent/25 bg-background p-3 shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)] transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50"
                      >
                        {/* Left Hazard Accent Strip */}
                        <div className="absolute bottom-2.5 left-0 top-2.5 w-1 rounded-r-full bg-accent" />

                        <div className="flex items-center gap-3 min-w-0 pl-1.5">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]">
                            <AlertOctagon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-extrabold text-foreground truncate">
                                {area.name}
                              </p>
                              <span className="shrink-0 rounded-md border border-accent/30 bg-accent/15 px-1.5 py-0.5 font-mono text-[9px] font-black text-accent uppercase">
                                {area.severity || "CRITICAL"}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[10px] font-medium text-muted-foreground line-clamp-1">
                              {area.description || area.siteName}
                            </p>
                          </div>
                        </div>

                        {canReadRestricted && onManageZones && (
                          <button
                            type="button"
                            onClick={() => onManageZones(area.site, "restricted")}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/60 bg-background text-muted-foreground shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] transition-all group-hover/area:border-accent/40 group-hover/area:text-accent cursor-pointer dark:border-white/10"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
