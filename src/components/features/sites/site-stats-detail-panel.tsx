"use client";
import { Table, TableToolbar, TableContent, TablePagination, TableRefresh } from "@/components/ui/table";

import { useMemo, useState } from "react";
import {
  AlertOctagon,
  Building2,
  Calculator,
  Camera,
  ChevronRight,
  HardHat,
  Layers,
  Loader2,
  Plus,
  Shield,
  ShieldCheck,
  Shirt,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/providers/locale-provider";
import { useAllRestrictedAreas, useAllZones } from "@/hooks/sites";
import type { SiteItem } from "@/types";

export type SiteStatKey = "totalSites" | "totalZones" | "restrictedAreas" | "complianceRate";

export interface SiteStatsDetailPanelProps {
  activeStat: SiteStatKey;
  sites: SiteItem[];
  onClose: () => void;
  onManageZones?: (site: SiteItem) => void;
  onSafetyConfig?: (site: SiteItem) => void;
  onCreateSite?: () => void;
  complianceRate?: number;
  totalViolations?: number;
}

export function SiteStatsDetailPanel({
  activeStat,
  sites,
  onClose,
  onManageZones,
  onSafetyConfig,
  onCreateSite,
  complianceRate = 100,
  totalViolations = 0,
}: SiteStatsDetailPanelProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  // Selected filters
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>("ALL");

  // Lazy queries when opening panel
  const isZonesActive = activeStat === "totalZones";
  const isRestrictedActive = activeStat === "restrictedAreas";

  const { data: fetchedZones = [], isLoading: isZonesLoading } = useAllZones(
    undefined,
    isZonesActive
  );

  const { data: fetchedRestricted = [], isLoading: isRestrictedLoading } =
    useAllRestrictedAreas(undefined, isRestrictedActive);

  // Map sites for fast lookup
  const sitesMap = useMemo(() => {
    return new Map<string, SiteItem>(sites.map((s) => [s.id, s]));
  }, [sites]);

  // Summary counts
  const totalSites = sites.length;
  const activeSites = sites.filter((s) => s.status === "ACTIVE").length;
  const inactiveSites = sites.filter((s) => s.status === "INACTIVE").length;
  const completedSites = sites.filter((s) => s.status === "COMPLETED").length;
  const archivedSites = sites.filter((s) => s.status === "ARCHIVED").length;

  const totalZones = sites.reduce(
    (acc, s) =>
      acc + (s.zoneCount ?? (s.zones ? s.zones.length : undefined) ?? s._count?.zones ?? 0),
    0
  );
  const totalRestricted = sites.reduce(
    (acc, s) =>
      acc +
      (s.restrictedAreaCount ??
        (s.restrictedAreas ? s.restrictedAreas.length : undefined) ??
        s._count?.restrictedAreas ??
        0),
    0
  );

  // Flattened zones (ưu tiên site.zones nếu có, fallback sang fetchedZones)
  const allZones = useMemo(() => {
    const embeddedZones = sites.flatMap((site) =>
      (site.zones || []).map((z) => ({
        ...z,
        siteName: site.name,
        siteCode: site.code,
        site,

      }))
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

      }))
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

  const computedTotalZones = Math.max(totalZones, allZones.length, fetchedZones.length);
  const computedTotalRestricted = Math.max(
    totalRestricted,
    allRestricted.length,
    fetchedRestricted.length
  );

  return (
    <div
      className={`relative overflow-hidden rounded-[24px] sm:rounded-[30px] border bg-background p-1.5 shadow-[10px_10px_24px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light)] transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${activeStat === "restrictedAreas"
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
          className={`pointer-events-none absolute inset-x-10 top-0 h-[2px] rounded-full bg-gradient-to-r from-transparent to-transparent ${activeStat === "restrictedAreas"
              ? "via-accent"
              : "via-primary"
            }`}
        />

        {/* 3. Dual Ambient Plasma Orbs */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute -left-14 -top-14 h-40 w-40 rounded-full blur-3xl ${activeStat === "restrictedAreas" ? "bg-accent/18" : "bg-primary/15"
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
              className={`flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl border shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)] ${activeStat === "restrictedAreas"
                  ? "border-accent/35 bg-gradient-to-br from-accent/20 to-primary/10 text-accent"
                  : "border-white/80 bg-gradient-to-br from-primary/15 to-accent/15 text-primary dark:border-white/10"
                }`}
            >
              {activeStat === "totalSites" && <Building2 className="h-4.5 w-4.5 sm:h-5 sm:w-5" strokeWidth={2.2} />}
              {activeStat === "totalZones" && <Layers className="h-4.5 w-4.5 sm:h-5 sm:w-5" strokeWidth={2.2} />}
              {activeStat === "restrictedAreas" && <AlertOctagon className="h-4.5 w-4.5 sm:h-5 sm:w-5" strokeWidth={2.2} />}
              {activeStat === "complianceRate" && <ShieldCheck className="h-4.5 w-4.5 sm:h-5 sm:w-5" strokeWidth={2.2} />}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black tracking-tight text-foreground truncate">
                  {activeStat === "totalSites" && t("sites.detail.totalSitesTitle")}
                  {activeStat === "totalZones" && t("sites.detail.totalZonesTitle")}
                  {activeStat === "restrictedAreas" && t("sites.detail.restrictedTitle")}
                  {activeStat === "complianceRate" && t("sites.detail.complianceTitle")}
                </h3>

                {/* Recessed Digital Counter Pill */}
                <span
                  className={`inline-flex items-center rounded-full bg-background px-2.5 py-0.5 font-mono text-[11px] font-black tabular-nums shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] ${activeStat === "restrictedAreas" ? "text-accent" : "text-primary"
                    }`}
                >
                  {activeStat === "totalSites" && `${totalSites}`}
                  {activeStat === "totalZones" && `${computedTotalZones}`}
                  {activeStat === "restrictedAreas" && `${computedTotalRestricted}`}
                  {activeStat === "complianceRate" && `${complianceRate.toFixed(1)}%`}
                </span>
              </div>

              <p className="mt-0.5 text-[11px] sm:text-xs font-medium text-muted-foreground truncate hidden sm:block">
                {activeStat === "totalSites" && t("sites.detail.totalSitesDesc")}
                {activeStat === "totalZones" && t("sites.detail.totalZonesDesc")}
                {activeStat === "restrictedAreas" && t("sites.detail.restrictedDesc")}
                {activeStat === "complianceRate" && t("sites.detail.complianceDesc")}
              </p>
            </div>
          </div>

          {/* Tactile Action Controls & Close */}
          <div className="flex items-center gap-2 shrink-0">
            {activeStat === "totalSites" && onCreateSite && (
              <button
                type="button"
                onClick={onCreateSite}
                className="inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-full border border-primary/30 bg-background px-3.5 text-[11px] sm:text-xs font-extrabold text-primary shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] transition-all hover:-translate-y-0.5 hover:border-transparent hover:bg-gradient-to-r hover:from-primary hover:to-accent hover:text-primary-foreground hover:shadow-[0_4px_14px_hsl(var(--primary)/0.35)] cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("sites.detail.createSiteBtn")}</span>
              </button>
            )}

            {activeStat === "totalZones" && sites[0] && onManageZones && (
              <button
                type="button"
                onClick={() => onManageZones(sites[0])}
                className="inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-full border border-primary/30 bg-background px-3.5 text-[11px] sm:text-xs font-extrabold text-primary shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] transition-all hover:-translate-y-0.5 hover:border-transparent hover:bg-gradient-to-r hover:from-primary hover:to-accent hover:text-primary-foreground hover:shadow-[0_4px_14px_hsl(var(--primary)/0.35)] cursor-pointer"
              >
                <Layers className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("sites.detail.manageZonesBtn")}</span>
              </button>
            )}

            {activeStat === "restrictedAreas" && sites[0] && onManageZones && (
              <button
                type="button"
                onClick={() => onManageZones(sites[0])}
                className="inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-full border border-accent/35 bg-background px-3.5 text-[11px] sm:text-xs font-extrabold text-accent shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] transition-all hover:-translate-y-0.5 hover:bg-accent hover:text-white hover:shadow-[0_4px_14px_hsl(var(--accent)/0.35)] cursor-pointer"
              >
                <AlertOctagon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("sites.zonesDrawer.tabRestricted")}</span>
              </button>
            )}

            {activeStat === "complianceRate" && sites[0] && onSafetyConfig && (
              <button
                type="button"
                onClick={() => onSafetyConfig(sites[0])}
                className="inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-full border border-primary/30 bg-background px-3.5 text-[11px] sm:text-xs font-extrabold text-primary shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] transition-all hover:-translate-y-0.5 hover:border-transparent hover:bg-gradient-to-r hover:from-primary hover:to-accent hover:text-primary-foreground hover:shadow-[0_4px_14px_hsl(var(--primary)/0.35)] cursor-pointer"
              >
                <Shield className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("sites.detail.safetyRulesBtn")}</span>
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

        {/* ── 1. NỘI DUNG: TỔNG QUAN CÔNG TRƯỜNG ──────────────────────────────────── */}
        {activeStat === "totalSites" && (
          <div className="relative space-y-3">
            {/* Status Telemetry Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/50 bg-background/75 px-3.5 py-2 text-[11px] shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] dark:border-white/5">
              <span className="inline-flex items-center gap-2 font-semibold text-foreground/85">
                <span className="h-2 w-2 rounded-full bg-gradient-to-r from-primary to-accent" />
                {isVietnamese
                  ? `Hoạt động: ${activeSites} · Tạm dừng: ${inactiveSites} · Hoàn thành: ${completedSites} · Lưu trữ: ${archivedSites}`
                  : `Active: ${activeSites} · Inactive: ${inactiveSites} · Completed: ${completedSites} · Archived: ${archivedSites}`}
              </span>
              <span className="text-[10px] font-medium italic text-muted-foreground">
                {t("sites.detail.totalSitesDesc")}
              </span>
            </div>

            {/* DESKTOP / EMBEDDED TABLE DECK */}
            <div className="min-w-0 overflow-hidden rounded-[20px] border border-white/50 bg-background/60 p-1.5 shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)] dark:border-white/5">
              <Table
                surface="embedded"
                data={sites}
                columns={[
                  {
                    id: "name",
                    header: t("sites.table.name"),
                    accessorFn: (site) => site.name,
                    enableSorting: true,
                    cell: ({ row }) => {
                      const site = row.original;
                      return (
                        <div className="font-bold text-foreground">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
                              <Building2 className="h-3.5 w-3.5" />
                            </span>
                            <div>
                              <span className="font-bold text-foreground">{site.name}</span>
                              <span className="block font-mono text-[10px] font-semibold text-primary">
                                {site.code}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    },
                  },
                  {
                    id: "status",
                    header: t("sites.table.status"),
                    accessorFn: (site) => site.status,
                    enableSorting: true,
                    cell: ({ row }) => {
                      const site = row.original;
                      const isActive = site.status === "ACTIVE";
                      return (
                        <div>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${isActive
                                ? "bg-primary/10 text-primary border-primary/25 shadow-[0_0_8px_hsl(var(--primary)/0.12)]"
                                : "bg-muted/40 text-muted-foreground border-border/40"
                              }`}
                          >
                            {isActive && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
                            {isActive
                              ? t("sites.status.active")
                              : site.status === "INACTIVE"
                                ? t("sites.status.inactive")
                                : site.status === "COMPLETED"
                                  ? t("sites.status.completed")
                                  : site.status === "ARCHIVED"
                                    ? t("sites.status.archived")
                                    : t("sites.status.suspended")}
                          </span>
                        </div>
                      );
                    },
                  },
                  {
                    id: "address",
                    header: t("sites.table.address"),
                    accessorFn: (site) => site.address,
                    enableSorting: true,
                    cell: ({ row }) => {
                      const site = row.original;
                      return (
                        <div className="text-muted-foreground max-w-xs truncate">
                          {site.address || t("sites.card.noAddress")}
                        </div>
                      );
                    },
                  },
                  {
                    id: "zoneCount",
                    header: t("sites.table.zonesCount"),
                    accessorFn: (site) => site.zoneCount ?? site.zones?.length ?? site._count?.zones ?? 0,
                    enableSorting: true,
                    cell: ({ row }) => {
                      const site = row.original;
                      const zoneCount = site.zoneCount ?? site.zones?.length ?? site._count?.zones ?? 0;
                      return (
                        <div className="text-center">
                          <span className="inline-flex min-w-[2rem] items-center justify-center rounded-lg bg-background px-2 py-0.5 font-mono text-xs font-extrabold text-primary shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]">
                            {zoneCount}
                          </span>
                        </div>
                      );
                    },
                  },
                  {
                    id: "restrictedAreaCount",
                    header: t("sites.table.restrictedCount"),
                    accessorFn: (site) =>
                      site.restrictedAreaCount ??
                      site.restrictedAreas?.length ??
                      site._count?.restrictedAreas ??
                      0,
                    enableSorting: true,
                    cell: ({ row }) => {
                      const site = row.original;
                      const restrictedCount =
                        site.restrictedAreaCount ??
                        site.restrictedAreas?.length ??
                        site._count?.restrictedAreas ??
                        0;
                      return (
                        <div className="text-center">
                          <span className="inline-flex min-w-[2rem] items-center justify-center rounded-lg bg-background px-2 py-0.5 font-mono text-xs font-extrabold text-accent shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]">
                            {restrictedCount}
                          </span>
                        </div>
                      );
                    },
                  },
                  {
                    id: "actions",
                    header: t("sites.table.actions"),
                    enableSorting: false,
                    cell: ({ row }) => {
                      const site = row.original;
                      return (
                        <div className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {onManageZones && (
                              <button
                                type="button"
                                onClick={() => onManageZones(site)}
                                className="rounded-full border border-primary/25 bg-background px-2.5 py-1 text-[10px] font-extrabold text-primary shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)] transition-all hover:bg-primary hover:text-primary-foreground cursor-pointer"
                              >
                                {t("sites.card.zonesAndRestricted")}
                              </button>
                            )}
                            {onSafetyConfig && (
                              <button
                                type="button"
                                onClick={() => onSafetyConfig(site)}
                                className="rounded-full border border-accent/30 bg-background px-2.5 py-1 text-[10px] font-extrabold text-accent shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)] transition-all hover:bg-accent hover:text-white cursor-pointer"
                              >
                                PPE
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    },
                  },
                ]}
                loading={false}
                getRowId={(row) => row.id}
                features={{
                  globalFilter: false,
                  sorting: true,
                  rowSelection: false,
                  pagination: false,
                }}
              >
                <TableToolbar showSearch={false} actions={<TableRefresh />} />
                <TableContent />
                <TablePagination />
              </Table>
            </div>
          </div>
        )}

        {/* ── 2. NỘI DUNG: PHÂN BỔ PHÂN KHU (ZONES) ────────────────────────────────── */}
        {activeStat === "totalZones" && (
          <div className="relative space-y-3">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1 text-[11px] font-bold text-muted-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
                <Layers className="h-3.5 w-3.5 text-primary" />
                <span>
                  <strong className="font-mono text-foreground">{filteredZones.length}</strong>{" "}
                  {t("sites.units.zones")} ({sites.length}{" "}
                  {isVietnamese ? "công trường" : "sites"})
                </span>
              </span>

              <select
                value={selectedSiteFilter}
                onChange={(e) => setSelectedSiteFilter(e.target.value)}
                className="max-w-full rounded-full border border-white/60 bg-background px-3.5 py-1.5 text-xs font-bold text-foreground shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] focus:border-primary focus:outline-none dark:border-white/10"
              >
                <option value="ALL">{isVietnamese ? "Tất cả công trường" : "All sites"}</option>
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
                <span>{isVietnamese ? "Đang tải danh sách phân khu..." : "Loading zones..."}</span>
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
                              <span className="truncate max-w-[130px] font-medium">{zone.siteName}</span>
                            </div>
                          </div>
                        </div>

                        {onManageZones && (
                          <button
                            type="button"
                            onClick={() => onManageZones(zone.site)}
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

        {/* ── 3. NỘI DUNG: VÙNG CẤM NGUY HIỂM (RESTRICTED) ─────────────────────────── */}
        {activeStat === "restrictedAreas" && (
          <div className="relative space-y-3">
            {/* Site Filter */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1 text-[11px] font-bold text-muted-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
                <AlertOctagon className="h-3.5 w-3.5 text-accent" />
                <span>
                  <strong className="font-mono text-foreground">{filteredRestricted.length}</strong>{" "}
                  {isVietnamese ? "vùng cấm" : "restricted areas"}
                </span>
              </span>

              <select
                value={selectedSiteFilter}
                onChange={(e) => setSelectedSiteFilter(e.target.value)}
                className="rounded-full border border-white/60 bg-background px-3.5 py-1.5 text-xs font-bold text-foreground shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] focus:border-accent focus:outline-none dark:border-white/10"
              >
                <option value="ALL">{isVietnamese ? "Tất cả công trường" : "All sites"}</option>
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
                <span>{isVietnamese ? "Đang tải danh sách vùng cấm..." : "Loading restricted areas..."}</span>
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
                              <p className="text-xs font-extrabold text-foreground truncate">{area.name}</p>
                              <span className="shrink-0 rounded-md border border-accent/30 bg-accent/15 px-1.5 py-0.5 font-mono text-[9px] font-black text-accent uppercase">
                                {area.severity || "CRITICAL"}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[10px] font-medium text-muted-foreground line-clamp-1">
                              {area.description || area.siteName}
                            </p>
                          </div>
                        </div>

                        {onManageZones && (
                          <button
                            type="button"
                            onClick={() => onManageZones(area.site)}
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

        {/* ── 4. NỘI DUNG: QUY TẮC AN TOÀN & TUÂN THỦ PPE ──────────────────────────── */}
        {activeStat === "complianceRate" && (
          <div className="relative space-y-4">
            {/* Banner công thức tính toán Tỷ lệ Tuân thủ An toàn TB */}
            <div className="rounded-[22px] border border-primary/25 bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4 sm:p-5 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-[var(--shadow-dark)]/15 pb-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background text-primary shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
                    <Calculator className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-foreground">
                      {isVietnamese
                        ? "Công thức Tính Tỷ lệ Tuân thủ An toàn TB"
                        : "Average Safety Compliance Formula"}
                    </h4>
                    <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground">
                      {isVietnamese
                        ? "Chuẩn hóa theo báo cáo phân tích thời gian thực từ smart-ppe-reporting-service"
                        : "Standardized according to real-time analytics from smart-ppe-reporting-service"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto rounded-full border border-primary/25 bg-background px-3 py-1 shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {isVietnamese ? "Chỉ số hiện tại:" : "Current score:"}
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-black text-primary">
                    {complianceRate.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Recessed Formula Display Well */}
              <div className="flex flex-col items-center justify-center rounded-2xl border border-white/50 bg-background/90 py-3.5 px-3 sm:px-5 shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)] dark:border-white/5">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 text-xs sm:text-sm font-semibold text-foreground">
                  <span className="font-black text-primary">
                    {isVietnamese ? "Tỷ lệ tuân thủ (%)" : "Compliance Rate (%)"}
                  </span>
                  <span className="text-muted-foreground font-mono">=</span>
                  <span className="rounded-lg bg-background px-2 py-0.5 font-mono font-black shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)]">
                    100%
                  </span>
                  <span className="text-muted-foreground font-mono">−</span>
                  <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-xl bg-background border border-white/60 shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light)] dark:border-white/10">
                    <span className="text-muted-foreground font-mono text-lg sm:text-xl">(</span>
                    <div className="inline-flex flex-col items-center justify-center text-center px-1">
                      <span className="border-b border-foreground/40 px-2 pb-1 text-accent font-extrabold text-[11px] sm:text-xs">
                        {isVietnamese ? "Số vi phạm được xác nhận" : "Confirmed Violations"}
                      </span>
                      <span className="px-2 pt-1 text-primary font-extrabold text-[11px] sm:text-xs">
                        {isVietnamese ? "Tổng lượt người AI quét qua" : "Total Scanned Persons by AI"}
                      </span>
                    </div>
                    <span className="text-muted-foreground font-mono text-lg sm:text-xl">)</span>
                    <span className="font-mono text-xs sm:text-sm font-black text-foreground">× 100%</span>
                  </div>
                </div>

                {/* Giải thích chi tiết 2 đại lượng trong công thức */}
                <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full pt-3 border-t border-[var(--shadow-dark)]/15 text-[10px] sm:text-[11px] text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
                    <span className="leading-relaxed">
                      <strong className="text-foreground">
                        {isVietnamese ? "Số vi phạm được xác nhận:" : "Confirmed Violations:"}
                      </strong>{" "}
                      {isVietnamese
                        ? "Chuỗi vi phạm không đội mũ, không mặc áo, xâm nhập vùng cấm kéo dài liên tục ≥ 3s (đã qua bộ lọc thời gian và chống báo động lặp)."
                        : "Violations lasting ≥ 3s continuously (filtered through temporal confirmation and cooldown)."}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <span className="leading-relaxed">
                      <strong className="text-foreground">
                        {isVietnamese ? "Tổng lượt người AI quét qua:" : "Total Scanned Persons:"}
                      </strong>{" "}
                      {isVietnamese
                        ? "Tổng số lượt nhận diện công nhân hợp lệ trong ca làm việc đạt ngưỡng tin cậy mô hình YOLO (confidenceThreshold ≥ 80%)."
                        : "Total valid worker detections across all cameras reaching model confidence threshold ≥ 80%."}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section Sub-header */}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
              <span className="font-semibold">{t("sites.detail.complianceDesc")}</span>
              <span className="rounded-full bg-background px-2.5 py-0.5 font-mono text-[10px] font-bold text-primary shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)]">
                {sites.length} {isVietnamese ? "công trường áp dụng quy tắc" : "sites configured"}
              </span>
            </div>

            {/* Site Rules Grid inside Recessed Tray */}
            <div className="rounded-[20px] border border-white/40 bg-background/70 p-2.5 shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_var(--shadow-light)] dark:border-white/5">
              <div className="max-h-[280px] overflow-y-auto pr-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {sites.map((site) => {
                    const config = site.safetyConfigs?.[0];
                    const hasHelmet = config?.enableNoHelmet ?? true;
                    const hasVest = config?.enableNoVest ?? true;
                    const hasRestricted = config?.enableRestrictedArea ?? true;
                    const confidence = config?.confidenceThreshold
                      ? Math.round(config.confidenceThreshold * 100)
                      : 75;
                    const duration = config?.confirmationDuration ?? 3;

                    return (
                      <div
                        key={site.id}
                        className="rounded-2xl border border-white/75 bg-background p-3.5 shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)] space-y-2.5 transition-all hover:border-primary/35 dark:border-white/10"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-extrabold text-foreground truncate">{site.name}</p>
                            <span className="font-mono text-[10px] font-bold text-primary">{site.code}</span>
                          </div>

                          {onSafetyConfig && (
                            <button
                              type="button"
                              onClick={() => onSafetyConfig(site)}
                              className="shrink-0 rounded-full border border-primary/30 bg-background px-2.5 py-1 text-[10px] font-extrabold text-primary shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)] transition-all hover:bg-primary hover:text-primary-foreground cursor-pointer"
                            >
                              {t("sites.detail.safetyRulesBtn")}
                            </button>
                          )}
                        </div>

                        {/* PPE Rules Badges */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-bold border ${hasHelmet
                                ? "bg-primary/10 text-primary border-primary/25"
                                : "bg-muted/40 text-muted-foreground border-border/40 line-through"
                              }`}
                          >
                            <HardHat className="h-3 w-3" />
                            <span>{t("sites.safetyConfig.hardHat")}</span>
                          </span>

                          <span
                            className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-bold border ${hasVest
                                ? "bg-primary/10 text-primary border-primary/25"
                                : "bg-muted/40 text-muted-foreground border-border/40 line-through"
                              }`}
                          >
                            <Shirt className="h-3 w-3" />
                            <span>{t("sites.safetyConfig.vest")}</span>
                          </span>

                          <span
                            className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-bold border ${hasRestricted
                                ? "bg-accent/15 text-accent border-accent/25"
                                : "bg-muted/40 text-muted-foreground border-border/40 line-through"
                              }`}
                          >
                            <AlertOctagon className="h-3 w-3" />
                            <span>{t("sites.safetyConfig.restrictedArea")}</span>
                          </span>
                        </div>

                        {/* AI Confidence & Confirmation Duration */}
                        <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground border-t border-[var(--shadow-dark)]/15 pt-2">
                          <span>{t("sites.detail.aiDelay", { duration })}</span>
                          <span className="font-mono text-primary">
                            {t("sites.detail.aiConfidence", { rate: confidence })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
