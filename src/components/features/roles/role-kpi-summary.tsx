"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Key, Lock, Shield, Users } from "lucide-react";
import { StatsCard } from "@/components/ui/stats-cards";
import { useLocale } from "@/providers/locale-provider";
import type { PermissionDto, RoleDto } from "@/types";
import { RoleStatsDetailPanel, type RoleStatKey } from "./role-stats-detail-panel";

export interface RoleKpiSummaryProps {
  roles: RoleDto[];
  permissions?: PermissionDto[];
  totalPermissionsCount: number;
  loading?: boolean;
  selectedStat?: RoleStatKey | null;
  onSelectStat?: (stat: RoleStatKey | null) => void;
  onConfigurePermissions?: (role: RoleDto) => void;
  onCreateRole?: () => void;
}

export function RoleKpiSummary({
  roles,
  permissions = [],
  totalPermissionsCount,
  loading = false,
  selectedStat: propSelectedStat,
  onSelectStat,
  onConfigurePermissions,
  onCreateRole,
}: RoleKpiSummaryProps) {
  const { t } = useLocale();

  const [internalSelectedStat, setInternalSelectedStat] = useState<RoleStatKey | null>(null);

  const activeStat = propSelectedStat !== undefined ? propSelectedStat : internalSelectedStat;

  const handleToggle = (key: RoleStatKey) => {
    const next = activeStat === key ? null : key;
    if (onSelectStat) {
      onSelectStat(next);
    } else {
      setInternalSelectedStat(next);
    }
  };

  const totalRoles = roles.length;
  const systemRolesCount = roles.filter((r) => r.isSystem).length;
  const totalAssignedUsers = roles.reduce((acc, r) => acc + (r.userCount || 0), 0);

  // Hiệu ứng chìm sâu (neumorphic sunken) khi card được chọn:
  // - Chìm xuống dưới (translate-y-1.5)
  // - Đổ bóng âm sâu 2 lớp (deep inset shadow)
  // - Tuyệt đối KHÔNG có màu viền hay ring bao quanh
  // - Khi hover vẫn giữ nguyên trạng thái chìm sâu
  const sunkenClass =
    "!translate-y-1.5 !shadow-[inset_6px_6px_14px_var(--shadow-dark),inset_-6px_-6px_14px_var(--shadow-light),inset_2px_2px_4px_rgba(0,0,0,0.18)] dark:!shadow-[inset_6px_6px_16px_rgba(0,0,0,0.7),inset_-4px_-4px_10px_rgba(255,255,255,0.03)] hover:!translate-y-1.5 hover:!shadow-[inset_6px_6px_14px_var(--shadow-dark),inset_-6px_-6px_14px_var(--shadow-light),inset_2px_2px_4px_rgba(0,0,0,0.18)]";

  return (
    <div className="space-y-4">
      {/* Bento Grid 4 Stats Cards - 2x2 trên Mobile, 4 cột trên Desktop */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        {/* 1. Tổng số vai trò */}
        <StatsCard
          title={t("roles.stats.totalRoles")}
          value={loading ? "..." : totalRoles}
          icon={Shield}
          variant="soft-extruded"
          tone="primary"
          showGlow={false}
          description={t("roles.stats.totalRolesDesc")}
          onClick={() => handleToggle("totalRoles")}
          className={`transition-all duration-200 ${
            activeStat === "totalRoles" ? sunkenClass : "hover:border-primary/30"
          }`}
          footer={
            <span className="flex items-center text-[10px] font-semibold transition-colors gap-0.5">
              {activeStat === "totalRoles" ? (
                <span className="flex items-center text-primary font-bold gap-0.5">
                  {t("roles.stats.collapse")} <ChevronUp className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center text-muted-foreground hover:text-foreground gap-0.5">
                  {t("roles.stats.viewDetail")} <ChevronDown className="h-3 w-3" />
                </span>
              )}
            </span>
          }
        />

        {/* 2. Vai trò hệ thống */}
        <StatsCard
          title={t("roles.stats.systemRoles")}
          value={loading ? "..." : systemRolesCount}
          icon={Lock}
          variant="soft-extruded"
          tone="primary"
          showGlow={false}
          description={t("roles.stats.systemRolesDesc")}
          onClick={() => handleToggle("systemRoles")}
          className={`transition-all duration-200 ${
            activeStat === "systemRoles" ? sunkenClass : "hover:border-primary/30"
          }`}
          footer={
            <span className="flex items-center text-[10px] font-semibold transition-colors gap-0.5">
              {activeStat === "systemRoles" ? (
                <span className="flex items-center text-primary font-bold gap-0.5">
                  {t("roles.stats.collapse")} <ChevronUp className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center text-muted-foreground hover:text-foreground gap-0.5">
                  {t("roles.stats.viewDetail")} <ChevronDown className="h-3 w-3" />
                </span>
              )}
            </span>
          }
        />

        {/* 3. Tổng số quyền hạn */}
        <StatsCard
          title={t("roles.stats.totalPermissions")}
          value={loading ? "..." : totalPermissionsCount}
          icon={Key}
          variant="soft-extruded"
          tone="primary"
          showGlow={false}
          description={t("roles.stats.totalPermissionsDesc")}
          onClick={() => handleToggle("totalPermissions")}
          className={`transition-all duration-200 ${
            activeStat === "totalPermissions" ? sunkenClass : "hover:border-primary/30"
          }`}
          footer={
            <span className="flex items-center text-[10px] font-semibold transition-colors gap-0.5">
              {activeStat === "totalPermissions" ? (
                <span className="flex items-center text-primary font-bold gap-0.5">
                  {t("roles.stats.collapse")} <ChevronUp className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center text-muted-foreground hover:text-foreground gap-0.5">
                  {t("roles.stats.viewDetail")} <ChevronDown className="h-3 w-3" />
                </span>
              )}
            </span>
          }
        />

        {/* 4. Người dùng đã gán */}
        <StatsCard
          title={t("roles.stats.assignedUsers")}
          value={loading ? "..." : totalAssignedUsers}
          icon={Users}
          variant="soft-extruded"
          tone="primary"
          showGlow={false}
          description={t("roles.stats.assignedUsersDesc")}
          onClick={() => handleToggle("assignedUsers")}
          className={`transition-all duration-200 ${
            activeStat === "assignedUsers" ? sunkenClass : "hover:border-primary/30"
          }`}
          footer={
            <span className="flex items-center text-[10px] font-semibold transition-colors gap-0.5">
              {activeStat === "assignedUsers" ? (
                <span className="flex items-center text-primary font-bold gap-0.5">
                  {t("roles.stats.collapse")} <ChevronUp className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center text-muted-foreground hover:text-foreground gap-0.5">
                  {t("roles.stats.viewDetail")} <ChevronDown className="h-3 w-3" />
                </span>
              )}
            </span>
          }
        />
      </div>

      {/* Khung thông tin chi tiết mở rộng ngay dưới stats */}
      {activeStat && (
        <RoleStatsDetailPanel
          activeStat={activeStat}
          roles={roles}
          permissions={permissions}
          totalPermissionsCount={totalPermissionsCount}
          onClose={() => handleToggle(activeStat)}
          onConfigurePermissions={onConfigurePermissions}
          onCreateRole={onCreateRole}
        />
      )}
    </div>
  );
}
