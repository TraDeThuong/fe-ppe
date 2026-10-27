"use client";

import { BarChart3, HardHat, ShieldAlert, Shirt, User } from "lucide-react";
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

  const getClassTone = (name: string) => {
    if (name === "NO_HELMET" || name === "NO_VEST") {
      return "text-rose-500 bg-rose-500/10 border-rose-500/20";
    }
    return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
  };

  return (
    <div className="rounded-2xl border border-border/40 bg-surface p-5 shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.3)] space-y-4">
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-border/30 pb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h4 className="font-bold text-sm text-foreground">
            {t("aiMetrics.perClass.title")}
          </h4>
        </div>
        <span className="text-xs text-muted-foreground font-medium">
          {metrics.length} {t("aiMetrics.perClass.class")}
        </span>
      </div>

      {/* Metrics List */}
      <div className="space-y-3.5">
        {metrics.map((item) => {
          const precisionPct = (item.precision * 100).toFixed(1);
          const recallPct = (item.recall * 100).toFixed(1);
          const f1Pct = (item.f1Score * 100).toFixed(1);

          return (
            <div
              key={item.className}
              className="rounded-xl border border-border/30 bg-surface/50 p-3 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.04)] space-y-2"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getClassTone(
                    item.className
                  )}`}
                >
                  {getClassNameVi(item.className)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {item.sampleCount.toLocaleString()} {t("aiMetrics.perClass.samples")}
                </span>
              </div>

              {/* Progress bars row */}
              <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                {/* Precision */}
                <div>
                  <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                    <span>{t("aiMetrics.perClass.precision")}</span>
                    <span className="font-bold text-foreground">{precisionPct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-border/40 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${item.precision * 100}%` }}
                    />
                  </div>
                </div>

                {/* Recall */}
                <div>
                  <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                    <span>{t("aiMetrics.perClass.recall")}</span>
                    <span className="font-bold text-foreground">{recallPct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-border/40 overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${item.recall * 100}%` }}
                    />
                  </div>
                </div>

                {/* F1-Score */}
                <div>
                  <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                    <span>{t("aiMetrics.perClass.f1")}</span>
                    <span className="font-bold text-foreground">{f1Pct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-border/40 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${item.f1Score * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
