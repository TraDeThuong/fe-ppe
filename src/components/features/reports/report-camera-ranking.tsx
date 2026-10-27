"use client";

import { AlertOctagon, Camera, Flame } from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import type { CameraStatDto } from "@/types";

export interface ReportCameraRankingProps {
  rankings?: CameraStatDto[];
  loading?: boolean;
}

export function ReportCameraRanking({
  rankings = [
    {
      cameraId: "cam-north-01-uuid",
      cameraName: "CAM-NORTH-01 (Giàn giáo Tầng 5)",
      totalViolations: 42,
      confirmedCount: 39,
      falseAlarmCount: 3,
      resolvedCount: 38,
    },
    {
      cameraId: "cam-warehouse-03-uuid",
      cameraName: "CAM-WAREHOUSE-03 (Xưởng Hàn & Cơ khí)",
      totalViolations: 28,
      confirmedCount: 26,
      falseAlarmCount: 2,
      resolvedCount: 26,
    },
    {
      cameraId: "cam-gate-02-uuid",
      cameraName: "CAM-GATE-02 (Cổng Kiểm soát Xe Tải)",
      totalViolations: 18,
      confirmedCount: 17,
      falseAlarmCount: 1,
      resolvedCount: 17,
    },
    {
      cameraId: "cam-tower-04-uuid",
      cameraName: "CAM-TOWER-04 (Cần trục Tháp số 2)",
      totalViolations: 14,
      confirmedCount: 13,
      falseAlarmCount: 1,
      resolvedCount: 13,
    },
    {
      cameraId: "cam-zone-b-uuid",
      cameraName: "CAM-ZONE-B-01 (Khuôn đúc Bê tông)",
      totalViolations: 11,
      confirmedCount: 10,
      falseAlarmCount: 1,
      resolvedCount: 10,
    },
  ],
  loading = false,
}: ReportCameraRankingProps) {
  const { t } = useLocale();

  const maxViolations = Math.max(...rankings.map((r) => r.totalViolations), 45);

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
        <span className="text-xs text-muted-foreground">Top 5 điểm nóng</span>
      </div>

      {/* Rankings List */}
      <div className="space-y-3">
        {rankings.map((item, idx) => {
          const pct = Math.round((item.totalViolations / maxViolations) * 100);
          const resolvePct =
            item.totalViolations > 0
              ? Math.round((item.resolvedCount / item.totalViolations) * 100)
              : 100;

          return (
            <div
              key={item.cameraId}
              className="rounded-xl border border-border/30 bg-surface/50 p-3 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.04)] space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  {getRankBadge(idx)}
                  <span className="font-semibold text-xs text-foreground">
                    {item.cameraName || item.cameraId}
                  </span>
                </div>
                <span className="font-bold text-xs text-rose-600 dark:text-rose-400">
                  {item.totalViolations} vụ
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
                  <span>Xác nhận: {item.confirmedCount} vụ</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    Đã xử lý: {resolvePct}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
