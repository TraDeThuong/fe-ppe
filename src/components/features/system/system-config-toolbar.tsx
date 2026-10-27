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
}

export function SystemConfigToolbar({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  onAddConfig,
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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("system.configs.searchPlaceholder")}
            className="w-full rounded-xl border border-border/40 bg-surface pl-10 pr-4 py-2 text-sm text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]"
          />
        </div>

        {/* Category Select */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="rounded-xl border border-border/40 bg-surface px-3 py-2 text-sm text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]"
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Add Config Button */}
      <Button
        variant="primary"
        onClick={onAddConfig}
        className="flex items-center gap-2 rounded-xl"
      >
        <Plus className="h-4 w-4" />
        <span>{t("system.addConfig")}</span>
      </Button>
    </div>
  );
}
