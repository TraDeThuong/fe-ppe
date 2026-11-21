"use client";

import { ShieldCheck, Sparkles, X } from "lucide-react";
import type { SystemConfigItem } from "@/types";
import { isFeatureFlagEnabled } from "@/lib/system-config";
import { useLocale } from "@/providers/locale-provider";

export interface FeatureFlagCardProps {
  flag: SystemConfigItem;
  onToggle: (flag: SystemConfigItem, enabled: boolean) => void;
  disabled?: boolean;
}

export function FeatureFlagCard({ flag, onToggle, disabled = false }: FeatureFlagCardProps) {
  const { t, locale } = useLocale();
  const isEnabled = isFeatureFlagEnabled(flag.value);

  return (
    <div
      className={`group relative flex flex-col justify-between gap-4 overflow-hidden rounded-[24px] border p-5 transition-all duration-300 hover:-translate-y-0.5 ${
        isEnabled
          ? "border-primary/30 bg-surface shadow-[8px_8px_18px_var(--shadow-dark),-8px_-8px_18px_rgba(255,255,255,0.9)] dark:border-primary/25 dark:bg-card dark:shadow-[8px_8px_20px_rgba(0,0,0,0.58),-3px_-3px_10px_rgba(255,255,255,0.03)]"
          : "border-white/55 bg-surface/90 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_rgba(255,255,255,0.8)] opacity-90 hover:opacity-100 dark:border-white/[0.05] dark:bg-card/85 dark:shadow-[6px_6px_15px_rgba(0,0,0,0.48),-2px_-2px_6px_rgba(255,255,255,0.02)]"
      }`}
    >
      {/* Specular Rim Top Highlight */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-7 top-0 h-[2px] bg-gradient-to-r from-transparent to-transparent transition-opacity duration-300 ${
          isEnabled ? "via-primary/45 opacity-100" : "via-border/60 opacity-60"
        }`}
      />

      {/* =========================================================
          1. HEADER & DESCRIPTION
      ========================================================= */}
      <div className="relative space-y-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {/* Extruded + Debossed Icon Pod */}
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] border transition-all duration-300 ${
                isEnabled
                  ? "border-primary/25 bg-surface text-primary shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_rgba(255,255,255,0.9)] dark:bg-card dark:shadow-[4px_4px_10px_rgba(0,0,0,0.55)]"
                  : "border-white/60 bg-surface text-muted-foreground shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_rgba(255,255,255,0.85)] dark:border-white/[0.05] dark:bg-card dark:shadow-[3px_3px_8px_rgba(0,0,0,0.5)]"
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-[10px] transition-colors ${
                  isEnabled
                    ? "bg-primary/10 shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_rgba(255,255,255,0.75)] dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.65)]"
                    : "bg-background/70 shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark)] dark:bg-black/30"
                }`}
              >
                {isEnabled ? (
                  <Sparkles className="h-4 w-4" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </div>
            </div>

            {/* Recessed Key Plate */}
            <div className="min-w-0">
              <span
                title={flag.key}
                className={`inline-block max-w-full truncate rounded-lg bg-background/65 px-2.5 py-1 font-mono text-xs font-extrabold tracking-tight shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] dark:bg-black/35 dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.7)] ${
                  isEnabled ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {flag.key}
              </span>
            </div>
          </div>

          {/* Status Pill */}
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-extrabold tracking-wide shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_rgba(255,255,255,0.75)] dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.65)] ${
              isEnabled
                ? "bg-primary/10 text-primary"
                : "bg-background/75 text-muted-foreground dark:bg-black/35"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isEnabled ? "bg-primary" : "bg-muted-foreground/45"
              }`}
            />
            {isEnabled ? t("system.flags.enabled") : t("system.flags.disabled")}
          </span>
        </div>

        {/* Description */}
        <p className="line-clamp-2 min-h-[38px] text-xs leading-relaxed text-foreground/80">
          {flag.description ||
            (locale === "vi-VN"
              ? "Tùy chỉnh tính năng vận hành hệ thống."
              : "Configure system operational feature.")}
        </p>
      </div>

      {/* =========================================================
          2. GROOVED FOOTER & TACTILE NEUMORPHIC SWITCH
      ========================================================= */}
      <div className="relative flex items-center justify-between pt-3.5 before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-border/45 before:to-transparent">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-background/60 px-2.5 py-1 text-[11px] font-bold text-muted-foreground shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark)] dark:bg-black/30">
          <ShieldCheck className={`h-3.5 w-3.5 ${isEnabled ? "text-primary" : "text-muted-foreground"}`} />
          {t("system.flags.hotToggle")}
        </span>

        {/* Mechanical Neumorphic Toggle Switch */}
        <button
          type="button"
          role="switch"
          aria-checked={isEnabled}
          disabled={disabled}
          onClick={() => onToggle(flag, !isEnabled)}
          aria-label={`Toggle ${flag.key}`}
          className={`relative inline-flex h-[28px] w-[52px] shrink-0 cursor-pointer items-center rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-45 ${
            isEnabled
              ? "bg-primary/15 shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_rgba(255,255,255,0.85)] dark:bg-primary/20 dark:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.75)]"
              : "bg-background/80 shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_rgba(255,255,255,0.85)] dark:bg-black/45 dark:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.75)]"
          }`}
        >
          {/* Extruded Thumb Knob */}
          <span
            className={`pointer-events-none flex h-[20px] w-[20px] items-center justify-center rounded-full transition-all duration-300 ${
              isEnabled
                ? "translate-x-[28px] bg-primary shadow-[2px_2px_6px_rgba(0,0,0,0.3),-1px_-1px_3px_rgba(255,255,255,0.4)]"
                : "translate-x-[4px] bg-surface shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_rgba(255,255,255,0.9)] dark:bg-card dark:shadow-[2px_2px_5px_rgba(0,0,0,0.65)]"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                isEnabled
                  ? "bg-primary-foreground"
                  : "bg-muted-foreground/35"
              }`}
            />
          </span>
        </button>
      </div>
    </div>
  );
}
