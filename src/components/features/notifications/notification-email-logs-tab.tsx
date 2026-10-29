"use client";

import { useState } from "react";
import { Mail, RefreshCw, CheckCircle2, Clock, AlertTriangle, Search, X } from "lucide-react";
import { useEmailLogs, useRetryEmail } from "@/hooks/notifications";
import { useDebounce } from "@/hooks/use-debounce";
import { useLocale } from "@/providers/locale-provider";
import type { EmailLogItemDto } from "@/types";

export function NotificationEmailLogsTab({ className = "" }: { className?: string }) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const [page, setPage] = useState(1);
  const [toEmail, setToEmail] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const debouncedEmail = useDebounce(toEmail, 300);

  const { data, isLoading } = useEmailLogs({
    page,
    limit: 10,
    toEmail: debouncedEmail || undefined,
    status: statusFilter === "ALL" ? undefined : statusFilter,
  });

  const retryMutation = useRetryEmail();
  const logs = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  const handleRetry = (id: string) => {
    retryMutation.mutate(id);
  };

  return (
    <div
      className={`flex flex-col gap-4 rounded-2xl border border-border/30 bg-background p-4 shadow-[6px_6px_15px_var(--shadow-dark),-6px_-6px_15px_var(--shadow-light)] sm:p-6 ${className}`}
    >
      {/* Header & Filter Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/30 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-[3px_3px_8px_var(--shadow-dark),-3px_-3px_8px_var(--shadow-light)]">
            <Mail className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground sm:text-lg">
              {t("notifications.tabs.emailLogs")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isVietnamese
                ? "Theo dõi trạng thái phát hành email từ hàng đợi gửi thư phi tập trung"
                : "Monitor email dispatch queue and asynchronous delivery status"}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Email Search */}
          <div className="relative min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={toEmail}
              onChange={(e) => {
                setToEmail(e.target.value);
                setPage(1);
              }}
              placeholder={isVietnamese ? "Tìm theo email nhận..." : "Search recipient email..."}
              className="w-full rounded-xl border border-border/40 bg-background py-1.5 pl-8 pr-7 text-xs text-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark)] outline-none focus:border-primary/50"
            />
            {toEmail && (
              <button
                type="button"
                onClick={() => setToEmail("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* Status Select */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-border/40 bg-background px-3 py-1.5 text-xs text-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark)] outline-none focus:border-primary/50"
          >
            <option value="ALL">{isVietnamese ? "Tất cả trạng thái" : "All Statuses"}</option>
            <option value="SENT">{isVietnamese ? "Thành công (SENT)" : "Sent (SENT)"}</option>
            <option value="PENDING">{isVietnamese ? "Chờ gửi (PENDING)" : "Pending (PENDING)"}</option>
            <option value="FAILED">{isVietnamese ? "Thất bại (FAILED)" : "Failed (FAILED)"}</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="overflow-x-auto rounded-xl border border-border/30 bg-background shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border/30 bg-muted/20 text-muted-foreground font-semibold">
            <tr>
              <th className="p-3 sm:p-4">{isVietnamese ? "Người nhận (Email)" : "Recipient (Email)"}</th>
              <th className="p-3 sm:p-4">{isVietnamese ? "Tiêu đề email" : "Subject"}</th>
              <th className="p-3 sm:p-4 hidden sm:table-cell">{isVietnamese ? "Mã khuôn mẫu" : "Template Key"}</th>
              <th className="p-3 sm:p-4 text-center">{isVietnamese ? "Trạng thái" : "Status"}</th>
              <th className="p-3 sm:p-4 text-center hidden md:table-cell">{isVietnamese ? "Lần thử" : "Attempts"}</th>
              <th className="p-3 sm:p-4 hidden lg:table-cell">{isVietnamese ? "Thời gian gửi" : "Sent At"}</th>
              <th className="p-3 sm:p-4 text-right">{isVietnamese ? "Thao tác" : "Actions"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20 text-foreground">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  {isVietnamese ? "Đang tải nhật ký hàng đợi email..." : "Loading email queue logs..."}
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  {isVietnamese ? "Không tìm thấy bản ghi gửi email nào." : "No email dispatch records found."}
                </td>
              </tr>
            ) : (
              logs.map((log: EmailLogItemDto) => (
                <tr key={log.id} className="transition-colors hover:bg-muted/10">
                  <td className="p-3 sm:p-4 font-mono font-medium text-foreground">
                    {log.toEmail}
                  </td>
                  <td className="p-3 sm:p-4 font-semibold max-w-xs truncate">
                    {log.subject}
                    {log.lastError && (
                      <p className="mt-0.5 truncate text-[10px] text-destructive">
                        {log.lastError}
                      </p>
                    )}
                  </td>
                  <td className="p-3 sm:p-4 hidden sm:table-cell font-mono text-[11px] text-muted-foreground">
                    {log.templateKey}
                  </td>
                  <td className="p-3 sm:p-4 text-center">
                    {log.status === "SENT" ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="size-3" />
                        <span>{isVietnamese ? "Thành công" : "Sent"}</span>
                      </span>
                    ) : log.status === "FAILED" ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
                        <AlertTriangle className="size-3" />
                        <span>{isVietnamese ? "Thất bại" : "Failed"}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        <Clock className="size-3" />
                        <span>{isVietnamese ? "Chờ gửi" : "Pending"}</span>
                      </span>
                    )}
                  </td>
                  <td className="p-3 sm:p-4 text-center hidden md:table-cell font-mono text-[11px]">
                    {log.attempts}/3
                  </td>
                  <td className="p-3 sm:p-4 hidden lg:table-cell text-muted-foreground font-medium">
                    {log.sentAt
                      ? new Date(log.sentAt).toLocaleString(isVietnamese ? "vi-VN" : "en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                        })
                      : "—"}
                  </td>
                  <td className="p-3 sm:p-4 text-right">
                    {log.status === "FAILED" && (
                      <button
                        type="button"
                        onClick={() => handleRetry(log.id)}
                        disabled={retryMutation.isPending}
                        className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-background px-2.5 py-1 text-xs font-semibold text-primary shadow-[2px_2px_4px_var(--shadow-dark)] hover:bg-primary/10 active:shadow-[inset_1px_1px_2px_var(--shadow-dark)] disabled:opacity-40"
                      >
                        <RefreshCw className="size-3" />
                        <span>{isVietnamese ? "Gửi lại" : "Retry"}</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border/20 pt-3 text-xs text-muted-foreground">
          <span>
            {isVietnamese
              ? `Trang ${page} / ${meta.totalPages} (Tổng: ${meta.total} email)`
              : `Page ${page} of ${meta.totalPages} (Total: ${meta.total} emails)`}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-border/40 bg-background px-3 py-1 font-semibold text-foreground shadow-[2px_2px_4px_var(--shadow-dark)] disabled:opacity-40"
            >
              {isVietnamese ? "Trước" : "Previous"}
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page >= meta.totalPages}
              className="rounded-lg border border-border/40 bg-background px-3 py-1 font-semibold text-foreground shadow-[2px_2px_4px_var(--shadow-dark)] disabled:opacity-40"
            >
              {isVietnamese ? "Sau" : "Next"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
