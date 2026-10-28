
"use client";

import { BarChart3, ShieldAlert, ShieldCheck } from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import type { PerClassMetric } from "@/types";

export interface PerClassMetricsCardProps {
  metrics?: PerClassMetric[];
  loading?: boolean;
}

export function PerClassMetricsCard({
  metrics = [],
  loading = false,
}: PerClassMetricsCardProps) {
  const { t } = useLocale();

  const getClassNameVi = (name: string) => {
    switch (name) {
      case "PERSON":
        return "Người (Person)";
      case "HARD_HAT":
        return "Mũ bảo hộ (Hard Hat)";
      case "NO_HELMET":
        return "Không đội mũ (No Helmet)";
      case "SAFETY_VEST":
        return "Áo phản quang (Safety Vest)";
      case "NO_VEST":
        return "Không mặc áo (No Vest)";
      default:
        return name;
    }
  };

  const isViolation = (name: string) =>
    name === "NO_HELMET" || name === "NO_VEST";

  const clampPercent = (value: number) =>
    Math.min(100, Math.max(0, Number.isFinite(value) ? value * 100 : 0));

  const metricsConfig = [
    {
      key: "precision",
      label: t("aiMetrics.perClass.precision"),
      getValue: (item: PerClassMetric) => item.precision,
    },
    {
      key: "recall",
      label: t("aiMetrics.perClass.recall"),
      getValue: (item: PerClassMetric) => item.recall,
    },
    {
      key: "f1",
      label: t("aiMetrics.perClass.f1"),
      getValue: (item: PerClassMetric) => item.f1Score,
    },
  ];

  const shellShadow =
    "shadow-[0_2px_0_rgba(255,255,255,0.82)_inset,0_-2px_0_rgba(0,0,0,0.025)_inset,8px_10px_18px_var(--shadow-dark),-8px_-8px_18px_var(--shadow-light)]";

  if (loading) {
    return (
      <section
        className={`relative overflow-hidden rounded-[26px] border border-border/40 bg-surface p-5 sm:p-6 ${shellShadow}`}
      >
        <div className="animate-pulse space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-muted/70" />
            <div className="space-y-2">
              <div className="h-4 w-40 rounded-full bg-muted/70" />
              <div className="h-3 w-24 rounded-full bg-muted/50" />
            </div>
          </div>

          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-[104px] rounded-2xl bg-muted/40 shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)]"
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      className={`relative isolate overflow-hidden rounded-[26px] border border-border/40 bg-surface p-4 sm:p-5 ${shellShadow}`}
    >
      {/* Ánh sáng nổi trên bề mặt, không dùng gradient màu rực */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-white/90 dark:bg-white/15"
      />

      <div className="relative space-y-5">
        {/* Header */}
        <header className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative shrink-0">
              <div className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-border/50 bg-surface text-primary shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,4px_5px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)] dark:shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,4px_5px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]">
                <BarChart3 className="h-[21px] w-[21px] stroke-[2.2]" />
              </div>
              <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-surface bg-primary shadow-[0_1px_3px_var(--shadow-dark)]" />
            </div>

            <div className="min-w-0">
              <h4 className="truncate text-sm font-extrabold tracking-[-0.025em] text-foreground sm:text-[15px]">
                {t("aiMetrics.perClass.title")}
              </h4>
              <p className="mt-1 text-[11px] font-medium tracking-wide text-muted-foreground">
                MODEL PERFORMANCE
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 rounded-xl border border-border/40 bg-surface px-3 py-2 shadow-[2px_3px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)]">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="text-xs font-bold tabular-nums text-foreground">
              {metrics.length}
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">
              {t("aiMetrics.perClass.class")}
            </span>
          </div>
        </header>

        {/* Divider */}
        <div className="h-px bg-border/60 shadow-[0_1px_0_rgba(255,255,255,0.65)] dark:shadow-none" />

        {/* Empty state */}
        {metrics.length === 0 ? (
          <div className="flex min-h-32 flex-col items-center justify-center gap-3 rounded-2xl border border-border/30 bg-surface/50 px-4 text-center shadow-[inset_3px_3px_8px_var(--shadow-dark),inset_-3px_-3px_8px_var(--shadow-light)]">
            <BarChart3 className="h-7 w-7 text-muted-foreground/60" />
            <p className="text-sm font-medium text-muted-foreground">
              {t("aiMetrics.perClass.noData")}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {metrics.map((item, index) => {
              const violation = isViolation(item.className);

              return (
                <article
                  key={item.className}
                  className="group relative rounded-[20px] border border-border/40 bg-surface p-3.5 transition-[transform,box-shadow] duration-300 hover:-translate-y-[2px] hover:shadow-[0_3px_0_rgba(255,255,255,0.8)_inset,0_13px_22px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)] sm:p-4"
                  style={{
                    boxShadow:
                      "0 1px 0 rgba(255,255,255,0.8) inset, 0 -1px 0 rgba(0,0,0,0.025) inset, 5px 6px 12px var(--shadow-dark), -5px -5px 12px var(--shadow-light)",
                  }}
                >
                  {/* Đường phản sáng trên mép khối */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-4 top-0 h-px bg-white/90 dark:bg-white/15"
                  />

                  {/* Class heading */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/40 bg-surface shadow-[2px_3px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] ${
                          violation ? "text-accent" : "text-primary"
                        }`}
                      >
                        {violation ? (
                          <ShieldAlert className="h-[17px] w-[17px] stroke-[2.1]" />
                        ) : (
                          <ShieldCheck className="h-[17px] w-[17px] stroke-[2.1]" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <h5 className="truncate text-xs font-extrabold text-foreground sm:text-[13px]">
                          {getClassNameVi(item.className)}
                        </h5>
                        <p className="mt-1 truncate text-[10px] font-medium uppercase tracking-[0.09em] text-muted-foreground">
                          {item.className.replace(/_/g, " ")}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-sm font-extrabold tabular-nums text-foreground">
                        {item.sampleCount.toLocaleString()}
                      </p>
                      <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">
                        {t("aiMetrics.perClass.samples")}
                      </p>
                    </div>
                  </div>

                  {/* Metrics inset panel */}
                  <div className="mt-4 rounded-[14px] border border-border/25 bg-background/35 p-3 shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)]">
                    <div className="grid grid-cols-3 gap-3">
                      {metricsConfig.map((config) => {
                        const value = config.getValue(item);
                        const percent = clampPercent(value);

                        return (
                          <div key={config.key} className="min-w-0">
                            <div className="mb-2 flex flex-col gap-1">
                              <span className="truncate text-[10px] font-semibold text-muted-foreground sm:text-[11px]">
                                {config.label}
                              </span>
                              <span className="text-[15px] font-extrabold leading-none tracking-[-0.04em] text-foreground tabular-nums sm:text-base">
                                {percent.toFixed(1)}
                                <span className="ml-0.5 text-[10px] font-bold text-muted-foreground">
                                  %
                                </span>
                              </span>
                            </div>

                            {/* Recessed track + raised fill */}
                            <div className="relative h-[7px] overflow-hidden rounded-full border border-border/20 bg-background/70 shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)]">
                              <div
                                className="relative h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
                                style={{
                                  width: `${percent}%`,
                                  boxShadow:
                                    "0 1px 0 rgba(255,255,255,0.55) inset, 0 -1px 0 rgba(0,0,0,0.08) inset, 1px 1px 2px var(--shadow-dark)",
                                }}
                              >
                                {percent > 8 && (
                                  <span className="absolute inset-x-1 top-[1px] h-px rounded-full bg-white/65" />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tiny index marker */}
                  <span className="pointer-events-none absolute right-3 top-3 text-[9px] font-bold tabular-nums text-muted-foreground/45">
                    {(index + 1).toString().padStart(2, "0")}
                  </span>
                </article>
              );
            })}
          </div>
        )}

        {/* Footer */}
        {metrics.length > 0 && (
          <footer className="flex items-center justify-between gap-3 px-1 pt-0.5">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_0_3px_var(--shadow-light)]" />
              <span className="text-[10px] font-medium text-muted-foreground">
                Precision · Recall · F1-Score
              </span>
            </div>

            <span className="rounded-lg border border-border/30 bg-surface px-2 py-1 text-[9px] font-bold tracking-[0.12em] text-muted-foreground shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)]">
              AI METRICS
            </span>
          </footer>
        )}
      </div>
    </section>
  );
}
