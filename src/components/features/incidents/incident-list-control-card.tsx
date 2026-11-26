"use client";

import { useMemo, type ReactNode } from "react";
import {
  Archive,
  ClipboardList,
  List,
  RotateCcw,
  Search,
  UserCheck,
  X,
} from "lucide-react";
import { RefreshIconButton } from "@/components/ui/refresh-action";
import { useCamerasCatalog } from "@/hooks/cameras";
import { useSitesCatalog } from "@/hooks/sites";
import {
  incidentWorkStatuses,
  type IncidentListScope,
  type IncidentWorkStatus,
} from "@/lib/incident-list-scope";
import { useLocale } from "@/providers/locale-provider";

/**
 * Card điều khiển danh sách sự cố, gồm phạm vi, hàng đợi, bộ lọc và thanh chọn nhanh.
 */
export interface IncidentListControlCardProps {
  // Hàng 1 + 2
  scope: IncidentListScope;
  queue?: IncidentWorkStatus | "CLOSED";
  onScopeChange: (scope: IncidentListScope, queue?: IncidentWorkStatus) => void;
  // Hàng 3
  search: string;
  onSearchChange: (value: string) => void;
  severityFilter: string;
  onSeverityFilterChange: (value: string) => void;
  violationFilter: string;
  onViolationFilterChange: (value: string) => void;
  siteFilter?: string;
  onSiteFilterChange?: (value: string) => void;
  zoneFilter?: string;
  onZoneFilterChange?: (value: string) => void;
  cameraIdFilter?: string;
  onCameraIdFilterChange?: (value: string) => void;
  assignedToMe?: boolean;
  onAssignedToMeChange?: (value: boolean) => void;
  onResetFilters?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  children?: ReactNode;
}

