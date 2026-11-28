"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Send,
  Volume2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePublicConfig } from "@/hooks/auth";
import { useCan } from "@/hooks/use-can";
import {
  getConfig,
  isFeatureFlagEnabled,
  SYSTEM_CONFIG_KEYS,
} from "@/lib/system-config";
import { useLocale } from "@/providers/locale-provider";
import { useNotificationSound } from "@/hooks/notifications/use-notification-sound";
import {
  useBroadcastNotification,
  useSendNotification,
} from "@/hooks/notifications/use-notification-mutations";
import { useUsers } from "@/hooks/users";
import { ApiError } from "@/lib/axios";
import { toast } from "@/lib/toast";
import { PREDEFINED_SYSTEM_TEMPLATES } from "../notification-predefined-data";
import type { SoundPreset } from "@/services/sound.service";
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
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const can = useCan();
  const canReadUsers = can("USER_READ");
  const { playPreset } = useNotificationSound();
  const { data: publicConfig } = usePublicConfig();
  const notificationsEnabled = isFeatureFlagEnabled(
    getConfig(publicConfig, SYSTEM_CONFIG_KEYS.notificationsEnabled, true),
  );

  const [selectedTemplateCode, setSelectedTemplateCode] = useState<string>("CUSTOM");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [severity, setSeverity] = useState<NotificationSeverity>("NORMAL");
  const [soundPreset, setSoundPreset] = useState<SoundPreset>("info");
  const [targetScope, setTargetScope] = useState<"BROADCAST" | "SPECIFIC_USERS" | "SAFETY_OFFICERS" | "MANAGERS">("BROADCAST");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [channels, setChannels] = useState<NotificationChannel[]>(["IN_APP"]);
  const [actionUrl, setActionUrl] = useState("");

  const { data: usersData } = useUsers(
    { limit: 100, isActive: true },
    { enabled: open && targetScope !== "BROADCAST" && canReadUsers },
  );
  const availableUsers = usersData?.data ?? [];

  const scopedRecipients = useMemo(() => {
    if (targetScope === "SPECIFIC_USERS") {
      return availableUsers.filter((u) => selectedUserIds.includes(u.id));
    }
    if (targetScope === "SAFETY_OFFICERS") {
      return availableUsers.filter(
        (u) => (u.role?.name || "").toUpperCase() === "SAFETY_OFFICER",
      );
    }
    if (targetScope === "MANAGERS") {
      return availableUsers.filter((u) =>
        ["SAFETY_MANAGER", "MANAGER", "ADMIN"].includes(
          (u.role?.name || "").toUpperCase(),
        ),
      );
    }
    return [];
  }, [availableUsers, selectedUserIds, targetScope]);

  const broadcastMutation = useBroadcastNotification({
    onSuccess: () => {
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    },
  });

  const sendMutation = useSendNotification({
    onSuccess: () => {
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    },
    onError: (error) => {
      // 400/422 VALIDATION_ERROR (vd. người nhận chưa liên kết Zalo Bot) không được toast tự động
      if (
        error instanceof ApiError &&
        (error.code === "VALIDATION_ERROR" || error.status === 422)
      ) {
        toast.error(
          error.message ||
            (isVietnamese ? "Dữ liệu gửi thông báo không hợp lệ." : "Invalid notification request."),
        );
      }
    },
  });

  const resetForm = () => {
    setSelectedTemplateCode("CUSTOM");
    setTitle("");
    setContent("");
    setSeverity("NORMAL");
    setSoundPreset("info");
    setTargetScope("BROADCAST");
    setSelectedUserIds([]);
    setChannels(["IN_APP"]);
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
    if (!notificationsEnabled || !title.trim() || !content.trim()) return;

    if (targetScope !== "BROADCAST") {
      const userIds =
        targetScope === "SPECIFIC_USERS"
          ? selectedUserIds
          : scopedRecipients.map((u) => u.id);

      if (userIds.length === 0) {
        toast.error(
          isVietnamese
            ? "Không tìm thấy người nhận phù hợp cho phạm vi đã chọn."
            : "No matching recipients found for the selected scope.",
        );
        return;
      }

      const selectedChannels: NotificationChannel[] = channels.length > 0 ? channels : ["IN_APP"];
      const recipientEmails = selectedChannels.includes("EMAIL")
        ? Object.fromEntries(
            scopedRecipients
              .filter((u) => Boolean(u.email))
              .map((u) => [u.id, u.email as string]),
          )
        : undefined;

      sendMutation.mutate({
        userIds,
        channels: selectedChannels,
        title: title.trim(),
        content: content.trim(),
        severity,
        actionUrl: actionUrl.trim() || undefined,
        ...(recipientEmails && Object.keys(recipientEmails).length > 0 ? { recipientEmails } : {}),
        metadata: {
          templateCode: selectedTemplateCode,
          targetScope,
          soundPreset,
          dispatchedAt: new Date().toISOString(),
        },
      });
      return;
    }

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
          {!notificationsEnabled && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-warning/35 bg-warning/15 p-3 text-xs text-foreground"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
              <p className="font-bold">
                {isVietnamese
                  ? "Hệ thống gửi thông báo và email tự động đang bị Quản trị viên tạm dừng. Thao tác gửi thông báo tùy chỉnh tạm thời bị vô hiệu hóa."
                  : "Automated notifications and email dispatch are currently paused by the Administrator. Custom dispatch is temporarily disabled."}
              </p>
            </div>
          )}

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
                {isVietnamese ? "Tự soạn thông báo tự do (Không dùng mẫu)" : "Custom Freeform Message (No Template)"}
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
                  {isVietnamese ? "Toàn công trường (Broadcast All)" : "Broadcast to All Sites"}
                </option>
                <option value="SPECIFIC_USERS">
                  {isVietnamese ? "Gửi đích danh Người dùng (Send)" : "Specific Users (Direct Send)"}
                </option>
                <option value="SAFETY_OFFICERS">
                  {isVietnamese ? "Đội ngũ Cán bộ An toàn (Safety)" : "Safety Officers Team"}
                </option>
                <option value="MANAGERS">
                  {isVietnamese ? "Ban Chỉ huy / Quản lý (Managers)" : "Site Management / Supervisors"}
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
                <option value="critical">{isVietnamese ? "Còi khẩn cấp (Siren)" : "Emergency Siren"}</option>
                <option value="warning">{isVietnamese ? "Chuông tam âm (Warning)" : "Tri-tone Chime"}</option>
                <option value="info">{isVietnamese ? "Giọt nước (Glass Pop)" : "Glass Pop"}</option>
                <option value="success">{isVietnamese ? "Hợp âm (Success Chord)" : "Success Chord"}</option>
                <option value="radio">{isVietnamese ? "Bộ đàm (Radio Chirp)" : "Dispatch Radio"}</option>
              </select>
            </div>
          </div>

          {/* Chọn danh sách người nhận & kênh gửi khi ở chế độ SPECIFIC_USERS */}
          {targetScope === "SPECIFIC_USERS" && (
            <div className="space-y-2.5 rounded-xl border border-border/30 bg-surface p-3 shadow-[inset_2px_2px_4px_var(--shadow-dark)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-foreground">
                  {isVietnamese
                    ? `Chọn người nhận (${selectedUserIds.length} đã chọn)`
                    : `Select Recipients (${selectedUserIds.length} selected)`}
                </span>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  {(["IN_APP", "EMAIL", "ZALO_BOT"] as NotificationChannel[]).map((ch) => (
                    <label key={ch} className="flex cursor-pointer items-center gap-1.5 font-semibold">
                      <input
                        type="checkbox"
                        checked={channels.includes(ch)}
                        onChange={(e) => {
                          setChannels((prev) =>
                            e.target.checked
                              ? [...prev, ch]
                              : prev.filter((item) => item !== ch),
                          );
                        }}
                        className="accent-primary"
                      />
                      <span>{ch === "ZALO_BOT" ? "Zalo Bot" : ch}</span>
                    </label>
                  ))}
                </div>
              </div>
              {channels.includes("ZALO_BOT") && (
                <p
                  role="note"
                  data-testid="custom-dispatch-zalo-note"
                  className="rounded-lg border border-info/25 bg-info/[0.06] px-2.5 py-1.5 text-[11px] leading-relaxed text-muted-foreground"
                >
                  {isVietnamese
                    ? "Kênh Zalo Bot: mọi người nhận phải đã liên kết Zalo Bot trong Cài đặt thông báo, nếu không hệ thống sẽ từ chối gửi."
                    : "Zalo Bot channel: every recipient must have linked Zalo Bot in Notification settings, otherwise the request is rejected."}
                </p>
              )}
              <div className="grid max-h-36 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
                {availableUsers.map((u) => {
                  const checked = selectedUserIds.includes(u.id);
                  return (
                    <label
                      key={u.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-background/60"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setSelectedUserIds((prev) =>
                            e.target.checked
                              ? [...prev, u.id]
                              : prev.filter((id) => id !== u.id),
                          );
                        }}
                        className="accent-primary"
                      />
                      <span className="truncate font-medium text-foreground">
                        {u.fullName || u.email}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

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
              type="url"
              value={actionUrl}
              onChange={(e) => setActionUrl(e.target.value)}
              placeholder={isVietnamese ? "VD: https://app.example.com/incidents" : "e.g., https://app.example.com/incidents"}
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
              disabled={
                !notificationsEnabled ||
                broadcastMutation.isPending ||
                sendMutation.isPending ||
                (targetScope === "SPECIFIC_USERS"
                  ? selectedUserIds.length === 0
                  : targetScope !== "BROADCAST" && scopedRecipients.length === 0)
              }
              title={
                !notificationsEnabled
                  ? isVietnamese
                    ? "Hệ thống gửi thông báo và email tự động đang bị Quản trị viên tạm dừng"
                    : "Automated notifications and email dispatch are currently paused by Administrator"
                  : undefined
              }
              className="flex items-center gap-1.5 font-bold shadow-[2px_2px_6px_var(--shadow-dark)]"
            >
              <Send className="size-4" />
              <span>
                {broadcastMutation.isPending || sendMutation.isPending
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
