"use client";

import { useMemo, type ReactNode } from "react";

import { BottomSheet } from "@ui/bottom-sheet";
import { FilterChip, FilterChipRow } from "@ui/filter-chip";
import { useCamerasCatalog } from "@/hooks/cameras";
import { useSitesCatalog } from "@/hooks/sites";
import type { IncidentPeriodFilter, IncidentPeriodMode } from "@/lib/incident-period";
import { useLocale } from "@/providers/locale-provider";

export interface IncidentMobileFilterValues {
  periodFilter: IncidentPeriodFilter;
  /** Công trường đang chọn ở thanh đầu trang — dùng để lọc danh sách phân khu/camera */
  siteFilter: string;
  zoneFilter: string;
  cameraIdFilter: string;
  severityFilter: string;
  violationFilter: string;
  assignedToMe: boolean;
}

export interface IncidentMobileFilterHandlers {
  onPeriodFilterChange: (next: IncidentPeriodFilter) => void;
  onZoneFilterChange: (value: string) => void;
  onCameraIdFilterChange: (value: string) => void;
  onSeverityFilterChange: (value: string) => void;
  onViolationFilterChange: (value: string) => void;
  onAssignedToMeChange?: (value: boolean) => void;
  onReset: () => void;
}

/** Số bộ lọc trong sheet đang bật (công trường ở thanh đầu trang không tính). */
export function countActiveIncidentMobileFilters(values: IncidentMobileFilterValues): number {
  return [
    values.periodFilter.mode !== "all",
    values.zoneFilter,
    values.cameraIdFilter,
    values.severityFilter,
    values.violationFilter,
    values.assignedToMe,
  ].filter(Boolean).length;
}

const SELECT_CLASS =
  "h-12 w-full rounded-xl border border-border/80 bg-background px-3 text-base text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

export interface IncidentMobileFilterSheetProps {
  open: boolean;
  onClose: () => void;
  today: string;
  values: IncidentMobileFilterValues;
  handlers: IncidentMobileFilterHandlers;
}

