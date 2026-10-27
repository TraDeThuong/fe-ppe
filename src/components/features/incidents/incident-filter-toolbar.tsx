"use client";

import { Search, SlidersHorizontal } from "lucide-react";
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
}: IncidentFilterToolbarProps) {
  const { t } = useLocale();

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-surface p-3.5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("incidents.toolbar.searchPlaceholder")}
          className="w-full rounded-xl border border-border/40 bg-surface pl-10 pr-4 py-2 text-sm text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]"
        />
      </div>

      {/* Select Filters Row */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="rounded-xl border border-border/40 bg-surface px-3 py-2 text-xs text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]"
        >
          <option value="">{t("incidents.toolbar.allStatuses")}</option>
          <option value="PENDING_REVIEW">{t("incidents.status.pendingReview")}</option>
          <option value="CONFIRMED">{t("incidents.status.confirmed")}</option>
          <option value="DISMISSED">{t("incidents.status.dismissed")}</option>
          <option value="RESOLVED">{t("incidents.status.resolved")}</option>
          <option value="CLOSED">{t("incidents.status.closed")}</option>
        </select>

        {/* Severity Filter */}
        <select
          value={severityFilter}
          onChange={(e) => onSeverityFilterChange(e.target.value)}
          className="rounded-xl border border-border/40 bg-surface px-3 py-2 text-xs text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]"
        >
          <option value="">{t("incidents.toolbar.allSeverities")}</option>
          <option value="CRITICAL">{t("incidents.severity.critical")}</option>
          <option value="HIGH">{t("incidents.severity.high")}</option>
          <option value="MEDIUM">{t("incidents.severity.medium")}</option>
          <option value="LOW">{t("incidents.severity.low")}</option>
        </select>

        {/* Violation Type Filter */}
        <select
          value={violationFilter}
          onChange={(e) => onViolationFilterChange(e.target.value)}
          className="rounded-xl border border-border/40 bg-surface px-3 py-2 text-xs text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]"
        >
          <option value="">{t("incidents.toolbar.allViolations")}</option>
          <option value="NO_HELMET">{t("incidents.violation.noHelmet")}</option>
          <option value="NO_VEST">{t("incidents.violation.noVest")}</option>
          <option value="RESTRICTED_AREA">{t("incidents.violation.restrictedArea")}</option>
          <option value="MULTI_VIOLATION">{t("incidents.violation.multi")}</option>
        </select>
      </div>
    </div>
  );
}
