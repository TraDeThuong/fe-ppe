"use client";

import {
  Calendar,
  CheckCircle2,
  Clock,
  Code2,
  Database,
  FileCheck,
  FileText,
  Mail,
  ShieldAlert,
  Timer,
  Trash2,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/providers/locale-provider";
import type { CronJobExecutionResult } from "@/types/cron.types";

export function CronResult({ result }: { result: CronJobExecutionResult }) {
  const { t, number, locale } = useLocale();
  const data = result.data ?? {};
  const isSuccess = Boolean(result.success);

  const fields =
    result.jobName === "cleanup-audit-logs"
      ? ["deletedCount", "retentionDays", "cutoffDate"]
      : result.jobName === "cleanup-unconfirmed-uploads"
      ? ["scannedCount", "deletedCount"]
      : result.jobName === "cleanup-expired-tokens"
      ? [
          "refreshTokensCount",
          "verificationTokensCount",
          "passwordResetTokensCount",
          "totalDeleted",
        ]
      : ["period", "startDate", "endDate", "recipientCount"];

  const formatValue = (key: string, value: unknown) => {
    if (typeof value === "number") return number.format(value);
    if (key === "period" && (value === "DAILY" || value === "WEEKLY"))
      return t(`cron.result.${value}`);
    if (
      typeof value === "string" &&
      ["startDate", "endDate", "cutoffDate"].includes(key)
    ) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime()))
        return date.toLocaleString(locale, { timeZone: "Asia/Ho_Chi_Minh" });
    }
    return typeof value === "string" ? value : JSON.stringify(value);
  };

  const getFieldIcon = (key: string) => {
    switch (key) {
      case "deletedCount":
      case "totalDeleted":
        return Trash2;
      case "scannedCount":
        return FileCheck;
      case "retentionDays":
      case "period":
        return Calendar;
      case "cutoffDate":
      case "startDate":
      case "endDate":
        return Clock;
      case "recipientCount":
        return Mail;
      default:
        return Database;
    }
  };

  return (
    <section aria-live="polite" className="space-y-4">
      {/* Execution Status Card */}
      <div
        className={`relative overflow-hidden rounded-2xl border p-4 shadow-sm transition-all ${
          isSuccess
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200"
            : "border-danger/30 bg-danger/10 text-danger"
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              isSuccess
                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                : "bg-danger/20 text-danger"
            }`}
          >
            {isSuccess ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <XCircle className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
              {t("cron.result.reported")}
            </p>
            <p className="mt-0.5 text-base font-bold text-foreground">
              {t(isSuccess ? "cron.result.completed" : "cron.result.failed")}
            </p>
            {result.error && (
              <p className="mt-1.5 text-xs font-medium text-danger bg-danger/10 p-2 rounded-lg border border-danger/20">
                {result.error}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {/* Duration */}
        <div className="rounded-xl border border-border/40 bg-surface/80 p-3 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium">
              {t("cron.result.duration")}
            </span>
            <Timer className="h-3.5 w-3.5 text-primary" />
          </div>
          <p className="mt-1 font-mono text-xl font-black text-foreground">
            {number.format(result.durationMs)}
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              ms (miliseconds)
            </span>
          </p>
        </div>

        {/* Affected item count or status */}
        <div className="rounded-xl border border-border/40 bg-surface/80 p-3 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium">
              {result.jobName.startsWith("cleanup-")
                ? t("cron.result.deletedCount")
                : t("cron.result.recipientCount")}
            </span>
            <FileText className="h-3.5 w-3.5 text-info" />
          </div>
          <p className="mt-1 font-mono text-xl font-black text-foreground">
            {data.deletedCount !== undefined
              ? number.format(Number(data.deletedCount))
              : data.totalDeleted !== undefined
              ? number.format(Number(data.totalDeleted))
              : data.recipientCount !== undefined
              ? number.format(Number(data.recipientCount))
              : "—"}
          </p>
        </div>
      </div>

      {/* Detailed Key-Value List */}
      <div className="rounded-xl border border-border/40 bg-surface-elevated/40 p-3.5">
        <dl className="space-y-2 text-xs sm:text-sm">
          <div className="flex justify-between items-center gap-4 py-1 border-b border-border/30">
            <dt className="text-muted-foreground flex items-center gap-1.5">
              <Timer className="h-3.5 w-3.5 text-primary" />
              <span>{t("cron.result.duration")}</span>
            </dt>
            <dd className="font-mono font-semibold text-foreground">
              {number.format(result.durationMs)} ms
            </dd>
          </div>

          {fields
            .filter((key) => data[key] !== undefined)
            .map((key) => {
              const Icon = getFieldIcon(key);
              return (
                <div
                  key={key}
                  className="flex justify-between items-center gap-4 py-1 border-b border-border/30 last:border-b-0"
                >
                  <dt className="text-muted-foreground flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{t(`cron.result.${key}`)}</span>
                  </dt>
                  <dd className="font-mono font-semibold text-foreground text-right">
                    {formatValue(key, data[key])}
                  </dd>
                </div>
              );
            })}
        </dl>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        {t("cron.result.limitations")}
      </p>

      {/* Collapsible JSON Detail Inspector */}
      <details className="group rounded-xl border border-border/50 bg-background/50 p-3 transition-colors hover:border-primary/30">
        <summary className="cursor-pointer rounded text-xs sm:text-sm font-semibold text-foreground flex items-center justify-between focus-visible:outline-2 focus-visible:outline-primary">
          <span className="flex items-center gap-2">
            <Code2 className="h-4 w-4 text-primary" />
            <span>{t("cron.result.details")}</span>
          </span>
          <Badge variant="outline" size="sm" className="font-mono text-[10px]">
            JSON
          </Badge>
        </summary>
        <div className="mt-3 overflow-hidden rounded-lg border border-border/40 bg-surface/90 p-2.5">
          <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-foreground">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      </details>
    </section>
  );
}
