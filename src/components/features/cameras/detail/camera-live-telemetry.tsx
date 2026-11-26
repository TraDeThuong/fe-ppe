"use client";

import { AlertTriangle, ArrowUpRight, Images } from "lucide-react";
import { NM } from "@/components/features/ai-test/nm-styles";
import { useLocale } from "@/providers/locale-provider";
import {
  formatTimeSec,
  formatViolationLabel,
  normalizeViolationType,
} from "@/components/features/ai-test/ai-test-utils";
import type { LiveStatsResponse } from "@/types/ai-test.types";

export interface CameraLiveTelemetryProps {
  stats: LiveStatsResponse | null;
  galleryCount: number;
  onOpenGallery: () => void;
}

export function CameraLiveTelemetry({
  stats,
  galleryCount,
  onOpenGallery,
}: CameraLiveTelemetryProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const metrics = stats?.metrics;
  const recentViolations = stats?.recent_violations ?? [];

  return (
    <div className="space-y-6 xl:col-span-5">
      {/* 1. Bento Telemetry Matrix (4 modules) */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        {/* Display / AI FPS */}
        <div className={`relative overflow-hidden rounded-[22px] p-4 ${NM.extruded}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Display / AI FPS
            </span>
            <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
          </div>

          <div className="mt-2.5 flex items-baseline gap-1.5 font-mono">
            <span className="text-2xl font-black tracking-tight text-foreground">
              {typeof metrics?.fps === "number" ? metrics.fps.toFixed(1) : "--"}
            </span>
            <span className="text-xs font-semibold text-primary">
              /{" "}
              {typeof metrics?.ai_fps_actual === "number"
                ? `${metrics.ai_fps_actual.toFixed(1)} ai`
                : "--"}
            </span>
          </div>

          <div className={`mt-3 h-1.5 w-full overflow-hidden rounded-full ${NM.recessed}`}>
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
              style={{
                width: `${
                  typeof metrics?.ai_fps_actual === "number"
                    ? Math.min(100, Math.max(8, (metrics.ai_fps_actual / 30) * 100))
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        {/* Inference Latency & E2E Alert */}
        <div className={`relative overflow-hidden rounded-[22px] p-4 ${NM.extruded}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Inference Latency
            </span>
            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">
              MS
            </span>
          </div>

          <div className="mt-2.5 flex items-baseline gap-1.5 font-mono">
            <span className="text-2xl font-black tracking-tight text-foreground">
              {typeof metrics?.inference_latency_ms === "number"
                ? metrics.inference_latency_ms.toFixed(1)
                : "--"}
            </span>
            <span className="text-xs font-bold text-muted-foreground">ms</span>
          </div>

          <div className="mt-2.5 flex items-center justify-between border-t border-foreground/[0.06] pt-2 text-[11px]">
            <span className="font-medium text-muted-foreground">E2E Alert</span>
            <span className="font-mono font-bold text-primary">
              {typeof metrics?.e2e_alert_latency_ms === "number"
                ? `${metrics.e2e_alert_latency_ms.toFixed(1)} ms`
                : "--"}
            </span>
          </div>
        </div>

        {/* Entity Counts */}
        <div className={`relative overflow-hidden rounded-[22px] p-4 ${NM.extruded}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Entity Counts
            </span>
            <span className="text-[10px] font-bold text-primary">PPE Track</span>
          </div>

          <div className="mt-2.5 grid grid-cols-3 gap-2">
            <div className={`rounded-xl px-2 py-1.5 text-center ${NM.recessed}`}>
              <div className="font-mono text-sm font-black text-foreground">
                {metrics?.counts?.person ?? metrics?.active_persons ?? 0}
              </div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                Person
              </div>
            </div>

            <div className={`rounded-xl px-2 py-1.5 text-center ${NM.recessed}`}>
              <div className="font-mono text-sm font-black text-primary">
                {metrics?.counts?.helmet ?? 0}
              </div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                Helmet
              </div>
            </div>

            <div className={`rounded-xl px-2 py-1.5 text-center ${NM.recessed}`}>
              <div className="font-mono text-sm font-black text-accent">
                {metrics?.counts?.safety_vest ?? 0}
              </div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                Vest
              </div>
            </div>
          </div>
        </div>

        {/* Active Violations */}
        <div className={`relative overflow-hidden rounded-[22px] p-4 ${NM.extruded}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Active Violations
            </span>
            <span className="relative flex h-2.5 w-2.5">
              {(metrics?.active_violations ?? 0) > 0 && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
              )}
              <span
                className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                  (metrics?.active_violations ?? 0) > 0
                    ? "bg-accent shadow-[0_0_8px_hsl(var(--accent))]"
                    : "bg-muted-foreground/30"
                }`}
              />
            </span>
          </div>

          <div className="mt-2.5 flex items-baseline gap-2 font-mono">
            <span
              className={`text-2xl font-black tracking-tight ${
                (metrics?.active_violations ?? 0) > 0
                  ? "text-accent"
                  : "text-foreground"
              }`}
            >
              {metrics?.active_violations ?? 0}
            </span>
            <span className="font-sans text-xs font-medium text-muted-foreground">
              {isVietnamese ? "đang vi phạm" : "active violations"}
            </span>
          </div>

          <div className="mt-2.5 flex items-center justify-between border-t border-foreground/[0.06] pt-2 text-[11px]">
            <span className="font-medium text-muted-foreground">
              {isVietnamese ? "Tổng đã ghi nhận" : "Total recorded"}
            </span>
            <span className="rounded-full bg-accent/15 px-2 font-mono text-[10px] font-extrabold text-accent">
              {recentViolations.length}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Recent Violations Feed & Quick Jump to Evidence Gallery */}
      <section className={`relative overflow-hidden rounded-[26px] p-4 sm:p-5 ${NM.chassis}`}>
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <AlertTriangle className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold tracking-tight text-foreground">
                {isVietnamese ? "Sự kiện Vi phạm gần đây" : "Recent Violation Events"}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Real-time violation telemetry log
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-accent/15 px-2.5 py-1 font-mono text-xs font-extrabold text-accent">
              {recentViolations.length}
            </span>
            <button
              type="button"
              onClick={onOpenGallery}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-primary ${NM.tactileBtn}`}
            >
              <Images className="size-3.5" />
              <span>
                {isVietnamese ? "Sự cố & Ảnh" : "Incidents"} ({galleryCount})
              </span>
              <ArrowUpRight className="size-3.5" />
            </button>
          </div>
        </div>

        {recentViolations.length === 0 ? (
          <div className={`rounded-2xl px-4 py-8 text-center text-xs font-medium text-muted-foreground ${NM.recessed}`}>
            {isVietnamese ? (
              <>
                Chưa ghi nhận vi phạm nào trong session hiện tại. Lịch sử sự cố & ảnh bằng chứng Before / After vẫn xem được trong{" "}
                <button
                  type="button"
                  onClick={onOpenGallery}
                  className="font-bold text-primary underline-offset-2 hover:underline cursor-pointer"
                >
                  Tab 02 · Sự Cố & Bằng Chứng
                </button>
                .
              </>
            ) : (
              <>
                No violations recorded in the current session. Historical incidents & Before / After evidence can still be inspected in{" "}
                <button
                  type="button"
                  onClick={onOpenGallery}
                  className="font-bold text-primary underline-offset-2 hover:underline cursor-pointer"
                >
                  Tab 02 · Incidents & Evidence
                </button>
                .
              </>
            )}
          </div>
        ) : (
          <div className={`max-h-72 space-y-2.5 overflow-y-auto rounded-2xl p-2.5 ${NM.recessed}`}>
            {recentViolations
              .slice()
              .reverse()
              .map((v) => {
                const norm = normalizeViolationType(v.violation_type);
                const isCritical =
                  norm === "NO_HELMET" || norm === "RESTRICTED_AREA";
                return (
                  <div
                    key={v.event_id}
                    className={`relative flex flex-wrap items-center justify-between gap-2 overflow-hidden rounded-xl px-3.5 py-2.5 text-xs ${NM.extruded}`}
                  >
                    <span
                      className={`absolute inset-y-1.5 left-1 w-1 rounded-full ${
                        isCritical ? "bg-accent" : "bg-primary"
                      }`}
                    />
                    <div className="flex flex-wrap items-center gap-2 pl-2">
                      <span
                        className={`rounded-lg px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase tracking-wider ${
                          isCritical
                            ? "bg-accent/15 text-accent"
                            : "bg-primary/15 text-primary"
                        }`}
                      >
                        {formatViolationLabel(v.violation_type, locale)}
                      </span>
                      <span className="font-bold text-foreground">
                        Person #{v.canonical_person_id ?? v.person_id ?? "-"}
                      </span>
                      {typeof v.frame === "number" && (
                        <span className="rounded bg-foreground/[0.05] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
                          F#{v.frame}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[11px] font-medium text-muted-foreground">
                      {formatTimeSec(v.confirmed_t ?? v.start_t)} •{" "}
                      <strong className="font-bold text-foreground">
                        {(v.duration_s ?? 0).toFixed(1)}s
                      </strong>
                    </span>
                  </div>
                );
              })}
          </div>
        )}
      </section>
    </div>
  );
}

