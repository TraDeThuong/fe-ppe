"use client";

import { useMemo } from "react";
import { RotateCcw, Search, X } from "lucide-react";
import { NM } from "@/components/features/ai-test/nm-styles";
import { Input } from "@/components/ui/form";
import {
  Select,
  type SelectOption,
} from "@/components/ui/form/selection-controls/select";
import { useSitesCatalog, useSiteZones } from "@/hooks/sites";

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
  wallLayout: "1x1" | "2x2" | "3x3";
  onWallLayoutChange: (layout: "1x1" | "2x2" | "3x3") => void;
  totalCount?: number;
  filteredCount?: number;
  hasExtraFilter?: boolean;
  onResetAll?: () => void;
}

const STATUS_OPTIONS: SelectOption[] = [
  { value: "", label: "Tất cả trạng thái DB" },
  { value: "ONLINE", label: "ONLINE (Đang trực tuyến)" },
  { value: "OFFLINE", label: "OFFLINE (Mất tín hiệu)" },
  { value: "MAINTENANCE", label: "MAINTENANCE (Bảo trì)" },
];

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
  wallLayout,
  onWallLayoutChange,
  totalCount,
  filteredCount,
  hasExtraFilter = false,
  onResetAll,
}: CameraToolbarProps) {
  const { data: sitesData } = useSitesCatalog();
  const sites = useMemo(() => sitesData || [], [sitesData]);

  const { data: zonesData = [] } = useSiteZones(
    siteFilter,
    Boolean(siteFilter),
  );

  const siteOptions = useMemo<SelectOption[]>(
    () => [
      { value: "", label: "Tất cả Công trường" },
      ...sites.map((s) => ({
        value: s.id,
        label: s.name,
      })),
    ],
    [sites],
  );

  const zoneOptions = useMemo<SelectOption[]>(
    () => [
      { value: "", label: siteFilter ? "Tất cả Khu vực" : "Chọn công trường trước" },
      ...zonesData.map((z) => ({
        value: z.id,
        label: z.name,
      })),
    ],
    [siteFilter, zonesData],
  );

  const hasFilter = Boolean(
    search.trim() || statusFilter || siteFilter || zoneFilter || hasExtraFilter,
  );

  const handleClearFilters = () => {
    onSearchChange("");
    onStatusFilterChange("");
    onSiteFilterChange?.("");
    onZoneFilterChange?.("");
    onResetAll?.();
  };

  return (
    <section
      aria-label="Thanh lọc danh sách camera"
      className={`rounded-[26px] p-4 sm:p-5 ${NM.chassis}`}
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        {/* Search Input + Portal Select Filters */}
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              size="sm"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Tìm mã hoặc tên camera..."
              className="pl-10 pr-8"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                title="Xóa tìm kiếm"
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
            onValueChange={(val) => {
              onSiteFilterChange?.(val);
              onZoneFilterChange?.("");
            }}
            placeholder="Công trường"
          />

          <Select
            size="sm"
            options={zoneOptions}
            value={zoneFilter}
            disabled={!siteFilter}
            onValueChange={(val) => onZoneFilterChange?.(val)}
            placeholder="Khu vực (Zone)"
          />

          <Select
            size="sm"
            options={STATUS_OPTIONS}
            value={statusFilter}
            onValueChange={onStatusFilterChange}
            placeholder="Trạng thái DB"
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
                / {totalCount} camera
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
              <span>Đặt lại</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
