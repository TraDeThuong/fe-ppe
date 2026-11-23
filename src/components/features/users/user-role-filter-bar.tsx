"use client";

import { useMemo } from "react";
import { Shield, X } from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import type { RoleDto } from "@/types";
import { buildRoleFilterItems } from "./user-presentation";

export interface UserRoleFilterBarProps {
  roles: RoleDto[];
  value: string;
  onChange: (role: string) => void;
  summaryTotal?: number;
  roleCounts?: Record<string, number>;
  loading?: boolean;
  className?: string;
}

export function UserRoleFilterBar({
  roles,
  value,
  onChange,
  summaryTotal,
  roleCounts,
  loading = false,
  className = "",
}: UserRoleFilterBarProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const items = useMemo(
    () =>
      buildRoleFilterItems({
        roles,
        allLabel: t("users.roleBar.all"),
        activeRole: value,
        summaryTotal,
        roleCounts,
      }),
    [roles, t, value, summaryTotal, roleCounts],
  );

  // Chỉ hiển thị khi có ít nhất 1 vai trò (ngoài "all") hoặc đang tải
  if (!loading && items.length <= 1) {
    return null;
  }

  return (
    <div
      className={`border-b border-border/30 px-4 py-3 sm:px-5 ${className}`}
      data-testid="user-role-filter-bar"
    >
      <div
        role="group"
        aria-label={t("users.roleBar.ariaLabel")}
        className="flex items-center gap-2 rounded-2xl border border-black/[0.03] bg-background/55 px-3 py-2 text-xs shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] dark:border-white/[0.05]"
      >
        {/* Nhãn vai trò */}
        <span className="inline-flex shrink-0 items-center gap-1.5 pr-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <Shield className="size-3.5 text-muted-foreground" aria-hidden="true" />
          <span className="hidden sm:inline">{t("users.roleBar.label")}</span>
        </span>

        {/* Danh sách pill vai trò */}
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {loading && items.length <= 1 ? (
            <>
              {[0, 1, 2, 3, 4].map((idx) => (
                <span
                  key={idx}
                  className="h-7 w-24 shrink-0 animate-pulse rounded-xl bg-muted/40"
                />
              ))}
            </>
          ) : (
            items.map((item) => {
              const isAll = item.value === "all";
              const isSelected = value === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={isSelected}
                  data-role-pill={item.value}
                  onClick={() => {
                    if (isAll) {
                      onChange("all");
                    } else {
                      onChange(isSelected ? "all" : item.value);
                    }
                  }}
                  title={
                    isAll
                      ? isVietnamese
                        ? "Xem tất cả vai trò"
                        : "Show all roles"
                      : isSelected
                        ? isVietnamese
                          ? `Bấm để bỏ lọc vai trò ${item.label}`
                          : `Click to clear ${item.label} filter`
                        : isVietnamese
                          ? `Lọc nhanh người dùng vai trò ${item.label}`
                          : `Quick filter by role ${item.label}`
                  }
                  className={[
                    "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                    isSelected
                      ? "border border-primary/30 bg-surface text-primary shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] dark:bg-card"
                      : "border border-transparent text-muted-foreground hover:bg-surface/65 hover:text-foreground",
                  ].join(" ")}
                >
                  <span className={isAll ? "" : "font-mono text-[10.5px] font-bold tracking-tight"}>
                    {item.label}
                  </span>
                  {typeof item.count === "number" && (
                    <span
                      className={[
                        "inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none tabular-nums",
                        isSelected
                          ? "bg-primary/15 text-primary"
                          : "bg-muted/60 text-muted-foreground",
                      ].join(" ")}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Nút xóa nhanh bộ lọc vai trò */}
        {value !== "all" && (
          <button
            type="button"
            onClick={() => onChange("all")}
            aria-label={t("users.roleBar.clear")}
            title={t("users.roleBar.clear")}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-xl border border-border/40 bg-surface px-2 py-1 text-[11px] font-semibold text-muted-foreground shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)] transition hover:border-primary/40 hover:text-primary"
          >
            <X className="size-3" />
            <span className="hidden md:inline">{t("users.roleBar.clear")}</span>
          </button>
        )}
      </div>
    </div>
  );
}
