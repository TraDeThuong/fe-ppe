"use client";

import { Filter, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";

export interface SystemConfigToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  onAddConfig: () => void;
  canManage?: boolean;
}

export function SystemConfigToolbar({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  onAddConfig,
  canManage = true,
}: SystemConfigToolbarProps) {
  const { t } = useLocale();

  const categories = [
    { value: "", label: t("system.configs.categoryAll") },
    { value: "GENERAL", label: "GENERAL" },
    { value: "SECURITY", label: "SECURITY" },
    { value: "INTEGRATION", label: "INTEGRATION" },
    { value: "FEATURE_FLAG", label: "FEATURE_FLAG" },
  ];

  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("system.configs.searchPlaceholder")}
            className="w-full rounded-xl border border-border/40 bg-surface pl-9 pr-3 py-1.5 text-xs text-foreground shadow-[inset_1px_1px_2px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-black/50 dark:bg-card/70"
          />
        </div>

        {/* Category Select */}
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full sm:w-auto rounded-xl border border-border/40 bg-surface px-3 py-1.5 text-xs text-foreground shadow-[inset_1px_1px_2px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:border-black/50 dark:bg-card/70"
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Add Config Button - Only for users with manage permission */}
      {canManage && (
        <Button
          variant="primary"
          onClick={onAddConfig}
          className="flex items-center justify-center gap-1.5 rounded-xl h-8 text-xs self-stretch sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{t("system.addConfig")}</span>
        </Button>
      )}
    </div>
  );
}
