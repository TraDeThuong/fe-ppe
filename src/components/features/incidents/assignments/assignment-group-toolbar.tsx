"use client";

import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  Camera,
  Clock,
  Filter,
  Layers,
  List,
  ListChecks,
  Search,
  ShieldAlert,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { NM } from "@/components/features/ai-test/nm-styles";
import { useLocale } from "@/providers/locale-provider";
import type { SiteItem } from "@/types";
import type { AssignmentFilterState } from "./types";

export interface GroupModeOption<T extends string = string> {
  key: T;
  vi: string;
  en: string;
  count?: number;
}

const MODE_ICON_MAP: Record<string, LucideIcon> = {
  flat: List,
  camera: Camera,
  person: Users,
  violation: ShieldAlert,
  severity: AlertTriangle,
  hour: Clock,
  shift: CalendarClock,
  officer: UserCheck,
  responsibility: Users,
  site: Building2,
  batches: ListChecks,
};

export interface AssignmentGroupToolbarProps<T extends string> {
  groupMode: T;
  onGroupModeChange: (mode: T) => void;
  options: ReadonlyArray<GroupModeOption<T>>;
  filter: AssignmentFilterState;
  onFilterChange: (next: AssignmentFilterState) => void;
  siteFilter?: string;
  onSiteChange?: (siteId: string) => void;
  sites?: SiteItem[];
  summaryText?: string;
}

export function AssignmentGroupToolbar<T extends string>({
  groupMode,
  onGroupModeChange,
  options,
  filter,
  onFilterChange,
  siteFilter,
  onSiteChange,
  sites,
  summaryText,
}: AssignmentGroupToolbarProps<T>) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const hasFilters = Boolean(
    filter.violationType || filter.severity || filter.search.trim(),
  );

  return (
    <div
      data-testid="assignment-group-toolbar"
      className={`space-y-3 rounded-2xl border border-border/35 p-3.5 ${NM.extruded}`}
    >
      {/* Row 1: Group Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
            <Layers className="h-3.5 w-3.5 text-primary" />
            <span>{isVietnamese ? "Phân nhóm theo:" : "Group by:"}</span>
          </span>

          <div
            role="group"
            aria-label={
              isVietnamese
                ? "Tùy chọn phân nhóm sự cố để phân công & giám sát"
                : "Incident grouping options"
            }
            className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-border/30 bg-background p-1 shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]"
          >
            {options.map((opt) => {
              const active = groupMode === opt.key;
              const Icon = MODE_ICON_MAP[opt.key] ?? Layers;
              return (
                <button
                  key={opt.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onGroupModeChange(opt.key)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                    active
                      ? "bg-primary text-primary-foreground shadow-[2px_2px_5px_var(--shadow-dark)]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3 w-3 shrink-0" />
                  <span>{isVietnamese ? opt.vi : opt.en}</span>
                  {opt.count !== undefined && (
                    <span
                      className={`rounded-full px-1.5 py-0 font-mono text-[10px] font-bold ${
                        active
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted/60 text-foreground"
                      }`}
                    >
                      {opt.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {summaryText && (
          <span className="text-[11px] font-semibold text-muted-foreground">
            {summaryText}
          </span>
        )}
      </div>

      {/* Row 2: Quick Filters (Site, Violation, Severity, Search) */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border/25 pt-2.5 text-xs">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
          <Filter className="h-3 w-3" />
          <span>{isVietnamese ? "Lọc nhanh:" : "Quick filters:"}</span>
        </span>

        {onSiteChange && sites && (
          <select
            value={siteFilter || ""}
            onChange={(e) => onSiteChange(e.target.value)}
            aria-label={isVietnamese ? "Lọc theo công trường" : "Filter by site"}
            className="rounded-xl border border-border/50 bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
          >
            <option value="">
              {isVietnamese ? "Tất cả công trường" : "All Sites"}
            </option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}

        <select
          value={filter.violationType}
          onChange={(e) =>
            onFilterChange({ ...filter, violationType: e.target.value })
          }
          aria-label={
            isVietnamese ? "Lọc theo loại vi phạm" : "Filter by violation type"
          }
          className="rounded-xl border border-border/50 bg-background px-2.5 py-1.5 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
        >
          <option value="">
            {isVietnamese ? "Mọi loại vi phạm" : "All Violations"}
          </option>
          <option value="NO_HELMET">
            {isVietnamese ? "Không đội mũ bảo hộ" : "No Hard Hat"}
          </option>
          <option value="NO_VEST">
            {isVietnamese ? "Không mặc áo phản quang" : "No Safety Vest"}
          </option>
          <option value="RESTRICTED_AREA">
            {isVietnamese ? "Xâm nhập vùng cấm" : "Restricted Area"}
          </option>
          <option value="MULTI_VIOLATION">
            {isVietnamese ? "Đa vi phạm PPE" : "Multi-Violation"}
          </option>
        </select>

        <select
          value={filter.severity}
          onChange={(e) =>
            onFilterChange({ ...filter, severity: e.target.value })
          }
          aria-label={
            isVietnamese ? "Lọc theo mức độ nghiêm trọng" : "Filter by severity"
          }
          className="rounded-xl border border-border/50 bg-background px-2.5 py-1.5 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
        >
          <option value="">
            {isVietnamese ? "Mọi mức độ" : "All Severities"}
          </option>
          <option value="CRITICAL">CRITICAL</option>
          <option value="HIGH">HIGH</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="LOW">LOW</option>
        </select>

        <div className="relative min-w-[180px] flex-1 sm:max-w-[260px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={filter.search}
            onChange={(e) =>
              onFilterChange({ ...filter, search: e.target.value })
            }
            placeholder={
              isVietnamese
                ? "Tìm mã sự cố, camera, cán bộ..."
                : "Search ID, camera, officer..."
            }
            className="w-full rounded-xl border border-border/50 bg-background py-1.5 pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
          />
          {filter.search && (
            <button
              type="button"
              onClick={() => onFilterChange({ ...filter, search: "" })}
              aria-label={isVietnamese ? "Xóa từ khóa" : "Clear search"}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={() =>
              onFilterChange({ violationType: "", severity: "", search: "" })
            }
            className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/15"
          >
            <X className="h-3 w-3" />
            <span>{isVietnamese ? "Xóa lọc" : "Reset"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
