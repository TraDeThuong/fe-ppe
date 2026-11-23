"use client";
import { useState, type ReactNode } from "react";
import { AlertCircle, Check, Filter, RefreshCw, RotateCcw } from "lucide-react";
import { useRefreshFeedback } from "@/hooks/use-refresh-feedback";
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
  const { fetching, loading, error, onRetry } = useTableContext();
  const { t, locale } = useLocale();
  const isVi = locale === "vi-VN";
  const { isSpinning, isSuccess, isError, lastSyncedLabel, trigger } =
    useRefreshFeedback({
      onRefresh: onRetry,
      isRefreshing: fetching,
      hasError: Boolean(error),
    });

  if (!onRetry) return null;

  const baseLabel = t("common.refresh");
  const title = isSuccess
    ? isVi
      ? `Đã cập nhật (${lastSyncedLabel ?? ""})`
      : `Updated (${lastSyncedLabel ?? ""})`
    : lastSyncedLabel
      ? `${baseLabel} · ${lastSyncedLabel}`
      : baseLabel;

  const stateClass = isSuccess
    ? "border-emerald-500/50 text-emerald-600 dark:text-emerald-400"
    : isError
      ? "border-danger/50 text-danger"
      : "border-border/50 text-muted-foreground hover:text-primary";

  return <button
    type="button"
    onClick={trigger}
    disabled={loading || isSpinning}
    aria-label={baseLabel}
    title={title}
    className={`inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border transition-all duration-200 active:scale-95 disabled:opacity-40 ${stateClass}`}
  >{isSuccess ? <Check size={14} className="stroke-[2.75]" /> : isError ? <AlertCircle size={14} /> : <RefreshCw size={14} className={isSpinning ? "animate-spin text-primary" : ""} />}</button>;
}
