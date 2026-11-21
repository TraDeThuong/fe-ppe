"use client";
import { Table, TableContent, TablePagination, TableRefresh } from "@/components/ui/table";

import { useState } from "react";
import { Mail, RefreshCw, CheckCircle2, Clock, AlertTriangle, Loader2, Search, X } from "lucide-react";
import { useEmailLogs, useRetryEmail } from "@/hooks/notifications";
import { useDebounce } from "@/hooks/use-debounce";
import { useCan } from "@/hooks/use-can";
import { useLocale } from "@/providers/locale-provider";
import { stripEmojis } from "@/lib/strip-emojis";

export function NotificationEmailLogsTab({ className = "" }: { className?: string }) {
  const canRetry = useCan()("NOTIFICATION_UPDATE");
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [toEmail, setToEmail] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const debouncedEmail = useDebounce(toEmail, 350);

  const { data, isLoading, isFetching, error, refetch } = useEmailLogs({
    page,
    limit,
    toEmail: debouncedEmail || undefined,
    status: statusFilter === "ALL" ? undefined : statusFilter,

  });

  const retryMutation = useRetryEmail();
  const logs = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  const handleRetry = (id: string) => {
    retryMutation.mutate(id);
  };

  return (<Table
    className={className}
    toolbar={<div className="space-y-4">
      {/* Header & Filter Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/30 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-[3px_3px_8px_var(--shadow-dark),-3px_-3px_8px_var(--shadow-light)]">
            <Mail className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-foreground sm:text-lg">
                {t("notifications.tabs.emailLogs")}
              </h2>
              <span className="rounded-full border border-primary/20 bg-primary/[0.06] px-2.5 py-0.5 font-mono text-[11px] font-semibold text-primary">
                {meta.total} {isVietnamese ? "bản ghi" : "records"}
              </span>
            </div>
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
                onClick={() => {
                  setToEmail("");
                  setPage(1);
                }}
                aria-label={isVietnamese ? "Xóa tìm kiếm email" : "Clear email search"}
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
            <option value="PROCESSING">{isVietnamese ? "Đang xử lý (PROCESSING)" : "Processing (PROCESSING)"}</option>
            <option value="PENDING">{isVietnamese ? "Chờ gửi (PENDING)" : "Pending (PENDING)"}</option>
            <option value="FAILED">{isVietnamese ? "Thất bại (FAILED)" : "Failed (FAILED)"}</option>
          </select>
          <TableRefresh />
        </div>
      </div>
      {/* Logs Table */}
    </div>}
    data={logs}
    columns={[{
      id: "toEmail",
      header: isVietnamese ? "Người nhận (Email)" : "Recipient (Email)",
      accessorFn: (log) => log.toEmail,
      enableSorting: true,
      cell: ({ row }) => {
        const log = row.original;
        return <div className={"font-mono font-medium text-foreground"}>
          {log.toEmail}
        </div>;
      }
    },
    {
      id: "subject",
      header: isVietnamese ? "Tiêu đề email" : "Subject",
      accessorFn: (log) => log.subject,
      enableSorting: true,
      cell: ({ row }) => {
        const log = row.original;
        return <div className={"font-semibold max-w-xs"}>
          <p className="truncate" title={stripEmojis(log.subject)}>{stripEmojis(log.subject)}</p>
          {log.lastError && (
            <p className="mt-0.5 line-clamp-2 break-words text-[10px] font-normal text-destructive" title={log.lastError}>
              {log.lastError}
            </p>
          )}
        </div>;
      }
    },
    {
      id: "templateCode",
      header: isVietnamese ? "Mã khuôn mẫu" : "Template Key",
      accessorFn: (log) => log.templateKey,
      enableSorting: true,
      cell: ({ row }) => {
        const log = row.original;
        return <div className={"font-mono text-[11px] text-muted-foreground"}>
          {log.templateKey}
        </div>;
      }
    },
    {
      id: "status",
      header: isVietnamese ? "Trạng thái" : "Status",
      accessorFn: (log) => log.status,
      enableSorting: true,
      cell: ({ row }) => {
        const log = row.original;
        return <div className={"text-center"}>
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
          ) : log.status === "PROCESSING" ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
              <Loader2 className="size-3 animate-spin" />
              <span>{isVietnamese ? "Đang xử lý" : "Processing"}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
              <Clock className="size-3" />
              <span>{isVietnamese ? "Chờ gửi" : "Pending"}</span>
            </span>
          )}
        </div>;
      }
    },
    {
      id: "attempts",
      header: isVietnamese ? "Lần thử" : "Attempts",
      accessorFn: (log) => log.attempts,
      enableSorting: true,
      cell: ({ row }) => {
        const log = row.original;
        return <div className={"text-center font-mono text-[11px]"}>
          {log.attempts}/3
        </div>;
      }
    },
    {
      id: "sentAt",
      header: isVietnamese ? "Thời gian gửi" : "Sent At",
      accessorFn: (log) => log.sentAt ?? log.createdAt,
      enableSorting: true,
      cell: ({ row }) => {
        const log = row.original;
        const formatOpts: Intl.DateTimeFormatOptions = {
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "2-digit",
        };
        const loc = isVietnamese ? "vi-VN" : "en-US";
        if (log.sentAt) {
          return <div className="text-muted-foreground font-medium">
            {new Date(log.sentAt).toLocaleString(loc, formatOpts)}
          </div>;
        }
        return <div className="text-muted-foreground/80 text-[11px]">
          {log.createdAt
            ? `${isVietnamese ? "Tạo: " : "Queued: "}${new Date(log.createdAt).toLocaleString(loc, formatOpts)}`
            : "—"}
        </div>;
      }
    },
    {
      id: "actions",
      header: isVietnamese ? "Thao tác" : "Actions",
      enableSorting: false,
      cell: ({ row }) => {
        const log = row.original;
        return <div className={"text-right"}>
          {log.status === "FAILED" && canRetry && (
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
        </div>;
      }
    }]}
    loading={isLoading}
    getRowId={row => row.id}
    features={{
      globalFilter: false,
      sorting: false,
      rowSelection: false,
      pagination: true
    }}
    manualFiltering
    manualSorting
    manualPagination
    fetching={isFetching}
    error={error}
    onRetry={() => {
      void refetch();
    }}
    rowCount={meta.total}
    pageCount={Math.max(1, meta.totalPages)}
    pagination={{ pageIndex: page - 1, pageSize: limit }}
    onPaginationChange={update => {
      const next = typeof update === "function" ? update({ pageIndex: page - 1, pageSize: limit }) : update;
      setPage(next.pageIndex + 1);
      setLimit(next.pageSize);
    }}
    filterKey={`${debouncedEmail}:${statusFilter}`}
  >
    <TableContent />
    <TablePagination />
  </Table>);
}
