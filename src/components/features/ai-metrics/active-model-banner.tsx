
"use client";

import {
  CheckCircle2,
  Cpu,
  HardDrive,
  Layers,
  Sparkles,
} from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import type { AiModelVersionDto } from "@/types";

export interface ActiveModelBannerProps {
  activeVersion?: AiModelVersionDto | null;
  loading?: boolean;
}

export function ActiveModelBanner({
  activeVersion,
  loading = false,
}: ActiveModelBannerProps) {
  const { t } = useLocale();

  const version = activeVersion?.version || "v2.1.0-STABLE";
  const framework = activeVersion?.framework || "TENSORRT";
  const inputSize = activeVersion?.inputSize || "640x640";
  const deployedAt = activeVersion?.deployedAt
    ? new Date(activeVersion.deployedAt).toLocaleDateString("vi-VN")
    : "20/10/2026";

  const specs = [
    {
      icon: Layers,
      label: t("aiMetrics.activeBanner.framework"),
      value: `${framework} FP16`,
    },
    {
      icon: HardDrive,
      label: t("aiMetrics.activeBanner.inputSize"),
      value: inputSize,
    },
    {
      icon: Sparkles,
      label: t("aiMetrics.activeBanner.deployedAt"),
      value: deployedAt,
    },
  ];

  return (
    <section
      className="
        relative isolate overflow-hidden rounded-[22px]
        border border-white/70 dark:border-white/[0.10]
        bg-background
        px-4 py-3.5 sm:px-5
        shadow-[7px_8px_16px_var(--shadow-dark),-6px_-6px_15px_var(--shadow-light)]
        transition-shadow duration-300
        hover:shadow-[9px_10px_20px_var(--shadow-dark),-7px_-7px_17px_var(--shadow-light)]
      "
    >
      {/* Sculpted glass-like bevel */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute inset-0 rounded-[22px]
          shadow-[inset_1px_1px_0_rgba(255,255,255,0.85),inset_-1px_-1px_0_rgba(0,0,0,0.035)]
          dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.10),inset_-1px_-1px_0_rgba(0,0,0,0.15)]
        "
      />

      {/* Reflected light along the upper edge */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute left-[8%] right-[8%] top-0
          h-px bg-gradient-to-r from-transparent
          via-white to-transparent opacity-100
          dark:opacity-30
        "
      />

      {/* Quiet architectural light, not colored glow */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute -right-10 -top-16
          h-36 w-56 rounded-full
          bg-white/30 blur-3xl dark:bg-white/[0.035]
        "
      />

      <div className="relative flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Model identity */}
        <div className="flex min-w-0 items-center gap-3.5">
          <div
            className="
              relative flex h-12 w-12 shrink-0 items-center justify-center
              rounded-[17px] bg-background text-foreground
              shadow-[5px_6px_10px_var(--shadow-dark),-5px_-5px_10px_var(--shadow-light)]
              before:absolute before:inset-[3px] before:rounded-[14px]
              before:border before:border-white/90 before:content-['']
              after:pointer-events-none after:absolute after:inset-[5px]
              after:rounded-[12px]
              after:shadow-[inset_1px_1px_2px_rgba(255,255,255,0.8),inset_-1px_-1px_2px_rgba(0,0,0,0.04)]
              after:content-['']
              dark:before:border-white/10
              dark:after:shadow-[inset_1px_1px_2px_rgba(255,255,255,0.05)]
            "
          >
            <Cpu className="relative z-10 h-[22px] w-[22px] stroke-[1.7] drop-shadow-[0_1px_0_rgba(255,255,255,0.5)]" />

            <span
              className="
                absolute -right-1 -top-1 z-20
                flex h-4 w-4 items-center justify-center
                rounded-full border-2 border-background bg-background
                shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)]
              "
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
          </div>

          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span
                className="
                  inline-flex items-center gap-1.5
                  rounded-full bg-background px-2 py-1
                  text-[9px] font-bold uppercase tracking-[0.13em]
                  text-emerald-600
                  shadow-[inset_1px_1px_2px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)]
                  dark:text-emerald-400
                "
              >
                <CheckCircle2 className="h-3 w-3" />
                {t("aiMetrics.governance.activeBadge")}
              </span>

              <span className="text-[10px] font-medium tracking-wide text-muted-foreground">
                YOLOv8n-PPE
              </span>
            </div>

            <h3 className="truncate text-sm font-bold tracking-tight text-foreground sm:text-[15px]">
              {loading ? "Đang tải phiên bản..." : version}
            </h3>
          </div>
        </div>

        {/* Floating telemetry modules */}
        <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-3 sm:flex sm:items-center">
          {specs.map(({ icon: Icon, label, value }, index) => (
            <div
              key={label}
              className="
                group relative flex min-w-0 items-center gap-2.5
                rounded-[14px] border border-white/80
                bg-background px-3 py-2.5
                shadow-[4px_5px_8px_var(--shadow-dark),-3px_-3px_8px_var(--shadow-light)]
                transition-all duration-200
                hover:-translate-y-0.5
                hover:shadow-[5px_6px_10px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]
                dark:border-white/[0.08]
                sm:min-w-[112px]
              "
            >
              {/* Tiny metallic index */}
              <span
                className="
                  absolute right-2 top-1.5
                  text-[8px] font-semibold tabular-nums
                  text-muted-foreground/40
                "
              >
                0{index + 1}
              </span>

              <div
                className="
                  flex h-8 w-8 shrink-0 items-center justify-center
                  rounded-[11px] bg-background text-muted-foreground
                  shadow-[inset_1px_1px_2px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)]
                  transition-shadow duration-200
                  group-hover:shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)]
                "
              >
                <Icon className="h-4 w-4 stroke-[1.7]" />
              </div>

              <div className="min-w-0 pr-2">
                <p className="truncate text-[9px] leading-4 text-muted-foreground">
                  {label}
                </p>
                <p
                  className="truncate text-xs font-bold leading-4 tracking-tight text-foreground"
                  title={value}
                >
                  {value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
