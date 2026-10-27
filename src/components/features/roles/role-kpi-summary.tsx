"use client";

import { Key, Lock, Shield, Users } from "lucide-react";
import { StatsCard } from "@/components/ui/stats-cards";
import { useLocale } from "@/providers/locale-provider";
import type { RoleDto } from "@/types";

export interface RoleKpiSummaryProps {
  roles: RoleDto[];
  totalPermissionsCount: number;
  loading?: boolean;
}

export function RoleKpiSummary({
  roles,
  totalPermissionsCount,
  loading = false,
}: RoleKpiSummaryProps) {
  const { t } = useLocale();

  const totalRoles = roles.length;
  const systemRolesCount = roles.filter((r) => r.isSystem).length;
  const totalAssignedUsers = roles.reduce((acc, r) => acc + (r.userCount || 0), 0);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title={t("roles.stats.totalRoles")}
        value={loading ? "..." : totalRoles}
        icon={Shield}
        variant="soft-extruded"
        tone="primary"
        description="Active access levels"
      />

      <StatsCard
        title={t("roles.stats.systemRoles")}
        value={loading ? "..." : systemRolesCount}
        icon={Lock}
        variant="soft-extruded"
        tone="warning"
        description="Immutable core roles"
      />

      <StatsCard
        title={t("roles.stats.totalPermissions")}
        value={loading ? "..." : totalPermissionsCount}
        icon={Key}
        variant="soft-extruded"
        tone="info"
        description="Granular endpoints & actions"
      />

      <StatsCard
        title={t("roles.stats.assignedUsers")}
        value={loading ? "..." : totalAssignedUsers}
        icon={Users}
        variant="soft-extruded"
        tone="success"
        description="Personnel covered"
      />
    </div>
  );
}
