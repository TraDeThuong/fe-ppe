"use client";

import { useState } from "react";
import {
  Battery,
  Eye,
  Laptop,
  Smartphone,
  Sparkles,
  Wifi,
} from "lucide-react";
import { MaintenanceScreen } from "./maintenance-screen";
import { useLocale } from "@/providers/locale-provider";
import type { MaintenanceConfig } from "@/types";

export interface MaintenancePreviewCardProps {
  config?: MaintenanceConfig | null;
}

export function MaintenancePreviewCard({
  config,
}: MaintenancePreviewCardProps) {
  const { t, locale } = useLocale();
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  return (
    <div className="rounded-2xl border border-border/40 bg-background p-5 shadow-[6px_6px_15px_var(--shadow-dark),-6px_-6px_15px_var(--shadow-light)] sm:p-6 flex flex-col h-full">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/30 pb-4">
        <div>
          <h3 className="text-base font-bold text-foreground sm:text-lg flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            {t("maintenance.preview.title")}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("maintenance.preview.desc")}
          </p>
        </div>

        {/* Device Switcher */}
        <div className="flex items-center gap-1 rounded-xl border border-border/40 bg-surface p-1 shadow-[inset_1px_1px_3px_var(--shadow-dark)]">
          <button
            type="button"
            onClick={() => setDevice("desktop")}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
              device === "desktop"
                ? "bg-background text-primary shadow-[2px_2px_5px_var(--shadow-dark)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Laptop className="h-3.5 w-3.5" />
            <span>{t("maintenance.preview.desktop")}</span>
          </button>
          <button
            type="button"
            onClick={() => setDevice("mobile")}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
              device === "mobile"
                ? "bg-background text-primary shadow-[2px_2px_5px_var(--shadow-dark)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>{t("maintenance.preview.mobile")}</span>
          </button>
        </div>
      </div>

      {/* Simulator Container */}
      <div className="relative flex-1 rounded-xl border border-border/30 bg-surface/50 p-3 sm:p-6 overflow-hidden flex items-center justify-center min-h-[460px] shadow-[inset_2px_2px_6px_var(--shadow-dark),inset_-2px_-2px_6px_var(--shadow-light)]">
        {device === "desktop" ? (
          /* Desktop Simulator Window */
          <div className="w-full max-w-3xl rounded-2xl border border-border/50 bg-background overflow-hidden shadow-[6px_6px_18px_var(--shadow-dark),-6px_-6px_18px_var(--shadow-light)]">
            {/* Fake browser bar */}
            <div className="flex items-center gap-2 border-b border-border/30 bg-surface px-4 py-2">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <div className="mx-auto text-[11px] font-mono text-muted-foreground bg-background px-3 py-0.5 rounded-md border border-border/30 w-48 text-center truncate">
                https://smartppe.vn
              </div>
            </div>

            {/* Screen Content */}
            <div className="p-4 sm:p-6">
              <MaintenanceScreen config={config} isPreview />
            </div>
          </div>
        ) : (
          /* Mobile Smartphone Simulator Frame (iPhone aspect ratio) */
          <div className="relative w-[300px] h-[520px] rounded-[42px] border-[8px] border-zinc-800 dark:border-zinc-700 bg-background overflow-hidden shadow-[0_20px_45px_rgba(0,0,0,0.35)] flex flex-col shrink-0 select-none">
            {/* Phone Status Bar */}
            <div className="relative z-20 flex items-center justify-between px-6 pt-3 pb-1 text-[10px] font-semibold text-foreground/80 shrink-0">
              <span>09:41</span>
              {/* Dynamic Island */}
              <div className="h-3.5 w-20 rounded-full bg-black mx-auto" />
              <div className="flex items-center gap-1.5">
                <Wifi className="h-3 w-3 text-foreground/80" />
                <Battery className="h-3.5 w-3.5 text-foreground/80" />
              </div>
            </div>

            {/* Phone Screen Content (Properly centered & fitted, with no awkward height stretch) */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-2 flex flex-col justify-center">
              <MaintenanceScreen
                config={config}
                isPreview
                previewMode="mobile"
              />
            </div>

            {/* Phone Bottom Home Bar */}
            <div className="py-2 shrink-0 flex justify-center">
              <div className="h-1 w-28 rounded-full bg-zinc-400 dark:bg-zinc-600" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
