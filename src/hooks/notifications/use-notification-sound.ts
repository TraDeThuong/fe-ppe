"use client";

import { useEffect, useState, useCallback, useContext } from "react";
import { soundService, type SoundPreset, type SoundSettings } from "@/services/sound.service";
import { AuthContext } from "@/contexts/AuthContext";
import type { NotificationSeverity } from "@/types";

export function useNotificationSound() {
  const authCtx = useContext(AuthContext);
  const userId = authCtx?.user?.id;

  const [settings, setSettings] = useState<SoundSettings>(() => soundService.getSettings());

  useEffect(() => {
    if (userId) {
      soundService.setUserId(userId);
      setSettings(soundService.getSettings());
    }
  }, [userId]);

  useEffect(() => {
    const handleSettingsChanged = (e: Event) => {
      const customEvent = e as CustomEvent<SoundSettings>;
      if (customEvent.detail) {
        setSettings(customEvent.detail);
      } else {
        setSettings(soundService.getSettings());
      }
    };

    window.addEventListener("ppe-sound-settings-changed", handleSettingsChanged);
    return () => {
      window.removeEventListener("ppe-sound-settings-changed", handleSettingsChanged);
    };
  }, []);

  const playAlert = useCallback((severity?: NotificationSeverity | string) => {
    soundService.playAlertSound(severity);
  }, []);

  const playPreset = useCallback((preset: SoundPreset, volume?: number) => {
    soundService.playPreset(preset, volume);
  }, []);

  const updateSettings = useCallback((newSettings: Partial<SoundSettings>) => {
    const updated = soundService.saveSettings(newSettings);
    setSettings(updated);
  }, []);

  const toggleSound = useCallback(() => {
    const updated = soundService.saveSettings({ enabled: !settings.enabled });
    setSettings(updated);
  }, [settings.enabled]);

  return {
    settings,
    enabled: settings.enabled,
    volume: settings.volume,
    playAlert,
    playPreset,
    updateSettings,
    toggleSound,
    isInQuietHours: soundService.isInQuietHours(),
  };
}
