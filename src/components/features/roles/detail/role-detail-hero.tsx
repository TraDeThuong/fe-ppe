"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronRight,
  Copy,
  Edit2,
  Key,
  Lock,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCan } from "@/hooks/use-can";
import { useLocale } from "@/providers/locale-provider";
import { toast } from "@/lib/toast";
import {
  RESOURCE_CATEGORY_ORDER,
  getPermissionCategory,
  type PermissionDto,
  type ResourceCategory,
  type RoleDto,
} from "@/types";
import { getRoleKnowledgeProfile } from "../role-guide-data";

export interface RoleDetailHeroProps {
  role: RoleDto;
  allRoles: RoleDto[];
  allPermissions: PermissionDto[];
  activeTab: string;
  onConfigurePermissions: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onViewUsers: () => void;
  onSelectCategoryFilter?: (category: ResourceCategory) => void;
}

export function RoleDetailHero({
  role,
  allRoles,
  allPermissions,
  activeTab,
  onConfigurePermissions,
  onEdit,
  onDelete,
  onViewUsers,
  onSelectCategoryFilter,
}: RoleDetailHeroProps) {
  const router = useRouter();
  const { t, locale } = useLocale();
  const can = useCan();
  const isVietnamese = locale === "vi-VN";
  const [copiedId, setCopiedId] = useState(false);

  const isAdmin = role.name.toUpperCase() === "ADMIN";
  const profile = useMemo(() => getRoleKnowledgeProfile(role, locale), [role, locale]);

  // Calculate permissions breakdown across 8 categories
  const categoryBreakdown = useMemo(() => {
    const rolePermIds = new Set((role.permissions || []).map((p) => p.id));
    const rolePermNames = new Set((role.permissions || []).map((p) => p.name));

    return RESOURCE_CATEGORY_ORDER.map((cat) => {
      const totalInCat = allPermissions.filter((p) => getPermissionCategory(p) === cat);

      const grantedInCat = totalInCat.filter(
        (p) => rolePermIds.has(p.id) || rolePermNames.has(p.name),
      );

      // Fallback if allPermissions is still loading
      const fallbackGranted = (role.permissions || []).filter(
        (p) => getPermissionCategory(p) === cat,
      );

      const grantedCount =
        allPermissions.length > 0 ? grantedInCat.length : fallbackGranted.length;
      const totalCount =
        allPermissions.length > 0 ? totalInCat.length : Math.max(grantedCount, 1);
      const percent = totalCount > 0 ? Math.round((grantedCount / totalCount) * 100) : 0;

      return {
        category: cat,
        title: t(`rbac.category.${cat}`),
        grantedCount,
        totalCount,
        percent,
      };
    });
  }, [role.permissions, allPermissions, t]);

  const handleCopyId = () => {
    navigator.clipboard.writeText(role.id);
    setCopiedId(true);
    toast.success(
      isVietnamese ? "Đã sao chép mã định danh vai trò" : "Copied role ID to clipboard",
    );
    setTimeout(() => setCopiedId(false), 2000);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString(isVietnamese ? "vi-VN" : "en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  return (
    <div className="space-y-4">
      {/* ── 1. TOP NAVIGATION & QUICK ACTIONS BAR ─────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/roles")}
            className="
              group inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 sm:px-3.5
              border border-white/70 bg-surface text-xs font-semibold
              text-muted-foreground
              shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_rgba(255,255,255,0.85)]
              transition-all duration-200
              hover:-translate-y-0.5 hover:text-primary
              hover:shadow-[5px_5px_10px_var(--shadow-dark),-4px_-4px_9px_rgba(255,255,255,0.95)]
              active:translate-y-[1px]
              active:shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]
              dark:border-white/5 dark:bg-card
              dark:shadow-[3px_3px_7px_rgba(0,0,0,0.38),-2px_-2px_6px_rgba(255,255,255,0.025)]
            "
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-1" />
            <span className="sm:hidden">{t("roles.detailPage.backShort")}</span>
            <span className="hidden sm:inline">{t("roles.detailPage.back")}</span>
          </button>

          {/* Quick Role Switcher Pills */}
          {allRoles.length > 1 && (
            <div className="hidden lg:flex items-center gap-1 rounded-xl border border-white/60 bg-surface/80 p-1 shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_rgba(255,255,255,0.75)] dark:border-white/5 dark:bg-card/80">
              <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("roles.detailPage.switchRole")}
              </span>
              {allRoles.map((r) => {
                const isCurrent = r.id === role.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      if (!isCurrent) {
                        router.push(`/roles/${r.id}?tab=${activeTab}`);
                      }
                    }}
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 font-mono text-[11px] font-bold transition-all ${
                      isCurrent
                        ? "bg-card text-primary shadow-sm border border-primary/30"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                    }`}
                  >
                    {r.isSystem ? (
                      <Lock className="h-2.5 w-2.5 shrink-0" />
                    ) : (
                      <Shield className="h-2.5 w-2.5 shrink-0" />
                    )}
                    <span>{r.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div
          className="
            flex items-center gap-1 sm:gap-1.5 rounded-2xl p-1 sm:p-1.5
            border border-white/60 bg-surface/90
            shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_rgba(255,255,255,0.75)]
            dark:border-white/5 dark:bg-card/80
            dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.35),inset_-1px_-1px_4px_rgba(255,255,255,0.025)]
          "
        >
          {can("ROLE_PERMISSION_ASSIGN") && (
            <Button
              variant="outline"
              size="sm"
              onClick={onConfigurePermissions}
              className="h-8 rounded-xl border-transparent px-2.5 sm:px-3 text-xs text-primary shadow-none hover:border-primary/20 hover:bg-primary/10"
            >
              <Key className="mr-1 sm:mr-1.5 h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("roles.configurePermissions")}</span>
              <span className="sm:hidden">{t("roles.actions.permissions")}</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onViewUsers}
            className="h-8 rounded-xl border-transparent px-2.5 sm:px-3 text-xs text-accent shadow-none hover:border-accent/20 hover:bg-accent/10"
          >
            <UserPlus className="mr-1 sm:mr-1.5 h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {isVietnamese ? "Quản lý nhân sự" : "Manage Personnel"}
            </span>
            <span className="sm:hidden">{isVietnamese ? "Nhân sự" : "Users"}</span>
          </Button>

          {can("ROLE_UPDATE") && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="h-8 rounded-xl border-transparent px-2.5 sm:px-3 text-xs text-muted-foreground shadow-none hover:bg-background/70 hover:text-foreground"
            >
              <Edit2 className="mr-1 sm:mr-1.5 h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("roles.actions.edit")}</span>
            </Button>
          )}

          {!role.isSystem && can("ROLE_DELETE") && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="h-8 rounded-xl border-transparent px-2.5 sm:px-3 text-xs text-danger shadow-none hover:border-danger/20 hover:bg-danger/10"
            >
              <Trash2 className="mr-1 sm:mr-1.5 h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("roles.actions.delete")}</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── 2. HERO OVERVIEW SECTION ──────────────────────────────────── */}
      <section
        className="
          relative overflow-hidden rounded-[24px]
          border border-white/80 bg-surface p-3.5 sm:p-5 lg:p-6
          shadow-[8px_8px_18px_var(--shadow-dark),-7px_-7px_18px_rgba(255,255,255,0.9)]
          transition-shadow duration-300
          dark:border-white/[0.06] dark:bg-card
          dark:shadow-[8px_8px_20px_rgba(0,0,0,0.48),-3px_-3px_10px_rgba(255,255,255,0.025)]
        "
      >
        {/* Top ambient highlight */}
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent dark:via-white/10" />

        <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] xl:gap-6">
          {/* ── LEFT: ROLE IDENTITY & MISSION ─────────────────────────── */}
          <div className="flex min-w-0 flex-col justify-between gap-4 sm:gap-5">
            <div className="space-y-4">
              {/* Role Title + Badges */}
              <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                <div
                  className="
                    relative flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-[14px] sm:rounded-[18px]
                    border border-white/80 bg-surface-elevated/80 text-primary
                    shadow-[5px_5px_10px_var(--shadow-dark),-5px_-5px_11px_rgba(255,255,255,0.95)]
                    dark:border-white/10 dark:bg-card
                    dark:shadow-[5px_5px_10px_rgba(0,0,0,0.45),-2px_-2px_7px_rgba(255,255,255,0.035)]
                  "
                >
                  {role.isSystem ? (
                    <Lock className="h-5 w-5 sm:h-7 sm:w-7 stroke-[1.8]" />
                  ) : (
                    <Shield className="h-5 w-5 sm:h-7 sm:w-7 stroke-[1.8]" />
                  )}
                  <span className="absolute bottom-1 right-1 sm:bottom-1.5 sm:right-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-surface dark:ring-card" />
                </div>

                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <h1 className="min-w-0 break-words font-mono text-lg font-extrabold leading-tight tracking-tight text-foreground sm:text-2xl">
                      {role.name}
                    </h1>

                    {role.isSystem ? (
                      <span
                        className="
                          inline-flex items-center gap-1 rounded-full px-2.5 py-0.5
                          border border-primary/20 bg-primary/[0.09] text-[10px] sm:text-[11px] font-bold text-primary
                          shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_rgba(255,255,255,0.85)]
                        "
                      >
                        <Lock className="h-3 w-3" />
                        {t("roles.badge.system")} • {t("roles.detail.immutable")}
                      </span>
                    ) : (
                      <span
                        className="
                          inline-flex items-center gap-1 rounded-full px-2.5 py-0.5
                          border border-border/50 bg-background/70 text-[10px] sm:text-[11px] font-bold text-muted-foreground
                          shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_rgba(255,255,255,0.85)]
                        "
                      >
                        <Shield className="h-3 w-3 text-primary" />
                        {t("roles.badge.custom")}
                      </span>
                    )}

                    {isAdmin && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold text-warning">
                        <ShieldAlert className="h-3 w-3" />
                        {t("roles.permissions.antiLockoutBadge")}
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-xs sm:text-sm font-bold text-primary">
                    {profile.title}
                  </p>
                </div>
              </div>

              {/* Recessed Security Level & Mission Panel */}
              <div
                className="
                  relative space-y-3 rounded-2xl p-3.5 sm:p-4
                  border border-black/[0.025] bg-background/55
                  shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_rgba(255,255,255,0.8)]
                  dark:border-white/[0.035] dark:bg-background/40
                  dark:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.35),inset_-2px_-2px_5px_rgba(255,255,255,0.02)]
                "
              >
                <div className="flex items-start gap-3">
                  <div
                    className="
                      flex h-9 w-9 shrink-0 items-center justify-center rounded-xl
                      border border-white/70 bg-surface text-primary
                      shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_rgba(255,255,255,0.9)]
                      dark:border-white/5 dark:bg-card
                      dark:shadow-[3px_3px_6px_rgba(0,0,0,0.35),-1px_-1px_4px_rgba(255,255,255,0.025)]
                    "
                  >
                    <ShieldCheck className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1 py-0.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/75">
                      {isVietnamese ? "CẤP ĐỘ AN NINH & PHẠM VI" : "SECURITY CLEARANCE & SCOPE"}
                    </p>
                    <p className="mt-0.5 break-words text-xs sm:text-sm font-bold text-foreground">
                      {profile.securityLevel}
                    </p>
                  </div>
                </div>

                <div className="border-t border-border/30 pt-2.5 text-xs leading-relaxed text-muted-foreground space-y-1.5">
                  <p className="text-foreground/90 font-medium">
                    {t(`roles.desc.${role.name}`) !== `roles.desc.${role.name}`
                      ? t(`roles.desc.${role.name}`)
                      : role.description || t("roles.detail.noDescription")}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{profile.mission}</p>
                </div>
              </div>
            </div>

            {/* Metadata Footer Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
                <span className="font-mono text-[10px]">ID: {role.id.slice(0, 13)}...</span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-background/60 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-primary transition"
                  title={isVietnamese ? "Sao chép Role UUID" : "Copy Role UUID"}
                >
                  {copiedId ? (
                    <Check className="h-3 w-3 text-primary" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-primary/80" />
                  {isVietnamese ? "Khởi tạo:" : "Created:"} {formatDate(role.createdAt)}
                </span>
                {role.updatedAt && (
                  <span className="hidden sm:inline-flex items-center gap-1">
                    • {isVietnamese ? "Cập nhật:" : "Updated:"} {formatDate(role.updatedAt)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT: PERMISSION DOMAIN BREAKDOWN CARD ───────────────── */}
          <div
            className="
              relative flex flex-col justify-between rounded-[21px] p-3.5 sm:p-4
              border border-white/80 bg-surface-elevated/65
              shadow-[inset_1px_1px_2px_rgba(255,255,255,0.9),7px_7px_15px_var(--shadow-dark),-5px_-5px_12px_rgba(255,255,255,0.85)]
              dark:border-white/[0.06] dark:bg-background/55
              dark:shadow-[inset_1px_1px_2px_rgba(255,255,255,0.035),6px_6px_14px_rgba(0,0,0,0.4),-2px_-2px_6px_rgba(255,255,255,0.02)]
            "
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between gap-2 border-b border-border/30 pb-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div
                    className="
                      flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px]
                      border border-white/80 bg-surface text-primary
                      shadow-[4px_4px_8px_var(--shadow-dark),-4px_-4px_8px_rgba(255,255,255,0.95)]
                      dark:border-white/10 dark:bg-card
                      dark:shadow-[4px_4px_8px_rgba(0,0,0,0.4),-2px_-2px_5px_rgba(255,255,255,0.025)]
                    "
                  >
                    <Key className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-sm font-extrabold tracking-tight text-foreground">
                      {isVietnamese ? "Cơ cấu Quyền theo Phân hệ" : "Privilege Domain Breakdown"}
                    </h2>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {isVietnamese
                        ? "Bấm vào phân hệ để lọc quyền tương ứng"
                        : "Click a domain to filter its permissions"}
                    </p>
                  </div>
                </div>

                <span
                  className="
                    flex h-8 min-w-8 shrink-0 items-center justify-center rounded-xl px-2.5
                    border border-primary/15 bg-primary/[0.08] font-mono text-xs font-extrabold text-primary
                    shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_rgba(255,255,255,0.85)]
                    dark:bg-primary/10
                  "
                >
                  {role.permissions?.length ?? 0}/{allPermissions.length || 54}
                </span>
              </div>

              {/* 8 Domain Progress Cards */}
              <div className="mt-3 space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {categoryBreakdown.map((item) => (
                  <button
                    key={item.category}
                    type="button"
                    onClick={() => onSelectCategoryFilter?.(item.category)}
                    className="
                      group w-full text-left rounded-[14px] p-2.5
                      border border-white/80 bg-surface
                      shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_rgba(255,255,255,0.9)]
                      transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30
                      dark:border-white/[0.06] dark:bg-card
                      dark:shadow-[3px_3px_7px_rgba(0,0,0,0.4),-1px_-1px_4px_rgba(255,255,255,0.02)]
                    "
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-foreground group-hover:text-primary transition-colors truncate">
                        {item.title}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-mono text-[11px] font-bold text-primary">
                          {item.grantedCount}/{item.totalCount}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          ({item.percent}%)
                        </span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>

                    {/* Progress Track */}
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-background/80 shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer note */}
            <div className="mt-3 flex items-center justify-between border-t border-border/25 pt-2.5 text-[10px] text-muted-foreground">
              <span>{t("roles.detail.leastPrivilege")}</span>
              <span className="font-mono font-semibold text-primary">RBAC v2.0</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