const SELECT_CLASS =
  "h-9 min-w-[130px] flex-1 rounded-lg border border-border/50 bg-background px-2.5 text-xs font-medium text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:flex-initial";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
      <span className="w-24 shrink-0 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function Pill({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-3.5 text-xs font-semibold transition-colors ${active
        ? "border-primary/40 bg-primary/10 text-primary"
        : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        }`}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

export function IncidentListControlCard({
  scope,
  queue,
  onScopeChange,
  search,
  onSearchChange,
  severityFilter,
  onSeverityFilterChange,
  violationFilter,
  onViolationFilterChange,
  siteFilter = "",
  onSiteFilterChange,
  zoneFilter = "",
  onZoneFilterChange,
  cameraIdFilter = "",
  onCameraIdFilterChange,
  assignedToMe = false,
  onAssignedToMeChange,
  onResetFilters,
  onRefresh,
  isRefreshing = false,
  children,
}: IncidentListControlCardProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  // ── Danh mục Site -> Zone -> Camera ──────────────────────────────
  const { data: sitesData } = useSitesCatalog();
  const sites = useMemo(() => sitesData || [], [sitesData]);

  const zones = useMemo(() => {
    const targetSites = siteFilter ? sites.filter((s) => s.id === siteFilter) : sites;
    return targetSites.flatMap((s) =>
      (s.zones || [])
        .filter((z) => z.id)
        .map((z) => ({
          id: z.id,
          label: siteFilter ? z.name : `${z.name} (${s.code || s.name})`,
        })),
    );
  }, [siteFilter, sites]);

  const { data: camerasData } = useCamerasCatalog();
  const cameras = useMemo(
    () =>
      (camerasData || []).filter(
        (c) =>
          (!siteFilter || c.siteId === siteFilter) &&
          (!zoneFilter || c.zoneId === zoneFilter),
      ),
    [camerasData, siteFilter, zoneFilter],
  );

  const activeFiltersCount = [
    search.trim(),
    siteFilter,
    zoneFilter,
    cameraIdFilter,
    severityFilter,
    violationFilter,
    assignedToMe,
  ].filter(Boolean).length;

  const handleResetAll = () => {
    if (onResetFilters) return onResetFilters();
    onSearchChange("");
    onSiteFilterChange?.("");
    onZoneFilterChange?.("");
    onCameraIdFilterChange?.("");
    onSeverityFilterChange("");
    onViolationFilterChange("");
    onAssignedToMeChange?.(false);
  };

  const scopeOptions: Array<{ value: IncidentListScope; label: string; icon: ReactNode }> = [
    { value: "work", label: t("incidents.scope.work"), icon: <ClipboardList className="size-4" /> },
    { value: "history", label: t("incidents.scope.history"), icon: <Archive className="size-4" /> },
    { value: "all", label: t("incidents.scope.all"), icon: <List className="size-4" /> },
  ];
  const queueOptions = Object.keys(incidentWorkStatuses) as IncidentWorkStatus[];
  const showQueueRow = scope === "work" && queue && queue !== "CLOSED";

  return (
    <section
      aria-label={isVietnamese ? "Điều khiển danh sách sự cố" : "Incident list controls"}
      className="relative overflow-hidden rounded-[26px] border border-white/75 bg-background p-3.5 shadow-[10px_10px_24px_rgba(0,0,0,0.07),-10px_-10px_24px_rgba(255,255,255,0.85)] dark:border-white/10 dark:shadow-[10px_10px_24px_rgba(0,0,0,0.45),-10px_-10px_24px_rgba(255,255,255,0.03)] sm:p-4"
    >
      {/* Top Specular Accent Edge */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-10 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"
      />

      <div className="space-y-3">
        {/* ── ZONE 1: PHẠM VI & HÀNG ĐỢI TÁC NGHIỆP (Recessed Navigation Deck) ── */}
        <div className="rounded-2xl border border-white/45 bg-background/80 p-2.5 shadow-[inset_3px_3px_7px_rgba(0,0,0,0.06),inset_-3px_-3px_7px_rgba(255,255,255,0.85)] dark:border-white/5 dark:shadow-[inset_3px_3px_8px_rgba(0,0,0,0.45),inset_-3px_-3px_8px_rgba(255,255,255,0.03)] sm:px-3.5 sm:py-2.5">
          <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between xl:gap-4">
            {/* Phạm vi */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {t("incidents.scope.label")}
              </span>

              <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-background p-1 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.06),inset_-2px_-2px_5px_rgba(255,255,255,0.85)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.45),inset_-2px_-2px_6px_rgba(255,255,255,0.03)]">
                {scopeOptions.map((opt) => {
                  const isActive = scope === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => onScopeChange(opt.value)}
                      className={`group relative inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-background px-3 text-xs font-bold transition-all duration-200 ${isActive
                          ? "text-primary shadow-[3px_3px_6px_rgba(0,0,0,0.07),-3px_-3px_6px_rgba(255,255,255,0.85)] ring-1 ring-primary/25 dark:shadow-[3px_3px_6px_rgba(0,0,0,0.45),-3px_-3px_6px_rgba(255,255,255,0.03)]"
                          : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${isActive
                            ? "bg-primary ring-2 ring-primary/25"
                            : "bg-muted-foreground/30 group-hover:bg-muted-foreground/60"
                          }`}
                      />
                      {opt.icon && (
                        <span className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-primary" : ""}`}>
                          {opt.icon}
                        </span>
                      )}
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hàng đợi tác nghiệp (nằm ngang cân đối trên màn hình rộng, xuống hàng gọn trên màn nhỏ) */}
            {showQueueRow && (
              <div className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-2 xl:border-l xl:border-t-0 xl:pl-4 xl:pt-0 sm:gap-2.5">
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  {t("incidents.scope.queueLabel")}
                </span>

                <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-background p-1 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.06),inset_-2px_-2px_5px_rgba(255,255,255,0.85)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.45),inset_-2px_-2px_6px_rgba(255,255,255,0.03)]">
                  {queueOptions.map((value) => {
                    const isActive = queue === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => onScopeChange("work", value)}
                        className={`group relative inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-background px-3 text-xs font-bold transition-all duration-200 ${isActive
                            ? "text-primary shadow-[3px_3px_6px_rgba(0,0,0,0.07),-3px_-3px_6px_rgba(255,255,255,0.85)] ring-1 ring-accent dark:shadow-[3px_3px_6px_rgba(0,0,0,0.45),-3px_-3px_6px_rgba(255,255,255,0.03)]"
                            : "text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${isActive
                              ? "bg-primary ring-2 ring-primary/25"
                              : "bg-muted-foreground/30 group-hover:bg-muted-foreground/60"
                            }`}
                        />
                        <span>{t(incidentWorkStatuses[value])}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── ZONE 2: TÌM KIẾM & BỘ LỌC CHI TIẾT (Extruded Command Strip) ── */}
        <div className="flex flex-col gap-2.5 rounded-2xl border border-white/60 bg-background p-2.5 shadow-[4px_4px_10px_rgba(0,0,0,0.05),-4px_-4px_10px_rgba(255,255,255,0.85)] dark:border-white/5 dark:shadow-[4px_4px_10px_rgba(0,0,0,0.35),-4px_-4px_10px_rgba(255,255,255,0.02)] sm:px-3.5 sm:py-3">
          {/* Hàng Search + Reset + Refresh */}
          <div className="flex items-center gap-2.5">
            <div className="group relative min-w-0 flex-1 rounded-xl bg-background shadow-[inset_3px_3px_6px_rgba(0,0,0,0.07),inset_-3px_-3px_6px_rgba(255,255,255,0.85)] transition-all focus-within:ring-1 focus-within:ring-primary/40 dark:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.45),inset_-3px_-3px_7px_rgba(255,255,255,0.03)]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <input
                type="text"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={t("incidents.toolbar.searchPlaceholder")}
                className="h-9 w-full bg-transparent pl-9 pr-9 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none sm:text-sm"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  aria-label={isVietnamese ? "Xóa tìm kiếm" : "Clear search"}
                  className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-background text-muted-foreground shadow-[2px_2px_4px_rgba(0,0,0,0.07),-2px_-2px_4px_rgba(255,255,255,0.85)] transition-all hover:text-primary active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.07),inset_-2px_-2px_4px_rgba(255,255,255,0.85)] dark:shadow-[2px_2px_4px_rgba(0,0,0,0.45),-2px_-2px_4px_rgba(255,255,255,0.03)]"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleResetAll}
                className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-background px-3 text-xs font-bold text-primary shadow-[4px_4px_8px_rgba(0,0,0,0.07),-4px_-4px_8px_rgba(255,255,255,0.85)] transition-all duration-200 hover:bg-accent/40 hover:shadow-[2px_2px_5px_rgba(0,0,0,0.07),-2px_-2px_5px_rgba(255,255,255,0.85)] active:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.07),inset_-2px_-2px_5px_rgba(255,255,255,0.85)] dark:shadow-[4px_4px_8px_rgba(0,0,0,0.45),-4px_-4px_8px_rgba(255,255,255,0.03)]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {isVietnamese ? "Đặt lại" : "Reset"}
                </span>
                <span className="flex h-4 min-w-[18px] items-center justify-center rounded-full bg-primary/15 px-1 font-mono text-[10px] font-extrabold text-primary">
                  {activeFiltersCount}
                </span>
              </button>
            )}

            {onRefresh && (
              <RefreshIconButton
                onRefresh={onRefresh}
                isRefreshing={isRefreshing}
                title={isVietnamese ? "Làm mới dữ liệu" : "Refresh data"}
                ariaLabel={isVietnamese ? "Làm mới" : "Refresh"}
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-background text-foreground shadow-[4px_4px_8px_rgba(0,0,0,0.07),-4px_-4px_8px_rgba(255,255,255,0.85)] transition-all duration-200 hover:bg-accent/40 hover:text-primary hover:shadow-[2px_2px_5px_rgba(0,0,0,0.07),-2px_-2px_5px_rgba(255,255,255,0.85)] active:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.07),inset_-2px_-2px_5px_rgba(255,255,255,0.85)] disabled:opacity-50 dark:shadow-[4px_4px_8px_rgba(0,0,0,0.45),-4px_-4px_8px_rgba(255,255,255,0.03)]"
                iconClassName="h-3.5 w-3.5"
              />
            )}
          </div>

          {/* Hàng Dropdown Bộ Lọc + Toggle Cá Nhân */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {sites.length > 0 && onSiteFilterChange && (
                <div className="group relative inline-flex items-center">
                  <select
                    value={siteFilter}
                    onChange={(e) => onSiteFilterChange(e.target.value)}
                    aria-label={isVietnamese ? "Lọc công trường" : "Filter by site"}
                    className={`h-8.5 cursor-pointer appearance-none rounded-xl bg-background pl-3 pr-8 text-xs font-semibold outline-none transition-all duration-200 ${siteFilter
                        ? "text-primary shadow-[inset_2px_2px_5px_rgba(0,0,0,0.07),inset_-2px_-2px_5px_rgba(255,255,255,0.85)] ring-1 ring-primary/30 dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.45),inset_-2px_-2px_5px_rgba(255,255,255,0.03)]"
                        : "text-foreground shadow-[3px_3px_7px_rgba(0,0,0,0.07),-3px_-3px_7px_rgba(255,255,255,0.85)] hover:bg-accent/30 hover:text-primary focus:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.07),inset_-2px_-2px_5px_rgba(255,255,255,0.85)] dark:shadow-[3px_3px_7px_rgba(0,0,0,0.45),-3px_-3px_7px_rgba(255,255,255,0.03)]"
                      }`}
                  >
                    <option value="" className="bg-background text-foreground">
                      {t("incidents.toolbar.allSites") ||
                        (isVietnamese ? "Tất cả công trường" : "All Sites")}
                    </option>
                    {sites.map((s) => (
                      <option key={s.id} value={s.id} className="bg-background text-foreground">
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                  <span
                    className={`pointer-events-none absolute right-2 flex h-4 w-4 items-center justify-center rounded transition-colors ${siteFilter
                        ? "bg-primary/15 text-primary"
                        : "bg-accent/60 text-accent-foreground group-hover:bg-primary/15 group-hover:text-primary"
                      }`}
                  >
                    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                </div>
              )}

              {zones.length > 0 && onZoneFilterChange && (
                <div className="group relative inline-flex items-center">
                  <select
                    value={zoneFilter}
                    onChange={(e) => onZoneFilterChange(e.target.value)}
                    aria-label={isVietnamese ? "Lọc phân khu" : "Filter by zone"}
                    className={`h-8.5 cursor-pointer appearance-none rounded-xl bg-background pl-3 pr-8 text-xs font-semibold outline-none transition-all duration-200 ${zoneFilter
                        ? "text-primary shadow-[inset_2px_2px_5px_rgba(0,0,0,0.07),inset_-2px_-2px_5px_rgba(255,255,255,0.85)] ring-1 ring-primary/30 dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.45),inset_-2px_-2px_5px_rgba(255,255,255,0.03)]"
                        : "text-foreground shadow-[3px_3px_7px_rgba(0,0,0,0.07),-3px_-3px_7px_rgba(255,255,255,0.85)] hover:bg-accent/30 hover:text-primary focus:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.07),inset_-2px_-2px_5px_rgba(255,255,255,0.85)] dark:shadow-[3px_3px_7px_rgba(0,0,0,0.45),-3px_-3px_7px_rgba(255,255,255,0.03)]"
                      }`}
                  >
                    <option value="" className="bg-background text-foreground">
                      {isVietnamese ? "Tất cả phân khu" : "All Zones"}
                    </option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id} className="bg-background text-foreground">
                        {z.label}
                      </option>
                    ))}
                  </select>
                  <span
                    className={`pointer-events-none absolute right-2 flex h-4 w-4 items-center justify-center rounded transition-colors ${zoneFilter
                        ? "bg-primary/15 text-primary"
                        : "bg-accent/60 text-accent-foreground group-hover:bg-primary/15 group-hover:text-primary"
                      }`}
                  >
                    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                </div>
              )}

              {cameras.length > 0 && onCameraIdFilterChange && (
                <div className="group relative inline-flex items-center">
                  <select
                    value={cameraIdFilter}
                    onChange={(e) => onCameraIdFilterChange(e.target.value)}
                    aria-label={isVietnamese ? "Lọc camera" : "Filter by camera"}
                    className={`h-8.5 cursor-pointer appearance-none rounded-xl bg-background pl-3 pr-8 text-xs font-semibold outline-none transition-all duration-200 ${cameraIdFilter
                        ? "text-primary shadow-[inset_2px_2px_5px_rgba(0,0,0,0.07),inset_-2px_-2px_5px_rgba(255,255,255,0.85)] ring-1 ring-primary/30 dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.45),inset_-2px_-2px_5px_rgba(255,255,255,0.03)]"
                        : "text-foreground shadow-[3px_3px_7px_rgba(0,0,0,0.07),-3px_-3px_7px_rgba(255,255,255,0.85)] hover:bg-accent/30 hover:text-primary focus:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.07),inset_-2px_-2px_5px_rgba(255,255,255,0.85)] dark:shadow-[3px_3px_7px_rgba(0,0,0,0.45),-3px_-3px_7px_rgba(255,255,255,0.03)]"
                      }`}
                  >
                    <option value="" className="bg-background text-foreground">
                      {t("incidents.toolbar.allCameras") ||
                        (isVietnamese ? "Tất cả camera" : "All Cameras")}
                    </option>
                    {cameras.map((c) => (
                      <option key={c.id} value={c.id} className="bg-background text-foreground">
                        {c.code} {c.name ? `- ${c.name}` : ""}
                      </option>
                    ))}
                  </select>
                  <span
                    className={`pointer-events-none absolute right-2 flex h-4 w-4 items-center justify-center rounded transition-colors ${cameraIdFilter
                        ? "bg-primary/15 text-primary"
                        : "bg-accent/60 text-accent-foreground group-hover:bg-primary/15 group-hover:text-primary"
                      }`}
                  >
                    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                </div>
              )}

              {/* Dropdown Mức độ */}
              <div className="group relative inline-flex items-center">
                <select
                  value={severityFilter}
                  onChange={(e) => onSeverityFilterChange(e.target.value)}
                  aria-label={isVietnamese ? "Lọc mức độ" : "Filter by severity"}
                  className={`h-8.5 cursor-pointer appearance-none rounded-xl bg-background pl-3 pr-8 text-xs font-semibold outline-none transition-all duration-200 ${severityFilter
                      ? "text-primary shadow-[inset_2px_2px_5px_rgba(0,0,0,0.07),inset_-2px_-2px_5px_rgba(255,255,255,0.85)] ring-1 ring-primary/30 dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.45),inset_-2px_-2px_5px_rgba(255,255,255,0.03)]"
                      : "text-foreground shadow-[3px_3px_7px_rgba(0,0,0,0.07),-3px_-3px_7px_rgba(255,255,255,0.85)] hover:bg-accent/30 hover:text-primary focus:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.07),inset_-2px_-2px_5px_rgba(255,255,255,0.85)] dark:shadow-[3px_3px_7px_rgba(0,0,0,0.45),-3px_-3px_7px_rgba(255,255,255,0.03)]"
                    }`}
                >
                  <option value="" className="bg-background text-foreground">
                    {t("incidents.toolbar.allSeverities")}
                  </option>
                  <option value="CRITICAL" className="bg-background text-foreground">
                    {t("incidents.severity.critical")}
                  </option>
                  <option value="HIGH" className="bg-background text-foreground">
                    {t("incidents.severity.high")}
                  </option>
                  <option value="MEDIUM" className="bg-background text-foreground">
                    {t("incidents.severity.medium")}
                  </option>
                  <option value="LOW" className="bg-background text-foreground">
                    {t("incidents.severity.low")}
                  </option>
                </select>
                <span
                  className={`pointer-events-none absolute right-2 flex h-4 w-4 items-center justify-center rounded transition-colors ${severityFilter
                      ? "bg-primary/15 text-primary"
                      : "bg-accent/60 text-accent-foreground group-hover:bg-primary/15 group-hover:text-primary"
                    }`}
                >
                  <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </div>

              {/* Dropdown Loại vi phạm */}
              <div className="group relative inline-flex items-center">
                <select
                  value={violationFilter}
                  onChange={(e) => onViolationFilterChange(e.target.value)}
                  aria-label={isVietnamese ? "Lọc loại vi phạm" : "Filter by violation"}
                  className={`h-8.5 cursor-pointer appearance-none rounded-xl bg-background pl-3 pr-8 text-xs font-semibold outline-none transition-all duration-200 ${violationFilter
                      ? "text-primary shadow-[inset_2px_2px_5px_rgba(0,0,0,0.07),inset_-2px_-2px_5px_rgba(255,255,255,0.85)] ring-1 ring-primary/30 dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.45),inset_-2px_-2px_5px_rgba(255,255,255,0.03)]"
                      : "text-foreground shadow-[3px_3px_7px_rgba(0,0,0,0.07),-3px_-3px_7px_rgba(255,255,255,0.85)] hover:bg-accent/30 hover:text-primary focus:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.07),inset_-2px_-2px_5px_rgba(255,255,255,0.85)] dark:shadow-[3px_3px_7px_rgba(0,0,0,0.45),-3px_-3px_7px_rgba(255,255,255,0.03)]"
                    }`}
                >
                  <option value="" className="bg-background text-foreground">
                    {t("incidents.toolbar.allViolations")}
                  </option>
                  <option value="NO_HELMET" className="bg-background text-foreground">
                    {t("incidents.violation.noHelmet")}
                  </option>
                  <option value="NO_VEST" className="bg-background text-foreground">
                    {t("incidents.violation.noVest")}
                  </option>
                  <option value="RESTRICTED_AREA" className="bg-background text-foreground">
                    {t("incidents.violation.restrictedArea")}
                  </option>
                  <option value="MULTI_VIOLATION" className="bg-background text-foreground">
                    {t("incidents.violation.multi")}
                  </option>
                </select>
                <span
                  className={`pointer-events-none absolute right-2 flex h-4 w-4 items-center justify-center rounded transition-colors ${violationFilter
                      ? "bg-primary/15 text-primary"
                      : "bg-accent/60 text-accent-foreground group-hover:bg-primary/15 group-hover:text-primary"
                    }`}
                >
                  <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </div>
            </div>

            {/* Nút Toggle "Việc được giao cho tôi" tách biệt bên phải cho cân đối */}
            {onAssignedToMeChange && (
              <button
                type="button"
                aria-pressed={assignedToMe}
                onClick={() => onAssignedToMeChange(!assignedToMe)}
                className={`inline-flex h-8.5 shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-background px-3.5 text-xs font-bold transition-all duration-200 ${assignedToMe
                    ? "text-primary shadow-[inset_3px_3px_6px_rgba(0,0,0,0.07),inset_-3px_-3px_6px_rgba(255,255,255,0.85)] ring-1 ring-primary/30 dark:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.45),inset_-3px_-3px_6px_rgba(255,255,255,0.03)]"
                    : "text-foreground shadow-[3px_3px_7px_rgba(0,0,0,0.07),-3px_-3px_7px_rgba(255,255,255,0.85)] hover:bg-accent/30 hover:text-primary active:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.07),inset_-2px_-2px_5px_rgba(255,255,255,0.85)] dark:shadow-[3px_3px_7px_rgba(0,0,0,0.45),-3px_-3px_7px_rgba(255,255,255,0.03)]"
                  }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full transition-all ${assignedToMe
                      ? "bg-primary ring-2 ring-primary/25"
                      : "bg-muted-foreground/40"
                    }`}
                />
                <UserCheck className={`h-3.5 w-3.5 ${assignedToMe ? "text-primary" : ""}`} />
                <span>
                  {isVietnamese ? "Việc được giao cho tôi" : "Assigned to me"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* ── ZONE 3: SLOT MỞ RỘNG (Nếu có children) ── */}
        {children ? (
          <div className="rounded-2xl border border-white/40 bg-background/70 px-3.5 py-2.5 shadow-[inset_2px_2px_6px_rgba(0,0,0,0.05),inset_-2px_-2px_6px_rgba(255,255,255,0.8)] dark:border-white/5 dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.4),inset_-2px_-2px_6px_rgba(255,255,255,0.02)]">
            {children}
          </div>
        ) : null}
      </div>
    </section>
  );
}
