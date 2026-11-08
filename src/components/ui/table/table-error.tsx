"use client";
import { useLocale } from "@/providers/locale-provider";
export function TableError({ onRetry }: { onRetry?: () => void }) {
  const { t } = useLocale();
  return <div role="alert" className="flex items-center justify-between gap-3 border-b border-danger/20 bg-danger/5 p-4 text-sm text-danger">
    <span>{t("table.error")}</span>
    {onRetry ? <button type="button" onClick={onRetry} className="rounded-lg border border-current px-3 py-1 font-semibold focus-visible:ring-2">{t("table.retry")}</button> : null}
  </div>;
}
