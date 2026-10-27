"use client";

import { SlidersHorizontal, Bell, Mail, ShieldAlert, Check } from "lucide-react";
import {
  useNotificationPreferences,
  useUpdateNotificationPreference,
} from "@/hooks/notifications";
import { useLocale } from "@/providers/locale-provider";
import type { NotificationChannel, NotificationSeverity } from "@/types";

export function NotificationPreferencesCard({ className = "" }: { className?: string }) {
  const { t } = useLocale();
  const { data: preferences = [], isLoading } = useNotificationPreferences();
  const updateMutation = useUpdateNotificationPreference();

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

  return (
    <div
      className={`rounded-2xl border border-border/30 bg-background p-4 shadow-[6px_6px_15px_var(--shadow-dark),-6px_-6px_15px_var(--shadow-light)] sm:p-6 ${className}`}
    >
      {/* Header */}
      <div className="mb-6 flex items-start gap-3.5 border-b border-border/30 pb-4">
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

      {/* Anti Alert Fatigue Engine Explanatory Notice */}
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/[0.04] p-3.5 sm:p-4 text-xs leading-relaxed text-muted-foreground shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
        <ShieldAlert className="size-4 shrink-0 text-primary mt-0.5" />
        <div>
          <span className="font-bold text-foreground">
            {t("notifications.preferences.antiFatigueHelp")}
          </span>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Tại công trường xây dựng, việc đặt ngưỡng cho phép bạn chỉ nhận những vi phạm thực sự cần can thiệp khẩn cấp (như không đội mũ ở tầng cao, đi vào vùng nguy hiểm cấm) qua Email, tránh làm tràn ngập hòm thư điện tử.
          </p>
        </div>
      </div>

      {/* Preferences Channel Grid */}
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
              <option value="LOW">Mức thấp (LOW) — Nhận tất cả thông báo</option>
              <option value="NORMAL">Bình thường (NORMAL) — Bỏ qua mức thấp</option>
              <option value="HIGH">Mức cao (HIGH) — Chỉ nhận cảnh báo nguy cơ cao</option>
              <option value="CRITICAL">Khẩn cấp (CRITICAL) — Chỉ nhận vi phạm đặc biệt</option>
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
              <option value="CRITICAL">Khẩn cấp (CRITICAL) — Khuyến nghị cho Email</option>
              <option value="HIGH">Mức cao (HIGH) — Khẩn cấp & Mức cao</option>
              <option value="NORMAL">Bình thường (NORMAL) — Từ mức vừa trở lên</option>
              <option value="LOW">Mức thấp (LOW) — Mọi vi phạm (Dễ gây đầy hòm thư)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
