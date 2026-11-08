"use client";

import { useMemo } from "react";
import { Compass, Key, ScrollText, Users } from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import type { RoleDto } from "@/types";
import type { RoleDetailTabKey } from "./role-detail-tabs";

export interface RoleDetailKpiBarProps {
  role: RoleDto;
  totalPermissionsCount: number;
  assignedUsersCount: number;
  activeUsersCount: number;
  twoFactorUsersCount: number;
  accessiblePagesCount: number;
  totalPagesCount: number;
  auditLogsCount: number;
  onSelectTab?: (tab: RoleDetailTabKey) => void;
  className?: string;
}

export function RoleDetailKpiBar({
  role,
  totalPermissionsCount,
  assignedUsersCount,
  activeUsersCount,
  twoFactorUsersCount,
  accessiblePagesCount,
  totalPagesCount,
  auditLogsCount,
  onSelectTab,
  className = "",
}: RoleDetailKpiBarProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const grantedCount = role.permissions?.length ?? 0;
  const totalPerms = totalPermissionsCount || 54;
  const coveragePercent =
    totalPerms > 0 ? Math.round((grantedCount / totalPerms) * 100) : 0;

  const cards = useMemo(
    () => [
      {
        id: "permissions",
        tab: "permissions" as RoleDetailTabKey,
        icon: Key,
        title: t("roles.detailPage.kpi.permissionsTitle"),
        subtitle: t("roles.detailPage.kpi.permissionsSub"),
        toneIcon: "bg-primary/10 text-primary border border-primary/20",
        valueRender: (
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-foreground tabular-nums">
              {grantedCount}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-muted-foreground/80 tabular-nums">
              /{totalPerms}
            </span>
          </div>
        ),
        badgeRender: (
          <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary border border-primary/20 font-mono">
            {coveragePercent}%
          </span>
        ),
      },
      {
        id: "users",
        tab: "users" as RoleDetailTabKey,
        icon: Users,
        title: t("roles.detailPage.kpi.usersTitle"),
        subtitle: isVietnamese
          ? `${activeUsersCount} hoạt động • ${twoFactorUsersCount} bật 2FA`
          : `${activeUsersCount} active • ${twoFactorUsersCount} 2FA`,
        toneIcon: "bg-primary/10 text-primary border border-primary/20",
        valueRender: (
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-foreground tabular-nums">
              {assignedUsersCount}
            </span>
            <span className="text-[11px] sm:text-xs font-normal text-muted-foreground">
              {t("roles.table.personnel").toLowerCase()}
            </span>
          </div>
        ),
        badgeRender: (
          <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary border border-primary/20">
            {assignedUsersCount > 0
              ? isVietnamese
                ? "Đang gán"
                : "Assigned"
              : isVietnamese
              ? "Trống"
              : "Empty"}
          </span>
        ),
      },
      {
        id: "capabilities",
        tab: "capabilities" as RoleDetailTabKey,
        icon: Compass,
        title: t("roles.detailPage.kpi.pagesTitle"),
        subtitle: t("roles.detailPage.kpi.pagesSub"),
        toneIcon: "bg-accent/15 text-accent border border-accent/25",
        valueRender: (
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-foreground tabular-nums">
              {accessiblePagesCount}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-muted-foreground/80 tabular-nums">
              /{totalPagesCount}
            </span>
            <span className="ml-1 text-[11px] font-normal text-muted-foreground">
              {isVietnamese ? "trang" : "pages"}
            </span>
          </div>
        ),
        badgeRender: (
          <span className="inline-flex items-center rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent border border-accent/25 font-mono">
            {totalPagesCount > 0
              ? `${Math.round((accessiblePagesCount / totalPagesCount) * 100)}%`
              : "0%"}
          </span>
        ),
      },
      {
        id: "audit",
        tab: "audit-logs" as RoleDetailTabKey,
        icon: ScrollText,
        title: t("roles.detailPage.kpi.auditTitle"),
        subtitle: t("roles.detailPage.kpi.auditSub"),
        toneIcon: "bg-primary/10 text-primary border border-primary/20",
        valueRender: (
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-foreground tabular-nums">
              {auditLogsCount}
            </span>
            <span className="text-[11px] sm:text-xs font-normal text-muted-foreground">
              {isVietnamese ? "sự kiện" : "events"}
            </span>
          </div>
        ),
        badgeRender: (
          <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary border border-primary/20">
            {role.isSystem ? t("roles.detail.immutable") : t("roles.badge.custom")}
          </span>
        ),
      },
    ],
    [
      t,
      isVietnamese,
      grantedCount,
      totalPerms,
      coveragePercent,
      assignedUsersCount,
      activeUsersCount,
      twoFactorUsersCount,
      accessiblePagesCount,
      totalPagesCount,
      auditLogsCount,
      role.isSystem,
    ],
  );

  return (
    <section
      aria-label={isVietnamese ? "Chỉ số tổng quan vai trò" : "Role KPI Metrics"}
      className={`grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-4 ${className}`}
    >
      {cards.map((card) => {
        const Icon = card.icon;
        const isClickable = Boolean(onSelectTab);

        return (
          <button
            key={card.id}
            type="button"
            disabled={!isClickable}
            onClick={isClickable ? () => onSelectTab?.(card.tab) : undefined}
            className="
              group relative flex flex-col justify-between overflow-hidden text-left
              rounded-xl sm:rounded-2xl p-3 sm:p-4
              border border-white/80 bg-surface
              shadow-[4px_4px_10px_var(--shadow-dark),-3px_-3px_9px_rgba(255,255,255,0.85)]
              transition-all duration-200
              hover:-translate-y-0.5 hover:shadow-[6px_6px_14px_var(--shadow-dark),-4px_-4px_12px_rgba(255,255,255,0.95)]
              active:translate-y-px active:shadow-[inset_2px_2px_5px_var(--shadow-dark)]
              dark:border-white/[0.06] dark:bg-card
              dark:shadow-[4px_4px_10px_rgba(0,0,0,0.4),-2px_-2px_6px_rgba(255,255,255,0.025)]
              dark:hover:shadow-[6px_6px_14px_rgba(0,0,0,0.45)]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
            "
          >
            {/* Ambient light gradient on top border */}
            <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/10" />

            {/* Card Header */}
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={`
                    flex size-7 shrink-0 items-center justify-center rounded-lg
                    border border-black/[0.04] shadow-sm dark:border-white/[0.05]
                    ${card.toneIcon}
                  `}
                >
                  <Icon className="size-3.5 sm:size-4 stroke-[2]" />
                </span>
                <span className="truncate text-[11px] sm:text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                  {card.title}
                </span>
              </div>

              {card.badgeRender}
            </div>

            {/* Card Body */}
            <div className="mt-2.5 sm:mt-3">
              {card.valueRender}
              <p className="mt-1 hidden sm:block truncate text-[10px] text-muted-foreground/75">
                {card.subtitle}
              </p>
            </div>
          </button>
        );
      })}
    </section>
  );
}
