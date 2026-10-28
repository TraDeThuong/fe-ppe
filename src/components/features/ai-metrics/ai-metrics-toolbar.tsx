"use client";

import { Calendar, Cpu, RefreshCw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { AiModelDto } from "@/types";

export interface AiMetricsToolbarProps {
  models: AiModelDto[];
  selectedModelId: string;
  onModelChange: (modelId: string) => void;
  period: string;
  onPeriodChange: (period: string) => void;
  onRefresh: () => void;
  loading?: boolean;
}

export function AiMetricsToolbar({
  models,
  selectedModelId,
  onModelChange,
  period,
  onPeriodChange,
  onRefresh,
  loading = false,
}: AiMetricsToolbarProps) {
  const { t } = useLocale();

  return (
    <div className="flex flex-col gap-2.5 sm:gap-3 rounded-2xl border border-border/40 bg-surface p-3 sm:p-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      {/* Filters Group */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        {/* Model Selector */}
        <div className="relative flex-1 min-w-[140px] sm:flex-none">
          <select
            value={selectedModelId}
            onChange={(e) => onModelChange(e.target.value)}
            className="w-full sm:w-auto rounded-xl border border-border/40 bg-surface px-3 py-2 text-xs font-medium text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]"
          >
            <option value="">{t("aiMetrics.toolbar.allModels")}</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Time Period Filter */}
        <div className="relative flex-1 min-w-[120px] sm:flex-none">
          <select
            value={period}
            onChange={(e) => onPeriodChange(e.target.value)}
            className="w-full sm:w-auto rounded-xl border border-border/40 bg-surface px-3 py-2 text-xs font-medium text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]"
          >
            <option value="24h">{t("aiMetrics.toolbar.period24h")}</option>
            <option value="7d">{t("aiMetrics.toolbar.period7d")}</option>
            <option value="30d">{t("aiMetrics.toolbar.period30d")}</option>
          </select>
        </div>
      </div>

      {/* Refresh Action */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onRefresh}
        disabled={loading}
        className="gap-2 text-xs self-end sm:self-auto h-8 px-3"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        <span>{t("common.refresh")}</span>
      </Button>
    </div>
  );
}
