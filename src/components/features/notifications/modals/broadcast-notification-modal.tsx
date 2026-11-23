"use client";

import { useCallback, useId, useRef, useState } from "react";
import { Radio, AlertTriangle, AlertCircle, Info, ShieldAlert, Send, Loader2 } from "lucide-react";
import { SculptedModal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useBroadcastNotification } from "@/hooks/notifications";
import { useLocale } from "@/providers/locale-provider";
import { ApiError } from "@/lib/axios";
import type { NotificationSeverity } from "@/types";

type FormField = "title" | "content" | "actionUrl";

export interface BroadcastNotificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BroadcastNotificationModal({
  open,
  onOpenChange,
}: BroadcastNotificationModalProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const submitting = useRef(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [severity, setSeverity] = useState<NotificationSeverity>("NORMAL");
  const [actionUrl, setActionUrl] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FormField, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const broadcastMutation = useBroadcastNotification({
    suppressToast: true,
    onSuccess: () => {
      handleClose();
    },
  });

  const handleClose = useCallback(() => {
    setTitle("");
    setContent("");
    setSeverity("NORMAL");
    setActionUrl("");
    setFieldErrors({});
    setSubmitError(null);
    onOpenChange(false);
  }, [onOpenChange]);

  const requestClose = useCallback(() => {
    if (!submitting.current) handleClose();
  }, [handleClose]);
  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) requestClose();
  }, [requestClose]);
  const clearError = (field: FormField) => {
    setFieldErrors((errors) => ({ ...errors, [field]: undefined }));
    setSubmitError(null);
  };
  const showFieldErrors = (errors: Partial<Record<FormField, string>>) => {
    setFieldErrors(errors);
    const first = (["title", "content", "actionUrl"] as const).find((field) => errors[field]);
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current || broadcastMutation.isPending) return;
    setSubmitError(null);
    const errors: Partial<Record<FormField, string>> = {};
    if (!title.trim()) errors.title = isVietnamese ? "Vui lòng nhập tiêu đề thông báo." : "Enter a notification title.";
    else if (title.trim().length > 255) errors.title = isVietnamese ? "Tiêu đề không được vượt quá 255 ký tự." : "The title must not exceed 255 characters.";
    if (!content.trim()) errors.content = isVietnamese ? "Vui lòng nhập nội dung thông báo." : "Enter notification content.";
    const url = actionUrl.trim();
    if (url) {
      try {
        const parsed = new URL(url);
        if (!/^https?:\/\//i.test(url) || !["http:", "https:"].includes(parsed.protocol) || !parsed.hostname) throw new Error("Invalid URL");
      } catch {
        errors.actionUrl = isVietnamese
          ? "Nhập URL đầy đủ bắt đầu bằng http:// hoặc https://, hoặc để trống. Ví dụ: https://example.com/incidents."
          : "Enter a full URL starting with http:// or https://, or leave this field blank. Example: https://example.com/incidents.";
      }
    }
    showFieldErrors(errors);
    if (Object.keys(errors).length) return;

    submitting.current = true;
    try {
      await broadcastMutation.mutateAsync({ title: title.trim(), content: content.trim(), severity, actionUrl: url || undefined });
    } catch (error) {
      const errors: Partial<Record<FormField, string>> = {};
      if (error instanceof ApiError) {
        for (const detail of error.errors ?? []) {
          if (detail.field === "title" || detail.field === "content" || detail.field === "actionUrl") errors[detail.field] = detail.message;
        }
      }
      showFieldErrors(errors);
      setSubmitError(error instanceof ApiError && (error.status === 422 || error.code === "VALIDATION_ERROR")
        ? isVietnamese ? "Máy chủ từ chối dữ liệu thông báo. Vui lòng kiểm tra tiêu đề, nội dung và đường dẫn hành động." : "The server rejected this notification. Check the title, content and action URL."
        : error instanceof ApiError && error.status === 403
          ? isVietnamese ? "Tài khoản không có quyền phát thông báo toàn hệ thống." : "You do not have permission to broadcast notifications."
          : error instanceof Error ? error.message : isVietnamese ? "Không thể phát thông báo. Vui lòng thử lại." : "Unable to broadcast. Please retry.");
    } finally {
      submitting.current = false;
    }
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
      onOpenChange={handleOpenChange}
      preventClose={broadcastMutation.isPending}
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
            onClick={requestClose}
            disabled={broadcastMutation.isPending}
          >
            {isVietnamese ? "Hủy bỏ" : "Cancel"}
          </Button>
          <Button
            type="submit"
            form={formId}
            variant="primary"
            disabled={broadcastMutation.isPending || !title.trim() || !content.trim()}
          >
            {broadcastMutation.isPending ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Send className="mr-1.5 size-3.5" />}
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
        id={formId}
        ref={formRef}
        noValidate
        onSubmit={handleSubmit}
        className="space-y-4 text-xs"
      >
        {submitError && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger">{submitError}</p>}
        {/* Tiêu đề */}
        <div>
          <label htmlFor={`${formId}-title`} className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            {isVietnamese ? "Tiêu đề thông báo *" : "Notification Title *"}
          </label>
          <input
            type="text"
            id={`${formId}-title`}
            name="title"
            required
            maxLength={255}
            disabled={broadcastMutation.isPending}
            aria-invalid={!!fieldErrors.title}
            aria-describedby={fieldErrors.title ? `${formId}-title-error` : undefined}
            value={title}
            onChange={(e) => { setTitle(e.target.value); clearError("title"); }}
            placeholder={
              isVietnamese
                ? "VD: Khẩn cấp - Yêu cầu trang bị đầy đủ PPE tại Tòa B"
                : "e.g., Mandatory PPE Compliance at Building B"
            }
            className={inputSocketClass}
          />
          {fieldErrors.title && <p id={`${formId}-title-error`} role="alert" className="mt-1 text-xs text-danger">{fieldErrors.title}</p>}
        </div>

        {/* Mức độ nghiêm trọng */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            {isVietnamese ? "Mức độ nghiêm trọng" : "Severity Level"}
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(
              [
                { value: "LOW", label: isVietnamese ? "Thấp" : "Low", icon: Info, color: "text-muted-foreground border-border/50" },
                { value: "NORMAL", label: isVietnamese ? "Bình thường" : "Normal", icon: AlertCircle, color: "text-primary border-primary/30" },
                { value: "HIGH", label: isVietnamese ? "Mức cao" : "High", icon: AlertTriangle, color: "text-warning border-warning/30" },
                { value: "CRITICAL", label: isVietnamese ? "Khẩn cấp" : "Critical", icon: ShieldAlert, color: "text-danger border-danger/30" },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const isSelected = severity === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  disabled={broadcastMutation.isPending}
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
          <label htmlFor={`${formId}-content`} className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            {isVietnamese ? "Nội dung thông báo *" : "Notification Content *"}
          </label>
          <textarea
            id={`${formId}-content`}
            name="content"
            required
            disabled={broadcastMutation.isPending}
            aria-invalid={!!fieldErrors.content}
            aria-describedby={fieldErrors.content ? `${formId}-content-error` : undefined}
            rows={4}
            value={content}
            onChange={(e) => { setContent(e.target.value); clearError("content"); }}
            placeholder={
              isVietnamese
                ? "Nhập chi tiết nội dung thông báo an toàn hoặc chỉ dẫn tới các đội thi công..."
                : "Enter notification details, instructions or safety notices..."
            }
            className={inputSocketClass}
          />
          {fieldErrors.content && <p id={`${formId}-content-error`} role="alert" className="mt-1 text-xs text-danger">{fieldErrors.content}</p>}
        </div>

        {/* Action URL */}
        <div>
          <label htmlFor={`${formId}-actionUrl`} className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            {isVietnamese ? "Đường dẫn hành động (Tùy chọn)" : "Action URL (Optional)"}
          </label>
          <input
            id={`${formId}-actionUrl`}
            name="actionUrl"
            type="url"
            disabled={broadcastMutation.isPending}
            aria-invalid={!!fieldErrors.actionUrl}
            aria-describedby={`${formId}-url-help${fieldErrors.actionUrl ? ` ${formId}-url-error` : ""}`}
            value={actionUrl}
            onChange={(e) => { setActionUrl(e.target.value); clearError("actionUrl"); }}
            placeholder="https://example.com/incidents"
            className={inputSocketClass}
          />
          {fieldErrors.actionUrl && <p id={`${formId}-url-error`} role="alert" className="mt-1 text-xs text-danger">{fieldErrors.actionUrl}</p>}
          <p id={`${formId}-url-help`} className="mt-1 text-[10px] text-muted-foreground">
            {isVietnamese
              ? "Để trống nếu không cần đường dẫn. Nếu nhập, dùng URL HTTP(S) đầy đủ; không dùng đường dẫn tương đối như /incidents. Máy chủ có thể từ chối địa chỉ nội bộ theo cấu hình môi trường."
              : "Leave blank if no link is needed. Otherwise use a full HTTP(S) URL, not a relative path such as /incidents. The server may reject private addresses depending on its environment."}
          </p>
        </div>
      </form>
    </SculptedModal>
  );
}
