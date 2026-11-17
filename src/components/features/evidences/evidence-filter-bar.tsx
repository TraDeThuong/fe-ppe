"use client";

import { useMemo } from "react";
import {
  Archive,
  ArrowDownUp,
  CheckCircle2,
  CheckSquare,
  Columns2,
  FolderKanban,
  LayoutGrid,
  RotateCcw,
  Search,
  ShieldAlert,
  Table2,
  X,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/form";
import {
  Select,
  type SelectOption,
} from "@/components/ui/form/selection-controls/select";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "@/components/ui/segmented-control";
import { useCamerasCatalog } from "@/hooks/cameras";
import { useSitesCatalog } from "@/hooks/sites";
import type {
  EvidenceChecksumFilter,
  EvidenceDatePreset,
  EvidenceLifecycleScope,
} from "@/lib/evidence-utils";
import { useLocale } from "@/providers/locale-provider";
import { EVIDENCE_TYPE, VIOLATION_TYPE } from "@/types";

export type EvidenceViewMode = "grid" | "pairs" | "table";

export interface EvidenceFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  siteId: string;
  onSiteIdChange: (value: string) => void;
  cameraId: string;
  onCameraIdChange: (value: string) => void;
  evidenceType: string;
  onEvidenceTypeChange: (value: string) => void;
  violationType: string;
  onViolationTypeChange: (value: string) => void;
  checksumFilter: EvidenceChecksumFilter;
  onChecksumFilterChange: (value: EvidenceChecksumFilter) => void;
  datePreset: EvidenceDatePreset;
  onDatePresetChange: (value: EvidenceDatePreset) => void;
  lifecycleScope?: EvidenceLifecycleScope;
  onLifecycleScopeChange?: (value: EvidenceLifecycleScope) => void;
  archivedCount?: number;
  sortBy: "capturedAt" | "createdAt";
  onSortByChange: (value: "capturedAt" | "createdAt") => void;
  sortOrder: "asc" | "desc";
  onToggleSortOrder: () => void;
  viewMode: EvidenceViewMode;
  onViewModeChange: (value: EvidenceViewMode) => void;
  onResetFilters: () => void;
  visibleCount: number;
  selectedCount: number;
  allVisibleSelected: boolean;
  onToggleSelectAll: () => void;
}

