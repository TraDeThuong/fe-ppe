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
    <div className="space-y-4">
      {/* Header and Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/15">
              <Cpu className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-foreground">
                  {t("system.flags.title")}
                </h3>
                <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {activeCount}/{flags.length}
                </span>
              </div>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {t("system.flags.description")}
              </p>
            </div>
          </div>

          {!canManage && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400 self-start sm:self-auto">
              {t("system.readOnlyBadge")}
            </span>
          )}
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("system.flags.searchPlaceholder")}
              className="w-full rounded-xl border border-border/40 bg-surface pl-9 pr-3 py-1.5 text-xs text-foreground shadow-[inset_1px_1px_2px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:border-black/50 dark:bg-card/70"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              type="button"
              variant={statusFilter === "ALL" ? "primary" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("ALL")}
              className="h-8 text-xs rounded-xl px-2.5"
            >
              {t("system.flags.filterAll")} ({flags.length})
            </Button>
            <Button
              type="button"
              variant={statusFilter === "ENABLED" ? "primary" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("ENABLED")}
              className="h-8 text-xs rounded-xl px-2.5"
            >
              {t("system.flags.filterEnabled")} ({activeCount})
            </Button>
            <Button
              type="button"
              variant={statusFilter === "DISABLED" ? "primary" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("DISABLED")}
              className="h-8 text-xs rounded-xl px-2.5"
            >
              {t("system.flags.filterDisabled")} ({flags.length - activeCount})
            </Button>
          </div>
        </div>
      </div>

      {filteredFlags.length === 0 ? (
        <div className="rounded-2xl border border-border/40 bg-surface p-10 text-center shadow-[4px_4px_10px_rgba(0,0,0,0.06)] dark:border-black/60 dark:bg-card/90">
          <p className="text-sm text-muted-foreground">
            {search.trim() ? t("system.flags.noMatch") : isVietnamese
              ? "Không tìm thấy cờ tính năng nào trong hệ thống."
              : "No feature flags found in the system."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:gap-4 md:grid-cols-2">
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
