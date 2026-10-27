"use client";

import { FilePlus2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { SiteItem } from "@/types";

export interface ReportFilterToolbarProps {
  sites: SiteItem[];
  selectedSiteId: string;
  onSiteChange: (siteId: string) => void;
  period: string;
  onPeriodChange: (period: string) => void;
  onGenerateClick: () => void;
  onRefresh: () => void;
  canExport?: boolean;
  loading?: boolean;
}

export function ReportFilterToolbar({
  sites,
  selectedSiteId,
  onSiteChange,
  period,
  onPeriodChange,
  onGenerateClick,
  onRefresh,
  canExport = true,
  loading = false,
}: ReportFilterToolbarProps) {
  const { t } = useLocale();

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-surface p-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      {/* Left: Filters */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Site Filter */}
        <select
          value={selectedSiteId}
          onChange={(e) => onSiteChange(e.target.value)}
          className="rounded-xl border border-border/40 bg-surface px-3 py-2 text-xs font-medium text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]"
        >
          <option value="">{t("reports.toolbar.allSites")}</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {/* Period Selector */}
        <select
          value={period}
          onChange={(e) => onPeriodChange(e.target.value)}
          className="rounded-xl border border-border/40 bg-surface px-3 py-2 text-xs font-medium text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]"
        >
          <option value="today">{t("reports.toolbar.periodToday")}</option>
          <option value="7d">{t("reports.toolbar.period7d")}</option>
          <option value="30d">{t("reports.toolbar.period30d")}</option>
        </select>

        {/* Refresh */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="gap-1.5 text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>{t("common.refresh")}</span>
        </Button>
      </div>

      {/* Right: Generate Report Action */}
      {canExport && (
        <Button
          variant="primary"
          size="sm"
          onClick={onGenerateClick}
          className="gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <FilePlus2 className="h-4 w-4" />
          <span>{t("reports.toolbar.generateBtn")}</span>
        </Button>
      )}
    </div>
  );
}
