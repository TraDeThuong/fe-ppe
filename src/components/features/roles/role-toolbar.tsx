"use client";

import { BookOpen, LayoutGrid, List, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";

export interface RoleToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  systemFilter: "all" | "system" | "custom";
  onSystemFilterChange: (value: "all" | "system" | "custom") => void;
  viewMode: "grid" | "table";
  onViewModeChange: (mode: "grid" | "table") => void;
  onCreateRole: () => void;
  onOpenGuide?: () => void;
}

export function RoleToolbar({
  search,
  onSearchChange,
  systemFilter,
  onSystemFilterChange,
  viewMode,
  onViewModeChange,
  onCreateRole,
  onOpenGuide,
}: RoleToolbarProps) {
  const { t } = useLocale();

  return (
    <div className="flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Hàng 1 trên Mobile: Tìm kiếm + Lọc loại vai trò */}
      <div className="flex flex-1 items-center gap-2">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("roles.searchPlaceholderMobile")}
            className="w-full rounded-xl border border-border/40 bg-surface pl-8.5 pr-3 py-1.5 sm:py-2 text-xs sm:text-sm text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]"
          />
        </div>

        {/* Filter select */}
        <select
          value={systemFilter}
          onChange={(e) =>
            onSystemFilterChange(e.target.value as "all" | "system" | "custom")
          }
          className="rounded-xl border border-border/40 bg-surface px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)] shrink-0"
        >
          <option value="all">{t("roles.filter.all")}</option>
          <option value="system">{t("roles.filter.system")}</option>
          <option value="custom">{t("roles.filter.custom")}</option>
        </select>
      </div>

      {/* Hàng 2 trên Mobile: View Mode + Cẩm nang + Tạo mới */}
      <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2">
        {/* View mode toggle */}
        <div className="flex items-center rounded-xl border border-border/40 bg-surface p-0.5 sm:p-1 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.05)] shrink-0">
          <button
            type="button"
            onClick={() => onViewModeChange("grid")}
            className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg transition ${
              viewMode === "grid"
                ? "bg-surface-elevated text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-label="Grid view"
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
            aria-label="Table view"
          >
            <List className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-1 sm:flex-initial justify-end">
          {/* Documentation Guide Button */}
          {onOpenGuide && (
            <Button
              type="button"
              variant="outline"
              onClick={onOpenGuide}
              className="flex items-center justify-center gap-1 sm:gap-1.5 rounded-xl border-primary/30 h-7 sm:h-8 text-[11px] sm:text-xs font-semibold text-primary hover:bg-primary/10 px-2 sm:px-3 flex-1 sm:flex-initial"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>{t("roles.guide.button")}</span>
            </Button>
          )}

          {/* Create Role Button */}
          <Button
            variant="primary"
            onClick={onCreateRole}
            className="flex items-center justify-center gap-1 sm:gap-1.5 rounded-xl h-7 sm:h-8 text-[11px] sm:text-xs px-2.5 sm:px-3 flex-1 sm:flex-initial"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("roles.create")}</span>
            <span className="sm:hidden">{t("roles.createShort")}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
