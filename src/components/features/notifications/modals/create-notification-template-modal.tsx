"use client";

import { useState } from "react";
import {
  FileText,
  Volume2,
  X,
  Plus,
  HelpCircle,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/providers/locale-provider";
import { useNotificationSound } from "@/hooks/notifications/use-notification-sound";
import { useCreateNotificationTemplate } from "@/hooks/notifications/use-notification-templates";
import {
  SOUND_PRESET_NAMES,
  type SoundPreset,
} from "@/services/sound.service";
import type {
  CreateNotificationTemplatePayload,
  NotificationChannel,
  NotificationSeverity,
} from "@/types";

export interface CreateNotificationTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const COMMON_PLACEHOLDERS = [
  { key: "{{userName}}", label: "Tên người nhận", sample: "Lê Hoàng Nam" },
  { key: "{{siteName}}", label: "Tên công trường", sample: "KCN VSIP II" },
  { key: "{{zoneName}}", label: "Khu vực / Tầng", sample: "Khu A - Tầng 3" },
  { key: "{{cameraCode}}", label: "Mã Camera", sample: "CAM-01" },
  { key: "{{violationType}}", label: "Loại vi phạm", sample: "Không đội mũ" },
  { key: "{{timestamp}}", label: "Thời gian", sample: "14:30 28/10/2026" },
  { key: "{{actionUrl}}", label: "Liên kết xử lý", sample: "/incidents/inc-01" },
];

export function CreateNotificationTemplateModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateNotificationTemplateModalProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const { playPreset } = useNotificationSound();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<NotificationChannel>("IN_APP");
  const [severity, setSeverity] = useState<NotificationSeverity>("NORMAL");
  const [soundPreset, setSoundPreset] = useState<SoundPreset>("info");
  const [subjectTemplate, setSubjectTemplate] = useState("");
  const [contentTemplate, setContentTemplate] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  const createMutation = useCreateNotificationTemplate({
    onSuccess: () => {
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    },
  });

  const resetForm = () => {
    setCode("");
    setName("");
    setChannel("IN_APP");
    setSeverity("NORMAL");
    setSoundPreset("info");
    setSubjectTemplate("");
    setContentTemplate("");
    setDescription("");
    setStatus("ACTIVE");
  };

  const handleInsertPlaceholder = (placeholderKey: string) => {
    setContentTemplate((prev) => `${prev} ${placeholderKey} `);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !contentTemplate.trim()) return;

    const payload: CreateNotificationTemplatePayload = {
      code: code.trim().toUpperCase().replace(/\s+/g, "_"),
      name: name.trim(),
      channel,
      subjectTemplate: subjectTemplate.trim() || null,
      contentTemplate: contentTemplate.trim(),
      status,
      description: description.trim() || undefined,
    };

    createMutation.mutate(payload);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-3 sm:p-6 backdrop-blur-sm animate-in fade-in">
      <div className="relative my-auto w-full max-w-2xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-2xl border border-white/60 bg-background p-4 sm:p-6 shadow-[8px_8px_24px_var(--shadow-dark),-8px_-8px_24px_var(--shadow-light)] dark:border-white/10">
        {/* Top Rim Specular Line */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-8 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent"
        />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border/30 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)]">
              <Plus className="size-4.5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                {isVietnamese ? "Tạo Mẫu Thông Báo Tùy Chỉnh" : "Create Custom Notification Template"}
              </h2>
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                {isVietnamese
                  ? "Tạo khuôn mẫu thông báo mới kèm các biến động và âm thanh cảnh báo"
                  : "Define a reusable template with dynamic variables and audio cue"}
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
            {/* Mã mẫu (Template Code) */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                {isVietnamese ? "Mã khuôn mẫu (Code) *" : "Template Code *"}
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="VD: CUSTOM_HIGH_ZONE_ALERT"
                className="w-full rounded-xl border border-border/40 bg-background px-3 py-2 font-mono text-xs text-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark)] outline-none focus:border-primary/60"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {isVietnamese ? "Viết hoa, không dấu, nối bằng dấu gạch dưới" : "Uppercase letters and underscores only"}
              </p>
            </div>

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
                placeholder={
                  isVietnamese
                    ? "VD: Cảnh báo công nhân vào vùng cấm"
                    : "e.g., Worker entered restricted area alert"
                }
                className="w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-xs text-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark)] outline-none focus:border-primary/60"
              />
            </div>
          </div>

          {/* Kênh phát, Mức độ nghiêm trọng, Âm thanh chuông */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Kênh truyền phát */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                {isVietnamese ? "Kênh truyền phát" : "Channel"}
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

            {/* Mức độ ưu tiên */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                {isVietnamese ? "Mức độ nghiêm trọng" : "Severity Level"}
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as NotificationSeverity)}
                className="w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark)] outline-none focus:border-primary/60"
              >
                <option value="LOW">{isVietnamese ? "Mức thấp (LOW)" : "Low (LOW)"}</option>
                <option value="NORMAL">{isVietnamese ? "Bình thường (NORMAL)" : "Normal (NORMAL)"}</option>
                <option value="HIGH">{isVietnamese ? "Mức cao (HIGH)" : "High (HIGH)"}</option>
                <option value="CRITICAL">{isVietnamese ? "Khẩn cấp (CRITICAL)" : "Critical (CRITICAL)"}</option>
              </select>
            </div>

            {/* Âm thanh chuông */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-foreground">
                  {isVietnamese ? "Âm thanh cảnh báo" : "Audio Cue"}
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

          {/* Tiêu đề khuôn mẫu */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              {isVietnamese ? "Tiêu đề mẫu (Subject Template)" : "Subject Template"}
            </label>
            <input
              type="text"
              value={subjectTemplate}
              onChange={(e) => setSubjectTemplate(e.target.value)}
              placeholder={isVietnamese ? "VD: ⚠️ Cảnh báo an toàn tại {{siteName}}" : "e.g., ⚠️ Safety Alert at {{siteName}}"}
              className="w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-xs text-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark)] outline-none focus:border-primary/60"
            />
          </div>

          {/* Biến động chèn nhanh (Placeholders) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <span>{isVietnamese ? "Nội dung khuôn mẫu *" : "Content Template *"}</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  ({isVietnamese ? "Bấm vào thẻ bên dưới để chèn biến" : "Click tags to insert variable"})
                </span>
              </label>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_PLACEHOLDERS.map((ph) => (
                <button
                  key={ph.key}
                  type="button"
                  onClick={() => handleInsertPlaceholder(ph.key)}
                  className="rounded-lg border border-border/40 bg-background/80 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary shadow-[1px_1px_3px_var(--shadow-dark)] hover:bg-primary/10 transition-all active:shadow-[inset_1px_1px_2px_var(--shadow-dark)]"
                  title={`${ph.label} (VD: ${ph.sample})`}
                >
                  + {ph.key}
                </button>
              ))}
            </div>

            <textarea
              required
              rows={4}
              value={contentTemplate}
              onChange={(e) => setContentTemplate(e.target.value)}
              placeholder={
                isVietnamese
                  ? "Nhập nội dung mẫu thông báo. Ví dụ: Phát hiện sự cố an toàn tại {{siteName}}, khu vực {{zoneName}}. Đề nghị cán bộ {{userName}} kiểm tra ngay..."
                  : "Enter template message. Example: Safety violation detected at {{siteName}}, zone {{zoneName}}. Officer {{userName}} please inspect immediately..."
              }
              className="w-full rounded-xl border border-border/40 bg-background p-3 text-xs text-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark)] outline-none focus:border-primary/60 leading-relaxed font-sans"
            />
          </div>

          {/* Mô tả nghiệp vụ */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              {isVietnamese ? "Ghi chú & Hướng dẫn sử dụng mẫu" : "Usage Notes & Description"}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                isVietnamese
                  ? "Ghi chú hoàn cảnh áp dụng mẫu này trong thực tế công trường..."
                  : "Notes on when to trigger this template on site..."
              }
              className="w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-xs text-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark)] outline-none focus:border-primary/60"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 border-t border-border/30 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              {isVietnamese ? "Hủy bỏ" : "Cancel"}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={createMutation.isPending}
              className="flex items-center gap-1.5 font-bold shadow-[2px_2px_6px_var(--shadow-dark)]"
            >
              <Plus className="size-4" />
              <span>
                {createMutation.isPending
                  ? isVietnamese
                    ? "Đang lưu..."
                    : "Saving..."
                  : isVietnamese
                    ? "Lưu mẫu thông báo"
                    : "Create Template"}
              </span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
