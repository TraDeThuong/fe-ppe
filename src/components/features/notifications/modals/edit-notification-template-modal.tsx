"use client";

import { useEffect, useState } from "react";
import { FileEdit, Volume2, X, Check, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/providers/locale-provider";
import { useNotificationSound } from "@/hooks/notifications/use-notification-sound";
import { useUpdateNotificationTemplate } from "@/hooks/notifications/use-notification-templates";
import { SOUND_PRESET_NAMES, type SoundPreset } from "@/services/sound.service";
import type { NotificationTemplateItemDto, NotificationChannel } from "@/types";

export interface EditNotificationTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: NotificationTemplateItemDto | null;
  onSuccess?: () => void;
}

const COMMON_PLACEHOLDERS = [
  "{{userName}}",
  "{{siteName}}",
  "{{zoneName}}",
  "{{cameraCode}}",
  "{{violationType}}",
  "{{timestamp}}",
  "{{actionUrl}}",
];

export function EditNotificationTemplateModal({
  open,
  onOpenChange,
  template,
  onSuccess,
}: EditNotificationTemplateModalProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const { playPreset } = useNotificationSound();

  const [name, setName] = useState("");
  const [channel, setChannel] = useState<NotificationChannel>("IN_APP");
  const [soundPreset, setSoundPreset] = useState<SoundPreset>("info");
  const [subjectTemplate, setSubjectTemplate] = useState("");
  const [contentTemplate, setContentTemplate] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  useEffect(() => {
    if (template) {
      setName(template.name || "");
      setChannel(template.channel || "IN_APP");
      setSubjectTemplate(template.subjectTemplate || "");
      setContentTemplate(template.contentTemplate || "");
      setDescription(template.description || "");
      setStatus(template.status || "ACTIVE");
      setSoundPreset(
        template.code.includes("CRITICAL") || template.code.includes("VIOLATION")
          ? "critical"
          : template.code.includes("WARNING") || template.code.includes("ALERT")
            ? "warning"
            : "info",
      );
    }
  }, [template]);

  const updateMutation = useUpdateNotificationTemplate({
    onSuccess: () => {
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const handleInsertPlaceholder = (placeholderKey: string) => {
    setContentTemplate((prev) => `${prev} ${placeholderKey} `);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!template || !name.trim() || !contentTemplate.trim()) return;

    updateMutation.mutate({
      id: template.id,
      payload: {
        name: name.trim(),
        channel,
        subjectTemplate: subjectTemplate.trim() || null,
        contentTemplate: contentTemplate.trim(),
        status,
        description: description.trim() || undefined,
      },
    });
  };

  if (!open || !template) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-3 sm:p-6 backdrop-blur-sm animate-in fade-in">
      <div className="relative my-auto w-full max-w-2xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-2xl border border-white/60 bg-background p-4 sm:p-6 shadow-[8px_8px_24px_var(--shadow-dark),-8px_-8px_24px_var(--shadow-light)] dark:border-white/10">
        {/* Top Rim Specular Highlight */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-8 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent"
        />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border/30 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)]">
              <FileEdit className="size-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-foreground">
                  {isVietnamese ? "Chỉnh Sửa Mẫu Thông Báo" : "Edit Notification Template"}
                </h2>
                <Badge variant="outline" size="sm" className="font-mono text-[10px] text-primary">
                  {template.code}
                </Badge>
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                {isVietnamese
                  ? "Cập nhật tiêu đề, nội dung mẫu và cờ trạng thái kích hoạt"
                  : "Update subject, message text and activation state"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex size-8 items-center justify-center rounded-xl border border-border/40 text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Tên hiển thị */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                {isVietnamese ? "Tên hiển thị mẫu *" : "Template Display Name *"}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-xs text-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark)] outline-none focus:border-primary/60"
              />
            </div>

            {/* Trạng thái hoạt động */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                {isVietnamese ? "Trạng thái kích hoạt" : "Template Status"}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE")}
                className="w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark)] outline-none focus:border-primary/60"
              >
                <option value="ACTIVE">{isVietnamese ? "KÍCH HOẠT (ACTIVE) — Sẵn sàng phát" : "ACTIVE — Ready to send"}</option>
                <option value="INACTIVE">{isVietnamese ? "TẠM NGỪNG (INACTIVE) — Chặn gửi" : "INACTIVE — Muted"}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Kênh phát */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                {isVietnamese ? "Kênh truyền phát" : "Delivery Channel"}
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as NotificationChannel)}
                className="w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark)] outline-none focus:border-primary/60"
              >
                <option value="IN_APP">{isVietnamese ? "In-App Web (Trực tiếp)" : "In-App Web (Direct)"}</option>
                <option value="EMAIL">{isVietnamese ? "Thư điện tử (Email)" : "Email"}</option>
                <option value="WEBHOOK">{isVietnamese ? "Webhook (ERP / Bot)" : "Webhook (ERP / Bot)"}</option>
                <option value="ZALO_ZNS">Zalo ZNS SMS</option>
              </select>
            </div>

            {/* Âm thanh cảnh báo */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-foreground">
                  {isVietnamese ? "Âm thanh cảnh báo" : "Audio Tone"}
                </label>
                <button
                  type="button"
                  onClick={() => playPreset(soundPreset)}
                  className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5"
                >
                  <Volume2 className="size-3" />
                  <span>{isVietnamese ? "Nghe thử" : "Test"}</span>
                </button>
              </div>
              <select
                value={soundPreset}
                onChange={(e) => {
                  const val = e.target.value as SoundPreset;
                  setSoundPreset(val);
                  playPreset(val);
                }}
                className="w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark)] outline-none focus:border-primary/60"
              >
                <option value="critical">{isVietnamese ? "🚨 Còi khẩn cấp (Siren)" : "🚨 Emergency Siren"}</option>
                <option value="warning">{isVietnamese ? "🔔 Chuông tam âm (Warning)" : "🔔 Tri-tone Chime"}</option>
                <option value="info">{isVietnamese ? "💧 Giọt nước (Glass Pop)" : "💧 Glass Pop"}</option>
                <option value="success">{isVietnamese ? "✨ Hợp âm (Success Chord)" : "✨ Success Chord"}</option>
                <option value="radio">{isVietnamese ? "📻 Bộ đàm (Radio Chirp)" : "📻 Dispatch Radio"}</option>
              </select>
            </div>
          </div>

          {/* Tiêu đề */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              {isVietnamese ? "Tiêu đề khuôn mẫu (Subject Template)" : "Subject Template"}
            </label>
            <input
              type="text"
              value={subjectTemplate}
              onChange={(e) => setSubjectTemplate(e.target.value)}
              className="w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-xs text-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark)] outline-none focus:border-primary/60"
            />
          </div>

          {/* Nội dung */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-foreground">
                {isVietnamese ? "Nội dung khuôn mẫu *" : "Content Template *"}
              </label>
            </div>

            <div className="flex flex-wrap gap-1 mb-2">
              {COMMON_PLACEHOLDERS.map((ph) => (
                <button
                  key={ph}
                  type="button"
                  onClick={() => handleInsertPlaceholder(ph)}
                  className="rounded-lg border border-border/40 bg-background/80 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary shadow-[1px_1px_3px_var(--shadow-dark)] hover:bg-primary/10 transition-all active:shadow-[inset_1px_1px_2px_var(--shadow-dark)]"
                >
                  + {ph}
                </button>
              ))}
            </div>

            <textarea
              required
              rows={5}
              value={contentTemplate}
              onChange={(e) => setContentTemplate(e.target.value)}
              className="w-full rounded-xl border border-border/40 bg-background p-3 text-xs text-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark)] outline-none focus:border-primary/60 leading-relaxed font-sans"
            />
          </div>

          {/* Mô tả */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              {isVietnamese ? "Ghi chú & Hướng dẫn sử dụng" : "Usage Notes"}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-xs text-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark)] outline-none focus:border-primary/60"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-border/30 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              {isVietnamese ? "Hủy" : "Cancel"}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={updateMutation.isPending}
              className="flex items-center gap-1.5 font-bold shadow-[2px_2px_6px_var(--shadow-dark)]"
            >
              <Check className="size-4" />
              <span>
                {updateMutation.isPending
                  ? isVietnamese
                    ? "Đang cập nhật..."
                    : "Updating..."
                  : isVietnamese
                    ? "Cập nhật mẫu"
                    : "Save Changes"}
              </span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
