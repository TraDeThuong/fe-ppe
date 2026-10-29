"use client";

import { useState } from "react";
import {
  SlidersHorizontal,
  Bell,
  Mail,
  ShieldAlert,
  Volume2,
  VolumeX,
  Clock,
  Music,
  Check,
  Radio,
} from "lucide-react";
import {
  useNotificationPreferences,
  useUpdateNotificationPreference,
} from "@/hooks/notifications";
import { useNotificationSound } from "@/hooks/notifications/use-notification-sound";
import { useLocale } from "@/providers/locale-provider";
import {
  SOUND_PRESET_NAMES,
  type SoundPreset,
} from "@/services/sound.service";
import type { NotificationChannel, NotificationSeverity } from "@/types";

export function NotificationPreferencesCard({ className = "" }: { className?: string }) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  // Preferences từ backend
  const { data: preferences = [], isLoading } = useNotificationPreferences();
  const updateMutation = useUpdateNotificationPreference();

  // Sound Engine
  const {
    settings: soundSettings,
    enabled: soundEnabled,
    volume: soundVolume,
    playAlert,
    playPreset,
    updateSettings: updateSoundSettings,
    toggleSound,
    isInQuietHours,
  } = useNotificationSound();

  const inAppPref = preferences.find((p) => p.channel === "IN_APP") || {
    channel: "IN_APP" as NotificationChannel,
    enabled: true,
    severityThreshold: "LOW" as NotificationSeverity,
  };

  const emailPref = preferences.find((p) => p.channel === "EMAIL") || {
    channel: "EMAIL" as NotificationChannel,
    enabled: true,
    severityThreshold: "HIGH" as NotificationSeverity,
  };

  const handleToggleChannel = (channel: NotificationChannel, currentEnabled: boolean) => {
    const currentPref = channel === "IN_APP" ? inAppPref : emailPref;
    updateMutation.mutate({
      channel,
      enabled: !currentEnabled,
      severityThreshold: currentPref.severityThreshold,
    });
  };

  const handleChangeThreshold = (
    channel: NotificationChannel,
    severityThreshold: NotificationSeverity,
  ) => {
    const currentPref = channel === "IN_APP" ? inAppPref : emailPref;
    updateMutation.mutate({
      channel,
      enabled: currentPref.enabled,
      severityThreshold,
    });
  };

  const handleVolumeChange = (newVol: number) => {
    updateSoundSettings({ volume: newVol });
  };

  const handleSoundMapChange = (severity: NotificationSeverity, preset: SoundPreset) => {
    updateSoundSettings({
      soundMap: {
        ...soundSettings.soundMap,
        [severity]: preset,
      },
    });
    playPreset(preset, soundVolume);
  };

  return (
    <div
      className={`space-y-6 rounded-2xl border border-border/30 bg-background p-4 shadow-[6px_6px_15px_var(--shadow-dark),-6px_-6px_15px_var(--shadow-light)] sm:p-6 ${className}`}
    >
      {/* 1. Header Card */}
      <div className="flex items-start gap-3.5 border-b border-border/30 pb-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-[3px_3px_8px_var(--shadow-dark),-3px_-3px_8px_var(--shadow-light)]">
          <SlidersHorizontal className="size-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-foreground sm:text-lg">
            {t("notifications.preferences.title")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {t("notifications.preferences.subtitle")}
          </p>
        </div>
      </div>

      {/* 2. CÀI ĐẶT ÂM THANH CẢNH BÁO THỜI GIAN THỰC (AUDIO NOTIFICATION ENGINE) */}
      <div className="rounded-2xl border border-primary/30 bg-primary/[0.03] p-4 sm:p-5 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/20 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[2px_2px_5px_var(--shadow-dark)]">
              {soundEnabled ? <Volume2 className="size-5" /> : <VolumeX className="size-5 text-muted-foreground" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">
                  {isVietnamese ? "Bộ Âm Thanh Cảnh Báo Thông Báo" : "Notification Audio Alert Engine"}
                </h3>
                <span
                  className={`inline-block size-2 rounded-full ${
                    soundEnabled ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                  }`}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {isVietnamese
                  ? "Phát âm thanh chuông đặc trưng khi có thông báo vi phạm PPE hoặc sự cố mới tới"
                  : "Play distinct acoustic cues when safety events or new alerts arrive"}
              </p>
            </div>
          </div>

          {/* Master Sound Switch */}
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <span className="text-xs font-semibold text-foreground">
              {soundEnabled ? (isVietnamese ? "Đang BẬT" : "ENABLED") : isVietnamese ? "Đang TẮT" : "MUTED"}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={soundEnabled}
              onClick={toggleSound}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                soundEnabled
                  ? "bg-primary shadow-[inset_1px_1px_3px_rgba(0,0,0,0.3)]"
                  : "bg-muted shadow-[inset_2px_2px_4px_var(--shadow-dark)]"
              }`}
            >
              <span
                className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                  soundEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Volume Slider & Test Button */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span>{isVietnamese ? "Âm lượng cảnh báo" : "Master Volume"}:</span>
              <span className="font-mono text-primary font-bold">{Math.round(soundVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={soundVolume}
              disabled={!soundEnabled}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-full accent-primary cursor-pointer disabled:opacity-40"
            />
          </div>

          {/* Test Sound Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!soundEnabled}
              onClick={() => playPreset("critical", soundVolume)}
              className="flex-1 rounded-xl border border-rose-500/30 bg-background py-2 px-3 text-xs font-bold text-rose-500 shadow-[2px_2px_5px_var(--shadow-dark)] hover:bg-rose-500/10 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 active:shadow-[inset_1px_1px_2px_var(--shadow-dark)]"
            >
              <Volume2 className="size-3.5" />
              <span>{isVietnamese ? "Thử Còi Khẩn cấp" : "Test Siren"}</span>
            </button>
            <button
              type="button"
              disabled={!soundEnabled}
              onClick={() => playPreset("warning", soundVolume)}
              className="flex-1 rounded-xl border border-amber-500/30 bg-background py-2 px-3 text-xs font-bold text-amber-500 shadow-[2px_2px_5px_var(--shadow-dark)] hover:bg-amber-500/10 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 active:shadow-[inset_1px_1px_2px_var(--shadow-dark)]"
            >
              <Volume2 className="size-3.5" />
              <span>{isVietnamese ? "Thử Chuông Tam âm" : "Test Chime"}</span>
            </button>
          </div>
        </div>

        {/* Lựa chọn âm thanh cho từng mức độ nghiêm trọng */}
        <div className="border-t border-border/20 pt-3 space-y-2">
          <span className="text-xs font-bold text-foreground block">
            {isVietnamese ? "Tùy biến âm thanh theo mức độ nghiêm trọng:" : "Severity Sound Mapping:"}
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* 1. CRITICAL */}
            <div className="rounded-xl border border-border/40 bg-background p-2.5 shadow-[inset_1px_1px_2px_var(--shadow-dark)] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-500">
                  {isVietnamese ? "Khẩn cấp (CRITICAL)" : "CRITICAL"}
                </span>
                <button
                  type="button"
                  onClick={() => playPreset(soundSettings.soundMap.CRITICAL, soundVolume)}
                  className="text-[10px] text-primary hover:underline font-bold"
                >
                  {isVietnamese ? "Nghe thử" : "Test"}
                </button>
              </div>
              <select
                value={soundSettings.soundMap.CRITICAL}
                onChange={(e) => handleSoundMapChange("CRITICAL", e.target.value as SoundPreset)}
                className="w-full rounded-lg border border-border/40 bg-background px-2 py-1 text-xs font-semibold text-foreground outline-none"
              >
                <option value="critical">{isVietnamese ? "🚨 Còi khẩn cấp (Siren)" : "🚨 Emergency Siren"}</option>
                <option value="warning">{isVietnamese ? "🔔 Chuông tam âm" : "🔔 Tri-tone Chime"}</option>
                <option value="radio">{isVietnamese ? "📻 Bộ đàm điều phối" : "📻 Dispatch Radio"}</option>
                <option value="info">{isVietnamese ? "💧 Giọt nước thanh thoát" : "💧 Glass Pop"}</option>
              </select>
            </div>

            {/* 2. HIGH */}
            <div className="rounded-xl border border-border/40 bg-background p-2.5 shadow-[inset_1px_1px_2px_var(--shadow-dark)] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-500">
                  {isVietnamese ? "Mức cao (HIGH)" : "HIGH"}
                </span>
                <button
                  type="button"
                  onClick={() => playPreset(soundSettings.soundMap.HIGH, soundVolume)}
                  className="text-[10px] text-primary hover:underline font-bold"
                >
                  {isVietnamese ? "Nghe thử" : "Test"}
                </button>
              </div>
              <select
                value={soundSettings.soundMap.HIGH}
                onChange={(e) => handleSoundMapChange("HIGH", e.target.value as SoundPreset)}
                className="w-full rounded-lg border border-border/40 bg-background px-2 py-1 text-xs font-semibold text-foreground outline-none"
              >
                <option value="warning">{isVietnamese ? "🔔 Chuông tam âm" : "🔔 Tri-tone Chime"}</option>
                <option value="critical">{isVietnamese ? "🚨 Còi khẩn cấp (Siren)" : "🚨 Emergency Siren"}</option>
                <option value="radio">{isVietnamese ? "📻 Bộ đàm điều phối" : "📻 Dispatch Radio"}</option>
                <option value="info">{isVietnamese ? "💧 Giọt nước thanh thoát" : "💧 Glass Pop"}</option>
              </select>
            </div>

            {/* 3. NORMAL */}
            <div className="rounded-xl border border-border/40 bg-background p-2.5 shadow-[inset_1px_1px_2px_var(--shadow-dark)] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-500">
                  {isVietnamese ? "Bình thường (NORMAL)" : "NORMAL"}
                </span>
                <button
                  type="button"
                  onClick={() => playPreset(soundSettings.soundMap.NORMAL, soundVolume)}
                  className="text-[10px] text-primary hover:underline font-bold"
                >
                  {isVietnamese ? "Nghe thử" : "Test"}
                </button>
              </div>
              <select
                value={soundSettings.soundMap.NORMAL}
                onChange={(e) => handleSoundMapChange("NORMAL", e.target.value as SoundPreset)}
                className="w-full rounded-lg border border-border/40 bg-background px-2 py-1 text-xs font-semibold text-foreground outline-none"
              >
                <option value="info">{isVietnamese ? "💧 Giọt nước thanh thoát" : "💧 Glass Pop"}</option>
                <option value="success">{isVietnamese ? "✨ Hợp âm thành công" : "✨ Success Chord"}</option>
                <option value="warning">{isVietnamese ? "🔔 Chuông tam âm" : "🔔 Tri-tone Chime"}</option>
              </select>
            </div>

            {/* 4. LOW */}
            <div className="rounded-xl border border-border/40 bg-background p-2.5 shadow-[inset_1px_1px_2px_var(--shadow-dark)] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">
                  {isVietnamese ? "Mức thấp (LOW)" : "LOW"}
                </span>
                <button
                  type="button"
                  onClick={() => playPreset(soundSettings.soundMap.LOW, soundVolume)}
                  className="text-[10px] text-primary hover:underline font-bold"
                >
                  {isVietnamese ? "Nghe thử" : "Test"}
                </button>
              </div>
              <select
                value={soundSettings.soundMap.LOW}
                onChange={(e) => handleSoundMapChange("LOW", e.target.value as SoundPreset)}
                className="w-full rounded-lg border border-border/40 bg-background px-2 py-1 text-xs font-semibold text-foreground outline-none"
              >
                <option value="info">{isVietnamese ? "💧 Giọt nước thanh thoát" : "💧 Glass Pop"}</option>
                <option value="success">{isVietnamese ? "✨ Hợp âm thành công" : "✨ Success Chord"}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Khung giờ yên tĩnh (Quiet Hours / Do Not Disturb) */}
        <div className="border-t border-border/20 pt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" />
            <div>
              <span className="font-semibold text-foreground">
                {isVietnamese ? "Khung giờ yên tĩnh (DND)" : "Quiet Hours / DND"}
              </span>
              <p className="text-[11px] text-muted-foreground">
                {isVietnamese
                  ? "Tắt âm thanh thông thường trong khung giờ nghỉ ngơi (chỉ phát còi cho sự cố Khẩn cấp)"
                  : "Mutes non-critical notification sounds during selected off-hours"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              role="switch"
              aria-checked={soundSettings.quietHoursEnabled}
              onClick={() =>
                updateSoundSettings({ quietHoursEnabled: !soundSettings.quietHoursEnabled })
              }
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                soundSettings.quietHoursEnabled ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                  soundSettings.quietHoursEnabled ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>

            {soundSettings.quietHoursEnabled && (
              <div className="flex items-center gap-1 font-mono text-xs">
                <input
                  type="time"
                  value={soundSettings.quietHoursStart}
                  onChange={(e) => updateSoundSettings({ quietHoursStart: e.target.value })}
                  className="rounded border border-border/40 bg-background px-1 py-0.5"
                />
                <span>-</span>
                <input
                  type="time"
                  value={soundSettings.quietHoursEnd}
                  onChange={(e) => updateSoundSettings({ quietHoursEnd: e.target.value })}
                  className="rounded border border-border/40 bg-background px-1 py-0.5"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Anti Alert Fatigue Engine Explanatory Notice */}
      <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/[0.04] p-3.5 sm:p-4 text-xs leading-relaxed text-muted-foreground shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
        <ShieldAlert className="size-4 shrink-0 text-primary mt-0.5" />
        <div>
          <span className="font-bold text-foreground">
            {t("notifications.preferences.antiFatigueHelp")}
          </span>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {isVietnamese
              ? "Tại công trường xây dựng, việc đặt ngưỡng cho phép bạn chỉ nhận những vi phạm thực sự cần can thiệp khẩn cấp (như không đội mũ ở tầng cao, đi vào vùng nguy hiểm cấm) qua Email, tránh làm tràn ngập hòm thư điện tử."
              : "On active sites, setting channel thresholds ensures email inbox is not overwhelmed, reserving high-bandwidth channels only for critical violations."}
          </p>
        </div>
      </div>

      {/* 4. Preferences Channel Grid (In-App & Email) */}
      <div className="space-y-4">
        {/* 1. Kênh Thông báo trên Web (In-App) */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border/40 bg-background p-4 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/40 bg-background text-primary shadow-[2px_2px_6px_var(--shadow-dark),-2px_-2px_6px_var(--shadow-light)]">
                <Bell className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  {t("notifications.channel.IN_APP")}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t("notifications.preferences.inAppDesc")}
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            <button
              type="button"
              role="switch"
              aria-checked={inAppPref.enabled}
              disabled={isLoading || updateMutation.isPending}
              onClick={() => handleToggleChannel("IN_APP", inAppPref.enabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                inAppPref.enabled
                  ? "bg-primary shadow-[inset_1px_1px_3px_rgba(0,0,0,0.3)]"
                  : "bg-muted shadow-[inset_2px_2px_4px_var(--shadow-dark)]"
              }`}
            >
              <span
                className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                  inAppPref.enabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Threshold Selection */}
          <div className="flex flex-col gap-2 border-t border-border/20 pt-3 sm:flex-row sm:items-center sm:justify-between text-xs">
            <span className="font-semibold text-foreground">
              {t("notifications.preferences.threshold")}:
            </span>
            <select
              value={inAppPref.severityThreshold}
              disabled={!inAppPref.enabled || updateMutation.isPending}
              onChange={(e) =>
                handleChangeThreshold("IN_APP", e.target.value as NotificationSeverity)
              }
              className="rounded-xl border border-border/40 bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] outline-none focus:border-primary/50 disabled:opacity-50"
            >
              <option value="LOW">
                {isVietnamese ? "Mức thấp (LOW) — Nhận tất cả thông báo" : "LOW — Receive all alerts"}
              </option>
              <option value="NORMAL">
                {isVietnamese ? "Bình thường (NORMAL) — Bỏ qua mức thấp" : "NORMAL — Ignore low alerts"}
              </option>
              <option value="HIGH">
                {isVietnamese ? "Mức cao (HIGH) — Chỉ nhận cảnh báo nguy cơ cao" : "HIGH — High risk & critical only"}
              </option>
              <option value="CRITICAL">
                {isVietnamese ? "Khẩn cấp (CRITICAL) — Chỉ nhận vi phạm đặc biệt" : "CRITICAL — Critical emergencies only"}
              </option>
            </select>
          </div>
        </div>

        {/* 2. Kênh Thư điện tử (Email) */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border/40 bg-background p-4 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/40 bg-background text-primary shadow-[2px_2px_6px_var(--shadow-dark),-2px_-2px_6px_var(--shadow-light)]">
                <Mail className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  {t("notifications.channel.EMAIL")}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t("notifications.preferences.emailDesc")}
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            <button
              type="button"
              role="switch"
              aria-checked={emailPref.enabled}
              disabled={isLoading || updateMutation.isPending}
              onClick={() => handleToggleChannel("EMAIL", emailPref.enabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                emailPref.enabled
                  ? "bg-primary shadow-[inset_1px_1px_3px_rgba(0,0,0,0.3)]"
                  : "bg-muted shadow-[inset_2px_2px_4px_var(--shadow-dark)]"
              }`}
            >
              <span
                className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                  emailPref.enabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Threshold Selection */}
          <div className="flex flex-col gap-2 border-t border-border/20 pt-3 sm:flex-row sm:items-center sm:justify-between text-xs">
            <span className="font-semibold text-foreground">
              {t("notifications.preferences.threshold")}:
            </span>
            <select
              value={emailPref.severityThreshold}
              disabled={!emailPref.enabled || updateMutation.isPending}
              onChange={(e) =>
                handleChangeThreshold("EMAIL", e.target.value as NotificationSeverity)
              }
              className="rounded-xl border border-border/40 bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] outline-none focus:border-primary/50 disabled:opacity-50"
            >
              <option value="CRITICAL">
                {isVietnamese ? "Khẩn cấp (CRITICAL) — Khuyến nghị cho Email" : "CRITICAL — Recommended for Email"}
              </option>
              <option value="HIGH">
                {isVietnamese ? "Mức cao (HIGH) — Khẩn cấp & Mức cao" : "HIGH — Critical & High alerts"}
              </option>
              <option value="NORMAL">
                {isVietnamese ? "Bình thường (NORMAL) — Từ mức vừa trở lên" : "NORMAL — Medium & above"}
              </option>
              <option value="LOW">
                {isVietnamese ? "Mức thấp (LOW) — Mọi vi phạm (Dễ gây đầy hòm thư)" : "LOW — All alerts (May flood inbox)"}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
