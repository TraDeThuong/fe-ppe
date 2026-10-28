"use client";

import { LayoutGrid, List, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";

export interface SiteToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  viewMode: "grid" | "table";
  onViewModeChange: (mode: "grid" | "table") => void;
  onCreateSite: () => void;
}

export function SiteToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  viewMode,
  onViewModeChange,
  onCreateSite,
}: SiteToolbarProps) {
  const { t } = useLocale();

  return (
    <div className="flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Row 1 on Mobile: Search + Status Filter */}
      <div className="flex flex-1 items-center gap-2">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("sites.toolbar.searchPlaceholder")}
            className="w-full rounded-xl border border-border/40 bg-surface pl-8.5 pr-3 py-1.5 sm:py-2 text-xs sm:text-sm text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="rounded-xl border border-border/40 bg-surface px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)] shrink-0"
        >
          <option value="">{t("sites.toolbar.allStatuses")}</option>
          <option value="ACTIVE">{t("sites.status.active")}</option>
          <option value="INACTIVE">{t("sites.status.inactive")}</option>
          <option value="SUSPENDED">{t("sites.status.suspended")}</option>
        </select>
      </div>

      {/* Row 2 on Mobile: View Mode + Action Button */}
      <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2">
        <div className="flex items-center rounded-xl border border-border/40 bg-surface p-0.5 sm:p-1 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.05)] shrink-0">
          <button
            type="button"
            onClick={() => onViewModeChange("grid")}
            className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg transition ${
              viewMode === "grid"
                ? "bg-surface-elevated text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title={t("sites.toolbar.viewGrid")}
          >
            <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>

          <button
            type="button"
            onClick={() => onViewModeChange("table")}
            className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg transition ${
              viewMode === "table"
                ? "bg-surface-elevated text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title={t("sites.toolbar.viewTable")}
          >
            <List className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>

        <Button
          variant="primary"
          onClick={onCreateSite}
          className="flex items-center justify-center gap-1 sm:gap-1.5 rounded-xl h-7 sm:h-8 text-[11px] sm:text-xs px-2.5 sm:px-3"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t("sites.toolbar.createSite")}</span>
          <span className="sm:hidden">{t("sites.toolbar.createSiteShort")}</span>
        </Button>
      </div>
    </div>
  );
}
