"use client";

import { useState } from "react";
import {
  Send,
  Volume2,
  X,
  Radio,
  Users,
  ShieldAlert,
  Sparkles,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/providers/locale-provider";
import { useNotificationSound } from "@/hooks/notifications/use-notification-sound";
import { useBroadcastNotification } from "@/hooks/notifications/use-notification-mutations";
import { PREDEFINED_SYSTEM_TEMPLATES } from "../notification-predefined-data";
import { SOUND_PRESET_NAMES, type SoundPreset } from "@/services/sound.service";
import type { NotificationSeverity, NotificationChannel } from "@/types";

export interface CustomDispatchNotificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CustomDispatchNotificationModal({
  open,
  onOpenChange,
  onSuccess,
}: CustomDispatchNotificationModalProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const { playPreset } = useNotificationSound();

  const [selectedTemplateCode, setSelectedTemplateCode] = useState<string>("CUSTOM");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [severity, setSeverity] = useState<NotificationSeverity>("NORMAL");
  const [soundPreset, setSoundPreset] = useState<SoundPreset>("info");
  const [targetScope, setTargetScope] = useState<"BROADCAST" | "SAFETY_OFFICERS" | "MANAGERS">("BROADCAST");
  const [actionUrl, setActionUrl] = useState("");

  const broadcastMutation = useBroadcastNotification({
    onSuccess: () => {
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    },
  });

  const resetForm = () => {
    setSelectedTemplateCode("CUSTOM");
    setTitle("");
    setContent("");
    setSeverity("NORMAL");
    setSoundPreset("info");
    setTargetScope("BROADCAST");
    setActionUrl("");
  };

  const handleSelectTemplate = (code: string) => {
    setSelectedTemplateCode(code);
    if (code === "CUSTOM") {
      setTitle("");
      setContent("");
      return;
    }
    const found = PREDEFINED_SYSTEM_TEMPLATES.find((tpl) => tpl.code === code);
    if (found) {
      setTitle(found.subjectTemplate);
      setContent(found.contentTemplate);
      setSeverity(found.severity);
      setSoundPreset(found.soundPreset);
      playPreset(found.soundPreset);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    broadcastMutation.mutate({
      title: title.trim(),
      content: content.trim(),
      severity,
      actionUrl: actionUrl.trim() || undefined,
      metadata: {
        templateCode: selectedTemplateCode,
        targetScope,
        soundPreset,
        dispatchedAt: new Date().toISOString(),
      },
    });
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
              <Send className="size-4.5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                {isVietnamese ? "Gửi Thông Báo Tùy Chỉnh / Theo Mẫu" : "Dispatch Custom / Templated Notification"}
              </h2>
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                {isVietnamese
                  ? "Soạn tin nhắn tùy ý hoặc chọn mẫu hệ thống có sẵn, kèm âm thanh báo động"
                  : "Compose a custom announcement or pick a pre-configured template"}
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
          {/* Lựa chọn khuôn mẫu có sẵn */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              {isVietnamese ? "Mẫu thông báo áp dụng (Tùy chọn)" : "Base Template (Optional)"}
            </label>
            <select
              value={selectedTemplateCode}
              onChange={(e) => handleSelectTemplate(e.target.value)}
              className="w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark)] outline-none focus:border-primary/60"
            >
              <option value="CUSTOM">
                {isVietnamese ? "✍️ Tự soạn thông báo tự do (Không dùng mẫu)" : "✍️ Custom Freeform Message (No Template)"}
              </option>
              <optgroup label={isVietnamese ? "── Mẫu Giám sát & An toàn PPE ──" : "── PPE Safety Templates ──"}>
                {PREDEFINED_SYSTEM_TEMPLATES.filter((t) => t.category === "PPE").map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.name} ({t.code})
                  </option>
                ))}
              </optgroup>
              <optgroup label={isVietnamese ? "── Mẫu Hạ tầng & Camera ──" : "── Camera & Infrastructure ──"}>
                {PREDEFINED_SYSTEM_TEMPLATES.filter((t) => t.category === "INFRASTRUCTURE").map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.name} ({t.code})
                  </option>
                ))}
              </optgroup>
              <optgroup label={isVietnamese ? "── Mẫu Vận hành & Báo cáo ──" : "── Operations & Reports ──"}>
                {PREDEFINED_SYSTEM_TEMPLATES.filter((t) => t.category === "OPERATIONS").map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.name} ({t.code})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Phạm vi người nhận & Mức độ nghiêm trọng */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                {isVietnamese ? "Phạm vi người nhận" : "Recipient Scope"}
              </label>
              <select
                value={targetScope}
                onChange={(e) => setTargetScope(e.target.value as any)}
                className="w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark)] outline-none focus:border-primary/60"
              >
                <option value="BROADCAST">
                  {isVietnamese ? "📢 Toàn công trường (Broadcast All)" : "📢 Broadcast to All Sites"}
                </option>
                <option value="SAFETY_OFFICERS">
                  {isVietnamese ? "👷 Đội ngũ Cán bộ An toàn (Safety)" : "👷 Safety Officers Team"}
                </option>
                <option value="MANAGERS">
                  {isVietnamese ? "👔 Ban Chỉ huy / Quản lý (Managers)" : "👔 Site Management / Supervisors"}
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                {isVietnamese ? "Mức độ nghiêm trọng" : "Severity"}
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
                  <span>{isVietnamese ? "Nghe thử" : "Play"}</span>
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
              {isVietnamese ? "Tiêu đề thông báo *" : "Notification Title *"}
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isVietnamese ? "Nhập tiêu đề thông báo..." : "Enter notification title..."}
              className="w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-xs text-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark)] outline-none focus:border-primary/60"
            />
          </div>

          {/* Nội dung */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              {isVietnamese ? "Nội dung chi tiết *" : "Message Content *"}
            </label>
            <textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={isVietnamese ? "Nhập nội dung cần truyền đạt đến người nhận..." : "Enter message content for recipients..."}
              className="w-full rounded-xl border border-border/40 bg-background p-3 text-xs text-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark)] outline-none focus:border-primary/60 leading-relaxed font-sans"
            />
          </div>

          {/* Đường dẫn thao tác (Action URL) */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              {isVietnamese ? "Đường dẫn đính kèm (Action URL - Tùy chọn)" : "Action URL (Optional)"}
            </label>
            <input
              type="text"
              value={actionUrl}
              onChange={(e) => setActionUrl(e.target.value)}
              placeholder={isVietnamese ? "VD: /incidents hoặc /reports" : "e.g., /incidents or /reports"}
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
              disabled={broadcastMutation.isPending}
              className="flex items-center gap-1.5 font-bold shadow-[2px_2px_6px_var(--shadow-dark)]"
            >
              <Send className="size-4" />
              <span>
                {broadcastMutation.isPending
                  ? isVietnamese
                    ? "Đang phát..."
                    : "Sending..."
                  : isVietnamese
                    ? "Phát lệnh thông báo"
                    : "Send Alert"}
              </span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
