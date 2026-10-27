"use client";

import { useState } from "react";
import { FileText, Eye, Send, Search, X, CheckCircle, AlertCircle } from "lucide-react";
import { useNotificationTemplates } from "@/hooks/notifications";
import { useDebounce } from "@/hooks/use-debounce";
import { useLocale } from "@/providers/locale-provider";
import type { NotificationTemplateItemDto } from "@/types";

export interface NotificationTemplatesTabProps {
  onPreviewTemplate?: (template: NotificationTemplateItemDto) => void;
  onTestSendTemplate?: (template: NotificationTemplateItemDto) => void;
  className?: string;
}

export function NotificationTemplatesTab({
  onPreviewTemplate,
  onTestSendTemplate,
  className = "",
}: NotificationTemplatesTabProps) {
  const { t } = useLocale();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useNotificationTemplates({
    page,
    limit: 10,
    search: debouncedSearch || undefined,
  });

  const templates = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  return (
    <div
      className={`flex flex-col gap-4 rounded-2xl border border-border/30 bg-background p-4 shadow-[6px_6px_15px_var(--shadow-dark),-6px_-6px_15px_var(--shadow-light)] sm:p-6 ${className}`}
    >
      {/* Header & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/30 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-[3px_3px_8px_var(--shadow-dark),-3px_-3px_8px_var(--shadow-light)]">
            <FileText className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground sm:text-lg">
              {t("notifications.tabs.templates")}
            </h2>
            <p className="text-xs text-muted-foreground">
              Quản lý danh sách các mẫu email và thông báo đẩy trong hệ thống Smart PPE
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo tên hoặc mã mẫu..."
            className="w-full rounded-xl border border-border/40 bg-background py-2 pl-9 pr-7 text-xs text-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] outline-none focus:border-primary/50"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Templates Table */}
      <div className="overflow-x-auto rounded-xl border border-border/30 bg-background shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border/30 bg-muted/20 text-muted-foreground font-semibold">
            <tr>
              <th className="p-3 sm:p-4">Mã mẫu (Code)</th>
              <th className="p-3 sm:p-4">Tên hiển thị</th>
              <th className="p-3 sm:p-4">Kênh</th>
              <th className="p-3 sm:p-4 hidden md:table-cell">Tiêu đề khuôn mẫu</th>
              <th className="p-3 sm:p-4 text-center">Trạng thái</th>
              <th className="p-3 sm:p-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20 text-foreground">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  Đang tải danh sách mẫu thông báo...
                </td>
              </tr>
            ) : templates.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  Không tìm thấy mẫu thông báo nào.
                </td>
              </tr>
            ) : (
              templates.map((tpl) => (
                <tr
                  key={tpl.id}
                  className="transition-colors hover:bg-muted/10"
                >
                  <td className="p-3 sm:p-4 font-mono font-bold text-primary">
                    {tpl.code}
                  </td>
                  <td className="p-3 sm:p-4 font-semibold">{tpl.name}</td>
                  <td className="p-3 sm:p-4">
                    <span className="rounded-md border border-border/40 bg-muted/20 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {tpl.channel}
                    </span>
                  </td>
                  <td className="p-3 sm:p-4 hidden md:table-cell max-w-xs truncate text-muted-foreground">
                    {tpl.subjectTemplate || "—"}
                  </td>
                  <td className="p-3 sm:p-4 text-center">
                    {tpl.status === "ACTIVE" ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="size-3" />
                        <span>Kích hoạt</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-500/30 bg-slate-500/10 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                        <AlertCircle className="size-3" />
                        <span>Tạm ngừng</span>
                      </span>
                    )}
                  </td>
                  <td className="p-3 sm:p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {onPreviewTemplate && (
                        <button
                          type="button"
                          onClick={() => onPreviewTemplate(tpl)}
                          title="Xem trước mẫu"
                          className="flex size-7 items-center justify-center rounded-lg border border-border/40 bg-background text-foreground shadow-[2px_2px_4px_var(--shadow-dark)] transition-all hover:text-primary active:shadow-[inset_1px_1px_2px_var(--shadow-dark)]"
                        >
                          <Eye className="size-3.5" />
                        </button>
                      )}

                      {onTestSendTemplate && (
                        <button
                          type="button"
                          onClick={() => onTestSendTemplate(tpl)}
                          title="Gửi thử nghiệm"
                          className="flex size-7 items-center justify-center rounded-lg border border-primary/30 bg-background text-primary shadow-[2px_2px_4px_var(--shadow-dark)] transition-all hover:bg-primary/10 active:shadow-[inset_1px_1px_2px_var(--shadow-dark)]"
                        >
                          <Send className="size-3.5" />
                        </button>
                      )}
                    </div>
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
            Trang <strong className="text-foreground">{page}</strong> / {meta.totalPages} (Tổng: {meta.total} mẫu)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-border/40 bg-background px-3 py-1 font-semibold text-foreground shadow-[2px_2px_4px_var(--shadow-dark)] disabled:opacity-40"
            >
              Trước
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page >= meta.totalPages}
              className="rounded-lg border border-border/40 bg-background px-3 py-1 font-semibold text-foreground shadow-[2px_2px_4px_var(--shadow-dark)] disabled:opacity-40"
            >
              Sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
