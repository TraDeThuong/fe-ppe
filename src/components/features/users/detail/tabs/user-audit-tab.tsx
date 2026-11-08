"use client";

import { useState } from "react";
import {
  FileText,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Shield,
  Activity,
} from "lucide-react";
import { useAuditLogs } from "@/hooks/audit";
import { useLocale } from "@/providers/locale-provider";
import type { UserResponseDto } from "@/types";

export interface UserAuditTabProps {
  user: UserResponseDto;
}

export function UserAuditTab({ user }: UserAuditTabProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const [page, setPage] = useState(1);

  const { data: auditData, isLoading } = useAuditLogs({
    userId: user.id,
    page,
    limit: 15,
  });

  const logs = auditData?.items || [];
  const meta = auditData?.meta;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/80 dark:border-white/5 bg-background dark:bg-card p-5 sm:p-6 shadow-[6px_6px_14px_var(--shadow-dark),-5px_-5px_14px_rgba(255,255,255,0.9)] dark:shadow-[6px_6px_14px_rgba(0,0,0,0.4),-2px_-2px_6px_rgba(255,255,255,0.02)] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Activity size={16} />
            </span>
            <div>
              <h3 className="font-bold text-sm text-foreground">
                {isVietnamese ? "Nhật Ký Kiểm Toán & Hoạt Động" : "User Audit Trail"}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {isVietnamese
                  ? `Lịch sử các thao tác do tài khoản ${user.fullName || user.email} thực hiện`
                  : `Chronological event log of actions performed by this user`}
              </p>
            </div>
          </div>

          <span className="text-xs font-mono font-bold text-muted-foreground">
            {meta?.total ?? logs.length} {isVietnamese ? "bản ghi" : "events"}
          </span>
        </div>

        {isLoading ? (
          <div className="flex min-h-[180px] items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="size-5 animate-spin text-primary" />
            <span className="text-xs">{isVietnamese ? "Đang tải nhật ký..." : "Loading audit log..."}</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-border/60 text-muted-foreground text-xs">
            {isVietnamese ? "Chưa ghi nhận sự kiện kiểm toán nào từ tài khoản này." : "No audit records found for this user."}
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              const isSuccess = log.status === "SUCCESS";
              return (
                <div
                  key={log.id}
                  className="p-3.5 rounded-xl border border-border/50 bg-background shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)] flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className={`flex size-8 shrink-0 items-center justify-center rounded-lg border mt-0.5 ${
                        isSuccess
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-danger/30 bg-danger/10 text-danger"
                      }`}
                    >
                      {isSuccess ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono text-foreground uppercase">
                          {log.action}
                        </span>
                        {log.targetType && (
                          <span className="px-1.5 py-0.2 rounded border border-border/60 bg-muted/40 text-muted-foreground text-[10px] font-mono">
                            {log.targetType}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {log.errorMessage || (isVietnamese ? "Thao tác thực thi thành công" : "Action executed successfully")}
                      </p>

                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono mt-1">
                        <span>IP: {log.ipAddress || "127.0.0.1"}</span>
                        <span>•</span>
                        <span>
                          {new Date(log.createdAt).toLocaleString(isVietnamese ? "vi-VN" : "en-US")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
