"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  Clock,
  Globe2,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import { StatsCard } from "@/components/ui/stats-cards";
import { useLocale } from "@/providers/locale-provider";
import type { MaintenanceConfig } from "@/types";

export interface MaintenanceKpiSummaryProps {
  config?: MaintenanceConfig | null;
  loading?: boolean;
}

export function MaintenanceKpiSummary({
  config,
  loading = false,
}: MaintenanceKpiSummaryProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const isEnabled = Boolean(config?.enabled);
  const status = config?.status || "ONLINE";

  // Tính toán thời gian dự kiến
  const timeDisplay = useMemo(() => {
    if (!isEnabled || !config?.estimatedEndAt) {
      return isVietnamese ? "Hoạt động chuẩn" : "Standard operation";
    }

    const end = new Date(config.estimatedEndAt).getTime();
    const now = Date.now();
    const diffMs = end - now;

    if (diffMs <= 0) {
      return isVietnamese ? "Đã đến hạn dự kiến" : "Past estimated end";
    }

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
      return `~${diffHours}h ${diffMins}m`;
    }
    return `~${diffMins}m`;
  }, [isEnabled, config?.estimatedEndAt, isVietnamese]);

  const bypassedRolesCount = Array.isArray(config?.bypassRoles)
    ? config.bypassRoles.length
    : 1;

  const bypassedIpsCount = Array.isArray(config?.bypassIps)
    ? config.bypassIps.length
    : 0;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Trạng thái vận hành */}
      <StatsCard
        title={t("maintenance.kpi.statusTitle")}
        value={
          loading
            ? "..."
            : isEnabled
              ? status === "READ_ONLY"
                ? t("maintenance.badge.readOnly")
                : t("maintenance.badge.active")
              : t("maintenance.badge.online")
        }
        icon={isEnabled ? (status === "READ_ONLY" ? AlertTriangle : ShieldAlert) : ShieldCheck}
        variant="soft-extruded"
        tone={isEnabled ? (status === "READ_ONLY" ? "warning" : "danger") : "success"}
        showGlow={isEnabled}
        description={t("maintenance.kpi.statusDesc")}
      />

      {/* 2. Thời gian bảo trì / Dự kiến */}
      <StatsCard
        title={t("maintenance.kpi.timeTitle")}
        value={loading ? "..." : timeDisplay}
        icon={Clock}
        variant="soft-extruded"
        tone={isEnabled ? "warning" : "default"}
        showGlow={false}
        description={t("maintenance.kpi.timeDesc")}
      />

      {/* 3. Vai trò được miễn trừ */}
      <StatsCard
        title={t("maintenance.kpi.rolesTitle")}
        value={loading ? "..." : `${bypassedRolesCount} ${isVietnamese ? "vai trò" : "roles"}`}
        icon={Users}
        variant="soft-extruded"
        tone="info"
        showGlow={false}
        description={t("maintenance.kpi.rolesDesc")}
      />

      {/* 4. Dải IP / Subnet miễn trừ */}
      <StatsCard
        title={t("maintenance.kpi.ipsTitle")}
        value={loading ? "..." : `${bypassedIpsCount} ${isVietnamese ? "địa chỉ / CIDR" : "IPs / Subnets"}`}
        icon={Globe2}
        variant="soft-extruded"
        tone="primary"
        showGlow={false}
        description={t("maintenance.kpi.ipsDesc")}
      />
    </div>
  );
}
