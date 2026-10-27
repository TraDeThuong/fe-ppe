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
    <div className="flex flex-col justify-between gap-4 rounded-2xl border border-border/40 bg-surface p-5 shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] transition-all duration-200 hover:shadow-[6px_6px_14px_rgba(0,0,0,0.08),-6px_-6px_14px_rgba(255,255,255,0.9)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.3),-4px_-4px_10px_rgba(255,255,255,0.02)]">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                isEnabled
                  ? "bg-success/15 text-success shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)]"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {isEnabled ? <Sparkles className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </span>
            <span className="font-mono text-xs font-semibold text-primary">
              {flag.key}
            </span>
          </div>

          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              isEnabled
                ? "bg-success/10 text-success border border-success/30"
                : "bg-muted text-muted-foreground border border-border/30"
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

        <p className="text-sm text-foreground/80 leading-relaxed min-h-[40px]">
          {flag.description || "Tùy chỉnh tính năng vận hành hệ thống."}
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-border/30 pt-3">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Hot-toggle live
        </span>

        {/* Neumorphic Switch */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onToggle(flag, !isEnabled)}
          className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
            isEnabled
              ? "bg-success shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2)]"
              : "bg-surface-elevated shadow-[inset_2px_2px_4px_rgba(0,0,0,0.15)] dark:bg-muted"
          }`}
          aria-label={`Toggle ${flag.key}`}
        >
          <span
            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
              isEnabled ? "translate-x-6" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
