
"use client";

import { Grid, CircleHelp } from "lucide-react";
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
  const { t, locale } = useLocale();
  const isVi = locale === "vi-VN";

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
        return isVi ? "Mũ bảo hộ" : "Hard Hat";
      case "NO_HELMET":
        return isVi ? "Không mũ" : "No Helmet";
      case "SAFETY_VEST":
        return isVi ? "Áo phản quang" : "Safety Vest";
      case "NO_VEST":
        return isVi ? "Không áo" : "No Vest";
      case "PERSON":
        return isVi ? "Người" : "Person";
      default:
        return name;
    }
  };

  const shellShadow =
    "shadow-[0_2px_0_rgba(255,255,255,0.8)_inset,0_-2px_0_rgba(0,0,0,0.025)_inset,8px_10px_18px_var(--shadow-dark),-8px_-8px_18px_var(--shadow-light)]";

  if (loading) {
    return (
      <section
        className={`space-y-5 rounded-[26px] border border-border/40 bg-surface p-5 sm:p-6 ${shellShadow}`}
      >
        <div className="flex animate-pulse items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-muted/70" />
          <div className="space-y-2">
            <div className="h-4 w-40 rounded-full bg-muted/70" />
            <div className="h-3 w-28 rounded-full bg-muted/50" />
          </div>
        </div>
        <div className="h-56 animate-pulse rounded-2xl bg-muted/40 shadow-[inset_3px_3px_8px_var(--shadow-dark),inset_-3px_-3px_8px_var(--shadow-light)]" />
      </section>
    );
  }

  return (
    <section
      className={`relative isolate space-y-5 overflow-hidden rounded-[26px] border border-border/40 bg-surface p-4 sm:p-5 ${shellShadow}`}
    >
      {/* Raised top edge */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-white/90 dark:bg-white/15"
      />

      {/* Header */}
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] border border-border/40 bg-surface text-primary shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,4px_5px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]">
            <Grid className="h-5 w-5 stroke-[2.2]" />
          </div>

          <div className="min-w-0">
            <h4 className="truncate text-sm font-extrabold tracking-[-0.025em] text-foreground sm:text-[15px]">
              {t("aiMetrics.matrix.title")}
            </h4>
            <p className="mt-1 text-[11px] font-medium tracking-wide text-muted-foreground">
              CONFUSION MATRIX
            </p>
          </div>
        </div>

        <div className="hidden sm:flex shrink-0 items-center gap-2 rounded-xl border border-border/40 bg-surface px-3 py-2 shadow-[2px_3px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)]">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="text-[10px] font-semibold text-muted-foreground sm:text-xs">
            {t("aiMetrics.matrix.description")}
          </span>
        </div>
      </header>

      <div className="h-px bg-border/60 shadow-[0_1px_0_rgba(255,255,255,0.6)] dark:shadow-none" />

      {/* Matrix recessed panel */}
      <div className="rounded-[20px] border border-border/30 bg-background/30 p-2.5 shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_var(--shadow-light)] sm:p-3.5">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <div>
            <p className="text-xs font-extrabold text-foreground">
              {t("aiMetrics.matrix.actual")}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Actual class / Predicted class
            </p>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-border/30 bg-surface px-2 py-1.5 text-[10px] font-semibold text-muted-foreground shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)]">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {classes.length} classes
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl">
          <table className="w-full min-w-[440px] border-separate border-spacing-1 text-center text-xs">
            <thead>
              <tr>
                <th className="w-[100px] p-2 text-left align-bottom">
                  <span className="text-[10px] font-bold leading-relaxed text-muted-foreground">
                    {t("aiMetrics.matrix.actual")}
                  </span>
                </th>

                {classes.map((cls) => (
                  <th key={cls} className="min-w-[74px] p-1.5 align-bottom">
                    <span className="mx-auto block max-w-[94px] text-[10px] font-extrabold leading-relaxed text-foreground sm:text-[11px]">
                      {formatClassName(cls)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {matrix.map((row, rowIdx) => {
                const rowTotal = row.reduce(
                  (acc, val) => acc + val,
                  0
                );

                return (
                  <tr key={classes[rowIdx] || rowIdx}>
                    {/* Row label: sculpted tile */}
                    <th className="p-0 text-left">
                      <div className="flex min-h-[58px] items-center rounded-xl border border-border/40 bg-surface px-2.5 text-[10px] font-bold leading-relaxed text-foreground shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,2px_3px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] sm:text-[11px]">
                        {formatClassName(
                          classes[rowIdx] || `Class ${rowIdx}`
                        )}
                      </div>
                    </th>

                    {row.map((val, colIdx) => {
                      const isDiagonal = rowIdx === colIdx;
                      const pct =
                        rowTotal > 0 ? (val / rowTotal) * 100 : 0;

                      return (
                        <td key={colIdx} className="p-0">
                          <div
                            title={`${formatClassName(
                              classes[rowIdx] || `Class ${rowIdx}`
                            )} → ${formatClassName(
                              classes[colIdx] || `Class ${colIdx}`
                            )}: ${val.toLocaleString()} (${pct.toFixed(1)}%)`}
                            className={`relative flex min-h-[58px] flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border transition-transform duration-200 hover:z-10 hover:-translate-y-0.5 ${
                              isDiagonal
                                ? "border-primary/25 bg-primary/[0.10] text-foreground shadow-[0_1px_0_rgba(255,255,255,0.85)_inset,0_2px_0_rgba(0,0,0,0.025),3px_4px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)]"
                                : val > 0
                                ? "border-accent/25 bg-accent/[0.10] text-foreground shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]"
                                : "border-border/20 bg-surface/35 text-muted-foreground/60 shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]"
                            }`}
                          >
                            {isDiagonal && (
                              <span
                                aria-hidden="true"
                                className="absolute inset-x-2 top-0 h-px bg-white/90 dark:bg-white/20"
                              />
                            )}

                            <span
                              className={`text-[12px] font-extrabold tabular-nums sm:text-[13px] ${
                                isDiagonal ? "text-primary" : ""
                              }`}
                            >
                              {val.toLocaleString()}
                            </span>

                            <span className="text-[9px] font-medium tabular-nums text-muted-foreground">
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="px-1 pt-2 text-[10px] leading-relaxed text-muted-foreground">
          Mỗi hàng biểu thị lớp thực tế; mỗi cột biểu thị lớp mô hình dự đoán.
        </p>
      </div>

      {/* Legend */}
      <footer className="flex flex-wrap items-center gap-x-5 gap-y-3 px-1">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)]">
            <span className="h-2 w-2 rounded-full bg-primary" />
          </span>
          <div>
            <p className="text-[11px] font-bold text-foreground">
              True Positive
            </p>
            <p className="text-[10px] text-muted-foreground">
              Nhận diện chính xác
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-accent/25 bg-accent/10 shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
            <span className="h-2 w-2 rounded-full bg-accent" />
          </span>
          <div>
            <p className="text-[11px] font-bold text-foreground">
              False Positive / Negative
            </p>
            <p className="text-[10px] text-muted-foreground">
              Dự đoán nhầm lớp
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5 text-muted-foreground">
          <CircleHelp className="h-3.5 w-3.5" />
          <span className="text-[10px]">Hover để xem chi tiết</span>
        </div>
      </footer>
    </section>
  );
}
