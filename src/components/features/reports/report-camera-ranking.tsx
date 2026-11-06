
"use client";

import {
  Camera,
  Flame,
  ShieldCheck,
  CheckCircle2,
  MapPin,
} from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import type { CameraStatDto } from "@/types";

export interface ReportCameraRankingProps {
  rankings?: CameraStatDto[];
  loading?: boolean;
}

export function ReportCameraRanking({
  rankings = [],
  loading = false,
}: ReportCameraRankingProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const { getCamera, getSiteName } = useEntityLookup();

  const getRankBadge = (idx: number) => {
    if (idx === 0) {
      return {
        badge:
          "bg-primary text-primary-foreground shadow-[2px_2px_5px_var(--shadow-dark),-1px_-1px_3px_var(--shadow-light)]",
        label: "1",
      };
    }

    if (idx === 1) {
      return {
        badge:
          "bg-primary/85 text-primary-foreground shadow-[2px_2px_5px_var(--shadow-dark),-1px_-1px_3px_var(--shadow-light)]",
        label: "2",
      };
    }

    if (idx === 2) {
      return {
        badge:
          "bg-primary/70 text-primary-foreground shadow-[2px_2px_5px_var(--shadow-dark),-1px_-1px_3px_var(--shadow-light)]",
        label: "3",
      };
    }

    return {
      badge:
        "bg-surface text-muted-foreground border border-border/40 shadow-[inset_1px_1px_3px_var(--shadow-dark),inset_-1px_-1px_3px_var(--shadow-light)]",
      label: `${idx + 1}`,
    };
  };

  return (
    <div
      className="relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl bg-surface p-4 sm:p-5
      shadow-[7px_7px_18px_var(--shadow-dark),-7px_-7px_18px_var(--shadow-light)]"
    >
      {/* Decorative light */}
      <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-primary/[0.05] blur-3xl" />

      {/* Header */}
      <div className="relative flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-primary
            shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]"
          >
            <Flame size={19} strokeWidth={2.3} />
          </div>

          <div className="min-w-0">
            <h4 className="text-sm font-extrabold text-foreground">
              {t("reports.charts.rankingsTitle")}
            </h4>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {isVietnamese
                ? "Phân tích vi phạm theo camera"
                : "Violation analysis by camera"}
            </p>
          </div>
        </div>

        <div
          className="flex shrink-0 items-center gap-2 rounded-xl bg-surface px-3 py-2
          shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)]"
        >
          <Camera size={14} className="text-accent" />
          <span className="text-sm font-extrabold tabular-nums text-primary">
            {rankings.length}
          </span>
          <span className="text-[10px] font-medium text-muted-foreground">
            {isVietnamese ? "Camera" : "Cameras"}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="my-4 h-px bg-gradient-to-r from-transparent via-border/70 to-transparent" />

      {/* Loading */}
      {loading ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-muted border-t-primary" />
          <p className="text-xs text-muted-foreground">
            {t("common.loading")}
          </p>
        </div>
      ) : rankings.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface text-muted-foreground/50
            shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_var(--shadow-light)]"
          >
            <Camera size={25} />
          </div>
          <p className="text-xs text-muted-foreground">
            {isVietnamese
              ? "Chưa có dữ liệu xếp hạng camera vi phạm."
              : "No camera violation ranking data available."}
          </p>
        </div>
      ) : (
        <>
          {/* Synchronized Ranking Grid */}
          <div className="relative grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {rankings.map((item, idx) => {
              const resolvePct =
                item.totalViolations > 0
                  ? Math.round(
                      (item.resolvedCount / item.totalViolations) * 100,
                    )
                  : 0;

              const camEntity = getCamera(item.cameraId);

              const displayLabel =
                item.cameraName ||
                (camEntity
                  ? `${camEntity.name} (${camEntity.code})`
                  : `Camera #${item.cameraId.slice(0, 8)}`);

              const siteLabel = camEntity?.siteId
                ? getSiteName(camEntity.siteId, "")
                : "";

              const rankBadge = getRankBadge(idx);

              return (
                <div
                  key={item.cameraId}
                  className="group relative flex min-w-0 flex-col justify-between overflow-hidden rounded-xl bg-surface p-3.5 transition-all duration-300
                    border border-border/30
                    shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)]
                    hover:-translate-y-1
                    hover:shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)]"
                >
                  {/* Card top */}
                  <div className="relative flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      {/* Rank Badge */}
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold ${rankBadge.badge}`}
                      >
                        {rankBadge.label}
                      </div>

                      {/* Camera name & Site */}
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate text-xs font-bold text-foreground"
                          title={displayLabel}
                        >
                          {displayLabel}
                        </p>

                        <div className="mt-0.5 flex min-w-0 items-center gap-1">
                          <MapPin
                            size={10}
                            className="shrink-0 text-primary/70"
                          />
                          <span
                            className="truncate text-[10px] text-muted-foreground"
                            title={siteLabel}
                          >
                            {siteLabel ||
                              (isVietnamese
                                ? "Camera giám sát"
                                : "Surveillance camera")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Total violations */}
                    <div className="shrink-0 text-right">
                      <p className="text-base font-extrabold leading-none tabular-nums text-primary">
                        {item.totalViolations.toLocaleString()}
                      </p>
                      <p className="mt-1 text-[9px] text-muted-foreground">
                        {isVietnamese ? "Vi phạm" : "Cases"}
                      </p>
                    </div>
                  </div>

                  {/* Statistics footer in card */}
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/30 pt-2.5">
                    <div className="flex min-w-0 items-center gap-1">
                      <ShieldCheck
                        size={11}
                        className="shrink-0 text-primary"
                      />
                      <span className="truncate text-[10px] text-muted-foreground">
                        {isVietnamese ? "Xác nhận" : "Confirmed"}
                        <span className="ml-1 font-bold text-foreground">
                          {item.confirmedCount}
                        </span>
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <CheckCircle2
                        size={11}
                        className="text-emerald-500"
                      />
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        {resolvePct}%
                      </span>
                      <span className="text-[9px] text-muted-foreground">
                        ({item.resolvedCount}/{item.totalViolations})
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Compact footer */}
          <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="text-[10px] text-muted-foreground">
                {isVietnamese
                  ? "Xếp hạng camera vi phạm"
                  : "Camera violation ranking"}
              </span>
            </div>

            <span className="text-[10px] font-semibold text-muted-foreground">
              {isVietnamese ? "Tổng" : "Total"}:
              <span className="ml-1 text-primary">
                {rankings.length}
              </span>
            </span>
          </div>
        </>
      )}
    </div>
  );
}
