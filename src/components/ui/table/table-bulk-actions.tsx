"use client";

import type { ReactNode } from "react";
import { CheckSquare, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTableContext } from "./table-context";
import { useLocale } from "@/providers/locale-provider";

export interface TableBulkAction {
  id: string;
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  disabled?: boolean;
}

export interface TableBulkActionsProps {
  actions?: TableBulkAction[];
  selectedCount?: number;
  onClearSelection?: () => void;
  className?: string;
  selectionLabel?: string;
  clearSelectionLabel?: string;
}

export function TableBulkActions({
  actions = [],
  selectedCount,
  onClearSelection,
  className = "",
  selectionLabel,
  clearSelectionLabel,
}: TableBulkActionsProps) {
  const { table } = useTableContext();

  let isVietnamese = true;
  try {
    const localeCtx = useLocale();
    isVietnamese = localeCtx.locale === "vi-VN";
  } catch {
    // fallback if outside LocaleProvider
  }

  const effectiveSelectionLabel =
    selectionLabel ?? (isVietnamese ? "dòng đang chọn" : "rows selected");
  const effectiveClearSelectionLabel =
    clearSelectionLabel ?? (isVietnamese ? "Bỏ chọn" : "Clear selection");

  const resolvedCount =
    selectedCount ?? table.getSelectedRowModel().rows.length;

  const clearSelection =
    onClearSelection ?? (() => table.resetRowSelection());

  if (resolvedCount === 0) return null;

  return (
    <div
      role="toolbar"
      aria-label={isVietnamese ? "Thao tác hàng loạt" : "Bulk actions"}
      className={[
        "flex flex-col gap-3 rounded-2xl p-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4",
        "border border-primary/30 bg-background/95 backdrop-blur-sm",
        "shadow-[6px_6px_16px_var(--shadow-dark),-6px_-6px_16px_var(--shadow-light),inset_1px_1px_2px_rgba(255,255,255,0.8)]",
        "transition-all duration-300 animate-in fade-in slide-in-from-top-2",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]">
          <CheckSquare size={16} />
        </div>

        <div className="flex items-center gap-2">
          <span
            aria-live="polite"
            className="text-xs sm:text-sm font-bold text-foreground"
          >
            <span className="font-mono text-primary font-black mr-1">
              {resolvedCount}
            </span>
            {effectiveSelectionLabel}
          </span>

          <button
            type="button"
            onClick={clearSelection}
            className={[
              "inline-flex items-center gap-1 rounded-lg px-2 py-1",
              "text-xs font-semibold text-muted-foreground transition-all",
              "hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            ].join(" ")}
            aria-label={isVietnamese ? "Bỏ chọn tất cả dòng" : "Clear all selected rows"}
          >
            <X size={13} />
            {effectiveClearSelectionLabel}
          </button>
        </div>
      </div>

      {actions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {actions.map((action) => (
            <Button
              key={action.id}
              type="button"
              variant={action.variant ?? "secondary"}
              size="sm"
              disabled={action.disabled}
              onClick={action.onClick}
              className="font-bold shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)]"
            >
              {action.icon}
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

export default TableBulkActions;
