"use client";

import { LayoutGrid, List, MonitorPlay, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";

export interface CameraToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  viewMode: "grid" | "table" | "wall";
  onViewModeChange: (mode: "grid" | "table" | "wall") => void;
  wallLayout: "1x1" | "2x2" | "3x3";
  onWallLayoutChange: (layout: "1x1" | "2x2" | "3x3") => void;
  onCreateCamera: () => void;
}

export function CameraToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  viewMode,
  onViewModeChange,
  wallLayout,
  onWallLayoutChange,
  onCreateCamera,
}: CameraToolbarProps) {
  const { t } = useLocale();

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      {/* Search and Filters */}
      <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("cameras.toolbar.searchPlaceholder")}
            className="w-full rounded-xl border border-border/40 bg-surface pl-10 pr-4 py-2 text-sm text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="rounded-xl border border-border/40 bg-surface px-3 py-2 text-sm text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]"
        >
          <option value="">{t("cameras.toolbar.allStatuses")}</option>
          <option value="ONLINE">{t("cameras.status.online")}</option>
          <option value="OFFLINE">{t("cameras.status.offline")}</option>
          <option value="CONNECTING">{t("cameras.status.connecting")}</option>
          <option value="MAINTENANCE">{t("cameras.status.maintenance")}</option>
        </select>
      </div>

      {/* View Mode & Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Wall Layout Toggle (only visible when in wall view) */}
        {viewMode === "wall" && (
          <div className="flex items-center gap-1 rounded-xl border border-border/40 bg-surface p-1 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.05)]">
            {(["1x1", "2x2", "3x3"] as const).map((layout) => (
              <button
                key={layout}
                type="button"
                onClick={() => onWallLayoutChange(layout)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
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
        <div className="flex items-center rounded-xl border border-border/40 bg-surface p-1 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.05)]">
          <button
            type="button"
            onClick={() => onViewModeChange("grid")}
            className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition ${
              viewMode === "grid"
                ? "bg-surface-elevated text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title={t("cameras.toolbar.viewGrid")}
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">{t("cameras.toolbar.viewGrid")}</span>
          </button>

          <button
            type="button"
            onClick={() => onViewModeChange("table")}
            className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition ${
              viewMode === "table"
                ? "bg-surface-elevated text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title={t("cameras.toolbar.viewTable")}
          >
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">{t("cameras.toolbar.viewTable")}</span>
          </button>

          <button
            type="button"
            onClick={() => onViewModeChange("wall")}
            className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition ${
              viewMode === "wall"
                ? "bg-surface-elevated text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title={t("cameras.toolbar.viewWall")}
          >
            <MonitorPlay className="h-4 w-4" />
            <span className="hidden sm:inline">{t("cameras.toolbar.viewWall")}</span>
          </button>
        </div>

        {/* Create Camera Button */}
        <Button
          variant="primary"
          onClick={onCreateCamera}
          className="flex items-center gap-2 rounded-xl"
        >
          <Plus className="h-4 w-4" />
          <span>{t("cameras.toolbar.createCamera")}</span>
        </Button>
      </div>
    </div>
  );
}
