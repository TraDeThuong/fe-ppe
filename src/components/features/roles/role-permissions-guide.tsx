"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Lock,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/providers/locale-provider";
import type { PermissionDto, RoleDto, ResourceCategory } from "@/types";
import { RESOURCE_CATEGORY_MAP } from "@/types";
import {
  getRoleKnowledgeProfile,
  type RoleKnowledgeProfile,
} from "./role-guide-data";

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

  // Phân loại quyền kỹ thuật của vai trò theo 4 nhóm
  const categorizedPermissions = useMemo(() => {
    if (!currentRole?.permissions) return {};
    const groups: Record<string, PermissionDto[]> = {
      MONITORING: [],
      ANALYTICS: [],
      IDENTITY: [],
      SYSTEM: [],
    };

    currentRole.permissions.forEach((p) => {
      const cat = (RESOURCE_CATEGORY_MAP[p.resource as keyof typeof RESOURCE_CATEGORY_MAP] ||
        "SYSTEM") as ResourceCategory;
      if (groups[cat]) {
        groups[cat].push(p);
      } else {
        groups.SYSTEM.push(p);
      }
    });

    return groups;
  }, [currentRole]);

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* ── TOP NAV BAR ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 rounded-xl sm:rounded-2xl border border-white/60 bg-surface/90 p-2.5 sm:p-4 shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)] dark:border-white/10 dark:bg-card/90">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBackToList}
            className="h-7 sm:h-9 gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl border-border/50 text-[11px] sm:text-xs font-semibold text-foreground hover:text-primary px-2 sm:px-3 shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>{t("roles.guide.back")}</span>
          </Button>

          <div className="hidden sm:block h-6 w-px bg-border/40" />

          <div className="flex items-center gap-2 min-w-0">
            <div className="hidden sm:flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[inset_1px_1px_2px_rgba(0,0,0,0.08)]">
              <BookOpen className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-bold text-foreground leading-tight truncate">
                {t("roles.guide.title")}
              </h2>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground hidden sm:block truncate">
                {t("roles.guide.description")}
              </p>
            </div>
          </div>
        </div>

        {currentRole && onConfigurePermissions && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => onConfigurePermissions(currentRole)}
            className="h-7 sm:h-8 gap-1 sm:gap-1.5 text-[11px] sm:text-xs rounded-lg sm:rounded-xl px-2 sm:px-3 shrink-0"
          >
            <ShieldCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>{t("roles.guide.editPermissions")}</span>
          </Button>
        )}
      </div>

      {/* ── MOBILE ROLE SELECTOR (CHIPS TRÊN ĐIỆN THOẠI) ───────────────────────── */}
      <div className="md:hidden overflow-x-auto pb-1 -mx-0.5 px-0.5">
        <div className="flex items-center gap-1.5 min-w-max">
          {roles.map((r) => {
            const isSelected = r.id === currentRole?.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => handleSelect(r.id)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-background text-primary border border-primary/40 shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]"
                    : "border border-border/40 bg-surface text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.isSystem ? <Lock className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                <span className="font-mono">{r.name}</span>
                <span className="text-[10px] opacity-75">({r.permissions?.length ?? 0})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── MAIN 2-COLUMN DOCUMENTATION LAYOUT ─────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-12 items-start">
        {/* ── CỘT TRÁI: DANH SÁCH ROLE SIDEBAR (DESKTOP) ───────────────────────── */}
        <div className="hidden md:block md:col-span-4 lg:col-span-3.5 space-y-3">
          <div className="rounded-2xl border border-white/60 bg-surface/90 p-4 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)] dark:border-black/60 dark:bg-card/90 dark:shadow-[6px_6px_16px_rgba(0,0,0,0.6)] space-y-3">
            {/* Search roles */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchRole}
                onChange={(e) => setSearchRole(e.target.value)}
                placeholder={t("roles.searchPlaceholderMobile")}
                className="w-full rounded-xl border border-border/40 bg-background/60 pl-8 pr-3 py-1.5 text-xs text-foreground shadow-[inset_1px_1px_2px_var(--shadow-dark)] focus:border-primary focus:outline-none dark:border-black/50"
              />
            </div>

            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
              {t("roles.detail.rolesList", { count: filteredRoles.length })}
            </div>

            {/* Role items list */}
            <div className="space-y-1.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {filteredRoles.map((role) => {
                const isSelected = role.id === currentRole?.id;
                const permCount = role.permissions?.length ?? 0;

                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => handleSelect(role.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all duration-150 flex items-start justify-between gap-2 text-xs ${
                      isSelected
                        ? "!bg-background/90 !border-primary/50 text-primary font-bold shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)] dark:!border-primary/60 dark:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.7)]"
                        : "border-border/30 bg-background/50 hover:bg-muted/40 text-foreground dark:border-black/40 dark:hover:border-black dark:hover:bg-background/80"
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {role.isSystem ? (
                          <Lock className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        ) : (
                          <Shield className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        )}
                        <span className="font-mono text-xs truncate">{role.name}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground font-normal line-clamp-1">
                        {t(`roles.desc.${role.name}`) !== `roles.desc.${role.name}`
                          ? t(`roles.desc.${role.name}`)
                          : role.description || t("roles.detail.noDescription")}
                      </p>
                    </div>

                    <div className="shrink-0 text-right space-y-1">
                      <Badge
                        variant={isSelected ? "outline" : "secondary"}
                        size="sm"
                        className={`font-mono text-[10px] px-1.5 py-0 ${isSelected ? "border-primary/40 text-primary" : ""}`}
                      >
                        {permCount} {t("roles.table.permsCount").toLowerCase()}
                      </Badge>
                      {role.isSystem && (
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wide">
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

        {/* ── CỘT PHẢI: CUỐN SÁCH HƯỚNG DẪN CHI TIẾT (DOCUMENTATION BOOK) ────────── */}
        <div className="col-span-12 md:col-span-8 lg:col-span-8.5 space-y-4 sm:space-y-5">
          {currentRole ? (
            <div className="rounded-xl sm:rounded-2xl border border-white/60 bg-surface/95 p-3.5 sm:p-6 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)] dark:border-black/60 dark:bg-card/95 dark:shadow-[6px_6px_16px_rgba(0,0,0,0.6)] space-y-4 sm:space-y-6">
              {/* Header của cuốn tài liệu */}
              <div className="border-b border-border/40 pb-3.5 sm:pb-5 space-y-2.5 sm:space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl sm:rounded-2xl bg-primary/10 text-primary shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)]">
                      {currentRole.isSystem ? (
                        <Lock className="h-4 w-4 sm:h-5 sm:w-5" />
                      ) : (
                        <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <h1 className="text-base sm:text-xl font-black tracking-tight text-foreground font-mono">
                          {currentRole.name}
                        </h1>
                        {currentRole.isSystem ? (
                          <Badge variant="outline" size="sm" className="text-primary border-primary/30 text-[9px] sm:text-[10px] px-1.5 py-0">
                            {t("roles.badge.system")}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" size="sm" className="text-[9px] sm:text-[10px] px-1.5 py-0">
                            {t("roles.badge.custom")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] sm:text-xs font-semibold text-primary">{profile.title}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs">
                    <Badge variant="outline" size="sm" className="font-mono text-foreground text-[10px] sm:text-[11px] px-1.5 py-0">
                      {currentRole.permissions?.length ?? 0} {t("roles.table.permsCount").toLowerCase()}
                    </Badge>
                    <Badge variant="secondary" size="sm" className="font-mono text-[10px] sm:text-[11px] px-1.5 py-0">
                      {currentRole.userCount ?? 0} {t("roles.table.personnel").toLowerCase()}
                    </Badge>
                  </div>
                </div>

                {/* Cấp độ an ninh & Sứ mệnh */}
                <div className="rounded-xl border border-border/40 bg-background/60 p-3.5 shadow-[inset_1px_1px_2px_var(--shadow-dark)] space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span>{profile.securityLevel}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{profile.mission}</p>
                </div>
              </div>

              {/* ── MỤC 1: TRÁCH NHIỆM CỐT LÕI ───────────────────────────────── */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary text-[11px]">
                    1
                  </span>
                  {t("roles.guide.coreResponsibilities")}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {profile.coreResponsibilities.map((resp, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 rounded-xl border border-border/30 bg-background/50 p-3 text-xs shadow-[inset_1px_1px_2px_var(--shadow-dark)]"
                    >
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-foreground/90 leading-relaxed">{resp}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── MỤC 2: BẢN ĐỒ QUYỀN HẠN THEO TRANG ("LÀM GÌ, Ở TRANG NÀO?") ─ */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary text-[11px]">
                      2
                    </span>
                    {t("roles.guide.pageCapabilities")}
                  </h3>
                  <span className="text-[11px] text-muted-foreground">
                    {profile.pageCapabilities.length} {locale === "en-US" ? "system pages" : "trang chức năng"}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {profile.pageCapabilities.map((page, idx) => {
                    const PageIcon = page.icon;
                    const isDenied = page.accessLevel === "none";

                    return (
                      <div
                        key={idx}
                        className={`rounded-xl border p-3.5 transition-all shadow-[inset_1px_1px_2px_var(--shadow-dark)] ${
                          isDenied
                            ? "border-border/30 bg-background/30 opacity-70"
                            : "border-border/40 bg-background/60 hover:bg-background/80"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface border border-border/40 text-primary shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
                              <PageIcon className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-foreground">{page.title}</span>
                              <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                                {page.route}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isDenied ? (
                              <Badge variant="outline" size="sm" className="text-[10px] text-muted-foreground border-border/50">
                                <XCircle className="h-3 w-3 mr-1" />
                                {page.accessLabel}
                              </Badge>
                            ) : (
                              <Badge variant="outline" size="sm" className="text-[10px] text-primary border-primary/30">
                                <CheckCircle2 className="h-3 w-3 mr-1 text-primary" />
                                {page.accessLabel}
                              </Badge>
                            )}

                            {!isDenied && (
                              <Link href={page.route} target="_blank">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-[11px] text-primary hover:text-primary gap-1"
                                >
                                  <span>{locale === "en-US" ? "Open" : "Xem trang"}</span>
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed pl-9">
                          {page.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── MỤC 3: DANH SÁCH MÃ QUYỀN API KỸ THUẬT (GRANULAR RBAC) ─────── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary text-[11px]">
                      3
                    </span>
                    {t("roles.guide.techPermissions")} ({currentRole.permissions?.length ?? 0}{" "}
                    {t("roles.table.permsCount").toLowerCase()})
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(categorizedPermissions).map(([catKey, perms]) => {
                    if (perms.length === 0) return null;

                    return (
                      <div
                        key={catKey}
                        className="rounded-xl border border-border/40 bg-background/50 p-3 shadow-[inset_1px_1px_2px_var(--shadow-dark)] space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-foreground">
                          <span>{t(`rbac.category.${catKey}`)}</span>
                          <span className="font-mono text-[11px] text-primary">
                            {perms.length} {locale === "en-US" ? "endpoints" : "mã"}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                          {perms.map((p) => (
                            <span
                              key={p.id}
                              title={p.description || p.name}
                              className="rounded bg-muted/50 border border-border/30 px-1.5 py-0.5 font-mono text-[10px] text-foreground/90 hover:border-primary/40 cursor-default"
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
              <div className="space-y-2.5 border-t border-border/40 pt-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary text-[11px]">
                    4
                  </span>
                  {t("roles.guide.securityGuardrails")}
                </h3>

                <div className="space-y-1.5">
                  {profile.securityGuardrails.map((rule, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 rounded-xl border border-border/30 bg-background/40 p-2.5 text-xs text-muted-foreground"
                    >
                      <ShieldAlert className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <span>{rule}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/40 bg-surface p-12 text-center text-xs text-muted-foreground">
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
