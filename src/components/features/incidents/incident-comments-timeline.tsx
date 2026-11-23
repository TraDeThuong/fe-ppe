"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Lock, MessageSquare, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale } from "@/providers/locale-provider";
import type { IncidentCommentItem } from "@/types";

export interface IncidentCommentsTimelineProps {
  comments?: IncidentCommentItem[];
  onSendComment: (comment: string) => Promise<void>;
  loading?: boolean;
  currentUserId?: string;
  canComment?: boolean;
  isClosed?: boolean;
  isLoadingComments?: boolean;
  isErrorComments?: boolean;
  onRetryComments?: () => void;
  highlighted?: boolean;
}

function formatRoleBadge(
  role: string | undefined,
  isVietnamese: boolean,
): { label: string; className: string } | null {
  const normalized = (role || "").toUpperCase().trim();
  if (!normalized) return null;
  if (normalized === "ADMIN") {
    return {
      label: isVietnamese ? "Quản trị viên" : "Admin",
      className: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    };
  }
  if (normalized === "SAFETY_MANAGER" || normalized === "MANAGER") {
    return {
      label: isVietnamese ? "Quản lý AT" : "Safety Mgr",
      className: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    };
  }
  if (normalized === "SAFETY_OFFICER") {
    return {
      label: isVietnamese ? "Cán bộ AT" : "Safety Officer",
      className: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    };
  }
  return {
    label: normalized,
    className: "border-border/40 bg-muted/40 text-muted-foreground",
  };
}

function formatCommentTimestamp(
  createdAt: string,
  locale: string,
): { short: string; exact: string } {
  const date = new Date(createdAt);
  if (!Number.isFinite(date.getTime())) {
    return { short: "—", exact: "—" };
  }
  const now = new Date();
  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const timePart = date.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const datePart = date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return {
    short: isSameDay ? timePart : `${timePart} · ${datePart}`,
    exact: `${timePart} · ${datePart}`,
  };
}

function getInitials(name: string): string {
  const cleaned = name.trim();
  if (!cleaned) return "?";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
}

