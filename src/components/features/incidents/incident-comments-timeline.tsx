"use client";

import { useState } from "react";
import { MessageSquare, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { IncidentCommentItem } from "@/types";

export interface IncidentCommentsTimelineProps {
  comments?: IncidentCommentItem[];
  onSendComment: (comment: string) => Promise<void>;
  loading?: boolean;
}

export function IncidentCommentsTimeline({
  comments = [],
  onSendComment,
  loading = false,
}: IncidentCommentsTimelineProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || sending) return;

    setSending(true);
    try {
      await onSendComment(commentText.trim());
      setCommentText("");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border/40 bg-surface p-5 shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.3)] space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border/30 pb-3">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h4 className="font-bold text-sm text-foreground">
          {isVietnamese
            ? `Trao đổi & Bình luận Hiện trường (${comments.length})`
            : `Field Notes & Incident Discussion (${comments.length})`}
        </h4>
      </div>

      {/* Comments List */}
      <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
        {comments.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            {isVietnamese
              ? "Chưa có bình luận nào. Hãy gửi phản hồi đầu tiên về sự cố này."
              : "No comments yet. Post the first response regarding this incident."}
          </p>
        ) : (
          comments.map((c) => {
            const timeStr = new Date(c.createdAt).toLocaleTimeString(locale, {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={c.id}
                className="flex items-start gap-2.5 rounded-xl border border-border/30 bg-surface/40 p-3 shadow-nm-inset"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
                  <User className="h-3.5 w-3.5" />
                </span>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-foreground">
                      {c.userName || (isVietnamese ? "Cán bộ An toàn" : "Safety Officer")}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {timeStr}
                    </span>
                  </div>
                  <p className="text-xs text-foreground/90 leading-relaxed">
                    {c.comment}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-1">
        <input
          type="text"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
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
    </div>
  );
}
