"use client";

import { useMemo, useState } from "react";
import {
  AlertOctagon,
  Building2,
  Calculator,
  Camera,
  CheckCircle2,
  ChevronRight,
  HardHat,
  Layers,
  MapPin,
  Plus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Shirt,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/providers/locale-provider";
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
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");

  // Summary counts
  const totalSites = sites.length;
  const activeSites = sites.filter((s) => s.status === "ACTIVE").length;
  const inactiveSites = sites.filter((s) => s.status === "INACTIVE").length;
  const suspendedSites = sites.filter((s) => s.status === "SUSPENDED").length;

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

  // Flattened zones
  const allZones = useMemo(() => {
    return sites.flatMap((site) =>
      (site.zones || []).map((z) => ({
        ...z,
        siteName: site.name,
        siteCode: site.code,
        site,
      }))
    );
  }, [sites]);

  const filteredZones = useMemo(() => {
    if (selectedSiteFilter === "ALL") return allZones;
    return allZones.filter((z) => z.siteId === selectedSiteFilter);
  }, [allZones, selectedSiteFilter]);

  // Flattened restricted areas
  const allRestricted = useMemo(() => {
    return sites.flatMap((site) =>
      (site.restrictedAreas || []).map((a) => ({
        ...a,
        siteName: site.name,
        siteCode: site.code,
        site,
      }))
    );
  }, [sites]);

  const filteredRestricted = useMemo(() => {
    let result = allRestricted;
    if (selectedSiteFilter !== "ALL") {
      result = result.filter((a) => a.siteId === selectedSiteFilter);
    }
    if (selectedSeverity !== "ALL") {
      result = result.filter((a) => a.severity === selectedSeverity);
    }
    return result;
  }, [allRestricted, selectedSiteFilter, selectedSeverity]);

  return (
    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-white/60 bg-surface/95 p-3 sm:p-4.5 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)] transition-all duration-300 dark:border-white/10 dark:bg-card/95 animate-in fade-in slide-in-from-top-2">
      {/* Specular Rim Top Highlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 sm:inset-x-8 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent"
      />

      {/* Header Toolbar */}
      <div className="mb-2.5 sm:mb-3.5 flex items-center justify-between gap-2 border-b border-border/40 pb-2.5 sm:pb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-primary/10 text-primary shadow-[inset_1px_1px_2px_rgba(0,0,0,0.08)]">
            {activeStat === "totalSites" && <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            {activeStat === "totalZones" && <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            {activeStat === "restrictedAreas" && <AlertOctagon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent" />}
            {activeStat === "complianceRate" && <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">
                {activeStat === "totalSites" && t("sites.detail.totalSitesTitle")}
                {activeStat === "totalZones" && t("sites.detail.totalZonesTitle")}
                {activeStat === "restrictedAreas" && t("sites.detail.restrictedTitle")}
                {activeStat === "complianceRate" && t("sites.detail.complianceTitle")}
              </h3>

              <Badge variant="outline" size="sm" className="font-mono text-[10px] sm:text-[11px] text-foreground px-1.5 py-0">
                {activeStat === "totalSites" && `${totalSites}`}
                {activeStat === "totalZones" && `${totalZones}`}
                {activeStat === "restrictedAreas" && `${totalRestricted}`}
                {activeStat === "complianceRate" && `${complianceRate.toFixed(1)}%`}
              </Badge>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate hidden sm:block">
              {activeStat === "totalSites" && t("sites.detail.totalSitesDesc")}
              {activeStat === "totalZones" && t("sites.detail.totalZonesDesc")}
              {activeStat === "restrictedAreas" && t("sites.detail.restrictedDesc")}
              {activeStat === "complianceRate" && t("sites.detail.complianceDesc")}
            </p>
          </div>
        </div>

        {/* Action Controls & Close */}
        <div className="flex items-center gap-1.5 shrink-0">
          {activeStat === "totalSites" && onCreateSite && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCreateSite}
              className="h-7 sm:h-8 gap-1 text-[11px] sm:text-xs text-primary hover:text-primary px-2 sm:px-3"
            >
              <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">{t("sites.detail.createSiteBtn")}</span>
            </Button>
          )}

          {activeStat === "totalZones" && sites[0] && onManageZones && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onManageZones(sites[0])}
              className="h-7 sm:h-8 gap-1 text-[11px] sm:text-xs text-primary hover:text-primary px-2 sm:px-3"
            >
              <Layers className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">{t("sites.detail.manageZonesBtn")}</span>
            </Button>
          )}

          {activeStat === "restrictedAreas" && sites[0] && onManageZones && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onManageZones(sites[0])}
              className="h-7 sm:h-8 gap-1 text-[11px] sm:text-xs text-accent hover:text-accent px-2 sm:px-3"
            >
              <AlertOctagon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">{t("sites.zonesDrawer.tabRestricted")}</span>
            </Button>
          )}

          {activeStat === "complianceRate" && sites[0] && onSafetyConfig && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onSafetyConfig(sites[0])}
              className="h-7 sm:h-8 gap-1 text-[11px] sm:text-xs text-primary hover:text-primary px-2 sm:px-3"
            >
              <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">{t("sites.detail.safetyRulesBtn")}</span>
            </Button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg sm:rounded-xl border border-border/40 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
            aria-label={t("sites.detail.closeAria")}
          >
            <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>
      </div>

      {/* ── 1. NỘI DUNG: TỔNG QUAN CÔNG TRƯỜNG ──────────────────────────────────── */}
      {activeStat === "totalSites" && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground px-0.5">
            <span>
              {t("sites.detail.statusBreakdown", {
                active: activeSites,
                inactive: inactiveSites,
                suspended: suspendedSites,
              })}
            </span>
            <span className="text-[10px] italic">{t("sites.detail.totalSitesDesc")}</span>
          </div>

          {/* MOBILE VIEW */}
          <div className="block sm:hidden max-h-[260px] overflow-y-auto space-y-2 pr-0.5">
            {sites.map((site) => {
              const zoneCount = site.zoneCount ?? site.zones?.length ?? site._count?.zones ?? 0;
              const restrictedCount = site.restrictedAreaCount ?? site.restrictedAreas?.length ?? site._count?.restrictedAreas ?? 0;
              const isActive = site.status === "ACTIVE";

              return (
                <div
                  key={site.id}
                  className="rounded-xl border border-border/40 bg-background/60 p-2.5 shadow-[inset_1px_1px_2px_var(--shadow-dark)] space-y-1.5 dark:border-black/50 dark:bg-card/70"
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Building2 className="h-3 w-3 text-primary shrink-0" />
                      <span className="font-mono text-xs font-bold text-primary">{site.code}</span>
                      <span className="text-xs font-semibold text-foreground truncate">{site.name}</span>
                    </div>

                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold border shrink-0 ${
                        isActive
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-muted/40 text-muted-foreground border-border/40"
                      }`}
                    >
                      {isActive
                        ? t("sites.status.active")
                        : site.status === "INACTIVE"
                          ? t("sites.status.inactive")
                          : t("sites.status.suspended")}
                    </span>
                  </div>

                  {site.address && (
                    <p className="text-[11px] text-muted-foreground line-clamp-1">{site.address}</p>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/20 pt-1.5">
                    <div className="flex items-center gap-2">
                      <span>{zoneCount} {t("sites.units.zones")}</span>
                      <span>•</span>
                      <span className="text-accent">{restrictedCount} {t("sites.units.restricted")}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {onManageZones && (
                        <button
                          type="button"
                          onClick={() => onManageZones(site)}
                          className="text-primary font-semibold hover:underline"
                        >
                          {t("sites.units.zones")}
                        </button>
                      )}
                      {onSafetyConfig && (
                        <button
                          type="button"
                          onClick={() => onSafetyConfig(site)}
                          className="text-accent font-semibold hover:underline"
                        >
                          PPE
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* DESKTOP VIEW */}
          <div className="hidden sm:block max-h-[280px] overflow-y-auto rounded-xl border border-border/30 bg-background/50 shadow-[inset_1px_1px_3px_var(--shadow-dark)]">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-2.5 px-3.5">{t("sites.table.name")}</th>
                  <th className="py-2.5 px-3">{t("sites.table.status")}</th>
                  <th className="py-2.5 px-3">{t("sites.table.address")}</th>
                  <th className="py-2.5 px-3 text-center">{t("sites.table.zonesCount")}</th>
                  <th className="py-2.5 px-3 text-center">{t("sites.table.restrictedCount")}</th>
                  <th className="py-2.5 px-3 text-right">{t("sites.table.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {sites.map((site) => {
                  const zoneCount = site.zoneCount ?? site.zones?.length ?? site._count?.zones ?? 0;
                  const restrictedCount = site.restrictedAreaCount ?? site.restrictedAreas?.length ?? site._count?.restrictedAreas ?? 0;
                  const isActive = site.status === "ACTIVE";

                  return (
                    <tr key={site.id} className="transition-colors hover:bg-muted/30 group">
                      <td className="py-2.5 px-3.5 font-bold text-foreground">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                          <div>
                            <span className="font-semibold text-foreground">{site.name}</span>
                            <span className="block font-mono text-[10px] text-primary">{site.code}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                            isActive
                              ? "bg-primary/10 text-primary border-primary/20"
                              : "bg-muted/40 text-muted-foreground border-border/40"
                          }`}
                        >
                          {isActive
                            ? t("sites.status.active")
                            : site.status === "INACTIVE"
                              ? t("sites.status.inactive")
                              : t("sites.status.suspended")}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground max-w-xs truncate">
                        {site.address || t("sites.card.noAddress")}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-semibold">
                        {zoneCount}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-semibold text-accent">
                        {restrictedCount}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {onManageZones && (
                            <button
                              type="button"
                              onClick={() => onManageZones(site)}
                              className="text-[11px] font-semibold text-primary hover:underline"
                            >
                              {t("sites.card.zonesAndRestricted")}
                            </button>
                          )}
                          {onSafetyConfig && (
                            <button
                              type="button"
                              onClick={() => onSafetyConfig(site)}
                              className="text-[11px] font-semibold text-accent hover:underline"
                            >
                              PPE
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 2. NỘI DUNG: PHÂN BỔ PHÂN KHU (ZONES) ────────────────────────────────── */}
      {activeStat === "totalZones" && (
        <div className="space-y-2.5">
          {/* Site Filter selector */}
          <div className="flex items-center justify-between gap-2 px-0.5">
            <span className="text-[11px] text-muted-foreground">
              {filteredZones.length} {t("sites.units.zones")} ({sites.length} {t("sites.units.cameras") === "Camera" ? "công trường" : "sites"})
            </span>

            <select
              value={selectedSiteFilter}
              onChange={(e) => setSelectedSiteFilter(e.target.value)}
              className="rounded-lg border border-border/40 bg-background/80 px-2.5 py-1 text-xs text-foreground shadow-nm-inset focus:border-primary focus:outline-none"
            >
              <option value="ALL">{t("sites.toolbar.searchPlaceholder").slice(0, 16)}... (Tất cả)</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          {filteredZones.length === 0 ? (
            <div className="rounded-xl border border-border/30 bg-background/40 p-6 text-center text-xs text-muted-foreground">
              {t("sites.detail.noZones")}
            </div>
          ) : (
            <div className="max-h-[270px] overflow-y-auto space-y-2 pr-0.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredZones.map((zone) => (
                  <div
                    key={zone.id}
                    className="flex items-center justify-between rounded-xl border border-border/40 bg-background/60 p-2.5 shadow-[inset_1px_1px_2px_var(--shadow-dark)] dark:border-black/50 dark:bg-card/70"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Layers className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{zone.name}</p>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <span className="font-mono text-primary font-semibold">{zone.code}</span>
                          <span>•</span>
                          <span className="truncate max-w-[120px]">{zone.siteName}</span>
                        </div>
                      </div>
                    </div>

                    {onManageZones && (
                      <button
                        type="button"
                        onClick={() => onManageZones(zone.site)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-primary transition shrink-0"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 3. NỘI DUNG: VÙNG CẤM NGUY HIỂM (RESTRICTED) ─────────────────────────── */}
      {activeStat === "restrictedAreas" && (
        <div className="space-y-2.5">
          {/* Severity & Site Filter */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
            <div className="flex items-center gap-1.5">
              {["ALL", "CRITICAL", "HIGH", "MEDIUM"].map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSelectedSeverity(sev)}
                  className={`rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase transition ${
                    selectedSeverity === sev
                      ? "bg-accent text-white shadow-sm"
                      : "bg-surface-elevated text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {sev === "ALL" ? t("sites.detail.severityFilterAll") : sev}
                </button>
              ))}
            </div>

            <select
              value={selectedSiteFilter}
              onChange={(e) => setSelectedSiteFilter(e.target.value)}
              className="rounded-lg border border-border/40 bg-background/80 px-2.5 py-1 text-xs text-foreground shadow-nm-inset focus:border-primary focus:outline-none"
            >
              <option value="ALL">{isVietnamese ? "Tất cả công trường" : "All sites"}</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {filteredRestricted.length === 0 ? (
            <div className="rounded-xl border border-border/30 bg-background/40 p-6 text-center text-xs text-muted-foreground">
              {t("sites.detail.noRestricted")}
            </div>
          ) : (
            <div className="max-h-[270px] overflow-y-auto space-y-2 pr-0.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredRestricted.map((area) => (
                  <div
                    key={area.id}
                    className="flex items-center justify-between rounded-xl border border-border/40 bg-background/60 p-2.5 shadow-[inset_1px_1px_2px_var(--shadow-dark)] dark:border-black/50 dark:bg-card/70"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                        <AlertOctagon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-foreground truncate">{area.name}</p>
                          <span className="rounded bg-accent/15 px-1 py-0 font-mono text-[9px] font-bold text-accent uppercase">
                            {area.severity || "CRITICAL"}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-1">
                          {area.description || area.siteName}
                        </p>
                      </div>
                    </div>

                    {onManageZones && (
                      <button
                        type="button"
                        onClick={() => onManageZones(area.site)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-accent transition shrink-0"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 4. NỘI DUNG: QUY TẮC AN TOÀN & TUÂN THỦ PPE ──────────────────────────── */}
      {activeStat === "complianceRate" && (
        <div className="space-y-3.5">
          {/* Banner công thức tính toán Tỷ lệ Tuân thủ An toàn TB */}
          <div className="rounded-xl border border-primary/25 bg-primary/5 p-3.5 sm:p-4 shadow-[inset_1px_1px_2px_var(--shadow-dark)] space-y-3 dark:border-primary/20 dark:bg-primary/10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-primary/15 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Calculator className="h-4 w-4" />
                </span>
                <div>
                  <h4 className="text-xs font-bold text-foreground">
                    {isVietnamese
                      ? "Công thức Tính Tỷ lệ Tuân thủ An toàn TB"
                      : "Average Safety Compliance Formula"}
                  </h4>
                  <p className="text-[10px] text-muted-foreground">
                    {isVietnamese
                      ? "Chuẩn hóa theo báo cáo phân tích thời gian thực từ smart-ppe-reporting-service"
                      : "Standardized according to real-time analytics from smart-ppe-reporting-service"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">
                  {isVietnamese ? "Chỉ số hiện tại:" : "Current score:"}
                </span>
                <span className="font-mono text-xs sm:text-sm font-extrabold text-primary bg-primary/10 px-2.5 py-0.5 rounded-lg border border-primary/20 shadow-sm">
                  {complianceRate.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Trình bày công thức Toán học đẹp mắt & trực quan */}
            <div className="flex flex-col items-center justify-center rounded-lg bg-background/80 py-3 px-3 sm:px-4 border border-border/30 dark:bg-card/90 shadow-nm-inset">
              <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-foreground">
                <span className="font-bold text-primary">
                  {isVietnamese ? "Tỷ lệ tuân thủ (%)" : "Compliance Rate (%)"}
                </span>
                <span className="text-muted-foreground">=</span>
                <span className="font-mono font-bold">100%</span>
                <span className="text-muted-foreground">−</span>
                <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-1 rounded-md bg-muted/40 border border-border/40">
                  <span className="text-muted-foreground font-mono text-base sm:text-lg">(</span>
                  <div className="inline-flex flex-col items-center justify-center text-center px-1">
                    <span className="border-b border-foreground/60 px-1.5 pb-0.5 text-accent font-bold text-[11px] sm:text-xs">
                      {isVietnamese ? "Số vi phạm được xác nhận" : "Confirmed Violations"}
                    </span>
                    <span className="px-1.5 pt-0.5 text-primary font-bold text-[11px] sm:text-xs">
                      {isVietnamese ? "Tổng lượt người AI quét qua" : "Total Scanned Persons by AI"}
                    </span>
                  </div>
                  <span className="text-muted-foreground font-mono text-base sm:text-lg">)</span>
                  <span className="font-mono text-xs font-bold text-foreground">× 100%</span>
                </div>
              </div>

              {/* Giải thích chi tiết 2 đại lượng trong công thức */}
              <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full pt-2.5 border-t border-border/20 text-[10px] text-muted-foreground">
                <div className="flex items-start gap-1.5">
                  <span className="text-accent font-bold leading-tight">•</span>
                  <span>
                    <strong className="text-foreground">
                      {isVietnamese ? "Số vi phạm được xác nhận:" : "Confirmed Violations:"}
                    </strong>{" "}
                    {isVietnamese
                      ? "Chuỗi vi phạm không đội mũ, không mặc áo, xâm nhập vùng cấm kéo dài liên tục ≥ 3s (đã qua bộ lọc thời gian và chống báo động lặp)."
                      : "Violations lasting ≥ 3s continuously (filtered through temporal confirmation and cooldown)."}
                  </span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-primary font-bold leading-tight">•</span>
                  <span>
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

          <div className="flex items-center justify-between text-[11px] text-muted-foreground px-0.5">
            <span>{t("sites.detail.complianceDesc")}</span>
            <span className="text-[10px] font-mono text-primary font-medium">
              {sites.length} {isVietnamese ? "công trường áp dụng quy tắc" : "sites configured"}
            </span>
          </div>

          <div className="max-h-[270px] overflow-y-auto space-y-2 pr-0.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {sites.map((site) => {
                const config = site.safetyConfigs?.[0];
                const hasHelmet = config?.enableNoHelmet ?? true;
                const hasVest = config?.enableNoVest ?? true;
                const hasRestricted = config?.enableRestrictedArea ?? true;
                const confidence = config?.confidenceThreshold ? Math.round(config.confidenceThreshold * 100) : 75;
                const duration = config?.confirmationDuration ?? 3;

                return (
                  <div
                    key={site.id}
                    className="rounded-xl border border-border/40 bg-background/60 p-3 shadow-[inset_1px_1px_2px_var(--shadow-dark)] space-y-2 dark:border-black/50 dark:bg-card/70"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{site.name}</p>
                        <span className="font-mono text-[10px] text-primary">{site.code}</span>
                      </div>

                      {onSafetyConfig && (
                        <button
                          type="button"
                          onClick={() => onSafetyConfig(site)}
                          className="rounded-lg border border-primary/30 px-2 py-0.5 text-[10px] font-semibold text-primary hover:bg-primary/10 transition"
                        >
                          {t("sites.detail.safetyRulesBtn")}
                        </button>
                      )}
                    </div>

                    {/* PPE Rules Badges */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium border ${
                          hasHelmet
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-muted/40 text-muted-foreground border-border/40 line-through"
                        }`}
                      >
                        <HardHat className="h-3 w-3" />
                        <span>{t("sites.safetyConfig.hardHat")}</span>
                      </span>

                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium border ${
                          hasVest
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-muted/40 text-muted-foreground border-border/40 line-through"
                        }`}
                      >
                        <Shirt className="h-3 w-3" />
                        <span>{t("sites.safetyConfig.vest")}</span>
                      </span>

                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium border ${
                          hasRestricted
                            ? "bg-accent/15 text-accent border-accent/20"
                            : "bg-muted/40 text-muted-foreground border-border/40 line-through"
                        }`}
                      >
                        <AlertOctagon className="h-3 w-3" />
                        <span>{t("sites.safetyConfig.restrictedArea")}</span>
                      </span>
                    </div>

                    {/* AI Confidence & Confirmation Duration */}
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/20 pt-1.5">
                      <span>{t("sites.detail.aiDelay", { duration })}</span>
                      <span>{t("sites.detail.aiConfidence", { rate: confidence })}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
