"use client";

import { useState } from "react";
import { ChevronDown, History, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useResourceAuditTrail } from "@/hooks/audit";
import { useCan } from "@/hooks/use-can";
import { useLocale } from "@/providers/locale-provider";

export interface ResourceAuditTrailCardProps {
  targetType: string;
  targetId: string;
  title?: string;
  limit?: number;
  defaultExpanded?: boolean;
}

export function ResourceAuditTrailCard({
  targetType,
  targetId,
  title,
  limit = 15,
  defaultExpanded = false,
}: ResourceAuditTrailCardProps) {
  const { locale } = useLocale();
  const isVi = locale === "vi-VN";
  const canReadAudit = useCan()("AUDIT_LOG_READ");
  const [expanded, setExpanded] = useState(defaultExpanded);

  const { data, isLoading, isFetching, refetch } = useResourceAuditTrail(
    targetType,
    targetId,
    limit,
    canReadAudit && expanded,
  );
  const logs = data?.items ?? [];

  if (!canReadAudit) return null;

  return (
    <section className="rounded-2xl border border-border/30 bg-surface p-4 shadow-nm-sm space-y-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex flex-1 cursor-pointer items-center gap-2.5 text-left"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <History className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-foreground">
              {title || (isVi ? "Nhật ký Tác động (Audit Trail)" : "Resource Audit Trail")}
            </h4>
            <p className="text-[11px] text-muted-foreground">
              {targetType} · {targetId.slice(0, 8)}...
            </p>
          </div>
          <ChevronDown
            className={`ml-auto h-4 w-4 text-muted-foreground transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </button>

        {expanded && (
          <Button
            size="sm"
            variant="ghost"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        )}
      </div>

      {expanded && (
        <div className="max-h-64 space-y-2 overflow-y-auto rounded-2xl p-3 shadow-nm-inset">
          {isLoading ? (
            <div className="h-20 animate-pulse rounded-xl bg-surface-elevated/40" />
          ) : logs.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              {isVi ? "Chưa có nhật ký nào cho đối tượng này." : "No audit entries recorded."}
            </p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/20 bg-surface px-3 py-2 text-xs"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant={log.status === "SUCCESS" ? "success" : "danger"}
                      className="text-[10px]"
                    >
                      {log.status}
                    </Badge>
                    <span className="font-mono font-bold text-foreground">{log.action}</span>
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {log.userName || log.userEmail || log.actorId || "System"}
                    {log.ipAddress ? ` · ${log.ipAddress}` : ""}
                  </p>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {new Date(log.createdAt).toLocaleString(locale)}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}

