
"use client";

import {
  Activity,
  Building2,
  Layers,
  LayoutGrid,
  List,
  MonitorPlay,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSites, useSiteZones } from "@/hooks/sites";
import { useLocale } from "@/providers/locale-provider";

export interface CameraToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  siteFilter?: string;
  onSiteFilterChange?: (value: string) => void;
  zoneFilter?: string;
  onZoneFilterChange?: (value: string) => void;
  viewMode: "grid" | "table" | "wall";
  onViewModeChange: (mode: "grid" | "table" | "wall") => void;
  wallLayout: "1x1" | "2x2" | "3x3";
  onWallLayoutChange: (layout: "1x1" | "2x2" | "3x3") => void;
  onCreateCamera: () => void;
  totalCount?: number;
  filteredCount?: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function CameraToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  siteFilter = "",
  onSiteFilterChange,
  zoneFilter = "",
  onZoneFilterChange,
  viewMode,
  onViewModeChange,
  wallLayout,
  onWallLayoutChange,
  onCreateCamera,
  totalCount,
  filteredCount,
  onRefresh,
  isRefreshing = false,
}: CameraToolbarProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const { data: sitesData } = useSites();
  const sites = sitesData?.items || [];

  const { data: zonesData = [] } = useSiteZones(
    siteFilter,
    Boolean(siteFilter),
  );

  const hasFilter = Boolean(
    search.trim() || statusFilter || siteFilter || zoneFilter,
  );

  const handleClearFilters = () => {
    onSearchChange("");
    onStatusFilterChange("");
    if (onSiteFilterChange) onSiteFilterChange("");
    if (onZoneFilterChange) onZoneFilterChange("");
  };

  const selectClass =
    "h-10 w-full appearance-none rounded-xl border border-border/50 bg-background pl-9 pr-8 text-xs font-semibold text-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] transition-all hover:border-primary/30 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-white/10";

  const viewButtonClass = (active: boolean) =>
    [
      "flex h-9 items-center justify-center gap-1.5 rounded-lg px-3",
      "text-xs font-semibold transition-all duration-200",
      active
        ? "bg-background text-primary shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)]"
        : "text-muted-foreground hover:text-foreground",
    ].join(" ");

  return (
    <section className="relative w-full rounded-2xl border border-border/40 bg-surface/80 p-3 shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)] sm:p-4">
      {/* ================= TOP BAR ================= */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        {/* Search + Count */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="group relative min-w-0 flex-1 xl:max-w-[420px]">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />

            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t("cameras.toolbar.searchPlaceholder")}
              className="h-10 w-full rounded-xl border border-border/50 bg-background pl-10 pr-10 text-sm text-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] transition-all placeholder:text-muted-foreground/70 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-white/10"
            />

            {search && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                title={isVietnamese ? "Xóa tìm kiếm" : "Clear search"}
                className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Result Count */}
          {typeof filteredCount === "number" && (
            <div className="hidden h-10 shrink-0 items-center gap-2 rounded-xl border border-border/40 bg-background px-3 shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] sm:flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40" />
                <span className="relative h-2 w-2 rounded-full bg-primary" />
              </span>

              <span className="text-xs font-bold tabular-nums text-foreground">
                {hasFilter && typeof totalCount === "number"
                  ? `${filteredCount} / ${totalCount}`
                  : filteredCount}
              </span>

              <span className="text-[11px] font-medium text-muted-foreground">
                {isVietnamese ? "camera" : "units"}
              </span>
            </div>
          )}
        </div>

        {/* View Mode + Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Wall Layout */}
          {viewMode === "wall" && (
            <div className="flex h-10 items-center gap-1 rounded-xl bg-background p-1 shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
              {(["1x1", "2x2", "3x3"] as const).map((layout) => (
                <button
                  key={layout}
                  type="button"
                  onClick={() => onWallLayoutChange(layout)}
                  className={`h-8 rounded-lg px-3 text-xs font-bold transition-all ${
                    wallLayout === layout
                      ? "bg-surface-elevated text-primary shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {layout}
                </button>
              ))}
            </div>
          )}

          {/* View Switcher */}
          <div className="flex h-10 items-center gap-1 rounded-xl bg-background p-1 shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
            <button
              type="button"
              onClick={() => onViewModeChange("grid")}
              className={viewButtonClass(viewMode === "grid")}
              title={t("cameras.toolbar.viewGrid")}
              aria-label={t("cameras.toolbar.viewGrid")}
              aria-pressed={viewMode === "grid"}
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">
                {t("cameras.toolbar.viewGrid")}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onViewModeChange("table")}
              className={viewButtonClass(viewMode === "table")}
              title={t("cameras.toolbar.viewTable")}
              aria-label={t("cameras.toolbar.viewTable")}
              aria-pressed={viewMode === "table"}
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">
                {t("cameras.toolbar.viewTable")}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onViewModeChange("wall")}
              className={viewButtonClass(viewMode === "wall")}
              title={t("cameras.toolbar.viewWall")}
              aria-label={t("cameras.toolbar.viewWall")}
              aria-pressed={viewMode === "wall"}
            >
              <MonitorPlay className="h-4 w-4" />
              <span className="hidden sm:inline">
                {t("cameras.toolbar.viewWall")}
              </span>
            </button>
          </div>

          {/* Refresh */}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              title={isVietnamese ? "Làm mới dữ liệu" : "Refresh data"}
              aria-label={isVietnamese ? "Làm mới dữ liệu" : "Refresh data"}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-background text-muted-foreground shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light)] transition-all hover:-translate-y-0.5 hover:text-primary active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin text-primary" : ""}`}
              />
            </button>
          )}

          {/* Create Camera */}
          <Button
            variant="primary"
            onClick={onCreateCamera}
            className="h-10 shrink-0 gap-2 rounded-xl px-4 shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)] active:translate-y-0"
          >
            <Plus className="h-4 w-4" />
            <span className="text-xs font-bold">
              {t("cameras.toolbar.createCamera")}
            </span>
          </Button>
        </div>
      </div>

      {/* ================= FILTER BAR ================= */}
      <div className="mt-4 flex flex-col gap-3 border-t border-border/30 pt-3 sm:flex-row sm:items-center">
        {/* Filter Label */}
        <div className="flex shrink-0 items-center gap-2 text-muted-foreground">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-background shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)]">
            <Activity className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.12em]">
            {isVietnamese ? "Bộ lọc" : "Filters"}
          </span>
        </div>

        {/* Filters */}
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2 xl:flex xl:flex-wrap">
          {/* Site */}
          {sites.length > 0 && onSiteFilterChange && (
            <div className="relative min-w-0 xl:min-w-[175px] xl:max-w-[230px]">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />

              <select
                value={siteFilter}
                onChange={(e) => onSiteFilterChange(e.target.value)}
                className={selectClass}
              >
                <option value="">{t("cameras.toolbar.allSites")}</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name} ({site.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Zone */}
          {siteFilter && zonesData.length > 0 && onZoneFilterChange && (
            <div className="relative min-w-0 animate-in fade-in xl:min-w-[175px] xl:max-w-[230px]">
              <Layers className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-primary" />

              <select
                value={zoneFilter}
                onChange={(e) => onZoneFilterChange(e.target.value)}
                className={`${selectClass} border-primary/30`}
              >
                <option value="">
                  {isVietnamese
                    ? `Tất cả phân khu (${zonesData.length})`
                    : `All zones (${zonesData.length})`}
                </option>

                {zonesData.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name} ({zone.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status */}
          <div className="relative min-w-0 xl:min-w-[165px] xl:max-w-[190px]">
            <Activity className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />

            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className={selectClass}
            >
              <option value="">{t("cameras.toolbar.allStatuses")}</option>
              <option value="ONLINE">{t("cameras.status.online")}</option>
              <option value="OFFLINE">{t("cameras.status.offline")}</option>
              <option value="CONNECTING">
                {t("cameras.status.connecting")}
              </option>
              <option value="MAINTENANCE">
                {t("cameras.status.maintenance")}
              </option>
            </select>
          </div>
        </div>

        {/* Reset Filters */}
        <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
          {typeof filteredCount === "number" && (
            <span className="text-[11px] font-medium text-muted-foreground sm:hidden">
              {filteredCount}
              {typeof totalCount === "number" && hasFilter
                ? ` / ${totalCount}`
                : ""}{" "}
              {isVietnamese ? "camera" : "units"}
            </span>
          )}

          {hasFilter && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-primary transition-all hover:bg-primary/5 active:scale-[0.97]"
            >
              <X className="h-3.5 w-3.5" />
              {isVietnamese ? "Xóa bộ lọc" : "Clear filters"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
