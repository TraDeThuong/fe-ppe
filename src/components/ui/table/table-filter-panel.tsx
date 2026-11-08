"use client";
import { useState, type ReactNode } from "react";
import { Filter, RefreshCw, RotateCcw } from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import { useTableContext } from "./table-context";

export function TableFilterPanel({ children, active = false, onReset, defaultOpen = false }: { children: ReactNode; active?: boolean; onReset?: () => void; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const { t } = useLocale();
  return <section className="border-b border-border/30">
    <div className="flex items-center gap-2 px-4 py-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 rounded-xl border border-border/50 px-3 py-2 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Filter size={14} />{t("table.filters")}{active ? <span className="size-2 rounded-full bg-primary" /> : null}
      </button>
      {active && onReset ? <button type="button" onClick={onReset} className="inline-flex items-center gap-1 text-xs text-primary"><RotateCcw size={13} />{t("table.resetFilters")}</button> : null}
    </div>
    {open ? <div className="grid gap-3 bg-muted/10 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div> : null}
  </section>;
}
export function TableRefresh() {
  const { fetching, loading, onRetry } = useTableContext();
  const { t } = useLocale();
  if (!onRetry) return null;
  return <button
    type="button"
    onClick={onRetry}
    disabled={loading || fetching}
    aria-label={t("common.refresh")}
    title={t("common.refresh")}
    className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/50 text-muted-foreground hover:text-primary disabled:opacity-40"
  ><RefreshCw size={14} className={fetching ? "animate-spin" : ""} /></button>;
}
