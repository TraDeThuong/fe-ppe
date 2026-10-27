"use client";

import { LayoutGrid, List, Plus, Search } from "lucide-react";
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
}

export function RoleToolbar({
  search,
  onSearchChange,
  systemFilter,
  onSystemFilterChange,
  viewMode,
  onViewModeChange,
  onCreateRole,
}: RoleToolbarProps) {
  const { t } = useLocale();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm theo tên vai trò, mã code..."
            className="w-full rounded-xl border border-border/40 bg-surface pl-10 pr-4 py-2 text-sm text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]"
          />
        </div>

        {/* Filter select */}
        <select
          value={systemFilter}
          onChange={(e) =>
            onSystemFilterChange(e.target.value as "all" | "system" | "custom")
          }
          className="rounded-xl border border-border/40 bg-surface px-3 py-2 text-sm text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]"
        >
          <option value="all">Tất cả vai trò</option>
          <option value="system">Vai trò Hệ thống</option>
          <option value="custom">Vai trò Tùy chỉnh</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        {/* View mode toggle */}
        <div className="flex items-center rounded-xl border border-border/40 bg-surface p-1 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.05)]">
          <button
            type="button"
            onClick={() => onViewModeChange("grid")}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
              viewMode === "grid"
                ? "bg-surface-elevated text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("table")}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
              viewMode === "table"
                ? "bg-surface-elevated text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-label="Table view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>

        {/* Create Role Button */}
        <Button
          variant="primary"
          onClick={onCreateRole}
          className="flex items-center gap-2 rounded-xl"
        >
          <Plus className="h-4 w-4" />
          <span>Tạo vai trò mới</span>
        </Button>
      </div>
    </div>
  );
}
