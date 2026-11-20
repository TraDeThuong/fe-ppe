"use client";

import { useLocale } from "@/providers/locale-provider";
import { getAuditActionInfo } from "./audit-action-dictionary";

export interface AuditActionBadgeProps {
  action: string;
  showCode?: boolean;
}

export function AuditActionBadge({ action, showCode = false }: AuditActionBadgeProps) {
  const { locale } = useLocale();
  const info = getAuditActionInfo(action, locale);

  // Giới hạn bảng màu theo hệ thống: ưu tiên primary, accent & neutral; chỉ dùng danger cho sự cố/khóa.
  const getBadgeStyle = (act: string) => {
    const a = act.toUpperCase();
    if (a === "ACCOUNT_LOCKED" || a.includes("FAIL") || a.includes("DENIED") || a.includes("REJECTED")) {
      return "bg-danger/10 text-danger border-danger/30";
    }
    if (
      a.includes("CONFIG") ||
      a.includes("FEATURE_FLAG") ||
      a.includes("ROLE") ||
      a.includes("MAINTENANCE")
    ) {
      return "bg-primary/10 text-primary border-primary/25";
    }
    if (
      a.includes("LOGIN") ||
      a.includes("2FA") ||
      a.includes("CRON") ||
      a.includes("WEBHOOK") ||
      a.includes("API_KEY")
    ) {
      return "bg-accent/15 text-foreground border-accent/45";
    }
    return "bg-surface text-foreground/85 border-border/50";
  };

  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <span
        title={`${info.code} — ${info.description}`}
        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${getBadgeStyle(
          action,
        )}`}
      >
        {info.label}
      </span>
      {showCode && (
        <code className="rounded bg-muted/70 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {info.code}
        </code>
      )}
    </span>
  );
}
