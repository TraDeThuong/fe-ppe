"use client";

import { useState } from "react";
import { Radio, AlertTriangle, AlertCircle, Info, ShieldAlert, Send } from "lucide-react";
import { SculptedModal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useBroadcastNotification } from "@/hooks/notifications";
import { useLocale } from "@/providers/locale-provider";
import type { NotificationSeverity } from "@/types";

export interface BroadcastNotificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BroadcastNotificationModal({
  open,
  onOpenChange,
}: BroadcastNotificationModalProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [severity, setSeverity] = useState<NotificationSeverity>("NORMAL");
  const [actionUrl, setActionUrl] = useState("");

  const broadcastMutation = useBroadcastNotification({
    onSuccess: () => {
      handleClose();
    },
  });

  const handleClose = () => {
    setTitle("");
    setContent("");
    setSeverity("NORMAL");
    setActionUrl("");
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    await broadcastMutation.mutateAsync({
      title: title.trim(),
      content: content.trim(),
      severity,
      actionUrl: actionUrl.trim() || undefined,
    });
  };

  const inputSocketClass = [
    "w-full rounded-xl px-3.5 py-2.5",
    "border border-[var(--shadow-dark)]/30 dark:border-white/10 bg-background",
    "shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]",
    "focus-within:ring-2 focus-within:ring-primary/40 outline-none transition-all text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60",
  ].join(" ");

  return (
    <SculptedModal
      open={open}
      onOpenChange={onOpenChange}
      title={isVietnamese ? "Phát thông báo toàn hệ thống" : "Broadcast Notification"}
      description={
        isVietnamese
          ? "Gửi thông báo khẩn cấp hoặc tin tức an toàn tới toàn bộ nhân sự trên hệ thống"
          : "Send urgent broadcast or safety alerts to all active users"
      }
      icon={<Radio className="h-5 w-5 text-primary" />}
      size="md"
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={broadcastMutation.isPending}
          >
            {isVietnamese ? "Hủy bỏ" : "Cancel"}
          </Button>
          <Button
            type="submit"
            form="broadcast-notification-form"
            variant="primary"
            disabled={broadcastMutation.isPending || !title.trim() || !content.trim()}
          >
            <Send className="mr-1.5 size-3.5" />
            {broadcastMutation.isPending
              ? isVietnamese
                ? "Đang phát..."
                : "Broadcasting..."
              : isVietnamese
              ? "Phát thông báo ngay"
              : "Send Broadcast"}
          </Button>
        </>
      }
    >
      <form
        id="broadcast-notification-form"
        onSubmit={handleSubmit}
        className="space-y-4 text-xs"
      >
        {/* Tiêu đề */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            {isVietnamese ? "Tiêu đề thông báo *" : "Notification Title *"}
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              isVietnamese
                ? "VD: Khẩn cấp - Yêu cầu trang bị đầy đủ PPE tại Tòa B"
                : "e.g., Mandatory PPE Compliance at Building B"
            }
            className={inputSocketClass}
          />
        </div>

        {/* Mức độ nghiêm trọng */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            {isVietnamese ? "Mức độ nghiêm trọng" : "Severity Level"}
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(
              [
                { value: "LOW", label: isVietnamese ? "Thấp" : "Low", icon: Info, color: "text-blue-500 border-blue-500/30" },
                { value: "NORMAL", label: isVietnamese ? "Bình thường" : "Normal", icon: AlertCircle, color: "text-slate-500 border-slate-500/30" },
                { value: "HIGH", label: isVietnamese ? "Mức cao" : "High", icon: AlertTriangle, color: "text-amber-500 border-amber-500/30" },
                { value: "CRITICAL", label: isVietnamese ? "Khẩn cấp" : "Critical", icon: ShieldAlert, color: "text-red-500 border-red-500/30" },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const isSelected = severity === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setSeverity(item.value)}
                  className={[
                    "flex flex-col items-center justify-center gap-1.5 rounded-xl p-2.5 transition-all",
                    isSelected
                      ? `border bg-background shadow-[inset_2px_2px_4px_var(--shadow-dark)] font-bold ${item.color}`
                      : "border border-border/40 bg-background/50 text-muted-foreground shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] hover:text-foreground",
                  ].join(" ")}
                >
                  <Icon className="size-4" />
                  <span className="text-[11px]">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Nội dung */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            {isVietnamese ? "Nội dung thông báo *" : "Notification Content *"}
          </label>
          <textarea
            required
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              isVietnamese
                ? "Nhập chi tiết nội dung thông báo an toàn hoặc chỉ dẫn tới các đội thi công..."
                : "Enter notification details, instructions or safety notices..."
            }
            className={inputSocketClass}
          />
        </div>

        {/* Action URL */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            {isVietnamese ? "Đường dẫn hành động (Tùy chọn)" : "Action URL (Optional)"}
          </label>
          <input
            type="text"
            value={actionUrl}
            onChange={(e) => setActionUrl(e.target.value)}
            placeholder="/incidents hoặc https://..."
            className={inputSocketClass}
          />
          <p className="mt-1 text-[10px] text-muted-foreground">
            {isVietnamese
              ? "Người dùng có thể bấm vào thông báo để chuyển hướng nhanh đến trang này."
              : "Users can click the notification to navigate directly to this destination."}
          </p>
        </div>
      </form>
    </SculptedModal>
  );
}
