"use client";

import type { NotificationSeverity } from "@/types";

export type SoundPreset = "critical" | "warning" | "info" | "success" | "radio";

export interface SoundSettings {
  enabled: boolean;
  volume: number; // 0.0 to 1.0
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "HH:mm"
  quietHoursEnd: string; // "HH:mm"
  soundMap: {
    CRITICAL: SoundPreset;
    HIGH: SoundPreset;
    MEDIUM: SoundPreset;
    NORMAL: SoundPreset;
    LOW: SoundPreset;
  };
}

const STORAGE_KEY = "ppe_notification_sound_settings";

export const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  enabled: true,
  volume: 0.8,
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "06:00",
  soundMap: {
    CRITICAL: "critical",
    HIGH: "warning",
    MEDIUM: "warning",
    NORMAL: "info",
    LOW: "info",
  },
};

export const SOUND_PRESET_NAMES: Record<SoundPreset, { vi: string; en: string; description: { vi: string; en: string } }> = {
  critical: {
    vi: "Còi báo động khẩn cấp",
    en: "Emergency Siren",
    description: {
      vi: "Âm thanh còi báo hai tông dồn dập cho vi phạm nguy cơ cao",
      en: "Rapid two-tone alert warble for critical PPE violations",
    },
  },
  warning: {
    vi: "Chuông cảnh báo tam âm",
    en: "Triple Warning Chime",
    description: {
      vi: "Chuông ngân cảnh báo ba nốt tăng dần độ chú ý",
      en: "Harmonic rising chime requiring immediate operator attention",
    },
  },
  info: {
    vi: "Giọt nước thanh thoát",
    en: "Glass Bubble Pop",
    description: {
      vi: "Âm thanh nhẹ nhàng, êm dịu cho thông báo thường",
      en: "Gentle glassy tone for general system updates",
    },
  },
  success: {
    vi: "Hợp âm thành công",
    en: "Harmonic Success Chord",
    description: {
      vi: "Hợp âm tươi sáng khi sự cố được khắc phục hoặc gửi thành công",
      en: "Bright major chord for resolved incidents and success cues",
    },
  },
  radio: {
    vi: "Bộ đàm điều phối",
    en: "Walkie-talkie Radio Chirp",
    description: {
      vi: "Tiếng tút bộ đàm công trường cho tin phát toàn diện rộng",
      en: "Site walkie-talkie dispatch beep for broadcasts",
    },
  },
};

class SoundService {
  private audioCtx: AudioContext | null = null;
  private settings: SoundSettings = DEFAULT_SOUND_SETTINGS;
  private isClient = typeof window !== "undefined";

  constructor() {
    if (this.isClient) {
      this.loadSettings();
    }
  }

