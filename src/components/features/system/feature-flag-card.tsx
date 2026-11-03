"use client";

import { Check, ShieldCheck, Sparkles, X } from "lucide-react";
import type { SystemConfigItem } from "@/types";
import { useLocale } from "@/providers/locale-provider";

export interface FeatureFlagCardProps {
  flag: SystemConfigItem;
  onToggle: (flag: SystemConfigItem, enabled: boolean) => void;
  disabled?: boolean;
}

export function FeatureFlagCard({ flag, onToggle, disabled = false }: FeatureFlagCardProps) {
  const { t } = useLocale();
  const isEnabled = Boolean(flag.value);

  return (
    <div
      className="group flex flex-col justify-between gap-4 rounded-xl sm:rounded-2xl border border-border/40 bg-surface p-4 sm:p-5 shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[8px_14px_24px_rgba(0,0,0,0.1),-6px_-6px_14px_rgba(255,255,255,0.9)] dark:border-black/60 dark:bg-card/90 dark:shadow-[5px_5px_14px_rgba(0,0,0,0.55)] dark:hover:border-black dark:hover:bg-card dark:hover:shadow-[0_20px_36px_rgba(0,0,0,0.95),0_6px_16px_#000000]"
    >
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <span
              className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl ${
                isEnabled
                  ? "bg-success/15 text-success shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)] dark:bg-success/20 dark:shadow-[inset_1px_1px_2px_rgba(0,0,0,0.4)]"
                  : "bg-muted text-muted-foreground dark:bg-muted/60"
              }`}
            >
              {isEnabled ? <Sparkles className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </span>
            <div className="min-w-0">
              <span className="font-mono text-xs sm:text-sm font-bold text-primary truncate block">
                {flag.key}
              </span>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold shrink-0 ${
              isEnabled
                ? "bg-success/10 text-success border border-success/30 dark:border-success/40"
                : "bg-muted text-muted-foreground border border-border/30 dark:border-black/50"
            }`}
          >
            {isEnabled ? (
              <>
                <Check className="h-3 w-3" />
                {t("system.flags.enabled")}
              </>
            ) : (
              <>
                <X className="h-3 w-3" />
                {t("system.flags.disabled")}
              </>
            )}
          </span>
        </div>

        <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed min-h-[36px] line-clamp-2">
          {flag.description || "Tùy chỉnh tính năng vận hành hệ thống."}
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-border/30 pt-3 dark:border-black/60">
        <span className="text-[11px] sm:text-xs text-muted-foreground flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          {t("system.flags.hotToggle")}
        </span>

        {/* Neumorphic Switch */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onToggle(flag, !isEnabled)}
          className={`relative inline-flex h-7 w-12 sm:w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-40 ${
            isEnabled
              ? "bg-success shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2)]"
              : "bg-surface-elevated shadow-[inset_2px_2px_4px_rgba(0,0,0,0.15)] dark:bg-muted/80 dark:border-black/40"
          }`}
          aria-label={`Toggle ${flag.key}`}
        >
          <span
            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
              isEnabled ? "translate-x-5 sm:translate-x-6" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
