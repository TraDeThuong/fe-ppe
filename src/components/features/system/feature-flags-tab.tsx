"use client";

import { Cpu } from "lucide-react";
import type { SystemConfigItem } from "@/types";
import { useLocale } from "@/providers/locale-provider";
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

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-44 animate-pulse rounded-2xl bg-surface-elevated/40"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-base font-semibold text-foreground">
              {t("system.flags.title")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("system.flags.description")}
            </p>
          </div>
        </div>

        {!canManage && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-500">
            {isVietnamese ? "Chế độ chỉ xem (Read-only)" : "Read-only mode"}
          </span>
        )}
      </div>

      {flags.length === 0 ? (
        <div className="rounded-2xl border border-border/40 bg-surface p-12 text-center">
          <p className="text-sm text-muted-foreground">
            {isVietnamese
              ? "Không tìm thấy cờ tính năng nào trong hệ thống."
              : "No feature flags found in the system."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {flags.map((flag) => (
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
