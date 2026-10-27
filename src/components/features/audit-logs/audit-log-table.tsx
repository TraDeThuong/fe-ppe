"use client";

import { CheckCircle2, ChevronRight, Clock, Globe, Shield, User, XCircle } from "lucide-react";
import type { AuditLogItem } from "@/types";
import { useLocale } from "@/providers/locale-provider";
import { AuditActionBadge } from "./audit-action-badge";

export interface AuditLogTableProps {
  items: AuditLogItem[];
  onSelectRecord: (record: AuditLogItem) => void;
  loading?: boolean;
}

export function AuditLogTable({
  items,
  onSelectRecord,
  loading = false,
}: AuditLogTableProps) {
  const { t } = useLocale();

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-elevated/40" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-border/30 bg-surface p-12 text-center">
        <p className="text-sm text-muted-foreground">{t("audit.table.empty")}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/40 bg-surface shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.3)]">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border/40 bg-surface-elevated/40 text-xs font-semibold uppercase text-muted-foreground">
          <tr>
            <th className="px-5 py-3.5">{t("audit.table.timestamp")}</th>
            <th className="px-5 py-3.5">{t("audit.table.actor")}</th>
            <th className="px-5 py-3.5">{t("audit.table.action")}</th>
            <th className="px-5 py-3.5">{t("audit.table.target")}</th>
            <th className="px-5 py-3.5">{t("audit.table.status")}</th>
            <th className="px-5 py-3.5">{t("audit.table.ip")}</th>
            <th className="px-5 py-3.5 text-right">{t("audit.table.actions")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {items.map((log) => (
            <tr
              key={log.id}
              onClick={() => onSelectRecord(log)}
              className="cursor-pointer transition-colors duration-150 hover:bg-surface-elevated/30"
            >
              <td className="px-5 py-4 whitespace-nowrap">
                <div className="flex items-center gap-1.5 font-mono text-xs text-foreground/80">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{formatDate(log.createdAt)}</span>
                </div>
              </td>

              <td className="px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-elevated text-primary text-xs font-bold shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)]">
                    <User className="h-3.5 w-3.5" />
                  </span>
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-foreground max-w-[160px] truncate">
                      {log.userEmail || "Hệ thống tự động"}
                    </p>
                    {log.userRole && (
                      <span className="inline-flex rounded-full px-1.5 py-0.2 text-[10px] font-semibold bg-muted text-muted-foreground">
                        {log.userRole}
                      </span>
                    )}
                  </div>
                </div>
              </td>

              <td className="px-5 py-4">
                <AuditActionBadge action={log.action} />
              </td>

              <td className="px-5 py-4">
                <div className="space-y-0.5">
                  <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-foreground">
                    <Shield className="h-3 w-3 text-primary" />
                    {log.targetType}
                  </span>
                  {log.targetId && (
                    <p className="font-mono text-[11px] text-muted-foreground max-w-[120px] truncate">
                      #{log.targetId.slice(0, 10)}...
                    </p>
                  )}
                </div>
              </td>

              <td className="px-5 py-4">
                {log.status === "SUCCESS" ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    SUCCESS
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-danger">
                    <XCircle className="h-3.5 w-3.5" />
                    FAILED
                  </span>
                )}
              </td>

              <td className="px-5 py-4 font-mono text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  {log.ipAddress || "127.0.0.1"}
                </span>
              </td>

              <td className="px-5 py-4 text-right">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectRecord(log);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-border/40 px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary hover:text-primary"
                >
                  <span>{t("audit.table.actions")}</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
