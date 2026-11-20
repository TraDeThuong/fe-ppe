"use client";

import { useMemo, useState } from "react";
import { Cpu, Filter, Search, Sparkles } from "lucide-react";
import type { SystemConfigItem } from "@/types";
import { useLocale } from "@/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { FeatureFlagCard } from "./feature-flag-card";

export interface FeatureFlagsTabProps {
  flags: SystemConfigItem[];
  onToggle: (flag: SystemConfigItem, enabled: boolean) => void;
  loading?: boolean;
  canManage?: boolean;
}

export function FeatureFlagsTab({
  flags,
  onToggle,
  loading = false,
  canManage = true,
}: FeatureFlagsTabProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ENABLED" | "DISABLED">("ALL");

  const filteredFlags = useMemo(() => {
    return flags.filter((flag) => {
      const isEnabled = Boolean(flag.value);
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ENABLED" && isEnabled) ||
        (statusFilter === "DISABLED" && !isEnabled);

      const matchesSearch =
        !search.trim() ||
        flag.key.toLowerCase().includes(search.toLowerCase()) ||
        (flag.description && flag.description.toLowerCase().includes(search.toLowerCase()));

      return matchesStatus && matchesSearch;
    });
  }, [flags, search, statusFilter]);

  const activeCount = useMemo(() => flags.filter((f) => Boolean(f.value)).length, [flags]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3.5 sm:gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-44 animate-pulse rounded-2xl bg-surface-elevated/40 dark:bg-card/40"
          />
        ))}
      </div>
    );
  }

  return (
<div className="space-y-5">
  {/* =========================================================
      1. NEUMORPHIC HEADER & FILTER BAR
  ========================================================= */}
  <section className="relative overflow-hidden rounded-[24px] border border-white/65 bg-surface p-4 sm:p-5 shadow-[8px_8px_18px_var(--shadow-dark),-8px_-8px_18px_rgba(255,255,255,0.85)] dark:border-white/[0.06] dark:bg-card dark:shadow-[8px_8px_20px_rgba(0,0,0,0.55),-3px_-3px_10px_rgba(255,255,255,0.03)] space-y-4">
    {/* Specular Rim Top Highlight */}
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-8 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent"
    />

    {/* Row 1: Title + Ratio Telemetry + Read-Only Pill */}
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3.5">
        {/* Extruded + Debossed Emblem Pod */}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] border border-white/70 bg-surface text-primary shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.9)] dark:border-white/[0.06] dark:bg-card dark:shadow-[4px_4px_10px_rgba(0,0,0,0.5)]">
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary/[0.08] shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_rgba(255,255,255,0.75)] dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.65)]">
            <Cpu className="h-4.5 w-4.5" />
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-extrabold tracking-tight text-foreground sm:text-[15px]">
              {t("system.flags.title")}
            </h3>

            {/* Recessed Counter Pill */}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-background/65 px-2.5 py-0.5 font-mono text-[11px] font-extrabold text-primary shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] dark:bg-black/30 dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.65)]">
              <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_5px_var(--primary)]" />
              {activeCount}/{flags.length}
            </span>
          </div>
          <p className="mt-0.5 hidden truncate text-xs text-muted-foreground sm:block">
            {t("system.flags.description")}
          </p>
        </div>
      </div>

      {!canManage && (
        <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-accent/15 px-3 py-1 text-[11px] font-extrabold text-accent shadow-[inset_2px_2px_4px_var(--shadow-dark)] dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.65)] sm:self-auto">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          {t("system.readOnlyBadge")}
        </span>
      )}
    </div>

    {/* Row 2: Recessed Filter & Search Well */}
    <div className="flex flex-col gap-2.5 rounded-[18px] bg-background/60 p-2.5 shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_rgba(255,255,255,0.85)] dark:bg-black/30 dark:shadow-[inset_3px_3px_8px_rgba(0,0,0,0.7)] sm:flex-row sm:items-center">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-primary/80" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("system.flags.searchPlaceholder")}
          className="h-9 w-full rounded-[12px] border border-white/60 bg-surface pl-9 pr-3 text-xs font-medium text-foreground shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_rgba(255,255,255,0.85)] placeholder:text-muted-foreground/75 focus:border-primary/40 focus:outline-none dark:border-white/[0.06] dark:bg-card dark:shadow-[2px_2px_6px_rgba(0,0,0,0.55)]"
        />
      </div>

      {/* Segmented Status Keys */}
      <div className="flex shrink-0 items-center gap-1.5">
        {(
          [
            {
              key: "ALL",
              label: t("system.flags.filterAll"),
              count: flags.length,
              activeTone: "bg-primary text-primary-foreground",
            },
            {
              key: "ENABLED",
              label: t("system.flags.filterEnabled"),
              count: activeCount,
              activeTone: "bg-primary text-primary-foreground",
            },
            {
              key: "DISABLED",
              label: t("system.flags.filterDisabled"),
              count: flags.length - activeCount,
              activeTone: "bg-accent text-accent-foreground",
            },
          ] as const
        ).map((tab) => {
          const isSelected = statusFilter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-[12px] px-3 text-xs font-extrabold transition-all duration-150 ${
                isSelected
                  ? `${tab.activeTone} shadow-[3px_3px_8px_rgba(0,0,0,0.2)]`
                  : "border border-white/60 bg-surface text-muted-foreground shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_rgba(255,255,255,0.85)] hover:text-foreground dark:border-white/[0.05] dark:bg-card dark:shadow-[2px_2px_5px_rgba(0,0,0,0.5)]"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-md px-1.5 py-0.2 font-mono text-[10px] ${
                  isSelected
                    ? "bg-black/15 text-current"
                    : "bg-background/70 text-muted-foreground dark:bg-black/30"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  </section>

  {/* =========================================================
      2. EMPTY STATE OR FEATURE FLAG GRID
  ========================================================= */}
  {filteredFlags.length === 0 ? (
    <div className="rounded-[24px] border border-white/60 bg-surface p-12 text-center shadow-[8px_8px_18px_var(--shadow-dark),-8px_-8px_18px_rgba(255,255,255,0.85)] dark:border-white/[0.06] dark:bg-card dark:shadow-[8px_8px_20px_rgba(0,0,0,0.55)]">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[16px] bg-primary/[0.08] text-primary shadow-[inset_2px_2px_5px_var(--shadow-dark)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.65)]">
        <Cpu className="h-6 w-6" />
      </div>
      <p className="text-xs font-bold text-muted-foreground">
        {search.trim()
          ? t("system.flags.noMatch")
          : isVietnamese
            ? "Không tìm thấy cờ tính năng nào trong hệ thống."
            : "No feature flags found in the system."}
      </p>
    </div>
  ) : (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {filteredFlags.map((flag) => (
        <FeatureFlagCard
          key={flag.id}
          flag={flag}
          onToggle={onToggle}
          disabled={!canManage}
        />
      ))}
    </div>
  )}
</div>
  );
}
