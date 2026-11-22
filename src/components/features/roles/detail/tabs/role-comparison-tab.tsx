"use client";

import { useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  GitCompare,
  Lock,
  Minus,
  Search,
  Shield,
  X,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/providers/locale-provider";
import {
  RESOURCE_CATEGORY_MAP,
  type PermissionDto,
  type ResourceCategory,
  type RoleDto,
} from "@/types";

export interface RoleComparisonTabProps {
  currentRole: RoleDto;
  allRoles: RoleDto[];
  allPermissions: PermissionDto[];
}

export function RoleComparisonTab({
  currentRole,
  allRoles,
  allPermissions,
}: RoleComparisonTabProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  // Filter out current role from comparison options
  const otherRoles = useMemo(
    () => allRoles.filter((r) => r.id !== currentRole.id),
    [allRoles, currentRole.id],
  );

  const [compareRoleId, setCompareRoleId] = useState<string>(() => {
    return otherRoles[0]?.id || "";
  });
  const [diffOnly, setDiffOnly] = useState(false);
  const [search, setSearch] = useState("");

  const compareRole = useMemo(
    () => otherRoles.find((r) => r.id === compareRoleId) || otherRoles[0],
    [otherRoles, compareRoleId],
  );

  const currentPermIds = useMemo(
    () => new Set((currentRole.permissions || []).map((p) => p.id)),
    [currentRole.permissions],
  );
  const comparePermIds = useMemo(
    () => new Set((compareRole?.permissions || []).map((p) => p.id)),
    [compareRole?.permissions],
  );

  // Stats calculation
  const stats = useMemo(() => {
    let shared = 0;
    let onlyCurrent = 0;
    let onlyCompare = 0;

    const catalog =
      allPermissions.length > 0
        ? allPermissions
        : [
          ...(currentRole.permissions || []),
          ...(compareRole?.permissions || []),
        ];

    const uniqueMap = new Map<string, PermissionDto>();
    catalog.forEach((p) => uniqueMap.set(p.id, p));

    uniqueMap.forEach((p) => {
      const inCurrent = currentPermIds.has(p.id);
      const inCompare = comparePermIds.has(p.id);

      if (inCurrent && inCompare) shared++;
      else if (inCurrent && !inCompare) onlyCurrent++;
      else if (!inCurrent && inCompare) onlyCompare++;
    });

    return { shared, onlyCurrent, onlyCompare, totalUnique: uniqueMap.size };
  }, [allPermissions, currentRole.permissions, compareRole?.permissions, currentPermIds, comparePermIds]);

  // Group permissions for comparison
  const comparedList = useMemo(() => {
    const catalog =
      allPermissions.length > 0
        ? allPermissions
        : [
          ...(currentRole.permissions || []),
          ...(compareRole?.permissions || []),
        ];

    const uniqueMap = new Map<string, PermissionDto>();
    catalog.forEach((p) => uniqueMap.set(p.id, p));

    const q = search.trim().toLowerCase();

    return Array.from(uniqueMap.values())
      .filter((p) => {
        const inCurrent = currentPermIds.has(p.id);
        const inCompare = comparePermIds.has(p.id);

        if (diffOnly && inCurrent === inCompare) return false;

        if (q) {
          const matchName = p.name.toLowerCase().includes(q);
          const matchDesc = (p.description || "").toLowerCase().includes(q);
          const matchRes = String(p.resource).toLowerCase().includes(q);
          if (!matchName && !matchDesc && !matchRes) return false;
        }

        return true;
      })
      .map((p) => {
        const inCurrent = currentPermIds.has(p.id);
        const inCompare = comparePermIds.has(p.id);
        return {
          permission: p,
          inCurrent,
          inCompare,
          isDiff: inCurrent !== inCompare,
          category: (RESOURCE_CATEGORY_MAP[
            p.resource as keyof typeof RESOURCE_CATEGORY_MAP
          ] || "SYSTEM") as ResourceCategory,
        };
      });
  }, [allPermissions, currentRole.permissions, compareRole?.permissions, currentPermIds, comparePermIds, diffOnly, search]);

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
      {/* =========================================================
      CỘT TRÁI (4 COLS): BẢNG ĐIỀU KHIỂN & THỐNG KÊ ĐỐI CHIẾU
  ========================================================= */}
      <aside className="space-y-4 rounded-[24px] border border-white/60 bg-surface p-5 shadow-[8px_8px_18px_var(--shadow-dark),-8px_-8px_18px_rgba(255,255,255,0.85)] dark:border-white/[0.06] dark:bg-card dark:shadow-[8px_8px_20px_rgba(0,0,0,0.55),-3px_-3px_10px_rgba(255,255,255,0.03)] lg:col-span-4">
        {/* Header + VS Pill */}
        <div className="space-y-3 border-b border-border/25 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-primary/[0.08] text-primary shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_rgba(255,255,255,0.75)] dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.65)]">
              <GitCompare className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-extrabold text-foreground">
                {t("roles.detailPage.tabs.comparison")}
              </h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {isVietnamese
                  ? "So sánh trực quan ma trận quyền hạn"
                  : "Side-by-side privilege matrix"}
              </p>
            </div>
          </div>

          {/* VS Arena Badge */}
          {compareRole && (
            <div className="flex items-center justify-between gap-2 rounded-[14px] bg-background/65 px-3 py-2 font-mono text-xs font-extrabold shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_rgba(255,255,255,0.8)] dark:bg-black/30 dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.7)]">
              <span className="truncate text-primary">{currentRole.name}</span>
              <span className="shrink-0 rounded-md bg-surface px-1.5 py-0.5 text-[9px] font-black text-muted-foreground shadow-sm dark:bg-card">
                VS
              </span>
              <span className="truncate text-accent">{compareRole.name}</span>
            </div>
          )}
        </div>

        {/* Chọn vai trò đối chiếu */}
        <div className="space-y-2">
          <span className="px-1 text-[10.5px] font-extrabold uppercase tracking-wider text-muted-foreground">
            {isVietnamese ? "Đối chiếu với vai trò:" : "Compare with role:"}
          </span>
          <div className="flex flex-wrap gap-1.5 rounded-[16px] bg-background/60 p-2 shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_rgba(255,255,255,0.85)] dark:bg-black/30 dark:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.7)]">
            {otherRoles.map((r) => {
              const isSelected = (compareRole?.id || "") === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setCompareRoleId(r.id)}
                  className={`inline-flex items-center gap-1.5 rounded-[11px] px-2.5 py-1.5 font-mono text-[11px] font-extrabold transition-all duration-150 ${isSelected
                      ? "bg-accent text-accent-foreground shadow-[2px_2px_6px_rgba(0,0,0,0.2)]"
                      : "border border-white/60 bg-surface text-muted-foreground shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_rgba(255,255,255,0.8)] hover:text-foreground dark:border-white/[0.05] dark:bg-card dark:shadow-[2px_2px_5px_rgba(0,0,0,0.5)]"
                    }`}
                >
                  {r.isSystem ? (
                    <Lock className="h-3 w-3 shrink-0" />
                  ) : (
                    <Shield className="h-3 w-3 shrink-0" />
                  )}
                  <span>{r.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3 Chỉ số thống kê xếp dọc gọn gàng */}
        {compareRole && (
          <div className="space-y-2">
            <span className="px-1 text-[10.5px] font-extrabold uppercase tracking-wider text-muted-foreground">
              {isVietnamese ? "Tổng quan chênh lệch:" : "Discrepancy summary:"}
            </span>

            <div className="space-y-2 rounded-[18px] bg-background/60 p-2.5 shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_rgba(255,255,255,0.85)] dark:bg-black/30 dark:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.7)]">
              {/* Shared */}
              <div className="flex items-center justify-between rounded-[12px] border border-white/60 bg-surface px-3.5 py-2 shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_rgba(255,255,255,0.85)] dark:border-white/[0.05] dark:bg-card dark:shadow-[2px_2px_5px_rgba(0,0,0,0.5)]">
                <span className="text-xs font-bold text-foreground">
                  {isVietnamese ? "Quyền chung (2 bên)" : "Shared privileges"}
                </span>
                <span className="rounded-lg bg-primary/10 px-2.5 py-0.5 font-mono text-sm font-black tabular-nums text-primary">
                  {stats.shared}
                </span>
              </div>

              {/* Only Current */}
              <div className="flex items-center justify-between rounded-[12px] border border-white/60 bg-surface px-3.5 py-2 shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_rgba(255,255,255,0.85)] dark:border-white/[0.05] dark:bg-card dark:shadow-[2px_2px_5px_rgba(0,0,0,0.5)]">
                <span className="truncate pr-2 font-mono text-[11px] font-bold text-muted-foreground">
                  {isVietnamese ? "Chỉ" : "Only"} {currentRole.name}
                </span>
                <span className="rounded-lg bg-primary/10 px-2.5 py-0.5 font-mono text-sm font-black tabular-nums text-primary">
                  +{stats.onlyCurrent}
                </span>
              </div>

              {/* Only Compare */}
              <div className="flex items-center justify-between rounded-[12px] border border-white/60 bg-surface px-3.5 py-2 shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_rgba(255,255,255,0.85)] dark:border-white/[0.05] dark:bg-card dark:shadow-[2px_2px_5px_rgba(0,0,0,0.5)]">
                <span className="truncate pr-2 font-mono text-[11px] font-bold text-muted-foreground">
                  {isVietnamese ? "Chỉ" : "Only"} {compareRole.name}
                </span>
                <span className="rounded-lg bg-accent/15 px-2.5 py-0.5 font-mono text-sm font-black tabular-nums text-accent">
                  +{stats.onlyCompare}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Bộ lọc tìm kiếm & Diff Only Toggle */}
        <div className="space-y-2.5 border-t border-border/25 pt-3.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-primary/75" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("roles.permissions.searchPlaceholder")}
              className="h-9.5 w-full rounded-[13px] bg-background/65 pl-8.5 pr-8 text-xs font-medium text-foreground shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_rgba(255,255,255,0.85)] placeholder:text-muted-foreground/75 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-black/35 dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.7)]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute inset-y-0 right-2 my-auto flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <label className="flex w-full cursor-pointer select-none items-center justify-between rounded-[14px] border border-white/60 bg-surface px-3.5 py-2.5 shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_rgba(255,255,255,0.85)] dark:border-white/[0.06] dark:bg-card dark:shadow-[3px_3px_7px_rgba(0,0,0,0.5)]">
            <span className="text-xs font-extrabold text-foreground">
              {isVietnamese
                ? "Chỉ hiện quyền khác biệt (Diff)"
                : "Show differing only (Diff)"}
            </span>
            <span className="relative inline-flex items-center">
              <input
                type="checkbox"
                checked={diffOnly}
                onChange={(e) => setDiffOnly(e.target.checked)}
                className="peer sr-only"
              />
              <span className="relative h-[20px] w-[38px] rounded-full bg-background/80 shadow-[inset_2px_2px_4px_var(--shadow-dark)] transition-all duration-200 peer-checked:bg-accent/20 dark:bg-black/45">
                <span
                  className={`absolute left-[2px] top-[2px] h-[16px] w-[16px] rounded-full transition-all duration-200 ${diffOnly
                      ? "translate-x-[18px] bg-accent shadow-sm"
                      : "bg-surface shadow-sm dark:bg-card"
                    }`}
                />
              </span>
            </span>
          </label>
        </div>
      </aside>

      {/* =========================================================
      CỘT PHẢI (8 COLS): MA TRẬN SO SÁNH QUYỀN HẠN (DỄ THỞ, CUỘN NỘI BỘ)
  ========================================================= */}
      <div className="lg:col-span-8">
        {comparedList.length === 0 ? (
          <div className="flex h-[380px] sm:h-[560px] flex-col items-center justify-center rounded-[24px] border border-white/60 bg-surface p-6 sm:p-8 text-center shadow-[8px_8px_18px_var(--shadow-dark),-8px_-8px_18px_rgba(255,255,255,0.85)] dark:border-white/[0.06] dark:bg-card dark:shadow-[8px_8px_20px_rgba(0,0,0,0.55)]">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[16px] bg-primary/10 text-primary shadow-[inset_2px_2px_5px_var(--shadow-dark)]">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="text-sm font-extrabold text-foreground">
              {diffOnly
                ? isVietnamese
                  ? "Hai vai trò này có bộ quyền hoàn toàn giống nhau!"
                  : "Both roles have identical permissions!"
                : t("roles.guide.noPermsFound")}
            </p>
            {diffOnly && (
              <p className="mt-1 text-xs text-muted-foreground">
                {isVietnamese
                  ? "Tắt công tắc Diff bên trái để xem toàn bộ quyền chung."
                  : "Toggle off Diff on the left to view all shared permissions."}
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-[24px] border border-white/60 bg-surface shadow-[8px_8px_18px_var(--shadow-dark),-8px_-8px_18px_rgba(255,255,255,0.85)] dark:border-white/[0.06] dark:bg-card dark:shadow-[8px_8px_20px_rgba(0,0,0,0.55),-3px_-3px_10px_rgba(255,255,255,0.03)]">
            {/* Chiều cao rộng rãi 560px, cuộn nội bộ mượt mà */}
            <div className="max-h-[70dvh] sm:h-[560px] sm:max-h-none overflow-auto">
              <table className="w-full min-w-[540px] border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10 bg-surface/95 backdrop-blur-md dark:bg-card/95">
                  <tr className="border-b border-border/30 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-3.5">
                      {isVietnamese ? "Mã Quyền & Tài nguyên" : "Permission & Resource"}{" "}
                      <span className="ml-1.5 rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                        {comparedList.length}
                      </span>
                    </th>
                    <th className="w-36 px-3 py-3.5 text-center">
                      <span className="inline-block rounded-lg bg-primary/10 px-2.5 py-1 font-mono text-[10.5px] font-black text-primary">
                        {currentRole.name}
                      </span>
                    </th>
                    <th className="w-36 px-3 py-3.5 text-center">
                      <span className="inline-block rounded-lg bg-accent/15 px-2.5 py-1 font-mono text-[10.5px] font-black text-accent">
                        {compareRole?.name || "Target"}
                      </span>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border/20">
                  {comparedList.map((item) => (
                    <tr
                      key={item.permission.id}
                      className={`relative transition-colors duration-150 ${item.isDiff
                          ? "bg-accent/[0.04] hover:bg-accent/[0.08]"
                          : "hover:bg-background/50 dark:hover:bg-black/20"
                        }`}
                    >
                      {/* Permission Info */}
                      <td className="relative min-w-[240px] px-5 py-3">
                        {item.isDiff && (
                          <span className="absolute inset-y-1.5 left-1 w-1 rounded-full bg-accent" />
                        )}

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-extrabold text-foreground">
                            {item.permission.name}
                          </span>

                          <span className="rounded-md bg-background/70 px-1.5 py-0.5 font-mono text-[9.5px] font-bold text-muted-foreground shadow-[inset_1px_1px_2px_var(--shadow-dark)] dark:bg-black/35">
                            {item.permission.resource}
                          </span>

                          {item.isDiff && (
                            <span className="rounded-full bg-accent/15 px-2 py-0.5 font-mono text-[9px] font-black uppercase text-accent">
                              DIFF
                            </span>
                          )}
                        </div>

                        <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
                          {item.permission.description || item.permission.action}
                        </p>
                      </td>

                      {/* Current Role (Primary) */}
                      <td className="px-3 py-3 text-center">
                        {item.inCurrent ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-extrabold text-primary shadow-[inset_1px_1px_3px_var(--shadow-dark)] dark:shadow-[inset_1px_1px_4px_rgba(0,0,0,0.65)]">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>{isVietnamese ? "Đã cấp" : "Granted"}</span>
                          </span>
                        ) : (
                          <span className="inline-flex h-6 w-10 items-center justify-center rounded-full bg-background/60 text-muted-foreground/40 shadow-[inset_1px_1px_2px_var(--shadow-dark)] dark:bg-black/30">
                            <Minus className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </td>

                      {/* Compare Role (Accent) */}
                      <td className="px-3 py-3 text-center">
                        {item.inCompare ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-extrabold text-accent shadow-[inset_1px_1px_3px_var(--shadow-dark)] dark:shadow-[inset_1px_1px_4px_rgba(0,0,0,0.65)]">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>{isVietnamese ? "Đã cấp" : "Granted"}</span>
                          </span>
                        ) : (
                          <span className="inline-flex h-6 w-10 items-center justify-center rounded-full bg-background/60 text-muted-foreground/40 shadow-[inset_1px_1px_2px_var(--shadow-dark)] dark:bg-black/30">
                            <Minus className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
