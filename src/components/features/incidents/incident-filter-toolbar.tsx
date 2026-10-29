"use client";

import { useMemo } from "react";
import {
  AlertOctagon,
  Building2,
  Camera,
  Filter,
  HardHat,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSites } from "@/hooks/sites";
import { useCameras } from "@/hooks/cameras";
import { useLocale } from "@/providers/locale-provider";

export interface IncidentFilterToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  severityFilter: string;
  onSeverityFilterChange: (value: string) => void;
  violationFilter: string;
  onViolationFilterChange: (value: string) => void;
  siteFilter?: string;
  onSiteFilterChange?: (value: string) => void;
  cameraIdFilter?: string;
  onCameraIdFilterChange?: (value: string) => void;
  onResetFilters?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  className?: string;
}

export function IncidentFilterToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  severityFilter,
  onSeverityFilterChange,
  violationFilter,
  onViolationFilterChange,
  siteFilter = "",
  onSiteFilterChange,
  cameraIdFilter = "",
  onCameraIdFilterChange,
  onResetFilters,
  onRefresh,
  isRefreshing = false,
  className = "",
}: IncidentFilterToolbarProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  // Danh mục Site & Camera
  const { data: sitesData } = useSites({ limit: 100 });
  const sites = sitesData?.items || [];

  const { data: camerasData } = useCameras({
    siteId: siteFilter || undefined,
    limit: 100,
  });
  const cameras = camerasData?.items || [];

  // Tìm tên hiển thị của site và camera đang chọn
  const activeSiteName = useMemo(() => {
    if (!siteFilter) return "";
    const found = sites.find((s) => s.id === siteFilter);
    return found ? `${found.name} (${found.code})` : siteFilter;
  }, [siteFilter, sites]);

  const activeCameraName = useMemo(() => {
    if (!cameraIdFilter) return "";
    const found = cameras.find((c) => c.id === cameraIdFilter);
    return found ? `${found.code}${found.name ? ` - ${found.name}` : ""}` : cameraIdFilter;
  }, [cameraIdFilter, cameras]);

  // Đếm số lượng bộ lọc đang kích hoạt
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (siteFilter) count++;
    if (cameraIdFilter) count++;
    if (statusFilter) count++;
    if (severityFilter) count++;
    if (violationFilter) count++;
    return count;
  }, [search, siteFilter, cameraIdFilter, statusFilter, severityFilter, violationFilter]);

  const hasActiveFilters = activeFiltersCount > 0;

  const handleResetAll = () => {
    onSearchChange("");
    if (onSiteFilterChange) onSiteFilterChange("");
    if (onCameraIdFilterChange) onCameraIdFilterChange("");
    onStatusFilterChange("");
    onSeverityFilterChange("");
    onViolationFilterChange("");
    if (onResetFilters) onResetFilters();
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PENDING_REVIEW":
        return t("incidents.status.pendingReview");
      case "CONFIRMED":
        return t("incidents.status.confirmed");
      case "DISMISSED":
        return t("incidents.status.dismissed");
      case "RESOLVED":
        return t("incidents.status.resolved");
      case "CLOSED":
        return t("incidents.status.closed");
      default:
        return status;
    }
  };

  const getSeverityLabel = (sev: string) => {
    switch (sev) {
      case "CRITICAL":
        return t("incidents.severity.critical");
      case "HIGH":
        return t("incidents.severity.high");
      case "MEDIUM":
        return t("incidents.severity.medium");
      case "LOW":
        return t("incidents.severity.low");
      default:
        return sev;
    }
  };

  const getViolationLabel = (violation: string) => {
    switch (violation) {
      case "NO_HELMET":
        return t("incidents.violation.noHelmet");
      case "NO_VEST":
        return t("incidents.violation.noVest");
      case "RESTRICTED_AREA":
        return t("incidents.violation.restrictedArea");
      case "MULTI_VIOLATION":
        return t("incidents.violation.multi");
      default:
        return violation;
    }
  };

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border border-border/30 bg-surface/90 p-3 sm:p-4 shadow-[6px_6px_16px_var(--shadow-dark),-6px_-6px_16px_var(--shadow-light)] dark:border-white/10 dark:bg-card/90 transition-all ${className}`}
    >
      {/* ── HÀNG 1: TÌM KIẾM & TIỆN ÍCH LÀM MỚI / ĐẶT LẠI ──────────────────── */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Bar Input */}
        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
            <Search className="h-4 w-4" />
          </div>

          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("incidents.toolbar.searchPlaceholder")}
            className="w-full rounded-xl border border-border/40 bg-surface pl-9.5 pr-8 py-2 sm:py-2.5 text-xs sm:text-sm text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)] transition-colors placeholder:text-muted-foreground/60"
          />

          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-muted-foreground hover:text-foreground"
              aria-label={isVietnamese ? "Xóa tìm kiếm" : "Clear search"}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Global Toolbar Controls: Reset & Refresh */}
        <div className="flex items-center gap-2 justify-end shrink-0">
          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetAll}
              className="h-8 sm:h-9 gap-1.5 text-xs text-primary hover:text-primary font-semibold px-2.5 sm:px-3 rounded-xl border-primary/30 shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{t("incidents.toolbar.resetFilters") || (isVietnamese ? "Đặt lại bộ lọc" : "Reset filters")}</span>
              <Badge variant="secondary" size="sm" className="font-mono text-[9px] px-1 py-0 ml-0.5">
                {activeFiltersCount}
              </Badge>
            </Button>
          )}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              title={isVietnamese ? "Làm mới dữ liệu" : "Refresh data"}
              aria-label={isVietnamese ? "Làm mới" : "Refresh"}
              className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl border border-border/40 bg-surface text-foreground shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] transition-all hover:text-primary active:shadow-[inset_2px_2px_4px_var(--shadow-dark)] disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`}
              />
            </button>
          )}
        </div>
      </div>

      {/* ── HÀNG 2: BỘ LỌC PHÂN TẦNG (SITE -> CAMERA -> STATUS -> SEVERITY -> VIOLATION) ── */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/20 text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground font-semibold pr-1 shrink-0 text-xs">
          <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
          <span className="hidden sm:inline">{t("incidents.toolbar.filtersLabel") || (isVietnamese ? "Bộ lọc:" : "Filters:")}</span>
        </span>

        {/* 1. Lọc Công trường (Site Filter) */}
        {sites.length > 0 && onSiteFilterChange && (
          <div className="relative min-w-[130px] flex-1 sm:flex-initial">
            <select
              value={siteFilter}
              onChange={(e) => {
                onSiteFilterChange(e.target.value);
                if (onCameraIdFilterChange) onCameraIdFilterChange("");
              }}
              className="w-full rounded-xl border border-border/40 bg-surface px-2.5 py-1.5 sm:py-2 text-xs font-medium text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)] transition-colors"
            >
              <option value="">{t("incidents.toolbar.allSites") || (isVietnamese ? "Tất cả công trường" : "All Sites")}</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 2. Lọc Camera (Camera Filter) */}
        {cameras.length > 0 && onCameraIdFilterChange && (
          <div className="relative min-w-[120px] flex-1 sm:flex-initial">
            <select
              value={cameraIdFilter}
              onChange={(e) => onCameraIdFilterChange(e.target.value)}
              className="w-full rounded-xl border border-border/40 bg-surface px-2.5 py-1.5 sm:py-2 text-xs font-medium text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)] transition-colors"
            >
              <option value="">
                {siteFilter
                  ? (isVietnamese
                      ? `Tất cả camera (${cameras.length})`
                      : `All Cameras (${cameras.length})`)
                  : t("incidents.toolbar.allCameras") || (isVietnamese ? "Tất cả camera" : "All Cameras")}
              </option>
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} {c.name ? `- ${c.name}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 3. Lọc Trạng thái (Status Filter) */}
        <div className="relative min-w-[125px] flex-1 sm:flex-initial">
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="w-full rounded-xl border border-border/40 bg-surface px-2.5 py-1.5 sm:py-2 text-xs font-medium text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)] transition-colors"
          >
            <option value="">{t("incidents.toolbar.allStatuses")}</option>
            <option value="PENDING_REVIEW">{t("incidents.status.pendingReview")}</option>
            <option value="CONFIRMED">{t("incidents.status.confirmed")}</option>
            <option value="RESOLVED">{t("incidents.status.resolved")}</option>
            <option value="CLOSED">{t("incidents.status.closed")}</option>
            <option value="DISMISSED">{t("incidents.status.dismissed")}</option>
          </select>
        </div>

        {/* 4. Lọc Mức độ nguy hiểm (Severity Filter) */}
        <div className="relative min-w-[115px] flex-1 sm:flex-initial">
          <select
            value={severityFilter}
            onChange={(e) => onSeverityFilterChange(e.target.value)}
            className="w-full rounded-xl border border-border/40 bg-surface px-2.5 py-1.5 sm:py-2 text-xs font-medium text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)] transition-colors"
          >
            <option value="">{t("incidents.toolbar.allSeverities")}</option>
            <option value="CRITICAL">{t("incidents.severity.critical")}</option>
            <option value="HIGH">{t("incidents.severity.high")}</option>
            <option value="MEDIUM">{t("incidents.severity.medium")}</option>
            <option value="LOW">{t("incidents.severity.low")}</option>
          </select>
        </div>

        {/* 5. Lọc Loại vi phạm (Violation Type Filter) */}
        <div className="relative min-w-[130px] flex-1 sm:flex-initial">
          <select
            value={violationFilter}
            onChange={(e) => onViolationFilterChange(e.target.value)}
            className="w-full rounded-xl border border-border/40 bg-surface px-2.5 py-1.5 sm:py-2 text-xs font-medium text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)] transition-colors"
          >
            <option value="">{t("incidents.toolbar.allViolations")}</option>
            <option value="NO_HELMET">{t("incidents.violation.noHelmet")}</option>
            <option value="NO_VEST">{t("incidents.violation.noVest")}</option>
            <option value="RESTRICTED_AREA">{t("incidents.violation.restrictedArea")}</option>
            <option value="MULTI_VIOLATION">{t("incidents.violation.multi")}</option>
          </select>
        </div>
      </div>

      {/* ── HÀNG 3: ACTIVE FILTER CHIPS (KHI CÓ BỘ LỌC ĐANG CHỌN) ─────────── */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 -mb-0.5">
          <span className="text-[11px] text-muted-foreground mr-1">
            {t("incidents.toolbar.activeFilters") || (isVietnamese ? "Đang lọc:" : "Active:")}
          </span>

          {search.trim() && (
            <span className="inline-flex items-center gap-1 rounded-lg border border-border/40 bg-background/80 px-2 py-0.5 text-[11px] text-foreground font-mono">
              <span className="text-muted-foreground">{isVietnamese ? "Từ khóa:" : "Search:"}</span>
              <span className="font-semibold text-primary font-sans max-w-[120px] truncate">&quot;{search}&quot;</span>
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="hover:text-danger text-muted-foreground transition ml-0.5"
                aria-label="Remove search filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {siteFilter && onSiteFilterChange && (
            <span className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-2 py-0.5 text-[11px] text-primary">
              <Building2 className="h-3 w-3 shrink-0" />
              <span className="max-w-[150px] truncate font-medium">{activeSiteName}</span>
              <button
                type="button"
                onClick={() => {
                  onSiteFilterChange("");
                  if (onCameraIdFilterChange) onCameraIdFilterChange("");
                }}
                className="hover:text-danger transition ml-0.5"
                aria-label="Remove site filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {cameraIdFilter && onCameraIdFilterChange && (
            <span className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-2 py-0.5 text-[11px] text-primary">
              <Camera className="h-3 w-3 shrink-0" />
              <span className="max-w-[140px] truncate font-mono font-medium">{activeCameraName}</span>
              <button
                type="button"
                onClick={() => onCameraIdFilterChange("")}
                className="hover:text-danger transition ml-0.5"
                aria-label="Remove camera filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {statusFilter && (
            <span className="inline-flex items-center gap-1 rounded-lg border border-border/40 bg-background/80 px-2 py-0.5 text-[11px] text-foreground">
              <span className="text-muted-foreground">{isVietnamese ? "Trạng thái:" : "Status:"}</span>
              <span className="font-semibold">{getStatusLabel(statusFilter)}</span>
              <button
                type="button"
                onClick={() => onStatusFilterChange("")}
                className="hover:text-danger text-muted-foreground transition ml-0.5"
                aria-label="Remove status filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {severityFilter && (
            <span className="inline-flex items-center gap-1 rounded-lg border border-border/40 bg-background/80 px-2 py-0.5 text-[11px] text-foreground">
              <span className="text-muted-foreground">{isVietnamese ? "Mức độ:" : "Severity:"}</span>
              <span className="font-semibold">{getSeverityLabel(severityFilter)}</span>
              <button
                type="button"
                onClick={() => onSeverityFilterChange("")}
                className="hover:text-danger text-muted-foreground transition ml-0.5"
                aria-label="Remove severity filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {violationFilter && (
            <span className="inline-flex items-center gap-1 rounded-lg border border-border/40 bg-background/80 px-2 py-0.5 text-[11px] text-foreground">
              <span className="text-muted-foreground">{isVietnamese ? "Vi phạm:" : "Violation:"}</span>
              <span className="font-semibold">{getViolationLabel(violationFilter)}</span>
              <button
                type="button"
                onClick={() => onViolationFilterChange("")}
                className="hover:text-danger text-muted-foreground transition ml-0.5"
                aria-label="Remove violation filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={handleResetAll}
            className="text-[11px] font-semibold text-primary hover:underline ml-auto"
          >
            {t("incidents.toolbar.clearAll") || (isVietnamese ? "Xóa tất cả" : "Clear all")}
          </button>
        </div>
      )}
    </div>
  );
}
