"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  BookOpen,
  Cctv,
  CheckCircle2,
  Cpu,
  ExternalLink,
  Lock,
  Search,
  Settings2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
  Webhook,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/providers/locale-provider";
import type { PermissionDto, RoleDto, ResourceCategory } from "@/types";
import { RESOURCE_CATEGORY_ORDER, getPermissionCategory } from "@/types";
import {
  getRoleKnowledgeProfile,
  type RoleKnowledgeProfile,
} from "./role-guide-data";

const CATEGORY_ICONS: Record<ResourceCategory, typeof Shield> = {
  INCIDENTS_SAFETY: ShieldAlert,
  SITES_CAMERAS: Cctv,
  ANALYTICS_AI: Cpu,
  USER_MANAGEMENT: Users,
  RBAC_SECURITY: ShieldCheck,
  NOTIFICATIONS: Bell,
  WEBHOOK: Webhook,
  SYSTEM_OPS: Settings2,
};

export interface RolePermissionsGuideProps {
  roles: RoleDto[];
  allPermissions: PermissionDto[];
  selectedRoleId?: string;
  onSelectRole?: (roleId: string) => void;
  onBackToList: () => void;
  onConfigurePermissions?: (role: RoleDto) => void;
}

export function RolePermissionsGuide({
  roles,
  allPermissions,
  selectedRoleId: propSelectedRoleId,
  onSelectRole,
  onBackToList,
  onConfigurePermissions,
}: RolePermissionsGuideProps) {
  const { t, locale } = useLocale();
  const [internalSelectedRoleId, setInternalSelectedRoleId] = useState<string>("");
  const [searchRole, setSearchRole] = useState("");

  const activeRoleId = propSelectedRoleId || internalSelectedRoleId || roles[0]?.id || "";

  const handleSelect = (id: string) => {
    if (onSelectRole) {
      onSelectRole(id);
    } else {
      setInternalSelectedRoleId(id);
    }
  };

  const currentRole = useMemo(
    () => roles.find((r) => r.id === activeRoleId) || roles[0],
    [roles, activeRoleId],
  );

  // Lọc vai trò theo tìm kiếm ở cột trái
  const filteredRoles = useMemo(() => {
    if (!searchRole.trim()) return roles;
    const query = searchRole.toLowerCase();
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        (r.description && r.description.toLowerCase().includes(query)),
    );
  }, [roles, searchRole]);

  // Hồ sơ kiến thức của vai trò đang chọn (Tự động thích ứng song ngữ EN/VI)
  const profile: RoleKnowledgeProfile = useMemo(() => {
    return getRoleKnowledgeProfile(currentRole, locale);
  }, [currentRole, locale]);

  // Phân loại quyền kỹ thuật của vai trò theo 8 nhóm nghiệp vụ
  const categorizedPermissions = useMemo(() => {
    const groups = Object.fromEntries(
      RESOURCE_CATEGORY_ORDER.map((cat) => [cat, [] as PermissionDto[]]),
    ) as Record<ResourceCategory, PermissionDto[]>;

    if (!currentRole?.permissions) return groups;

    currentRole.permissions.forEach((p) => {
      const cat = getPermissionCategory(p);
      const target = groups[cat] ?? groups.SYSTEM_OPS;
      target.push(p);
    });

    return groups;
  }, [currentRole]);

  // Tổng số quyền mỗi nhóm trên toàn hệ thống để hiển thị tỷ lệ X/Y
  const totalPerCategory = useMemo(() => {
    const counts = Object.fromEntries(
      RESOURCE_CATEGORY_ORDER.map((cat) => [cat, 0]),
    ) as Record<ResourceCategory, number>;

    allPermissions.forEach((p) => {
      const cat = getPermissionCategory(p);
      counts[cat] = (counts[cat] ?? 0) + 1;
    });

    return counts;
  }, [allPermissions]);

  return (
    <div className="space-y-5">
      {/* ── TOP NAV BAR ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/60 bg-surface p-3.5 sm:p-4 shadow-[8px_8px_18px_var(--shadow-dark),-8px_-8px_18px_rgba(255,255,255,0.85)] dark:border-white/[0.06] dark:bg-card dark:shadow-[8px_8px_20px_rgba(0,0,0,0.55),-3px_-3px_10px_rgba(255,255,255,0.03)]">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onBackToList}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-[13px] border border-white/70 bg-surface px-3 text-xs font-bold text-foreground shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.85)] transition-all duration-150 hover:text-primary active:shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_rgba(255,255,255,0.85)] dark:border-white/[0.06] dark:bg-card dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45),-2px_-2px_6px_rgba(255,255,255,0.03)] dark:active:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.65)]"
          >
            <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>{t("roles.guide.back")}</span>
          </button>

          <div className="hidden h-7 w-px bg-gradient-to-b from-transparent via-border/60 to-transparent sm:block" />

          <div className="flex min-w-0 items-center gap-3">
            {/* Extruded Icon Pod */}
            <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-white/70 bg-surface text-primary shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_rgba(255,255,255,0.9)] dark:border-white/[0.06] dark:bg-card dark:shadow-[4px_4px_9px_rgba(0,0,0,0.5)] sm:flex">
              <div className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-primary/[0.08] shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_rgba(255,255,255,0.75)] dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.65)]">
                <BookOpen className="h-4 w-4" />
              </div>
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-xs font-extrabold leading-tight text-foreground sm:text-[15px]">
                {t("roles.guide.title")}
              </h2>
              <p className="mt-0.5 hidden truncate text-[11px] text-muted-foreground sm:block">
                {t("roles.guide.description")}
              </p>
            </div>
          </div>
        </div>

        {currentRole && onConfigurePermissions && (
          <button
            type="button"
            onClick={() => onConfigurePermissions(currentRole)}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-[13px] bg-primary px-3.5 text-xs font-extrabold text-primary-foreground shadow-[4px_4px_12px_rgba(var(--primary-rgb),0.35),-3px_-3px_8px_rgba(255,255,255,0.7)] transition-all duration-150 hover:brightness-105 active:scale-[0.98] dark:shadow-[4px_4px_14px_rgba(0,0,0,0.6),-2px_-2px_6px_rgba(255,255,255,0.05)]"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{t("roles.guide.editPermissions")}</span>
          </button>
        )}
      </div>

      {/* ── MOBILE ROLE SELECTOR (TACTILE KEYS) ──────────────────────────────── */}
      <div className="-mx-0.5 overflow-x-auto px-0.5 pb-1 md:hidden">
        <div className="flex min-w-max items-center gap-2 rounded-[18px] bg-background/60 p-1.5 shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_rgba(255,255,255,0.85)] dark:bg-black/30 dark:shadow-[inset_3px_3px_8px_rgba(0,0,0,0.7)]">
          {roles.map((r) => {
            const isSelected = r.id === currentRole?.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => handleSelect(r.id)}
                className={`flex items-center gap-1.5 rounded-[12px] px-3 py-1.5 text-xs font-extrabold transition-all duration-200 ${isSelected
                    ? "border border-primary/25 bg-surface text-primary shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_rgba(255,255,255,0.9)] dark:bg-card dark:shadow-[3px_3px_7px_rgba(0,0,0,0.6)]"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {r.isSystem ? (
                  <Lock className="h-3 w-3 shrink-0" />
                ) : (
                  <Shield className="h-3 w-3 shrink-0" />
                )}
                <span className="font-mono">{r.name}</span>
                <span className="text-[10px] opacity-75">
                  ({r.permissions?.length ?? 0})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── MAIN 2-COLUMN DOCUMENTATION LAYOUT ───────────────────────────────── */}
      <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-12">
        {/* ── CỘT TRÁI: DANH SÁCH ROLE SIDEBAR (DESKTOP) ─────────────────────── */}
        <div className="hidden space-y-3 md:col-span-4 md:block">
          <div className="space-y-4 rounded-[24px] border border-white/60 bg-surface p-4 shadow-[8px_8px_18px_var(--shadow-dark),-8px_-8px_18px_rgba(255,255,255,0.85)] dark:border-white/[0.06] dark:bg-card dark:shadow-[8px_8px_20px_rgba(0,0,0,0.55),-3px_-3px_10px_rgba(255,255,255,0.03)]">
            {/* Recessed Search Well */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-primary/80" />
              <input
                type="text"
                value={searchRole}
                onChange={(e) => setSearchRole(e.target.value)}
                placeholder={t("roles.searchPlaceholderMobile")}
                className="h-9 w-full rounded-[13px] bg-background/65 pl-9 pr-3 text-xs font-medium text-foreground shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_rgba(255,255,255,0.85)] placeholder:text-muted-foreground/75 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-black/35 dark:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.7)]"
              />
            </div>

            <div className="flex items-center justify-between px-1">
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-muted-foreground">
                {t("roles.detail.rolesList", { count: filteredRoles.length })}
              </span>
            </div>

            {/* Role Items List */}
            <div className="max-h-[calc(100vh-280px)] space-y-2.5 overflow-y-auto p-1">
              {filteredRoles.map((role) => {
                const isSelected = role.id === currentRole?.id;
                const permCount = role.permissions?.length ?? 0;

                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => handleSelect(role.id)}
                    className={`flex w-full items-start justify-between gap-2.5 rounded-[16px] p-3.5 text-left text-xs transition-all duration-200 ${isSelected
                        ? "border border-primary/25 bg-background/75 font-bold text-primary shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_rgba(255,255,255,0.85)] dark:bg-black/35 dark:shadow-[inset_3px_3px_8px_rgba(0,0,0,0.75),inset_-1px_-1px_3px_rgba(255,255,255,0.03)]"
                        : "border border-white/60 bg-surface text-foreground shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_rgba(255,255,255,0.85)] hover:-translate-y-0.5 dark:border-white/[0.05] dark:bg-card dark:shadow-[4px_4px_9px_rgba(0,0,0,0.45),-2px_-2px_5px_rgba(255,255,255,0.02)]"
                      }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5">
                        {role.isSystem ? (
                          <Lock
                            className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"
                              }`}
                          />
                        ) : (
                          <Shield
                            className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"
                              }`}
                          />
                        )}
                        <span className="truncate font-mono text-xs font-extrabold">
                          {role.name}
                        </span>
                      </div>
                      <p className="line-clamp-1 text-[11px] font-normal text-muted-foreground">
                        {t(`roles.desc.${role.name}`) !== `roles.desc.${role.name}`
                          ? t(`roles.desc.${role.name}`)
                          : role.description || t("roles.detail.noDescription")}
                      </p>
                    </div>

                    <div className="shrink-0 space-y-1 text-right">
                      <span
                        className={`inline-block rounded-lg px-2 py-0.5 font-mono text-[10px] font-extrabold ${isSelected
                            ? "bg-primary/15 text-primary shadow-[2px_2px_4px_var(--shadow-dark)] dark:shadow-[2px_2px_4px_rgba(0,0,0,0.6)]"
                            : "bg-background/60 text-muted-foreground shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark)] dark:bg-black/30"
                          }`}
                      >
                        {permCount} {t("roles.table.permsCount").toLowerCase()}
                      </span>
                      {role.isSystem && (
                        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80">
                          {t("roles.badge.system")}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── CỘT PHẢI: CUỐN SÁCH HƯỚNG DẪN CHI TIẾT (DOCUMENTATION BOOK) ──────── */}
        <div className="col-span-12 space-y-5 md:col-span-8">
          {currentRole ? (
            <div className="space-y-6 rounded-[26px] border border-white/60 bg-surface p-4 sm:p-6 shadow-[8px_8px_18px_var(--shadow-dark),-8px_-8px_18px_rgba(255,255,255,0.85)] dark:border-white/[0.06] dark:bg-card dark:shadow-[8px_8px_20px_rgba(0,0,0,0.55),-3px_-3px_10px_rgba(255,255,255,0.03)]">
              {/* Header của cuốn tài liệu */}
              <div className="relative space-y-4 pb-5 before:absolute before:inset-x-0 before:bottom-0 before:h-[1px] before:bg-gradient-to-r before:from-primary/40 before:via-border/50 before:to-transparent">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    {/* Extruded + Debossed Role Emblem */}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] border border-white/70 bg-surface text-primary shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.9)] dark:border-white/[0.06] dark:bg-card dark:shadow-[4px_4px_10px_rgba(0,0,0,0.5)] sm:h-14 sm:w-14">
                      <div className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-primary/[0.08] shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_rgba(255,255,255,0.75)] dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.65)] sm:h-10 sm:w-10">
                        {currentRole.isSystem ? (
                          <Lock className="h-4 w-4 sm:h-5 sm:w-5" />
                        ) : (
                          <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className="font-mono text-base font-black tracking-tight text-foreground sm:text-xl">
                          {currentRole.name}
                        </h1>
                        {currentRole.isSystem ? (
                          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-extrabold text-primary shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark)] dark:shadow-[inset_1.5px_1.5px_4px_rgba(0,0,0,0.65)]">
                            {t("roles.badge.system")}
                          </span>
                        ) : (
                          <span className="rounded-full bg-background/70 px-2.5 py-0.5 text-[10px] font-extrabold text-muted-foreground shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark)] dark:bg-black/30">
                            {t("roles.badge.custom")}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs font-bold text-primary">
                        {profile.title}
                      </p>
                    </div>
                  </div>

                  {/* Recessed Telemetry Counters */}
                  <div className="flex items-center gap-2">
                    <span className="rounded-xl bg-background/65 px-2.5 py-1 font-mono text-[11px] font-extrabold text-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] dark:bg-black/30 dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.65)]">
                      {currentRole.permissions?.length ?? 0}{" "}
                      <span className="font-sans font-semibold text-muted-foreground">
                        {t("roles.table.permsCount").toLowerCase()}
                      </span>
                    </span>
                    <span className="rounded-xl bg-background/65 px-2.5 py-1 font-mono text-[11px] font-extrabold text-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] dark:bg-black/30 dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.65)]">
                      {currentRole.userCount ?? 0}{" "}
                      <span className="font-sans font-semibold text-muted-foreground">
                        {t("roles.table.personnel").toLowerCase()}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Cấp độ an ninh & Sứ mệnh (Recessed Plaque) */}
                <div className="space-y-1.5 rounded-[18px] bg-background/65 p-4 shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_rgba(255,255,255,0.85)] dark:bg-black/30 dark:shadow-[inset_4px_4px_10px_rgba(0,0,0,0.7)]">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-foreground">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                    <span>{profile.securityLevel}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {profile.mission}
                  </p>
                </div>
              </div>

              {/* ── MỤC 1: TRÁCH NHIỆM CỐT LÕI ───────────────────────────────── */}
              <div className="space-y-3.5">
                <h3 className="flex items-center gap-2.5 text-xs font-black uppercase tracking-wider text-muted-foreground">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 font-mono text-[11px] font-black text-primary shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark)] dark:shadow-[inset_1.5px_1.5px_4px_rgba(0,0,0,0.65)]">
                    1
                  </span>
                  {t("roles.guide.coreResponsibilities")}
                </h3>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {profile.coreResponsibilities.map((resp, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 rounded-[16px] border border-white/60 bg-surface p-3.5 text-xs shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.85)] dark:border-white/[0.05] dark:bg-card dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45),-2px_-2px_5px_rgba(255,255,255,0.02)]"
                    >
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                      <span className="leading-relaxed font-medium text-foreground/90">
                        {resp}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── MỤC 2: BẢN ĐỒ QUYỀN HẠN THEO TRANG ("LÀM GÌ, Ở TRANG NÀO?") ─ */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2.5 text-xs font-black uppercase tracking-wider text-muted-foreground">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 font-mono text-[11px] font-black text-primary shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark)] dark:shadow-[inset_1.5px_1.5px_4px_rgba(0,0,0,0.65)]">
                      2
                    </span>
                    {t("roles.guide.pageCapabilities")}
                  </h3>
                  <span className="rounded-lg bg-background/60 px-2 py-0.5 font-mono text-[10.5px] font-bold text-muted-foreground shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark)] dark:bg-black/30">
                    {profile.pageCapabilities.length}{" "}
                    {locale === "en-US" ? "system pages" : "trang chức năng"}
                  </span>
                </div>

                <div className="space-y-3">
                  {profile.pageCapabilities.map((page, idx) => {
                    const PageIcon = page.icon;
                    const isDenied = page.accessLevel === "none";

                    return (
                      <div
                        key={idx}
                        className={`rounded-[18px] border p-4 transition-all duration-200 ${isDenied
                            ? "border-transparent bg-background/55 opacity-70 shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_rgba(255,255,255,0.8)] dark:bg-black/25 dark:shadow-[inset_3px_3px_8px_rgba(0,0,0,0.7)]"
                            : "border-white/60 bg-surface shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_rgba(255,255,255,0.85)] hover:-translate-y-0.5 dark:border-white/[0.05] dark:bg-card dark:shadow-[5px_5px_12px_rgba(0,0,0,0.5),-2px_-2px_6px_rgba(255,255,255,0.025)]"
                          }`}
                      >
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            {/* Debossed Page Icon */}
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-primary/[0.08] text-primary shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_rgba(255,255,255,0.75)] dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.65)]">
                              <PageIcon className="h-4 w-4" />
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-extrabold text-foreground">
                                {page.title}
                              </span>
                              <span className="rounded-md bg-background/60 px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-muted-foreground shadow-[inset_1px_1px_2px_var(--shadow-dark)] dark:bg-black/30">
                                {page.route}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isDenied ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-background/70 px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark)] dark:bg-black/35">
                                <XCircle className="h-3 w-3" />
                                {page.accessLabel}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-extrabold text-primary shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark)] dark:shadow-[inset_1.5px_1.5px_4px_rgba(0,0,0,0.65)]">
                                <CheckCircle2 className="h-3 w-3 text-primary" />
                                {page.accessLabel}
                              </span>
                            )}

                            {!isDenied && (
                              <Link
                                href={page.route}
                                target="_blank"
                                className="inline-flex h-7 items-center gap-1 rounded-[10px] border border-white/70 bg-surface px-2.5 text-[11px] font-extrabold text-primary shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_rgba(255,255,255,0.85)] transition-all hover:brightness-105 active:shadow-[inset_2px_2px_4px_var(--shadow-dark)] dark:border-white/[0.06] dark:bg-card dark:shadow-[2px_2px_5px_rgba(0,0,0,0.5)]"
                              >
                                <span>
                                  {locale === "en-US" ? "Open" : "Xem trang"}
                                </span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </Link>
                            )}
                          </div>
                        </div>

                        <p className="pl-10.5 text-xs leading-relaxed text-muted-foreground">
                          {page.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── MỤC 3: DANH SÁCH MÃ QUYỀN API KỸ THUẬT (GRANULAR RBAC) ─────── */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2.5 text-xs font-black uppercase tracking-wider text-muted-foreground">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 font-mono text-[11px] font-black text-primary shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark)] dark:shadow-[inset_1.5px_1.5px_4px_rgba(0,0,0,0.65)]">
                      3
                    </span>
                    {t("roles.guide.techPermissions")} (
                    {currentRole.permissions?.length ?? 0}{" "}
                    {t("roles.table.permsCount").toLowerCase()})
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  {RESOURCE_CATEGORY_ORDER.map((catKey) => {
                    const perms = categorizedPermissions[catKey] ?? [];
                    if (perms.length === 0) return null;
                    const CategoryIcon = CATEGORY_ICONS[catKey] || Shield;
                    const totalInCat = totalPerCategory[catKey] || perms.length;

                    return (
                      <div
                        key={catKey}
                        className="space-y-3 rounded-[18px] border border-white/60 bg-surface p-3.5 shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_rgba(255,255,255,0.85)] dark:border-white/[0.05] dark:bg-card dark:shadow-[5px_5px_12px_rgba(0,0,0,0.5),-2px_-2px_6px_rgba(255,255,255,0.025)]"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs font-extrabold text-foreground">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-primary/10 text-primary shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark)]">
                              <CategoryIcon className="h-3.5 w-3.5" />
                            </span>
                            <span className="truncate">
                              {t(`rbac.category.${catKey}`)}
                            </span>
                          </div>
                          <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[10.5px] font-black text-primary">
                            {perms.length}/{totalInCat}{" "}
                            {locale === "en-US" ? "endpoints" : "mã"}
                          </span>
                        </div>

                        {/* Recessed Permission Chips Tray */}
                        <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto rounded-[13px] bg-background/60 p-2.5 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_rgba(255,255,255,0.8)] dark:bg-black/30 dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.65)]">
                          {perms.map((p) => (
                            <span
                              key={p.id}
                              title={p.description || p.name}
                              className="cursor-default rounded-md border border-white/60 bg-surface px-2 py-0.5 font-mono text-[10px] font-semibold text-foreground/90 shadow-[1.5px_1.5px_3px_var(--shadow-dark),-1px_-1px_2px_rgba(255,255,255,0.8)] transition-colors hover:text-primary dark:border-white/[0.05] dark:bg-card dark:shadow-[1.5px_1.5px_4px_rgba(0,0,0,0.55)]"
                            >
                              {p.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── MỤC 4: GIỚI HẠN BẢO MẬT & QUY TẮC AN TOÀN ────────────────── */}
              <div className="relative space-y-3 pt-5 before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-border/45 before:to-transparent">
                <h3 className="flex items-center gap-2.5 text-xs font-black uppercase tracking-wider text-muted-foreground">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 font-mono text-[11px] font-black text-primary shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark)] dark:shadow-[inset_1.5px_1.5px_4px_rgba(0,0,0,0.65)]">
                    4
                  </span>
                  {t("roles.guide.securityGuardrails")}
                </h3>

                <div className="space-y-2 rounded-[18px] bg-background/60 p-3.5 shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_rgba(255,255,255,0.85)] dark:bg-black/30 dark:shadow-[inset_3px_3px_8px_rgba(0,0,0,0.7)]">
                  {profile.securityGuardrails.map((rule, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 rounded-xl px-2 py-1.5 text-xs text-muted-foreground"
                    >
                      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="leading-relaxed font-medium">{rule}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border border-white/60 bg-surface p-12 text-center text-xs font-medium text-muted-foreground shadow-[8px_8px_18px_var(--shadow-dark),-8px_-8px_18px_rgba(255,255,255,0.85)] dark:border-white/[0.06] dark:bg-card dark:shadow-[8px_8px_20px_rgba(0,0,0,0.55)]">
              {locale === "en-US"
                ? "Please select a role from the list to view its guide book."
                : "Vui lòng chọn một vai trò từ danh sách để xem tài liệu chi tiết."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
