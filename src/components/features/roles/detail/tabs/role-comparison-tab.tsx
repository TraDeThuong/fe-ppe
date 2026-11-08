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
    <div className="space-y-4">
      {/* ── TOP ROLE SELECTOR & STATS BAR ─────────────────────────────── */}
      <div className="rounded-2xl border border-white/80 bg-surface p-4 sm:p-5 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_rgba(255,255,255,0.9)] dark:border-white/[0.06] dark:bg-card dark:shadow-[6px_6px_14px_rgba(0,0,0,0.45)] space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
              <GitCompare className="h-4 w-4 text-primary" />
              <span>{t("roles.detailPage.tabs.comparison")}</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isVietnamese
                ? "Đặt 2 vai trò lên bàn cân để đối chiếu sự khác biệt quyền hạn"
                : "Side-by-side privilege matrix to identify permission discrepancies"}
            </p>
          </div>

          {/* Target Role Selector Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-semibold">
              {isVietnamese ? "Đối chiếu với:" : "Compare with:"}
            </span>
            {otherRoles.map((r) => {
              const isSelected = (compareRole?.id || "") === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setCompareRoleId(r.id)}
                  className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 font-mono text-xs font-bold transition-all ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "border border-border/40 bg-background/60 text-muted-foreground hover:text-foreground hover:bg-background/90"
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

        {/* 3 Summary Bento Cards */}
        {compareRole && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 text-center space-y-1">
              <span className="text-xs font-bold text-primary">
                {isVietnamese ? "Quyền chung (Cả hai cùng có)" : "Shared Privileges"}
              </span>
              <p className="font-mono text-2xl font-black text-primary">
                {stats.shared}
              </p>
            </div>

            <div className="rounded-xl border border-border/40 bg-background/55 p-3 text-center space-y-1">
              <span className="text-xs font-bold text-foreground">
                {isVietnamese
                  ? `Chỉ ${currentRole.name} có`
                  : `Exclusive to ${currentRole.name}`}
              </span>
              <p className="font-mono text-2xl font-black text-foreground">
                {stats.onlyCurrent}
              </p>
            </div>

            <div className="rounded-xl border border-border/40 bg-background/55 p-3 text-center space-y-1">
              <span className="text-xs font-bold text-foreground">
                {isVietnamese
                  ? `Chỉ ${compareRole.name} có`
                  : `Exclusive to ${compareRole.name}`}
              </span>
              <p className="font-mono text-2xl font-black text-foreground">
                {stats.onlyCompare}
              </p>
            </div>
          </div>
        )}

        {/* Search & Diff Only Toggle */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-t border-border/30 pt-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("roles.permissions.searchPlaceholder")}
              className="h-8 w-full rounded-xl border border-border/40 bg-background/70 pl-8 pr-3 text-xs focus:border-primary focus:outline-none"
            />
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={diffOnly}
              onChange={(e) => setDiffOnly(e.target.checked)}
              className="rounded text-primary focus:ring-primary"
            />
            <span>
              {isVietnamese
                ? "Chỉ hiển thị các quyền có sự khác biệt (Diff only)"
                : "Show only differing permissions (Diff only)"}
            </span>
          </label>
        </div>
      </div>

      {/* ── COMPARISON TABLE ──────────────────────────────────────────── */}
      {comparedList.length === 0 ? (
        <div className="rounded-2xl border border-border/40 bg-surface p-12 text-center text-xs text-muted-foreground">
          {diffOnly
            ? isVietnamese
              ? "Hai vai trò này có bộ quyền hoàn toàn giống nhau!"
              : "Both roles have identical permissions!"
            : t("roles.guide.noPermsFound")}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/80 bg-surface shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_rgba(255,255,255,0.9)] dark:border-white/[0.06] dark:bg-card dark:shadow-[6px_6px_14px_rgba(0,0,0,0.45)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/40 bg-background/70 text-muted-foreground font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">
                    {isVietnamese ? "Mã Quyền & Tài nguyên" : "Permission & Resource"}
                  </th>
                  <th className="py-3 px-4 text-center font-mono w-44">
                    {currentRole.name}
                  </th>
                  <th className="py-3 px-4 text-center font-mono w-44">
                    {compareRole?.name || "Target"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {comparedList.map((item) => (
                  <tr
                    key={item.permission.id}
                    className={`transition-colors ${
                      item.isDiff
                        ? "bg-primary/[0.03] hover:bg-primary/[0.07]"
                        : "hover:bg-muted/30"
                    }`}
                  >
                    <td className="py-2.5 px-4 min-w-[240px]">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-foreground">
                          {item.permission.name}
                        </span>
                        <Badge
                          variant="outline"
                          size="sm"
                          className="font-mono text-[9px] px-1 py-0 text-muted-foreground"
                        >
                          {item.permission.resource}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                        {item.permission.description || item.permission.action}
                      </p>
                    </td>

                    {/* Current Role cell */}
                    <td className="py-2.5 px-4 text-center">
                      {item.inCurrent ? (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{isVietnamese ? "Đã cấp" : "Granted"}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-muted-foreground/60">
                          <Minus className="h-4 w-4" />
                          <span>—</span>
                        </span>
                      )}
                    </td>

                    {/* Compare Role cell */}
                    <td className="py-2.5 px-4 text-center">
                      {item.inCompare ? (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{isVietnamese ? "Đã cấp" : "Granted"}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-muted-foreground/60">
                          <Minus className="h-4 w-4" />
                          <span>—</span>
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
  );
}