export function EvidenceFilterBar({
  search,
  onSearchChange,
  siteId,
  onSiteIdChange,
  cameraId,
  onCameraIdChange,
  evidenceType,
  onEvidenceTypeChange,
  violationType,
  onViolationTypeChange,
  checksumFilter,
  onChecksumFilterChange,
  datePreset,
  onDatePresetChange,
  lifecycleScope = "all",
  onLifecycleScopeChange,
  archivedCount = 0,
  sortBy,
  onSortByChange,
  sortOrder,
  onToggleSortOrder,
  viewMode,
  onViewModeChange,
  onResetFilters,
  visibleCount,
  selectedCount,
  allVisibleSelected,
  onToggleSelectAll,
}: EvidenceFilterBarProps) {
  const { t, locale } = useLocale();
  const isVi = locale === "vi-VN";
  const { data: sitesData } = useSitesCatalog();
  const { data: camerasData } = useCamerasCatalog();

  const sites = useMemo(() => sitesData ?? [], [sitesData]);
  const cameras = useMemo(() => {
    const list = camerasData ?? [];
    return siteId ? list.filter((c) => c.siteId === siteId) : list;
  }, [camerasData, siteId]);

  const viewOptions: SegmentedControlOption<EvidenceViewMode>[] = useMemo(
    () => [
      { value: "grid", label: t("evidences.view.grid"), icon: <LayoutGrid /> },
      { value: "pairs", label: t("evidences.view.pairs"), icon: <Columns2 /> },
      { value: "table", label: t("evidences.view.table"), icon: <Table2 /> },
    ],
    [t],
  );

  const typeOptions: SegmentedControlOption<string>[] = useMemo(
    () => [
      { value: "", label: t("evidences.filters.allTypes") },
      { value: EVIDENCE_TYPE.SNAPSHOT, label: "SNAPSHOT" },
      { value: EVIDENCE_TYPE.REFERENCE_SNAPSHOT, label: "REFERENCE" },
      { value: EVIDENCE_TYPE.VIDEO_CLIP, label: "VIDEO" },
    ],
    [t],
  );

  const siteOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: t("evidences.filters.allSites") },
      ...sites.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` })),
    ],
    [sites, t],
  );

  const cameraOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: t("evidences.filters.allCameras") },
      ...cameras.map((c) => ({
        value: c.id,
        label: `${c.code}${c.name ? ` — ${c.name}` : ""}`,
      })),
    ],
    [cameras, t],
  );

  const violationOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: t("evidences.filters.allViolations") },
      { value: VIOLATION_TYPE.NO_HELMET, label: t("incidents.violations.noHelmet") },
      { value: VIOLATION_TYPE.NO_VEST, label: t("incidents.violations.noVest") },
      {
        value: VIOLATION_TYPE.RESTRICTED_AREA,
        label: t("incidents.violations.restrictedArea"),
      },
      {
        value: VIOLATION_TYPE.MULTI_VIOLATION,
        label: t("incidents.violations.multiViolation"),
      },
    ],
    [t],
  );

  const checksumOptions: SelectOption[] = useMemo(
    () => [
      { value: "all", label: t("evidences.filters.checksumAll") },
      { value: "has_hash", label: t("evidences.filters.checksumHas") },
      { value: "missing_hash", label: t("evidences.filters.checksumMissing") },
    ],
    [t],
  );

  const sortOptions: SelectOption[] = useMemo(
    () => [
      { value: "capturedAt", label: t("evidences.filters.sortCaptured") },
      { value: "createdAt", label: t("evidences.filters.sortCreated") },
    ],
    [t],
  );

  const datePresets: { value: EvidenceDatePreset; label: string }[] = [
    { value: "all", label: t("evidences.filters.dateAll") },
    { value: "today", label: t("evidences.filters.dateToday") },
    { value: "7d", label: t("evidences.filters.date7d") },
    { value: "30d", label: t("evidences.filters.date30d") },
  ];

  const activeCount =
    (search.trim() ? 1 : 0) +
    (siteId ? 1 : 0) +
    (cameraId ? 1 : 0) +
    (evidenceType ? 1 : 0) +
    (violationType ? 1 : 0) +
    (checksumFilter !== "all" ? 1 : 0) +
    (datePreset !== "all" ? 1 : 0) +
    (lifecycleScope !== "all" ? 1 : 0);

  const scopeTabs: Array<{
    value: EvidenceLifecycleScope;
    label: string;
    icon: typeof FolderKanban;
    badge?: number;
  }> = [
    {
      value: "all",
      label: isVi ? "Tất cả kho" : "All Vault",
      icon: FolderKanban,
    },
    {
      value: "active",
      label: isVi ? "Đang hiệu lực" : "Active Incidents",
      icon: ShieldAlert,
    },
    {
      value: "closed",
      label: isVi ? "Sự cố đã đóng" : "Closed Incidents",
      icon: CheckCircle2,
    },
    {
      value: "dismissed",
      label: isVi ? "Báo nhầm (Rác AI)" : "Dismissed (AI Noise)",
      icon: XCircle,
    },
    {
      value: "archived",
      label: isVi ? "Kho Lưu trữ" : "Archived Vault",
      icon: Archive,
      badge: archivedCount,
    },
  ];

  return (
    <div className="space-y-4 rounded-[26px] bg-background p-4 sm:p-5 shadow-[10px_10px_24px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light)] transition-all duration-300">
      {/* TẦNG 0: Phân tầng Hồ sơ & Kho Lưu trữ (Vault Scope Tabs) */}
      {onLifecycleScopeChange && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-background p-1.5 shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)]">
          {scopeTabs.map((tab) => {
            const Icon = tab.icon;
            const active = lifecycleScope === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => onLifecycleScopeChange(tab.value)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  active
                    ? "bg-background text-primary shadow-[2.5px_2.5px_5px_var(--shadow-dark),-2.5px_-2.5px_5px_var(--shadow-light)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                {typeof tab.badge === "number" && tab.badge > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 font-mono text-[10px] font-extrabold ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* TẦNG 1: Tìm kiếm + Thời gian + Chế độ xem */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        {/* Ô tìm kiếm rộng rãi */}
        <div className="relative flex-1 xl:max-w-md rounded-2xl bg-background shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
          <Input
            size="sm"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("evidences.filters.searchPlaceholder")}
            className="h-10 border-0 bg-transparent pl-10 pr-9 text-xs font-medium shadow-none focus-visible:ring-1 focus-visible:ring-primary/40"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-background text-muted-foreground shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)] transition-all hover:text-foreground active:shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]"
              aria-label={t("common.clear")}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Cụm điều khiển nhanh bên phải */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Khoảng thời gian (Date Presets) */}
          <div className="flex items-center gap-1 rounded-xl bg-background p-1 shadow-[inset_2.5px_2.5px_5px_var(--shadow-dark),inset_-2.5px_-2.5px_5px_var(--shadow-light)]">
            {datePresets.map((preset) => {
              const isActive = datePreset === preset.value;
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => onDatePresetChange(preset.value)}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${isActive
                      ? "bg-background text-primary shadow-[2.5px_2.5px_5px_var(--shadow-dark),-2.5px_-2.5px_5px_var(--shadow-light)]"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Chế độ xem (Grid / List) */}
          <div className="rounded-xl bg-background p-0.5 shadow-[inset_2.5px_2.5px_5px_var(--shadow-dark),inset_-2.5px_-2.5px_5px_var(--shadow-light)]">
            <SegmentedControl
              size="sm"
              aria-label={t("evidences.view.label")}
              options={viewOptions}
              value={viewMode}
              onValueChange={onViewModeChange}
            />
          </div>

          {/* Nút Chọn tất cả trang */}
          {visibleCount > 0 && (
            <button
              type="button"
              onClick={onToggleSelectAll}
              title={t("evidences.batch.selectAllHint")}
              className={`inline-flex h-9.5 cursor-pointer items-center gap-2 rounded-xl px-4 text-xs font-bold transition-all duration-200 ${allVisibleSelected
                  ? "bg-primary text-primary-foreground shadow-[3px_3px_7px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)]"
                  : "bg-background text-foreground shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light)] hover:-translate-y-0.5 hover:text-primary active:translate-y-0 active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]"
                }`}
            >
              <CheckSquare className="h-3.5 w-3.5" />
              <span>
                {allVisibleSelected
                  ? t("evidences.batch.deselectAll")
                  : t("evidences.batch.selectPage")}
                {selectedCount > 0 ? ` (${selectedCount})` : ""}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* TẦNG 2: Lưới 3 cột rộng rãi (2 hàng × 3 cột) có nhãn rõ ràng */}
      <div className="rounded-[20px] bg-background p-3.5 sm:p-4 shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_var(--shadow-light)]">
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
          {/* Cột 1 - Hàng 1: Loại bằng chứng */}
          <div className="space-y-1.5">
            <label className="block px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("evidences.filters.typeLabel")}
            </label>
            <div className="flex h-9.5 items-center rounded-xl bg-background p-1 shadow-[2.5px_2.5px_5px_var(--shadow-dark),-2.5px_-2.5px_5px_var(--shadow-light)]">
              <SegmentedControl
                size="sm"
                aria-label={t("evidences.filters.typeLabel")}
                options={typeOptions}
                value={evidenceType}
                onValueChange={onEvidenceTypeChange}
                className="w-full"
              />
            </div>
          </div>

          {/* Cột 2 - Hàng 1: Công trường */}
          <div className="space-y-1.5">
            <label className="block px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Site / Công trường
            </label>
            <div className="rounded-xl bg-background shadow-[2.5px_2.5px_5px_var(--shadow-dark),-2.5px_-2.5px_5px_var(--shadow-light)]">
              <Select
                size="sm"
                options={siteOptions}
                value={siteId}
                onValueChange={onSiteIdChange}
                className="h-9.5 border-0 bg-transparent text-xs font-semibold shadow-none"
              />
            </div>
          </div>

          {/* Cột 3 - Hàng 1: Camera */}
          <div className="space-y-1.5">
            <label className="block px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Camera
            </label>
            <div className="rounded-xl bg-background shadow-[2.5px_2.5px_5px_var(--shadow-dark),-2.5px_-2.5px_5px_var(--shadow-light)]">
              <Select
                size="sm"
                options={cameraOptions}
                value={cameraId}
                onValueChange={onCameraIdChange}
                className="h-9.5 border-0 bg-transparent text-xs font-semibold shadow-none"
              />
            </div>
          </div>

          {/* Cột 1 - Hàng 2: Loại vi phạm */}
          <div className="space-y-1.5">
            <label className="block px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Loại vi phạm
            </label>
            <div className="rounded-xl bg-background shadow-[2.5px_2.5px_5px_var(--shadow-dark),-2.5px_-2.5px_5px_var(--shadow-light)]">
              <Select
                size="sm"
                options={violationOptions}
                value={violationType}
                onValueChange={onViolationTypeChange}
                className="h-9.5 border-0 bg-transparent text-xs font-semibold shadow-none"
              />
            </div>
          </div>

          {/* Cột 2 - Hàng 2: Checksum / Toàn vẹn dữ liệu */}
          <div className="space-y-1.5">
            <label className="block px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Checksum
            </label>
            <div className="rounded-xl bg-background shadow-[2.5px_2.5px_5px_var(--shadow-dark),-2.5px_-2.5px_5px_var(--shadow-light)]">
              <Select
                size="sm"
                options={checksumOptions}
                value={checksumFilter}
                onValueChange={(v) =>
                  onChecksumFilterChange(v as EvidenceChecksumFilter)
                }
                className="h-9.5 border-0 bg-transparent text-xs font-semibold shadow-none"
              />
            </div>
          </div>

          {/* Cột 3 - Hàng 2: Sắp xếp & Thứ tự */}
          <div className="space-y-1.5">
            <label className="block px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("evidences.filters.toggleSort")}
            </label>
            <div className="flex h-9.5 items-center gap-1.5 rounded-xl bg-background p-1 shadow-[2.5px_2.5px_5px_var(--shadow-dark),-2.5px_-2.5px_5px_var(--shadow-light)]">
              <div className="min-w-0 flex-1">
                <Select
                  size="sm"
                  options={sortOptions}
                  value={sortBy}
                  onValueChange={(v) =>
                    onSortByChange(v as "capturedAt" | "createdAt")
                  }
                  className="h-7.5 border-0 bg-transparent text-xs font-semibold shadow-none"
                />
              </div>
              <button
                type="button"
                onClick={onToggleSortOrder}
                title={t("evidences.filters.toggleSort")}
                className="inline-flex h-7.5 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-background px-2.5 font-mono text-[11px] font-extrabold text-primary shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)] transition-all hover:opacity-85"
              >
                <ArrowDownUp className="h-3.5 w-3.5" />
                <span>{sortOrder === "desc" ? "DESC" : "ASC"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TẦNG 3: Dải Chips bộ lọc đang bật */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
          <span className="rounded-full bg-background px-3 py-1 text-[11px] font-bold text-muted-foreground shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]">
            {t("evidences.filters.activeCount", { count: activeCount })}
          </span>

          {siteId && (
            <Badge
              variant="primary"
              size="sm"
              removable
              onRemove={() => onSiteIdChange("")}
            >
              Site: {sites.find((s) => s.id === siteId)?.code || siteId.slice(0, 8)}
            </Badge>
          )}

          {cameraId && (
            <Badge
              variant="info"
              size="sm"
              removable
              onRemove={() => onCameraIdChange("")}
            >
              Camera:{" "}
              {cameras.find((c) => c.id === cameraId)?.code || cameraId.slice(0, 8)}
            </Badge>
          )}

          {evidenceType && (
            <Badge
              variant="secondary"
              size="sm"
              removable
              onRemove={() => onEvidenceTypeChange("")}
            >
              {evidenceType}
            </Badge>
          )}

          {violationType && (
            <Badge
              variant="warning"
              size="sm"
              removable
              onRemove={() => onViolationTypeChange("")}
            >
              {violationType}
            </Badge>
          )}

          {checksumFilter !== "all" && (
            <Badge
              variant="outline"
              size="sm"
              removable
              onRemove={() => onChecksumFilterChange("all")}
            >
              {checksumFilter === "has_hash"
                ? t("evidences.filters.checksumHas")
                : t("evidences.filters.checksumMissing")}
            </Badge>
          )}

          {datePreset !== "all" && (
            <Badge
              variant="outline"
              size="sm"
              removable
              onRemove={() => onDatePresetChange("all")}
            >
              {datePresets.find((d) => d.value === datePreset)?.label}
            </Badge>
          )}

          {search.trim() && (
            <Badge
              variant="default"
              size="sm"
              removable
              onRemove={() => onSearchChange("")}
            >
              “{search.trim()}”
            </Badge>
          )}

          <button
            type="button"
            onClick={onResetFilters}
            className="ml-auto inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full bg-background px-3.5 text-[11px] font-bold text-primary shadow-[2.5px_2.5px_5px_var(--shadow-dark),-2.5px_-2.5px_5px_var(--shadow-light)] transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]"
          >
            <RotateCcw className="h-3 w-3" />
            <span>{t("evidences.filters.reset")}</span>
          </button>
        </div>
      )}
    </div>
  );
}
