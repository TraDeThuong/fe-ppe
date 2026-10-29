"use client";

import {
  Activity,
  Building2,
  Filter,
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

  // Lấy danh sách phân khu của site đang chọn để lọc phân tầng
  const { data: zonesData = [] } = useSiteZones(siteFilter, Boolean(siteFilter));

  const hasFilter = Boolean(search.trim() || statusFilter || siteFilter || zoneFilter);

  const handleClearFilters = () => {
    onSearchChange("");
    onStatusFilterChange("");
    if (onSiteFilterChange) onSiteFilterChange("");
    if (onZoneFilterChange) onZoneFilterChange("");
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-surface/80 p-3 sm:p-4 shadow-[3px_3px_8px_var(--shadow-dark),-3px_-3px_8px_var(--shadow-light)] dark:shadow-[3px_3px_8px_rgba(0,0,0,0.4)] backdrop-blur-sm lg:flex-row lg:items-center lg:justify-between">
      {/* Search and Filters */}
      <div className="flex flex-1 flex-wrap items-center gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("cameras.toolbar.searchPlaceholder")}
            className="w-full rounded-xl border border-border/50 bg-background pl-10 pr-9 py-2 text-xs sm:text-sm text-foreground shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)] focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all dark:border-white/10"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              title={isVietnamese ? "Xóa tìm kiếm" : "Clear search"}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Records Count Badge */}
        {typeof filteredCount === "number" && (
          <div className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-border/40 bg-surface-elevated/50 px-3 py-2 text-xs font-semibold text-muted-foreground shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span>
              {hasFilter && typeof totalCount === "number"
                ? `${filteredCount} / ${totalCount}`
                : `${filteredCount}`}{" "}
              {isVietnamese ? "camera" : "units"}
            </span>
          </div>
        )}

        {/* Site Filter Select */}
        {sites.length > 0 && onSiteFilterChange && (
          <div className="relative min-w-[150px]">
            <select
              value={siteFilter}
              onChange={(e) => onSiteFilterChange(e.target.value)}
              className="w-full appearance-none rounded-xl border border-border/50 bg-background pl-8 pr-8 py-2 text-xs sm:text-sm font-medium text-foreground shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)] focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all cursor-pointer dark:border-white/10"
            >
              <option value="">{t("cameras.toolbar.allSites")}</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name} ({site.code})
                </option>
              ))}
            </select>
            <Building2 className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
        )}

        {/* Cascading Zone Filter Select (khi đã chọn công trường) */}
        {siteFilter && zonesData.length > 0 && onZoneFilterChange && (
          <div className="relative min-w-[150px] animate-in fade-in">
            <select
              value={zoneFilter}
              onChange={(e) => onZoneFilterChange(e.target.value)}
              className="w-full appearance-none rounded-xl border border-primary/40 bg-background pl-8 pr-8 py-2 text-xs sm:text-sm font-medium text-foreground shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all cursor-pointer dark:border-primary/40"
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
            <Layers className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-primary" />
          </div>
        )}

        {/* Status Filter Select */}
        <div className="relative min-w-[140px]">
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="w-full appearance-none rounded-xl border border-border/50 bg-background pl-8 pr-8 py-2 text-xs sm:text-sm font-medium text-foreground shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)] focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all cursor-pointer dark:border-white/10"
          >
            <option value="">{t("cameras.toolbar.allStatuses")}</option>
            <option value="ONLINE">{t("cameras.status.online")}</option>
            <option value="OFFLINE">{t("cameras.status.offline")}</option>
            <option value="CONNECTING">{t("cameras.status.connecting")}</option>
            <option value="MAINTENANCE">{t("cameras.status.maintenance")}</option>
          </select>
          <Activity className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>

        {/* Clear Filter Button */}
        {hasFilter && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline px-2 py-1"
          >
            <X className="h-3 w-3" />
            <span>{isVietnamese ? "Bỏ lọc" : "Reset"}</span>
          </button>
        )}
      </div>

      {/* View Mode & Actions */}
      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t border-border/30 sm:border-t-0">
        {/* Wall Layout Toggle (only visible when in wall view) */}
        {viewMode === "wall" && (
          <div className="flex items-center gap-1 rounded-xl border border-border/50 bg-background p-1 shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark)]">
            {(["1x1", "2x2", "3x3"] as const).map((layout) => (
              <button
                key={layout}
                type="button"
                onClick={() => onWallLayoutChange(layout)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  wallLayout === layout
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {layout}
              </button>
            ))}
          </div>
        )}

        {/* View Mode Switcher */}
        <div className="flex items-center rounded-xl border border-border/50 bg-background p-1 shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark)]">
          <button
            type="button"
            onClick={() => onViewModeChange("grid")}
            className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-all ${
              viewMode === "grid"
                ? "bg-surface-elevated text-primary shadow-[1px_1px_3px_var(--shadow-dark),-1px_-1px_3px_var(--shadow-light)] font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title={t("cameras.toolbar.viewGrid")}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("cameras.toolbar.viewGrid")}</span>
          </button>

          <button
            type="button"
            onClick={() => onViewModeChange("table")}
            className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-all ${
              viewMode === "table"
                ? "bg-surface-elevated text-primary shadow-[1px_1px_3px_var(--shadow-dark),-1px_-1px_3px_var(--shadow-light)] font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title={t("cameras.toolbar.viewTable")}
          >
            <List className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("cameras.toolbar.viewTable")}</span>
          </button>

          <button
            type="button"
            onClick={() => onViewModeChange("wall")}
            className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-all ${
              viewMode === "wall"
                ? "bg-surface-elevated text-primary shadow-[1px_1px_3px_var(--shadow-dark),-1px_-1px_3px_var(--shadow-light)] font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title={t("cameras.toolbar.viewWall")}
          >
            <MonitorPlay className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("cameras.toolbar.viewWall")}</span>
          </button>
        </div>

        {/* Refresh Button */}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-background text-muted-foreground shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] transition-all hover:text-foreground hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40"
            title={isVietnamese ? "Làm mới dữ liệu" : "Refresh data"}
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin text-primary" : ""}`}
            />
          </button>
        )}

        {/* Create Camera Button */}
        <Button
          variant="primary"
          onClick={onCreateCamera}
          className="flex items-center gap-2 rounded-xl shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light)] hover:shadow-nm transition-all"
        >
          <Plus className="h-4 w-4" />
          <span className="font-semibold">{t("cameras.toolbar.createCamera")}</span>
        </Button>
      </div>
    </div>
  );
}
