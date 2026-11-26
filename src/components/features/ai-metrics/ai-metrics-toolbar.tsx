"use client";

import { useLocale } from "@/providers/locale-provider";
import type { AiModelDto, CameraItem } from "@/types";

export interface AiMetricsToolbarProps {
  models: AiModelDto[];
  selectedModelId: string;
  onModelChange: (modelId: string) => void;
  cameras?: CameraItem[];
  selectedCameraId?: string;
  onCameraChange?: (cameraId: string) => void;
  period: string;
  onPeriodChange: (period: string) => void;
  canReadModels?: boolean;
  canReadCameras?: boolean;
}

export function AiMetricsToolbar({
  models,
  selectedModelId,
  onModelChange,
  cameras = [],
  selectedCameraId = "",
  onCameraChange,
  period,
  onPeriodChange,
  canReadModels = true,
  canReadCameras = true,
}: AiMetricsToolbarProps) {
  const { t, locale } = useLocale();
  const isVi = locale === "vi-VN";

  return (
    <div className="flex flex-col gap-2.5 sm:gap-3 rounded-2xl border border-border/40 bg-surface p-3 sm:p-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      {/* Filters Group */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        {/* Model Selector */}
        <div className="relative flex-1 min-w-[140px] sm:flex-none">
          <select
            aria-label={t("aiMetrics.toolbar.modelLabel")}
            disabled={!canReadModels}
            value={selectedModelId}
            onChange={(e) => onModelChange(e.target.value)}
            className="w-full sm:w-auto rounded-xl border border-border/40 bg-surface px-3 py-2 text-xs font-medium text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]"
          >
            <option value="">{t(canReadModels ? "aiMetrics.toolbar.allModels" : "aiMetrics.modelReadRequired")}</option>
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
            aria-label={t("aiMetrics.toolbar.periodLabel")}
            value={period}
            onChange={(e) => onPeriodChange(e.target.value)}
            className="w-full sm:w-auto rounded-xl border border-border/40 bg-surface px-3 py-2 text-xs font-medium text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]"
          >
            <option value="all">{t("aiMetrics.toolbar.periodAll")}</option>
            <option value="24h">{t("aiMetrics.toolbar.period24h")}</option>
            <option value="7d">{t("aiMetrics.toolbar.period7d")}</option>
            <option value="30d">{t("aiMetrics.toolbar.period30d")}</option>
          </select>
        </div>

        {/* Camera Telemetry Filter */}
        {onCameraChange && (
          <div className="relative flex-1 min-w-[150px] sm:flex-none">
            <select
              aria-label={t("aiMetrics.toolbar.cameraLabel")}
              disabled={!canReadCameras}
              value={selectedCameraId}
              onChange={(e) => onCameraChange(e.target.value)}
              className="w-full sm:w-auto rounded-xl border border-border/40 bg-surface px-3 py-2 text-xs font-medium text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]"
            >
              <option value="">
                {canReadCameras ? (isVi ? "Tất cả Camera" : "All Cameras") : t("aiMetrics.cameraReadRequired")}
              </option>
              {cameras.map((cam) => (
                <option key={cam.id} value={cam.id}>
                  {cam.code} — {cam.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

    </div>
  );
}
