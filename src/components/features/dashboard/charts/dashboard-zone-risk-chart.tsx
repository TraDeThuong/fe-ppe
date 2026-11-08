
"use client";

import { useLocale } from "@/providers/locale-provider";
import type { CameraItem } from "@/types";
import type { DashboardCameraStat } from "@/types/dashboard.types";
import { DashboardPanel } from "../dashboard-data-state";

export interface DashboardZoneRiskChartProps {
  cameras?: CameraItem[];
  cameraStats: DashboardCameraStat[];
  catalogComplete?: boolean;
  className?: string;
  topOnly?: boolean;
  onSelectCamera?: (id: string) => void;
}

export function DashboardZoneRiskChart({
  cameras = [],
  cameraStats,
  catalogComplete = false,
  className,
  topOnly = false,
  onSelectCamera,
}: DashboardZoneRiskChartProps) {
  const { t, number } = useLocale();

  const stats = new Map(cameraStats.map((row) => [row.cameraId, row]));
  const cameraMap = new Map(cameras.map((camera) => [camera.id, camera]));

  const ids = topOnly
    ? cameraStats.slice(0, 5).map((row) => row.cameraId)
    : [
        ...new Set([
          ...cameras.map((camera) => camera.id),
          ...cameraStats.map((row) => row.cameraId),
        ]),
      ];

  return (
    <DashboardPanel
      title={t(
        topOnly ? "dashboard.charts.topCameras" : "dashboard.charts.cameras",
      )}
      description={t("dashboard.charts.cameraScope")}
      className={className}
    >
      {!ids.length ? (
        <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-[22px] border border-border/30 bg-background/50 px-4 py-12 text-center shadow-[inset_3px_3px_8px_rgba(0,0,0,0.06),inset_-3px_-3px_8px_rgba(255,255,255,0.8)] dark:border-white/[0.05] dark:bg-background/30 dark:shadow-[inset_3px_3px_8px_rgba(0,0,0,0.25),inset_-1px_-1px_5px_rgba(255,255,255,0.02)]">
          <div className="mb-3 flex size-14 items-center justify-center rounded-2xl border border-border/30 bg-surface text-primary shadow-[5px_5px_10px_rgba(0,0,0,0.08),-5px_-5px_10px_rgba(255,255,255,0.85)] dark:border-white/[0.06] dark:bg-card dark:shadow-[4px_4px_9px_rgba(0,0,0,0.3),-2px_-2px_6px_rgba(255,255,255,0.02)]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="size-6"
            >
              <path
                d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z"
                strokeLinecap="round"
              />
              <circle cx="12" cy="12" r="3" />
              <path
                d="m20 9 2-1v8l-2-1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="text-sm font-semibold text-muted-foreground">
            {t("dashboard.charts.noIncidents")}
          </p>
        </div>
      ) : (
        <div className="max-h-[520px] space-y-4 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]">
          {ids.map((id, index) => {
            const camera = cameraMap.get(id);
            const row = stats.get(id);

            const total = row?.total ?? 0;
            const pending = row?.pending ?? 0;
            const resolved = Math.max(total - pending, 0);

            const pendingRate =
              total > 0 ? Math.min((pending / total) * 100, 100) : 0;

            const resolvedRate =
              total > 0
                ? Math.max(0, Math.min((resolved / total) * 100, 100))
                : 0;

            const cameraName =
              camera?.name ||
              row?.cameraName ||
              (id === "OTHER"
                ? t("dashboard.type.OTHER")
                : `Camera ${id.slice(0, 8)}`);

            const canSelect = !!onSelectCamera && id !== "OTHER";

            const isOnline = camera?.status === "ONLINE";
            const isOffline = camera?.status === "OFFLINE";

            return (
              <button
                key={id}
                type="button"
                disabled={!canSelect}
                onClick={() => onSelectCamera?.(id)}
                className={[
                  "group relative w-full overflow-hidden rounded-[22px] border p-4 text-left sm:p-5",
                  "border-border/40 bg-surface",
                  "shadow-[7px_8px_18px_rgba(0,0,0,0.08),-6px_-6px_16px_rgba(255,255,255,0.85)]",
                  "dark:border-white/[0.06] dark:bg-card",
                  "dark:shadow-[6px_7px_16px_rgba(0,0,0,0.3),-2px_-2px_8px_rgba(255,255,255,0.025)]",
                  "transition-all duration-300 ease-out",
                  canSelect
                    ? "cursor-pointer hover:-translate-y-1 hover:border-primary/30 hover:shadow-[9px_12px_22px_rgba(0,0,0,0.1),-7px_-7px_18px_rgba(255,255,255,0.9)] active:translate-y-0 dark:hover:border-primary/25"
                    : "cursor-default",
                ].join(" ")}
              >
                {/* Ambient highlight */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-12 -top-16 size-40 rounded-full bg-primary/[0.07] blur-3xl transition-opacity duration-300 group-hover:opacity-100"
                />

                {/* Accent rail */}
                <div
                  className={[
                    "absolute bottom-5 left-0 top-5 w-1 rounded-r-full",
                    pending > 0 ? "bg-accent" : "bg-primary/40",
                  ].join(" ")}
                />

                <div className="relative pl-2">
                  {/* Camera identity */}
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-surface text-primary shadow-[4px_4px_8px_rgba(0,0,0,0.09),-4px_-4px_8px_rgba(255,255,255,0.85)] dark:border-primary/20 dark:bg-card dark:shadow-[3px_3px_7px_rgba(0,0,0,0.3),-2px_-2px_6px_rgba(255,255,255,0.025)]">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          className="size-5"
                        >
                          <path
                            d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z"
                            strokeLinecap="round"
                          />
                          <circle cx="12" cy="12" r="3" />
                          <path
                            d="m20 9 2-1v8l-2-1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold tracking-tight text-foreground transition-colors group-hover:text-primary">
                          {cameraName}
                        </p>
                        <p className="mt-1 truncate font-mono text-[10px] font-medium tracking-wide text-muted-foreground">
                          {camera?.code || `ID: ${id.slice(0, 12)}`}
                        </p>
                      </div>
                    </div>

                    {/* Connection status */}
                    <div
                      className={[
                        "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5",
                        "bg-background/70 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.05),inset_-2px_-2px_4px_rgba(255,255,255,0.7)]",
                        "dark:border-white/[0.05] dark:bg-background/40 dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.25)]",
                        isOnline
                          ? "border-primary/20"
                          : isOffline
                            ? "border-destructive/20"
                            : "border-border/30",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "size-2 rounded-full",
                          isOnline
                            ? "bg-primary shadow-[0_0_7px_rgba(90,150,60,0.55)]"
                            : isOffline
                              ? "bg-destructive"
                              : "bg-muted-foreground/50",
                        ].join(" ")}
                      />
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {camera
                          ? t(`dashboard.camera.${camera.status}`)
                          : t("dashboard.camera.unknown")}
                      </span>
                    </div>
                  </div>

                  {/* Incident metrics */}
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    {/* Total incidents */}
                    <div className="relative min-w-0 overflow-hidden rounded-2xl border border-border/30 bg-background/60 p-3.5 shadow-[inset_3px_3px_7px_rgba(0,0,0,0.07),inset_-3px_-3px_7px_rgba(255,255,255,0.8)] dark:border-white/[0.04] dark:bg-background/40 dark:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.28),inset_-1px_-1px_5px_rgba(255,255,255,0.02)]">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {t("dashboard.charts.incidents")}
                        </p>
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-surface text-primary shadow-[2px_2px_5px_rgba(0,0,0,0.08),-2px_-2px_5px_rgba(255,255,255,0.8)] dark:bg-card dark:shadow-none">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            className="size-3.5"
                          >
                            <path
                              d="M12 8v4l2.5 2.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                      </div>

                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black tabular-nums tracking-tight text-foreground">
                          {number.format(total)}
                        </span>
                        <span className="truncate text-[10px] font-medium text-muted-foreground">
                          {t("dashboard.charts.total") || "Total"}
                        </span>
                      </div>
                    </div>

                    {/* Pending incidents */}
                    <div className="relative min-w-0 overflow-hidden rounded-2xl border border-accent/20 bg-accent/[0.045] p-3.5 shadow-[inset_3px_3px_7px_rgba(0,0,0,0.06),inset_-3px_-3px_7px_rgba(255,255,255,0.8)] dark:bg-accent/[0.06] dark:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.28),inset_-1px_-1px_5px_rgba(255,255,255,0.02)]">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {t("dashboard.charts.backlog")}
                        </p>
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-surface text-accent shadow-[2px_2px_5px_rgba(0,0,0,0.08),-2px_-2px_5px_rgba(255,255,255,0.8)] dark:bg-card dark:shadow-none">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            className="size-3.5"
                          >
                            <path
                              d="M12 8v4m0 4h.01M10.3 3.8 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                      </div>

                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black tabular-nums tracking-tight text-accent">
                          {number.format(pending)}
                        </span>
                        <span className="rounded-md bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-accent">
                          {total > 0 ? `${Math.round(pendingRate)}%` : "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Resolution progress */}
                  <div className="mt-4 rounded-2xl border border-border/25 bg-background/40 p-3.5 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.045),inset_-2px_-2px_5px_rgba(255,255,255,0.65)] dark:border-white/[0.04] dark:bg-background/25 dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.2)]">
                    <div className="mb-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex size-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="size-3"
                          >
                            <path
                              d="m5 12 4 4L19 6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {t("dashboard.charts.backlog")}
                        </span>
                      </div>

                      <span className="font-mono text-[10px] font-extrabold tabular-nums text-primary">
                        {Math.round(resolvedRate)}%
                      </span>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full border border-border/20 bg-background/80 p-[2px] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.09)] dark:border-white/[0.04] dark:bg-background/60">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary shadow-[1px_1px_3px_rgba(0,0,0,0.15)] transition-all duration-700 ease-out"
                        style={{ width: `${resolvedRate}%` }}
                      />
                    </div>

                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {number.format(resolved)} / {number.format(total)}
                      </span>
                      <span className="text-[10px] font-semibold text-primary">
                        {total > 0
                          ? `${number.format(resolved)} / ${number.format(total)}`
                          : t("dashboard.charts.noneInPeriod")}
                      </span>
                    </div>
                  </div>

                  {!total && (
                    <p className="mt-2 text-[10px] italic text-muted-foreground">
                      {t("dashboard.charts.noneInPeriod")}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {!catalogComplete && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-accent/15 bg-accent/[0.06] px-3.5 py-3 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.025)] dark:bg-accent/[0.07]">
          <span className="mt-1 size-2 shrink-0 rounded-full bg-accent shadow-[0_0_6px_rgba(180,140,60,0.35)]" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("dashboard.charts.catalogUnavailable")}
          </p>
        </div>
      )}
    </DashboardPanel>
  );
}
