"use client";

import { useMemo } from "react";
import { RotateCcw, Search, X } from "lucide-react";
import { NM } from "@/components/features/ai-test/nm-styles";
import { Input } from "@/components/ui/form";
import {
  Select,
  type SelectOption,
} from "@/components/ui/form/selection-controls/select";
import { useCan } from "@/hooks/use-can";
import { useSitesCatalog, useSiteZones } from "@/hooks/sites";
import { useLocale } from "@/providers/locale-provider";

export interface CameraToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  sourceTypeFilter?: string;
  onSourceTypeFilterChange?: (value: string) => void;
  siteFilter?: string;
  onSiteFilterChange?: (value: string) => void;
  zoneFilter?: string;
  onZoneFilterChange?: (value: string) => void;
  viewMode: "grid" | "table" | "wall";
  wallLayout: "1x1" | "2x2" | "3x3";
  onWallLayoutChange: (layout: "1x1" | "2x2" | "3x3") => void;
  totalCount?: number;
  filteredCount?: number;
  hasExtraFilter?: boolean;
  onResetAll?: () => void;
}

export function CameraToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sourceTypeFilter = "",
  onSourceTypeFilterChange,
  siteFilter = "",
  onSiteFilterChange,
  zoneFilter = "",
  onZoneFilterChange,
  viewMode,
  wallLayout,
  onWallLayoutChange,
  totalCount,
  filteredCount,
  hasExtraFilter = false,
  onResetAll,
}: CameraToolbarProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const can = useCan();
  const canReadSites = can("PPE_SITE_READ");
  const canReadZones = can("PPE_ZONE_READ");

  const statusOptions = useMemo<SelectOption[]>(
    () => [
      { value: "", label: isVietnamese ? "Tất cả trạng thái DB" : "All DB Statuses" },
      { value: "ONLINE", label: isVietnamese ? "ONLINE (Đang trực tuyến)" : "ONLINE (Connected)" },
      { value: "OFFLINE", label: isVietnamese ? "OFFLINE (Mất tín hiệu)" : "OFFLINE (No signal)" },
      { value: "MAINTENANCE", label: isVietnamese ? "MAINTENANCE (Bảo trì)" : "MAINTENANCE" },
      { value: "ERROR", label: isVietnamese ? "ERROR (Lỗi tín hiệu)" : "ERROR (Signal fault)" },
    ],
    [isVietnamese],
  );

  const { data: sitesData } = useSitesCatalog({ enabled: canReadSites });
  const sites = useMemo(() => sitesData || [], [sitesData]);

  const { data: zonesData = [] } = useSiteZones(
    siteFilter,
    Boolean(siteFilter) && canReadZones,
  );

  const siteOptions = useMemo<SelectOption[]>(
    () => [
      { value: "", label: isVietnamese ? "Tất cả Công trường" : "All Sites" },
      ...sites.map((s) => ({
        value: s.id,
        label: s.name,
      })),
    ],
    [isVietnamese, sites],
  );

  const zoneOptions = useMemo<SelectOption[]>(
    () => [
      {
        value: "",
        label: siteFilter
          ? isVietnamese
            ? "Tất cả Khu vực"
            : "All Zones"
          : isVietnamese
            ? "Chọn công trường trước"
            : "Select a site first",
      },
      ...zonesData.map((z) => ({
        value: z.id,
        label: z.name,
      })),
    ],
    [isVietnamese, siteFilter, zonesData],
  );

  const hasFilter = Boolean(
    search.trim() || statusFilter || sourceTypeFilter || siteFilter || zoneFilter || hasExtraFilter,
  );

  const handleClearFilters = () => {
    onSearchChange("");
    onStatusFilterChange("");
    onSourceTypeFilterChange?.("");
    onSiteFilterChange?.("");
    onZoneFilterChange?.("");
    onResetAll?.();
  };

  const sourceTypeOptions = useMemo<SelectOption[]>(
    () => [
      { value: "", label: isVietnamese ? "Tất cả nguồn" : "All Sources" },
      { value: "RTSP", label: "RTSP" },
      { value: "HLS", label: "HLS" },
      { value: "HTTP", label: "HTTP" },
      { value: "FILE", label: "FILE" },
    ],
    [isVietnamese],
  );

  return (
    <section
      aria-label={isVietnamese ? "Thanh lọc danh sách camera" : "Camera list filter toolbar"}
      className={`rounded-[26px] p-4 sm:p-5 ${NM.chassis}`}
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        {/* Search Input + Portal Select Filters */}
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              size="sm"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={isVietnamese ? "Tìm mã hoặc tên camera..." : "Search camera code or name..."}
              className="pl-10 pr-8"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                title={isVietnamese ? "Xóa tìm kiếm" : "Clear search"}
                aria-label={isVietnamese ? "Xóa tìm kiếm" : "Clear search"}
                className="absolute right-2.5 top-1/2 z-10 -translate-y-1/2 cursor-pointer rounded-md p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <Select
            size="sm"
            options={siteOptions}
            value={siteFilter}
            disabled={!canReadSites}
            onValueChange={(val) => {
              onSiteFilterChange?.(val);
              onZoneFilterChange?.("");
            }}
            placeholder={isVietnamese ? "Công trường" : "Site"}
          />

          <Select
            size="sm"
            options={zoneOptions}
            value={zoneFilter}
            disabled={!siteFilter || !canReadZones}
            onValueChange={(val) => onZoneFilterChange?.(val)}
            placeholder={isVietnamese ? "Khu vực (Zone)" : "Zone"}
          />

          <Select
            size="sm"
            options={statusOptions}
            value={statusFilter}
            onValueChange={onStatusFilterChange}
            placeholder={isVietnamese ? "Trạng thái DB" : "DB Status"}
          />

          <Select
            size="sm"
            options={sourceTypeOptions}
            value={sourceTypeFilter}
            onValueChange={(val) => onSourceTypeFilterChange?.(val)}
            placeholder={isVietnamese ? "Loại nguồn" : "Source Type"}
          />
        </div>

        {/* Right: Wall Layout Switch + Result Counter + Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 xl:justify-end">
          {viewMode === "wall" && (
            <div className={`flex items-center gap-1 rounded-xl p-1 ${NM.recessed}`}>
              {(["1x1", "2x2", "3x3"] as const).map((layout) => {
                const active = wallLayout === layout;
                return (
                  <button
                    key={layout}
                    type="button"
                    onClick={() => onWallLayoutChange(layout)}
                    className={`cursor-pointer rounded-lg px-2.5 py-1 font-mono text-[11px] font-extrabold transition-all ${
                      active
                        ? "bg-accent text-accent-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {layout}
                  </button>
                );
              })}
            </div>
          )}

          {typeof totalCount === "number" && (
            <span
              className={`rounded-xl px-3 py-1.5 font-mono text-xs font-bold text-foreground ${NM.recessed}`}
            >
              {filteredCount ?? totalCount}{" "}
              <span className="font-sans text-[11px] font-medium text-muted-foreground">
                / {totalCount} {isVietnamese ? "camera" : "cameras"}
              </span>
            </span>
          )}

          {hasFilter && (
            <button
              type="button"
              onClick={handleClearFilters}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-primary ${NM.tactileBtn}`}
            >
              <RotateCcw className="size-3.5" />
              <span>{isVietnamese ? "Đặt lại" : "Reset"}</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