  /**
   * Khởi tạo hoặc kích hoạt AudioContext sau cử chỉ của người dùng
   */
  private getAudioContext(): AudioContext | null {
    if (!this.isClient) return null;
    if (!this.audioCtx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {
        // Trình duyệt có thể chặn nếu chưa có user gesture
      });
    }
    return this.audioCtx;
  }

  public getSettings(): SoundSettings {
    return { ...this.settings };
  }

  public saveSettings(newSettings: Partial<SoundSettings>): SoundSettings {
    this.settings = {
      ...this.settings,
      ...newSettings,
      soundMap: {
        ...this.settings.soundMap,
        ...(newSettings.soundMap || {}),
      },
    };
    if (this.isClient) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
        window.dispatchEvent(new CustomEvent("ppe-sound-settings-changed", { detail: this.settings }));
      } catch (e) {
        console.warn("[SoundService] Unable to save sound settings to localStorage", e);
      }
    }
    return this.getSettings();
  }

  private loadSettings(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.settings = {
          ...DEFAULT_SOUND_SETTINGS,
          ...parsed,
          soundMap: {
            ...DEFAULT_SOUND_SETTINGS.soundMap,
            ...(parsed.soundMap || {}),
          },
        };
      }
    } catch {
      this.settings = DEFAULT_SOUND_SETTINGS;
    }
  }

  /**
   * Kiểm tra xem hiện tại có đang trong khung giờ yên tĩnh hay không
   */
  public isInQuietHours(): boolean {
    if (!this.settings.quietHoursEnabled) return false;
    try {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const [startH, startM] = this.settings.quietHoursStart.split(":").map(Number);
      const [endH, endM] = this.settings.quietHoursEnd.split(":").map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      if (startMinutes <= endMinutes) {
        return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
      }
      // Vượt qua nửa đêm (VD: 22:00 -> 06:00)
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    } catch {
      return false;
    }
  }

  /**
   * Phát âm thanh tổng hợp cho một Preset
   */
  public playPreset(preset: SoundPreset, overrideVolume?: number): void {
    if (!this.settings.enabled) return;
    if (this.isInQuietHours() && preset !== "critical") return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    const targetVolume = Math.max(0, Math.min(1, overrideVolume ?? this.settings.volume));
    if (targetVolume <= 0) return;

    try {
      switch (preset) {
        case "critical":
          this.synthesizeCriticalSiren(ctx, targetVolume);
          break;
        case "warning":
          this.synthesizeWarningChime(ctx, targetVolume);
          break;
        case "info":
          this.synthesizeInfoPop(ctx, targetVolume);
          break;
        case "success":
          this.synthesizeSuccessChord(ctx, targetVolume);
          break;
        case "radio":
          this.synthesizeRadioChirp(ctx, targetVolume);
          break;
      }
    } catch (err) {
      console.warn("[SoundService] Failed to synthesize audio tone:", err);
    }
  }

  /**
   * Phát âm thanh theo mức độ nghiêm trọng của thông báo
   */
  public playAlertSound(severity?: NotificationSeverity | string, overrideVolume?: number): void {
    const sev = (severity || "NORMAL").toUpperCase() as NotificationSeverity;
    const preset = this.settings.soundMap[sev] || (sev === "CRITICAL" ? "critical" : sev === "HIGH" ? "warning" : "info");
    this.playPreset(preset, overrideVolume);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // BỘ TỔNG HỢP ÂM THANH CHÂN THỰC BẰNG WEB AUDIO API (SYNTHESIZERS)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Còi báo động khẩn cấp (Emergency Two-Tone Siren):
   * Dao động tuần hoàn dồn dập giữa 880Hz (A5) và 660Hz (E5) trong 0.7 giây
   */
  private synthesizeCriticalSiren(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.linearRampToValueAtTime(660, now + 0.15);
    osc.frequency.linearRampToValueAtTime(880, now + 0.3);
    osc.frequency.linearRampToValueAtTime(660, now + 0.45);
    osc.frequency.linearRampToValueAtTime(880, now + 0.6);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol * 0.45, now + 0.05);
    gain.gain.setValueAtTime(vol * 0.45, now + 0.55);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.8);
  }

  /**
   * Chuông cảnh báo tam âm (Triple Warning Chime):
   * Ba nốt tăng dần: D5 (587Hz) -> F#5 (740Hz) -> A5 (880Hz)
   */
  private synthesizeWarningChime(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    const freqs = [587.33, 739.99, 880.0];

    freqs.forEach((freq, idx) => {
      const noteTime = now + idx * 0.1;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0, noteTime);
      gain.gain.linearRampToValueAtTime(vol * 0.4, noteTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.4);
    });
  }

  /**
   * Giọt nước thanh thoát (Glass Bubble Pop):
   * Quét tần số êm dịu từ 523Hz lên 659Hz rồi tắt nhanh
   */
  private synthesizeInfoPop(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.exponentialRampToValueAtTime(784.0, now + 0.08);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol * 0.35, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  /**
   * Hợp âm thành công (Harmonic Success Chord):
   * Hợp âm Đô trưởng C5 (523Hz) + E5 (659Hz) + G5 (784Hz) + C6 (1046Hz)
   */
  private synthesizeSuccessChord(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.5];

    freqs.forEach((freq, idx) => {
      const delay = idx * 0.04;
      const noteTime = now + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0, noteTime);
      gain.gain.linearRampToValueAtTime(vol * 0.25, noteTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.65);
    });
  }

  /**
   * Bộ đàm điều phối (Walkie-talkie Radio Chirp):
   * Hai tiếng beep dứt khoát 950Hz và 1200Hz
   */
  private synthesizeRadioChirp(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;

    [
      { freq: 950, start: now, dur: 0.06 },
      { freq: 1200, start: now + 0.08, dur: 0.1 },
    ].forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(vol * 0.2, start + 0.01);
      gain.gain.setValueAtTime(vol * 0.2, start + dur - 0.01);
      gain.gain.linearRampToValueAtTime(0, start + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + dur + 0.02);
    });
  }
}

export const soundService = new SoundService();
