"use client";

import { Cpu } from "lucide-react";
import type { SystemConfigItem } from "@/types";
import { useLocale } from "@/providers/locale-provider";
import { FeatureFlagCard } from "./feature-flag-card";

export interface FeatureFlagsTabProps {
  flags: SystemConfigItem[];
  onToggle: (flag: SystemConfigItem, enabled: boolean) => void;
  loading?: boolean;
}

export function FeatureFlagsTab({ flags, onToggle, loading = false }: FeatureFlagsTabProps) {
  const { t } = useLocale();

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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {flags.map((flag) => (
          <FeatureFlagCard key={flag.id} flag={flag} onToggle={onToggle} />
        ))}
      </div>
    </div>
  );
}
