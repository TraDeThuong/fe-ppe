"use client";

import { useMemo } from "react";
import { ArrowRight, Minus, Plus } from "lucide-react";
import { useLocale } from "@/providers/locale-provider";

export interface AuditDiffViewerProps {
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
}

export function AuditDiffViewer({ oldValue, newValue }: AuditDiffViewerProps) {
  const { t } = useLocale();

  const diffKeys = useMemo(() => {
    const keys = new Set<string>();
    if (oldValue && typeof oldValue === "object") {
      Object.keys(oldValue).forEach((k) => keys.add(k));
    }
    if (newValue && typeof newValue === "object") {
      Object.keys(newValue).forEach((k) => keys.add(k));
    }
    return Array.from(keys);
  }, [oldValue, newValue]);

  if (!oldValue && !newValue) {
    return (
      <div className="rounded-xl border border-border/30 bg-surface-elevated/30 p-4 text-center text-xs text-muted-foreground">
        {t("audit.drawer.noDiff")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-border/40 bg-surface shadow-[inset_1px_1px_3px_rgba(0,0,0,0.05)]">
        <div className="grid grid-cols-1 divide-y divide-border/20 text-xs font-mono">
          {diffKeys.map((key) => {
            const oldVal = oldValue ? oldValue[key] : undefined;
            const newVal = newValue ? newValue[key] : undefined;
            const isAdded = oldVal === undefined && newVal !== undefined;
            const isRemoved = oldVal !== undefined && newVal === undefined;
            const isModified =
              oldVal !== undefined &&
              newVal !== undefined &&
              JSON.stringify(oldVal) !== JSON.stringify(newVal);

            return (
              <div
                key={key}
                className={`p-3 transition-colors ${
                  isAdded
                    ? "bg-success/5 border-l-2 border-success"
                    : isRemoved
                    ? "bg-danger/5 border-l-2 border-danger"
                    : isModified
                    ? "bg-warning/5 border-l-2 border-warning"
                    : "opacity-60"
                }`}
              >
                <div className="flex items-center justify-between pb-1">
                  <span className="font-bold text-foreground">{key}:</span>
                  {isAdded && (
                    <span className="inline-flex items-center gap-0.5 text-[11px] text-success font-semibold">
                      <Plus className="h-3 w-3" /> Added
                    </span>
                  )}
                  {isRemoved && (
                    <span className="inline-flex items-center gap-0.5 text-[11px] text-danger font-semibold">
                      <Minus className="h-3 w-3" /> Removed
                    </span>
                  )}
                  {isModified && (
                    <span className="inline-flex items-center gap-0.5 text-[11px] text-warning font-semibold">
                      Modified
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
                  {oldVal !== undefined && (
                    <span className="text-danger/90 line-through max-w-sm truncate bg-danger/10 px-1.5 py-0.5 rounded">
                      {JSON.stringify(oldVal)}
                    </span>
                  )}
                  {isModified && (
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0 hidden sm:inline" />
                  )}
                  {newVal !== undefined && (
                    <span className="text-success max-w-sm truncate bg-success/10 px-1.5 py-0.5 rounded">
                      {JSON.stringify(newVal)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
