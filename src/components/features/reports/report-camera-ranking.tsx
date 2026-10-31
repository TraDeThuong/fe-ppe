"use client";

import { Camera, Flame } from "lucide-react";
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

  const maxViolations = Math.max(...rankings.map((r) => r.totalViolations), 1);

  const getRankBadge = (idx: number) => {
    if (idx === 0) {
      return (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white font-bold text-[11px]">
          1
        </span>
      );
    }
    if (idx === 1) {
      return (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white font-bold text-[11px]">
          2
        </span>
      );
    }
    if (idx === 2) {
      return (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-white font-bold text-[11px]">
          3
        </span>
      );
    }
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground font-semibold text-[11px]">
        {idx + 1}
      </span>
    );
  };

  return (
    <div className="rounded-2xl border border-border/40 bg-surface p-5 shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.3)] space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/30 pb-3">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-rose-500" />
          <h4 className="font-bold text-sm text-foreground">
            {t("reports.charts.rankingsTitle")}
          </h4>
        </div>
        <span className="text-xs text-muted-foreground">
          {isVietnamese
            ? `${rankings.length} camera ghi nhận vi phạm`
            : `${rankings.length} cameras with violations`}
        </span>
      </div>

      {/* Rankings List */}
      {loading ? (
        <div className="py-8 text-center text-xs text-muted-foreground">
          {t("common.loading")}
        </div>
      ) : rankings.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-xs text-muted-foreground">
          <Camera className="h-6 w-6 opacity-40" />
          <span>
            {isVietnamese
              ? "Chưa có dữ liệu xếp hạng camera vi phạm."
              : "No camera violation ranking data available."}
          </span>
        </div>
      ) : (
        <div className="space-y-3">
          {rankings.map((item, idx) => {
            const pct = Math.round((item.totalViolations / maxViolations) * 100);
            const resolvePct =
              item.totalViolations > 0
                ? Math.round((item.resolvedCount / item.totalViolations) * 100)
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

            return (
              <div
                key={item.cameraId}
                className="rounded-xl border border-border/30 bg-surface/50 p-3 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.04)] space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {getRankBadge(idx)}
                    <div className="min-w-0">
                      <span className="font-semibold text-xs text-foreground truncate block">
                        {displayLabel}
                      </span>
                      {siteLabel && (
                        <span className="text-[10px] text-muted-foreground truncate block">
                          {siteLabel}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="font-bold text-xs text-rose-600 dark:text-rose-400 shrink-0">
                    {item.totalViolations} {isVietnamese ? "vụ" : "cases"}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="h-2 w-full rounded-full bg-border/40 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>
                      {isVietnamese ? "Xác nhận:" : "Confirmed:"} {item.confirmedCount}{" "}
                      {isVietnamese ? "vụ" : "cases"}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {isVietnamese ? "Đã xử lý:" : "Resolved:"} {resolvePct}% ({item.resolvedCount}/{item.totalViolations})
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