export function IncidentMobileFilterSheet({
  open,
  onClose,
  today,
  values,
  handlers,
}: IncidentMobileFilterSheetProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const { data: sitesData } = useSitesCatalog({ enabled: open });
  const { data: camerasData } = useCamerasCatalog({ enabled: open });

  const zones = useMemo(() => {
    const sites = sitesData ?? [];
    const targetSites = values.siteFilter ? sites.filter((s) => s.id === values.siteFilter) : sites;
    return targetSites.flatMap((site) =>
      (site.zones ?? [])
        .filter((zone) => zone.id)
        .map((zone) => ({
          id: zone.id,
          label: values.siteFilter ? zone.name : `${zone.name} (${site.name})`,
        })),
    );
  }, [sitesData, values.siteFilter]);

  const cameras = useMemo(
    () =>
      (camerasData ?? []).filter(
        (camera) =>
          (!values.siteFilter || camera.siteId === values.siteFilter) &&
          (!values.zoneFilter || camera.zoneId === values.zoneFilter),
      ),
    [camerasData, values.siteFilter, values.zoneFilter],
  );

  const periodOptions: { mode: IncidentPeriodMode; label: string }[] = [
    { mode: "all", label: isVietnamese ? "Tất cả" : "All time" },
    { mode: "day", label: isVietnamese ? "Hôm nay" : "Today" },
    { mode: "week", label: isVietnamese ? "Tuần này" : "This week" },
    { mode: "month", label: isVietnamese ? "Tháng này" : "This month" },
    { mode: "year", label: isVietnamese ? "Năm nay" : "This year" },
  ];

  const severityOptions = [
    { value: "", label: isVietnamese ? "Tất cả" : "All" },
    { value: "CRITICAL", label: t("incidents.severity.critical") },
    { value: "HIGH", label: t("incidents.severity.high") },
    { value: "MEDIUM", label: t("incidents.severity.medium") },
    { value: "LOW", label: t("incidents.severity.low") },
  ];

  const violationOptions = [
    { value: "", label: isVietnamese ? "Tất cả" : "All" },
    { value: "NO_HELMET", label: t("incidents.violation.noHelmet") },
    { value: "NO_VEST", label: t("incidents.violation.noVest") },
    { value: "RESTRICTED_AREA", label: t("incidents.violation.restrictedArea") },
    { value: "MULTI_VIOLATION", label: t("incidents.violation.multi") },
  ];

  const selectPeriod = (mode: IncidentPeriodMode) => {
    handlers.onPeriodFilterChange({
      mode,
      anchorDate: today,
      customStart: values.periodFilter.customStart || today,
      customEnd: values.periodFilter.customEnd || today,
    });
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={isVietnamese ? "Bộ lọc" : "Filters"}
      closeLabel={isVietnamese ? "Đóng" : "Close"}
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlers.onReset}
            className="h-12 flex-1 rounded-xl border border-border/80 text-[15px] font-semibold text-foreground"
          >
            {isVietnamese ? "Đặt lại" : "Reset"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-12 flex-1 rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground"
          >
            {isVietnamese ? "Xem kết quả" : "Show results"}
          </button>
        </div>
      }
    >
      <div className="space-y-5 pt-2">
        {handlers.onAssignedToMeChange && (
          <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-xl border border-border/80 px-3">
            <span className="text-[15px] font-medium text-foreground">
              {isVietnamese ? "Chỉ việc giao cho tôi" : "Assigned to me only"}
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={values.assignedToMe}
              onChange={(event) => handlers.onAssignedToMeChange?.(event.target.checked)}
              className="size-6 shrink-0 accent-primary"
            />
          </label>
        )}

        <Section title={isVietnamese ? "Thời gian" : "Period"}>
          <FilterChipRow label={isVietnamese ? "Thời gian" : "Period"}>
            {periodOptions.map((option) => (
              <FilterChip
                key={option.mode}
                active={values.periodFilter.mode === option.mode}
                onClick={() => selectPeriod(option.mode)}
              >
                {option.label}
              </FilterChip>
            ))}
            {values.periodFilter.mode === "custom" && (
              <FilterChip active onClick={() => undefined}>
                {isVietnamese ? "Khoảng tự chọn" : "Custom range"}
              </FilterChip>
            )}
          </FilterChipRow>
        </Section>

        <Section title={isVietnamese ? "Mức độ" : "Severity"}>
          <FilterChipRow label={isVietnamese ? "Mức độ" : "Severity"}>
            {severityOptions.map((option) => (
              <FilterChip
                key={option.value || "all"}
                active={values.severityFilter === option.value}
                onClick={() => handlers.onSeverityFilterChange(option.value)}
              >
                {option.label}
              </FilterChip>
            ))}
          </FilterChipRow>
        </Section>

        <Section title={isVietnamese ? "Loại vi phạm" : "Violation"}>
          <FilterChipRow label={isVietnamese ? "Loại vi phạm" : "Violation"}>
            {violationOptions.map((option) => (
              <FilterChip
                key={option.value || "all"}
                active={values.violationFilter === option.value}
                onClick={() => handlers.onViolationFilterChange(option.value)}
              >
                {option.label}
              </FilterChip>
            ))}
          </FilterChipRow>
        </Section>

        {zones.length > 0 && (
          <Section title={isVietnamese ? "Phân khu" : "Zone"}>
            <select
              value={values.zoneFilter}
              onChange={(event) => handlers.onZoneFilterChange(event.target.value)}
              aria-label={isVietnamese ? "Phân khu" : "Zone"}
              className={SELECT_CLASS}
            >
              <option value="">{isVietnamese ? "Tất cả phân khu" : "All zones"}</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.label}
                </option>
              ))}
            </select>
          </Section>
        )}

        {cameras.length > 0 && (
          <Section title={isVietnamese ? "Camera" : "Camera"}>
            <select
              value={values.cameraIdFilter}
              onChange={(event) => handlers.onCameraIdFilterChange(event.target.value)}
              aria-label={isVietnamese ? "Camera" : "Camera"}
              className={SELECT_CLASS}
            >
              <option value="">{isVietnamese ? "Tất cả camera" : "All cameras"}</option>
              {cameras.map((camera) => (
                <option key={camera.id} value={camera.id}>
                  {camera.name || camera.code}
                </option>
              ))}
            </select>
          </Section>
        )}
      </div>
    </BottomSheet>
  );
}