export function IncidentCommentsTimeline({
  comments = [],
  onSendComment,
  loading = false,
  currentUserId,
  canComment = true,
  isClosed = false,
  isLoadingComments = false,
  isErrorComments = false,
  onRetryComments,
  highlighted = false,
}: IncidentCommentsTimelineProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const previousCountRef = useRef<number>(comments.length);

  useEffect(() => {
    if (comments.length > previousCountRef.current && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
    previousCountRef.current = comments.length;
  }, [comments.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || sending || !canComment || isClosed) return;

    setSending(true);
    try {
      await onSendComment(commentText.trim());
      setCommentText("");
    } catch {
      // Lỗi đã được thông báo qua toast trong mutation; giữ lại nội dung đang nhập để người dùng thử lại.
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      id="incident-comments-section"
      className={`rounded-2xl border bg-surface p-5 shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.3)] space-y-4 transition-all duration-500 ${
        highlighted
          ? "border-indigo-500/70 ring-4 ring-indigo-500/35 shadow-[0_0_24px_rgba(99,102,241,0.3)]"
          : "border-border/40"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border/30 pb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h4 className="font-bold text-sm text-foreground">
            {isVietnamese
              ? `Trao đổi & Bình luận Hiện trường (${comments.length})`
              : `Field Notes & Incident Discussion (${comments.length})`}
          </h4>
        </div>
        {isClosed && (
          <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            <Lock className="h-2.5 w-2.5" />
            <span>{isVietnamese ? "Đã đóng" : "Closed"}</span>
          </span>
        )}
      </div>

      {/* Comments List */}
      <div
        ref={listRef}
        className="space-y-3 max-h-72 overflow-y-auto pr-1 scroll-smooth"
      >
        {isLoadingComments && comments.length === 0 ? (
          <div className="space-y-2.5 py-2">
            {[0, 1].map((idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 rounded-xl border border-border/25 bg-surface/40 p-3"
              >
                <Skeleton className="h-7 w-7 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Skeleton className="h-3.5 w-28 rounded" />
                    <Skeleton className="h-3 w-16 rounded" />
                  </div>
                  <Skeleton className="h-3.5 w-full rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : isErrorComments && comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-danger/25 bg-danger/5 p-4 text-center">
            <AlertCircle className="h-5 w-5 text-danger" />
            <p className="text-xs text-muted-foreground">
              {isVietnamese
                ? "Không thể tải danh sách bình luận hiện trường."
                : "Unable to load incident comments."}
            </p>
            {onRetryComments && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRetryComments}
                className="gap-1.5 text-xs"
              >
                <RefreshCw className="h-3 w-3" />
                <span>{isVietnamese ? "Thử lại" : "Retry"}</span>
              </Button>
            )}
          </div>
        ) : comments.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            {isVietnamese
              ? "Chưa có bình luận nào. Hãy gửi phản hồi đầu tiên về sự cố này."
              : "No comments yet. Post the first response regarding this incident."}
          </p>
        ) : (
          comments.map((c) => {
            const isOwn = Boolean(currentUserId && c.userId === currentUserId);
            const displayName =
              c.userName?.trim() ||
              (c.userId
                ? `${isVietnamese ? "Thành viên" : "Member"} #${c.userId.slice(0, 8)}`
                : isVietnamese
                  ? "Thành viên hệ thống"
                  : "System Member");
            const roleBadge = formatRoleBadge(c.userRole, isVietnamese);
            const ts = formatCommentTimestamp(c.createdAt, locale);

            return (
              <div
                key={c.id}
                className={`flex items-start gap-2.5 rounded-xl border p-3 shadow-nm-inset ${
                  isOwn
                    ? "border-primary/30 bg-primary/[0.05]"
                    : "border-border/30 bg-surface/40"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-extrabold ${
                    isOwn
                      ? "bg-primary text-primary-foreground"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {getInitials(displayName)}
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <span className="truncate font-bold text-xs text-foreground">
                        {displayName}
                      </span>
                      {isOwn && (
                        <span className="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.2 text-[9.5px] font-bold text-primary">
                          {isVietnamese ? "Bạn" : "You"}
                        </span>
                      )}
                      {roleBadge && (
                        <span
                          className={`rounded-full border px-1.5 py-0.2 text-[9.5px] font-semibold ${roleBadge.className}`}
                        >
                          {roleBadge.label}
                        </span>
                      )}
                    </div>
                    <time
                      dateTime={c.createdAt}
                      title={ts.exact}
                      className="shrink-0 font-mono text-[10px] text-muted-foreground"
                    >
                      {ts.short}
                    </time>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-xs text-foreground/90 leading-relaxed">
                    {c.comment}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Box / Read-only Notice */}
      {isClosed ? (
        <div className="flex items-center gap-2 rounded-xl border border-border/30 bg-muted/30 px-3.5 py-2.5 text-[11px] text-muted-foreground">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          <span>
            {isVietnamese
              ? "Hồ sơ sự cố đã đóng — chỉ có thể xem lại lịch sử trao đổi."
              : "This incident is closed — discussion history is read-only."}
          </span>
        </div>
      ) : !canComment ? (
        <div className="flex items-center gap-2 rounded-xl border border-border/30 bg-muted/30 px-3.5 py-2.5 text-[11px] text-muted-foreground">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          <span>
            {isVietnamese
              ? "Bạn chỉ có quyền xem, không có quyền gửi bình luận cho sự cố này."
              : "You have read-only access and cannot post comments on this incident."}
          </span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            maxLength={2000}
            placeholder={
              isVietnamese
                ? "Nhập ghi chú hoặc cập nhật tiến độ hiện trường..."
                : "Enter field notes or incident progress updates..."
            }
            className="flex-1 rounded-xl border border-border/40 bg-surface px-3.5 py-2 text-xs shadow-nm-inset focus:border-primary focus:outline-none"
            disabled={loading || sending}
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={!commentText.trim() || loading || sending}
            className="flex items-center gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{isVietnamese ? "Gửi" : "Send"}</span>
          </Button>
        </form>
      )}
    </div>
  );
}
