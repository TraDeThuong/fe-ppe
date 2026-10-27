"use client";

import { Grid, HelpCircle } from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import type { ConfusionMatrixDto } from "@/types";

export interface ConfusionMatrixHeatmapProps {
  confusionMatrix?: ConfusionMatrixDto | null;
  loading?: boolean;
}

export function ConfusionMatrixHeatmap({
  confusionMatrix,
  loading = false,
}: ConfusionMatrixHeatmapProps) {
  const { t } = useLocale();

  const classes = confusionMatrix?.classes || [
    "HARD_HAT",
    "NO_HELMET",
    "SAFETY_VEST",
    "NO_VEST",
  ];
  const matrix = confusionMatrix?.matrix || [
    [952, 12, 4, 2],
    [18, 410, 1, 8],
    [5, 2, 890, 15],
    [1, 9, 22, 380],
  ];

  const formatClassName = (name: string) => {
    switch (name) {
      case "HARD_HAT":
        return "Mũ bảo hộ";
      case "NO_HELMET":
        return "Không mũ";
      case "SAFETY_VEST":
        return "Áo phản quang";
      case "NO_VEST":
        return "Không áo";
      case "PERSON":
        return "Người";
      default:
        return name;
    }
  };

  return (
    <div className="rounded-2xl border border-border/40 bg-surface p-5 shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.3)] space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/30 pb-3">
        <div className="flex items-center gap-2">
          <Grid className="h-4 w-4 text-primary" />
          <h4 className="font-bold text-sm text-foreground">
            {t("aiMetrics.matrix.title")}
          </h4>
        </div>
        <span className="text-xs text-muted-foreground">
          {t("aiMetrics.matrix.description")}
        </span>
      </div>

      {/* Heatmap Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-center text-xs">
          <thead>
            <tr>
              <th className="p-2 text-left font-bold text-muted-foreground border-b border-border/40">
                {t("aiMetrics.matrix.actual")}
              </th>
              {classes.map((cls) => (
                <th
                  key={cls}
                  className="p-2 font-bold text-foreground border-b border-border/40"
                >
                  {formatClassName(cls)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, rowIdx) => {
              const rowTotal = row.reduce((acc, val) => acc + val, 0);

              return (
                <tr key={classes[rowIdx] || rowIdx} className="hover:bg-surface-elevated/40">
                  <td className="p-2.5 text-left font-semibold text-foreground border-r border-border/40 bg-surface/50">
                    {formatClassName(classes[rowIdx] || `Class ${rowIdx}`)}
                  </td>

                  {row.map((val, colIdx) => {
                    const isDiagonal = rowIdx === colIdx;
                    const pct = rowTotal > 0 ? ((val / rowTotal) * 100).toFixed(1) : "0";

                    return (
                      <td
                        key={colIdx}
                        className={`p-2.5 border border-border/20 transition-all ${
                          isDiagonal
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold"
                            : val > 0
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 font-medium"
                            : "text-muted-foreground/40"
                        }`}
                      >
                        <div>{val.toLocaleString()}</div>
                        <div className="text-[10px] opacity-75">{pct}%</div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-4 text-[11px] text-muted-foreground pt-1">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-emerald-500/20 border border-emerald-500/30" />
          <span>True Positive (Nhận diện chính xác)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-rose-500/15 border border-rose-500/30" />
          <span>False Positive/Negative (Nhận nhầm)</span>
        </div>
      </div>
    </div>
  );
}
