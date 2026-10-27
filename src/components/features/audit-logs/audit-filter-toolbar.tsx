"use client";

import { Download, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { AuditLogStatus } from "@/types";

export interface AuditFilterToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  action: string;
  onActionChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  onExport: () => void;
}

export function AuditFilterToolbar({
  search,
  onSearchChange,
  action,
  onActionChange,
  status,
  onStatusChange,
  onExport,
}: AuditFilterToolbarProps) {
  const { t } = useLocale();

  const actions = [
    { value: "", label: t("audit.toolbar.actionAll") },
    { value: "CREATE", label: "CREATE" },
    { value: "UPDATE", label: "UPDATE" },
    { value: "DELETE", label: "DELETE" },
    { value: "LOGIN", label: "LOGIN" },
    { value: "ASSIGN_ROLE", label: "ASSIGN_ROLE" },
    { value: "REVIEW_INCIDENT", label: "REVIEW_INCIDENT" },
    { value: "TOGGLE_FEATURE", label: "TOGGLE_FEATURE" },
  ];

  const statuses = [
    { value: "", label: t("audit.toolbar.statusAll") },
    { value: "SUCCESS", label: "SUCCESS (Thành công)" },
    { value: "FAILED", label: "FAILED (Thất bại)" },
  ];

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("audit.toolbar.searchPlaceholder")}
            className="w-full rounded-xl border border-border/40 bg-surface pl-10 pr-4 py-2 text-sm text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]"
          />
        </div>

        {/* Action Select */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={action}
            onChange={(e) => onActionChange(e.target.value)}
            className="rounded-xl border border-border/40 bg-surface px-3 py-2 text-sm text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]"
          >
            {actions.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>

        {/* Status Select */}
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value as AuditLogStatus | "")}
          className="rounded-xl border border-border/40 bg-surface px-3 py-2 text-sm text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]"
        >
          {statuses.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Export Button */}
      <Button
        variant="outline"
        onClick={onExport}
        className="flex items-center gap-2 rounded-xl"
      >
        <Download className="h-4 w-4" />
        <span>{t("audit.export")}</span>
      </Button>
    </div>
  );
}
