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
      className={`group/panel relative overflow-hidden space-y-6 rounded-2xl sm:rounded-3xl border border-white/80 bg-surface/95 p-4 sm:p-6 shadow-[12px_12px_28px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light)] transition-all duration-500 dark:border-white/[0.07] dark:bg-card/95 ${className}`}
    >
      {/* Ambient Radial Aura (Primary & Accent blend) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-28 -right-28 h-64 w-64 rounded-full bg-gradient-to-br from-primary/15 via-accent/10 to-transparent blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 -left-28 h-64 w-64 rounded-full bg-gradient-to-tr from-accent/15 via-primary/5 to-transparent blur-3xl"
      />

      {/* Specular Metallic Top Rim */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-10 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/60 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-24 top-[1.5px] h-[1px] bg-gradient-to-r from-transparent via-accent/40 to-transparent"
      />

      {/* Precision Corner Micro-Indicators */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-3.5 left-3.5 h-1 w-1 rounded-full bg-primary/40 shadow-[0_0_6px_hsl(var(--primary))]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-3.5 right-3.5 h-1 w-1 rounded-full bg-accent/40"
      />

      {/* ===================================================================== */}
      {/* 1. HEADER CARD                                                        */}
      {/* ===================================================================== */}
      <div className="relative flex items-start gap-3.5 pb-4.5">
        {/* Engraved Divider */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-border/80 to-transparent dark:via-white/[0.08]"
        />

        {/* Extruded Neumorphic Medallion */}
        <div className="relative flex size-11 sm:size-12 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-gradient-to-br from-surface-elevated to-surface shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)] dark:border-white/10 dark:from-card dark:to-background">
          <div className="absolute inset-1 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10" />
          <SlidersHorizontal className="relative size-5 text-primary drop-shadow-[0_2px_6px_hsl(var(--primary)/0.35)]" />
        </div>

        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
            {t("notifications.preferences.title")}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {t("notifications.preferences.subtitle")}
          </p>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. AUDIO NOTIFICATION ENGINE (TACTILE CONSOLE)                        */}
      {/* ===================================================================== */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[0.04] via-background/70 to-accent/[0.05] p-4 sm:p-5 shadow-[inset_5px_5px_12px_var(--shadow-dark),inset_-5px_-5px_12px_var(--shadow-light)] space-y-4.5">
        {/* Console Header & Master Switch */}
        <div className="relative flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between pb-3.5">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-border/60 to-transparent"
          />

          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-surface text-primary shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] dark:border-white/10 dark:bg-card">
              {soundEnabled ? (
                <Volume2 className="size-5 drop-shadow-[0_0_6px_hsl(var(--primary)/0.4)]" />
              ) : (
                <VolumeX className="size-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">
                  {isVietnamese ? "Bộ Âm Thanh Cảnh Báo Thông Báo" : "Notification Audio Alert Engine"}
                </h3>
                <span className="relative flex h-2 w-2">
                  {soundEnabled && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                  )}
                  <span
                    className={`relative inline-flex h-2 w-2 rounded-full ${
                      soundEnabled
                        ? "bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
                        : "bg-accent border border-primary/20"
                    }`}
                  />
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isVietnamese
                  ? "Phát âm thanh chuông đặc trưng khi có thông báo vi phạm PPE hoặc sự cố mới tới"
                  : "Play distinct acoustic cues when safety events or new alerts arrive"}
              </p>
            </div>
          </div>

          {/* Master Hardware Rocker Switch */}
          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto rounded-2xl border border-white/60 bg-surface/90 px-3 py-1.5 shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)] dark:border-white/10 dark:bg-card">
            <span
              className={`font-mono text-[11px] font-bold tracking-wider ${
                soundEnabled ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {soundEnabled ? (isVietnamese ? "ĐANG BẬT" : "ENABLED") : isVietnamese ? "ĐANG TẮT" : "MUTED"}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={soundEnabled}
              onClick={toggleSound}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                soundEnabled
                  ? "bg-gradient-to-r from-primary to-primary/85 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.35)]"
                  : "bg-background shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)]"
              }`}
            >
              <span
                className={`pointer-events-none flex size-5 items-center justify-center rounded-full bg-surface shadow-[2px_2px_5px_rgba(0,0,0,0.25)] transition-transform duration-300 dark:bg-white ${
                  soundEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full transition-colors ${
                    soundEnabled ? "bg-primary shadow-[0_0_5px_hsl(var(--primary))]" : "bg-muted-foreground/40"
                  }`}
                />
              </span>
            </button>
          </div>
        </div>

        {/* Volume Fader & Acoustic Test Pads */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          {/* Recessed Fader Track */}
          <div className="rounded-2xl border border-white/60 bg-surface/80 p-3 shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)] dark:border-white/[0.06] dark:bg-card/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span>{isVietnamese ? "Âm lượng cảnh báo" : "Master Volume"}</span>
              <span className="rounded-md border border-primary/20 bg-primary/[0.07] px-1.5 py-0.5 font-mono text-[11px] font-bold text-primary shadow-[inset_1px_1px_3px_var(--shadow-dark)]">
                {Math.round(soundVolume * 100)}%
              </span>
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

          {/* Tactile Acoustic Test Pads */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={!soundEnabled}
              onClick={() => playPreset("critical", soundVolume)}
              className="flex-1 rounded-2xl border border-primary/30 bg-surface py-2.5 px-3 text-xs font-bold text-primary shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] hover:bg-primary hover:text-primary-foreground hover:shadow-[0_4px_14px_hsl(var(--primary)/0.35)] transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 active:shadow-[inset_3px_3px_6px_var(--shadow-dark)]"
            >
              <Volume2 className="size-3.5" />
              <span>{isVietnamese ? "Thử Còi Khẩn cấp" : "Test Siren"}</span>
            </button>
            <button
              type="button"
              disabled={!soundEnabled}
              onClick={() => playPreset("warning", soundVolume)}
              className="flex-1 rounded-2xl border border-accent/50 bg-surface py-2.5 px-3 text-xs font-bold text-foreground shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 active:shadow-[inset_3px_3px_6px_var(--shadow-dark)] dark:border-white/10"
            >
              <Volume2 className="size-3.5 text-primary" />
              <span>{isVietnamese ? "Thử Chuông Tam âm" : "Test Chime"}</span>
            </button>
          </div>
        </div>

        {/* Severity Sound Matrix (4 Extruded Cards) */}
        <div className="relative pt-3.5 space-y-2.5">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-border/60 to-transparent"
          />

          <span className="text-xs font-bold text-foreground block">
            {isVietnamese ? "Tùy biến âm thanh theo mức độ nghiêm trọng:" : "Severity Sound Mapping:"}
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. CRITICAL */}
            <div className="rounded-2xl border border-primary/30 bg-surface/95 p-3 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] dark:bg-card/90 space-y-2">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="size-2 shrink-0 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary))]" />
                  <span className="text-xs font-bold text-primary truncate">
                    {isVietnamese ? "Khẩn cấp (CRITICAL)" : "CRITICAL"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => playPreset(soundSettings.soundMap.CRITICAL, soundVolume)}
                  className="rounded-lg border border-primary/20 bg-primary/[0.07] px-2 py-0.5 text-[10px] font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-colors shrink-0"
                >
                  {isVietnamese ? "Nghe thử" : "Test"}
                </button>
              </div>
              <select
                value={soundSettings.soundMap.CRITICAL}
                onChange={(e) => handleSoundMapChange("CRITICAL", e.target.value as SoundPreset)}
                className="w-full rounded-xl border border-black/[0.05] bg-background/80 px-2.5 py-1.5 text-xs font-semibold text-foreground shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] outline-none focus:border-primary/50 dark:border-white/[0.06]"
              >
                <option value="critical">{isVietnamese ? "Còi khẩn cấp (Siren)" : "Emergency Siren"}</option>
                <option value="warning">{isVietnamese ? "Chuông tam âm" : "Tri-tone Chime"}</option>
                <option value="radio">{isVietnamese ? "Bộ đàm điều phối" : "Dispatch Radio"}</option>
                <option value="info">{isVietnamese ? "Giọt nước thanh thoát" : "Glass Pop"}</option>
              </select>
            </div>

            {/* 2. HIGH */}
            <div className="rounded-2xl border border-accent/50 bg-surface/95 p-3 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] dark:border-white/10 dark:bg-card/90 space-y-2">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="size-2 shrink-0 rounded-full bg-gradient-to-tr from-primary to-accent" />
                  <span className="text-xs font-bold text-foreground truncate">
                    {isVietnamese ? "Mức cao (HIGH)" : "HIGH"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => playPreset(soundSettings.soundMap.HIGH, soundVolume)}
                  className="rounded-lg border border-primary/20 bg-primary/[0.07] px-2 py-0.5 text-[10px] font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-colors shrink-0"
                >
                  {isVietnamese ? "Nghe thử" : "Test"}
                </button>
              </div>
              <select
                value={soundSettings.soundMap.HIGH}
                onChange={(e) => handleSoundMapChange("HIGH", e.target.value as SoundPreset)}
                className="w-full rounded-xl border border-black/[0.05] bg-background/80 px-2.5 py-1.5 text-xs font-semibold text-foreground shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] outline-none focus:border-primary/50 dark:border-white/[0.06]"
              >
                <option value="warning">{isVietnamese ? "Chuông tam âm" : "Tri-tone Chime"}</option>
                <option value="critical">{isVietnamese ? "Còi khẩn cấp (Siren)" : "Emergency Siren"}</option>
                <option value="radio">{isVietnamese ? "Bộ đàm điều phối" : "Dispatch Radio"}</option>
                <option value="info">{isVietnamese ? "Giọt nước thanh thoát" : "Glass Pop"}</option>
              </select>
            </div>

            {/* 3. NORMAL */}
            <div className="rounded-2xl border border-white/70 bg-surface/95 p-3 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] dark:border-white/[0.07] dark:bg-card/90 space-y-2">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="size-2 shrink-0 rounded-full bg-primary/50" />
                  <span className="text-xs font-bold text-foreground/90 truncate">
                    {isVietnamese ? "Bình thường (NORMAL)" : "NORMAL"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => playPreset(soundSettings.soundMap.NORMAL, soundVolume)}
                  className="rounded-lg border border-primary/20 bg-primary/[0.07] px-2 py-0.5 text-[10px] font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-colors shrink-0"
                >
                  {isVietnamese ? "Nghe thử" : "Test"}
                </button>
              </div>
              <select
                value={soundSettings.soundMap.NORMAL}
                onChange={(e) => handleSoundMapChange("NORMAL", e.target.value as SoundPreset)}
                className="w-full rounded-xl border border-black/[0.05] bg-background/80 px-2.5 py-1.5 text-xs font-semibold text-foreground shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] outline-none focus:border-primary/50 dark:border-white/[0.06]"
              >
                <option value="info">{isVietnamese ? "Giọt nước thanh thoát" : "Glass Pop"}</option>
                <option value="success">{isVietnamese ? "Hợp âm thành công" : "Success Chord"}</option>
                <option value="warning">{isVietnamese ? "Chuông tam âm" : "Tri-tone Chime"}</option>
              </select>
            </div>

            {/* 4. LOW */}
            <div className="rounded-2xl border border-white/70 bg-surface/95 p-3 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] dark:border-white/[0.07] dark:bg-card/90 space-y-2">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="size-2 shrink-0 rounded-full bg-accent border border-primary/20" />
                  <span className="text-xs font-bold text-muted-foreground truncate">
                    {isVietnamese ? "Mức thấp (LOW)" : "LOW"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => playPreset(soundSettings.soundMap.LOW, soundVolume)}
                  className="rounded-lg border border-primary/20 bg-primary/[0.07] px-2 py-0.5 text-[10px] font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-colors shrink-0"
                >
                  {isVietnamese ? "Nghe thử" : "Test"}
                </button>
              </div>
              <select
                value={soundSettings.soundMap.LOW}
                onChange={(e) => handleSoundMapChange("LOW", e.target.value as SoundPreset)}
                className="w-full rounded-xl border border-black/[0.05] bg-background/80 px-2.5 py-1.5 text-xs font-semibold text-foreground shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] outline-none focus:border-primary/50 dark:border-white/[0.06]"
              >
                <option value="info">{isVietnamese ? "Giọt nước thanh thoát" : "Glass Pop"}</option>
                <option value="success">{isVietnamese ? "Hợp âm thành công" : "Success Chord"}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quiet Hours / DND Bar */}
        <div className="relative pt-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-border/60 to-transparent"
          />

          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-white/60 bg-surface text-primary shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] dark:border-white/10 dark:bg-card">
              <Clock className="size-4" />
            </div>
            <div>
              <span className="font-bold text-foreground">
                {isVietnamese ? "Khung giờ yên tĩnh (DND)" : "Quiet Hours / DND"}
              </span>
              <p className="text-[11px] text-muted-foreground">
                {isVietnamese
                  ? "Tắt âm thanh thông thường trong khung giờ nghỉ ngơi (chỉ phát còi cho sự cố Khẩn cấp)"
                  : "Mutes non-critical notification sounds during selected off-hours"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              role="switch"
              aria-checked={soundSettings.quietHoursEnabled}
              onClick={() =>
                updateSoundSettings({ quietHoursEnabled: !soundSettings.quietHoursEnabled })
              }
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-all duration-300 ${
                soundSettings.quietHoursEnabled
                  ? "bg-primary shadow-[inset_1px_1px_3px_rgba(0,0,0,0.3)]"
                  : "bg-background shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]"
              }`}
            >
              <span
                className={`pointer-events-none inline-block size-4 transform rounded-full bg-surface shadow transition-transform duration-300 dark:bg-white ${
                  soundSettings.quietHoursEnabled ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>

            {soundSettings.quietHoursEnabled && (
              <div className="flex items-center gap-1.5 rounded-xl border border-black/[0.05] bg-background/80 px-2 py-1 font-mono text-xs shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] dark:border-white/[0.06]">
                <input
                  type="time"
                  value={soundSettings.quietHoursStart}
                  onChange={(e) => updateSoundSettings({ quietHoursStart: e.target.value })}
                  className="bg-transparent text-foreground outline-none"
                />
                <span className="text-primary font-bold">→</span>
                <input
                  type="time"
                  value={soundSettings.quietHoursEnd}
                  onChange={(e) => updateSoundSettings({ quietHoursEnd: e.target.value })}
                  className="bg-transparent text-foreground outline-none"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. ANTI ALERT FATIGUE ENGINE PLAQUE                                   */}
      {/* ===================================================================== */}
      <div className="flex items-start gap-3.5 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/[0.06] via-background/70 to-accent/[0.08] p-4 text-xs leading-relaxed text-muted-foreground shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_var(--shadow-light)]">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)]">
          <ShieldAlert className="size-4.5" />
        </div>
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

      {/* ===================================================================== */}
      {/* 4. PREFERENCES CHANNEL GRID (EXTRUDED CARDS)                          */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 1. Kênh Thông báo trên Web (In-App) */}
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-white/75 bg-surface/95 p-4 sm:p-5 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)] transition-all hover:border-primary/25 dark:border-white/[0.07] dark:bg-card/90">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/15 to-accent/10 text-primary shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]">
                <Bell className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  {t("notifications.channel.IN_APP")}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("notifications.preferences.inAppDesc")}
                </p>
              </div>
            </div>

            {/* Tactile Toggle Switch */}
            <button
              type="button"
              role="switch"
              aria-checked={inAppPref.enabled}
              disabled={isLoading || updateMutation.isPending}
              onClick={() => handleToggleChannel("IN_APP", inAppPref.enabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 ${
                inAppPref.enabled
                  ? "bg-gradient-to-r from-primary to-primary/85 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.35)]"
                  : "bg-background shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)]"
              }`}
            >
              <span
                className={`pointer-events-none flex size-5 items-center justify-center rounded-full bg-surface shadow-[2px_2px_5px_rgba(0,0,0,0.25)] transition-transform duration-300 dark:bg-white ${
                  inAppPref.enabled ? "translate-x-5" : "translate-x-0"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    inAppPref.enabled ? "bg-primary shadow-[0_0_5px_hsl(var(--primary))]" : "bg-muted-foreground/40"
                  }`}
                />
              </span>
            </button>
          </div>

          {/* Threshold Selection */}
          <div className="flex flex-col gap-2 border-t border-border/30 pt-3.5 text-xs">
            <span className="font-semibold text-foreground">
              {t("notifications.preferences.threshold")}:
            </span>
            <select
              value={inAppPref.severityThreshold}
              disabled={!inAppPref.enabled || updateMutation.isPending}
              onChange={(e) =>
                handleChangeThreshold("IN_APP", e.target.value as NotificationSeverity)
              }
              className="w-full rounded-xl border border-black/[0.05] bg-background/80 px-3 py-2 text-xs font-semibold text-foreground shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)] outline-none focus:border-primary/50 disabled:opacity-50 dark:border-white/[0.06]"
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
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-white/75 bg-surface/95 p-4 sm:p-5 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)] transition-all hover:border-primary/25 dark:border-white/[0.07] dark:bg-card/90">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-accent/40 bg-gradient-to-br from-accent/20 to-primary/10 text-primary shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]">
                <Mail className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  {t("notifications.channel.EMAIL")}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("notifications.preferences.emailDesc")}
                </p>
              </div>
            </div>

            {/* Tactile Toggle Switch */}
            <button
              type="button"
              role="switch"
              aria-checked={emailPref.enabled}
              disabled={isLoading || updateMutation.isPending}
              onClick={() => handleToggleChannel("EMAIL", emailPref.enabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 ${
                emailPref.enabled
                  ? "bg-gradient-to-r from-primary to-primary/85 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.35)]"
                  : "bg-background shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)]"
              }`}
            >
              <span
                className={`pointer-events-none flex size-5 items-center justify-center rounded-full bg-surface shadow-[2px_2px_5px_rgba(0,0,0,0.25)] transition-transform duration-300 dark:bg-white ${
                  emailPref.enabled ? "translate-x-5" : "translate-x-0"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    emailPref.enabled ? "bg-primary shadow-[0_0_5px_hsl(var(--primary))]" : "bg-muted-foreground/40"
                  }`}
                />
              </span>
            </button>
          </div>

          {/* Threshold Selection */}
          <div className="flex flex-col gap-2 border-t border-border/30 pt-3.5 text-xs">
            <span className="font-semibold text-foreground">
              {t("notifications.preferences.threshold")}:
            </span>
            <select
              value={emailPref.severityThreshold}
              disabled={!emailPref.enabled || updateMutation.isPending}
              onChange={(e) =>
                handleChangeThreshold("EMAIL", e.target.value as NotificationSeverity)
              }
              className="w-full rounded-xl border border-black/[0.05] bg-background/80 px-3 py-2 text-xs font-semibold text-foreground shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)] outline-none focus:border-primary/50 disabled:opacity-50 dark:border-white/[0.06]"
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
