"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Clock,
  Globe2,
  Power,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/form/selection-controls/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale } from "@/providers/locale-provider";
import type { MaintenanceConfig } from "@/types";

export interface MaintenanceKpiSummaryProps {
  config?: MaintenanceConfig | null;
  loading?: boolean;
  onToggleSwitch?: (checked: boolean) => void;
  isSwitchDisabled?: boolean;
}

function formatCompactDateTime(iso: string | null | undefined, locale: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function MaintenanceKpiSummary({
  config,
  loading = false,
  onToggleSwitch,
  isSwitchDisabled = false,
}: MaintenanceKpiSummaryProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const isEnabled = Boolean(config?.enabled);
  const status = config?.status || "ONLINE";
  const isReadOnly = isEnabled && status === "READ_ONLY";

  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    setNowMs(Date.now());
    if (!isEnabled || !config?.estimatedEndAt) return;

    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 30_000);

    return () => clearInterval(timer);
  }, [isEnabled, config?.estimatedEndAt]);

  const scheduleSummary = useMemo(() => {
    const startFormatted = formatCompactDateTime(config?.startAt, locale);
    const endFormatted = formatCompactDateTime(config?.estimatedEndAt, locale);

    if (isEnabled) {
      if (config?.estimatedEndAt && nowMs !== null) {
        const diffMs = new Date(config.estimatedEndAt).getTime() - nowMs;
        if (!Number.isNaN(diffMs)) {
          if (diffMs <= 0) {
            return {
              primary: isVietnamese ? "Đã quá hạn dự kiến" : "Past estimated end",
              secondary: endFormatted
                ? `${isVietnamese ? "Mốc" : "Target"}: ${endFormatted}`
                : null,
              isOverdue: true,
            };
          }
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          const remaining = hours > 0 ? `~${hours}h ${mins}m` : `~${Math.max(1, mins)}m`;
          return {
            primary: isVietnamese ? `Còn ${remaining}` : `${remaining} left`,
            secondary: endFormatted
              ? `${isVietnamese ? "Đến" : "Until"} ${endFormatted}`
              : null,
            isOverdue: false,
          };
        }
      }

      return {
        primary: isVietnamese ? "Không giới hạn" : "Indefinite",
        secondary: startFormatted
          ? `${isVietnamese ? "Bắt đầu" : "Since"} ${startFormatted}`
          : null,
        isOverdue: false,
      };
    }

    if (startFormatted && endFormatted) {
      return {
        primary: `${startFormatted} → ${endFormatted}`,
        secondary: isVietnamese ? "Lịch cấu hình sẵn" : "Scheduled window",
        isOverdue: false,
      };
    }

    if (endFormatted || startFormatted) {
      return {
        primary: endFormatted ?? startFormatted!,
        secondary: isVietnamese ? "Lịch cấu hình sẵn" : "Scheduled time",
        isOverdue: false,
      };
    }

    return {
      primary: isVietnamese ? "Chưa đặt lịch" : "No schedule",
      secondary: isVietnamese ? "Hoạt động bình thường" : "Standard operation",
      isOverdue: false,
    };
  }, [config?.startAt, config?.estimatedEndAt, isEnabled, isVietnamese, locale, nowMs]);

  const bypassRoles = useMemo(() => {
    if (!Array.isArray(config?.bypassRoles)) return ["ADMIN"];
    return config.bypassRoles.filter(Boolean);
  }, [config?.bypassRoles]);

  const bypassIps = useMemo(() => {
    if (!Array.isArray(config?.bypassIps)) return [];
    return config.bypassIps.filter(Boolean);
  }, [config?.bypassIps]);

  const statusTone = isEnabled
    ? isReadOnly
      ? {
        badgeVariant: "warning" as const,
        badgeText: t("maintenance.badge.readOnly"),
        Icon: AlertTriangle,
        summaryText: isVietnamese
          ? "Đang bật chế độ chỉ đọc: cho phép xem dữ liệu, chặn thêm/sửa/xóa."
          : "Read-only mode active: browsing allowed, write actions blocked.",
      }
      : {
        badgeVariant: "danger" as const,
        badgeText: t("maintenance.badge.active"),
        Icon: ShieldAlert,
        summaryText: t("maintenance.switch.activeDesc"),
      }
    : {
      badgeVariant: "success" as const,
      badgeText: t("maintenance.badge.online"),
      Icon: ShieldCheck,
      summaryText: t("maintenance.switch.inactiveDesc"),
    };

  const StatusIcon = onToggleSwitch ? Power : statusTone.Icon;
  const visibleRoles = bypassRoles.slice(0, 3);
  const extraRolesCount = Math.max(0, bypassRoles.length - visibleRoles.length);
  const visibleIps = bypassIps.slice(0, 2);
  const extraIpsCount = Math.max(0, bypassIps.length - visibleIps.length);

  if (loading) {
    return (
      <section
        aria-label={t("maintenance.switch.label")}
        className="rounded-2xl border border-border/40 bg-background p-4 shadow-[6px_6px_15px_var(--shadow-dark),-6px_-6px_15px_var(--shadow-light)] sm:p-5"
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5">
              <Skeleton className="h-12 w-12 shrink-0" rounded="xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-52" />
                <Skeleton className="h-3 w-72" />
              </div>
            </div>
            {onToggleSwitch && <Skeleton className="h-11 w-full sm:w-40" rounded="xl" />}
          </div>
          <Skeleton className="h-16 w-full" rounded="xl" />
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label={t("maintenance.switch.label")}
      className={`relative overflow-hidden rounded-[26px] sm:rounded-[32px] border bg-background p-1.5 transition-all duration-300 ${isEnabled
          ? isReadOnly
            ? "border-amber-500/50 shadow-[10px_10px_24px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light)]"
            : "border-rose-500/50 shadow-[10px_10px_24px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light)]"
          : "border-white/80 shadow-[10px_10px_24px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light)] dark:border-white/10"
        }`}
    >
      {/* INNER MACHINED BEZEL SHELL (Clean Solid Neumorphic Surface) */}
      <div className="relative overflow-hidden rounded-[22px] sm:rounded-[27px] border border-[var(--shadow-dark)]/15 bg-background p-4 sm:p-6">
        {/* Top Specular Laser Rim (Crisp solid gradient line without blur) */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-8 top-0 h-[2.5px] rounded-full bg-gradient-to-r from-transparent to-transparent transition-all duration-300 ${isEnabled
              ? isReadOnly
                ? "via-amber-500"
                : "via-rose-500"
              : "via-primary"
            }`}
        />

        <div className="relative space-y-4">
          {/* ================= TOP ROW: STATUS REACTOR & MASTER SWITCH ================= */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Left: Multi-tier Icon Pod + High-Contrast Status Banner */}
            <div className="flex min-w-0 items-start sm:items-center gap-4">
              {/* Dual-tier Neumorphic Icon Housing */}
              <div
                className={`relative flex h-14 w-14 sm:h-15 sm:w-15 shrink-0 items-center justify-center rounded-[20px] border bg-background shadow-[6px_6px_12px_var(--shadow-dark),-6px_-6px_12px_var(--shadow-light)] transition-all duration-300 ${isEnabled
                    ? isReadOnly
                      ? "border-amber-500/45"
                      : "border-rose-500/45"
                    : "border-white/85 dark:border-white/10"
                  }`}
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-background shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] transition-colors duration-300 ${isEnabled
                      ? isReadOnly
                        ? "text-amber-500"
                        : "text-rose-500"
                      : "text-primary"
                    }`}
                >
                  <StatusIcon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.2} />
                </div>

                {/* Live Radar Beacon */}
                <span
                  aria-hidden="true"
                  className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center"
                >
                  <span
                    className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-80 ${isEnabled
                        ? isReadOnly
                          ? "bg-amber-400"
                          : "bg-rose-400"
                        : "bg-emerald-400"
                      }`}
                  />
                  <span
                    className={`relative inline-flex h-3 w-3 rounded-full border-2 border-background ${isEnabled
                        ? isReadOnly
                          ? "bg-amber-500"
                          : "bg-rose-500"
                        : "bg-emerald-500"
                      }`}
                  />
                </span>
              </div>

              {/* Title + Operational Mode Badge + Summary */}
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-foreground">
                    {t("maintenance.switch.label")}
                  </h3>

                  <Badge
                    variant={statusTone.badgeVariant}
                    size="sm"
                    indicator="dot"
                    className="font-bold"
                  >
                    {statusTone.badgeText}
                  </Badge>
                </div>

                <p className="max-w-2xl text-xs sm:text-[13px] font-medium leading-relaxed text-muted-foreground">
                  {statusTone.summaryText}
                </p>
              </div>
            </div>

            {/* Right: Recessed Tactile Master Switch Control Box */}
            {onToggleSwitch && (
              <div
                className={`flex shrink-0 items-center justify-between gap-4 rounded-[20px] border bg-background px-4 py-3 shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_var(--shadow-light)] transition-all duration-300 sm:min-w-[195px] ${isEnabled
                    ? isReadOnly
                      ? "border-amber-500/45"
                      : "border-rose-500/45"
                    : "border-white/50 dark:border-white/5"
                  }`}
              >
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                    {isVietnamese ? "Trạng thái kích hoạt" : "Master Control"}
                  </span>
                  <span
                    className={`mt-0.5 font-mono text-xs font-black uppercase tracking-wider ${isEnabled
                        ? isReadOnly
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-rose-600 dark:text-rose-400"
                        : "text-emerald-600 dark:text-emerald-400"
                      }`}
                  >
                    {isEnabled
                      ? isVietnamese
                        ? "● ĐANG BẬT (ON)"
                        : "● ENABLED"
                      : isVietnamese
                        ? "○ ĐANG TẮT (OFF)"
                        : "○ DISABLED"}
                  </span>
                </div>

                {/* Extruded Switch Housing */}
                <div className="flex items-center justify-center rounded-full border border-white/75 bg-background p-1 shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] dark:border-white/10">
                  <Switch
                    size="lg"
                    checked={isEnabled}
                    onCheckedChange={onToggleSwitch}
                    disabled={isSwitchDisabled}
                    aria-label={t("maintenance.switch.label")}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ================= BOTTOM TELEMETRY TRAY: 3 RECESSED MODULES ================= */}
          <div className="rounded-[20px] border border-white/45 bg-background p-2 shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_var(--shadow-light)] dark:border-white/5">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-2.5">
              {/* 1. Schedule / Remaining Time */}
              <div className="flex flex-col justify-center gap-1.5 rounded-2xl border border-white/70 bg-background px-3.5 py-2.5 shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] dark:border-white/10">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-background text-primary shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]">
                    <Clock className="h-3 w-3 shrink-0" />
                  </span>
                  <span className="truncate">{t("maintenance.kpi.timeTitle")}</span>
                </div>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 pl-0.5">
                  <span
                    className={`truncate text-xs font-extrabold ${scheduleSummary.isOverdue
                        ? "text-rose-600 dark:text-rose-400"
                        : isEnabled
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-foreground"
                      }`}
                  >
                    {scheduleSummary.primary}
                  </span>
                  {scheduleSummary.secondary && (
                    <span className="truncate text-[10px] font-medium text-muted-foreground">
                      · {scheduleSummary.secondary}
                    </span>
                  )}
                </div>
              </div>

              {/* 2. Bypassed Roles */}
              <div className="flex flex-col justify-center gap-1.5 rounded-2xl border border-white/70 bg-background px-3.5 py-2.5 shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] dark:border-white/10">
                <div className="flex items-center justify-between gap-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  <span className="flex items-center gap-1.5 truncate">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-background text-primary shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]">
                      <Shield className="h-3 w-3 shrink-0" />
                    </span>
                    <span className="truncate">{t("maintenance.kpi.rolesTitle")}</span>
                  </span>
                  <span className="rounded-full bg-background px-2 py-0.5 font-mono text-[10px] font-black text-primary shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]">
                    {bypassRoles.length}
                  </span>
                </div>

                {bypassRoles.length > 0 ? (
                  <div
                    className="flex flex-wrap items-center gap-1 pl-0.5"
                    title={bypassRoles.join(", ")}
                  >
                    {visibleRoles.map((role) => (
                      <span
                        key={role}
                        className="inline-flex items-center rounded-lg border border-primary/30 bg-background px-2 py-0.5 text-[10px] font-extrabold text-primary shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]"
                      >
                        {role}
                      </span>
                    ))}
                    {extraRolesCount > 0 && (
                      <span className="inline-flex items-center rounded-lg border border-white/60 bg-background px-1.5 py-0.5 font-mono text-[10px] font-bold text-muted-foreground shadow-[inset_1px_1px_2px_var(--shadow-dark)] dark:border-white/10">
                        +{extraRolesCount}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="pl-0.5 text-xs font-medium text-muted-foreground">
                    {isVietnamese ? "Không có" : "None"}
                  </span>
                )}
              </div>

              {/* 3. IP Whitelist */}
              <div className="flex flex-col justify-center gap-1.5 rounded-2xl border border-white/70 bg-background px-3.5 py-2.5 shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] dark:border-white/10">
                <div className="flex items-center justify-between gap-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  <span className="flex items-center gap-1.5 truncate">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-background text-accent shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]">
                      <Globe2 className="h-3 w-3 shrink-0" />
                    </span>
                    <span className="truncate">
                      {isVietnamese ? "IP Miễn trừ" : "IP Whitelist"}
                    </span>
                  </span>
                  {bypassIps.length > 0 && (
                    <span className="rounded-full bg-background px-2 py-0.5 font-mono text-[10px] font-black text-accent shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]">
                      {bypassIps.length}
                    </span>
                  )}
                </div>

                {bypassIps.length > 0 ? (
                  <div
                    className="flex flex-wrap items-center gap-1 pl-0.5"
                    title={bypassIps.join(", ")}
                  >
                    {visibleIps.map((ip) => (
                      <span
                        key={ip}
                        className="inline-flex max-w-[135px] truncate rounded-lg border border-white/60 bg-background px-2 py-0.5 font-mono text-[10px] font-bold text-foreground shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)] dark:border-white/10"
                      >
                        {ip}
                      </span>
                    ))}
                    {extraIpsCount > 0 && (
                      <span className="inline-flex items-center rounded-lg border border-white/60 bg-background px-1.5 py-0.5 font-mono text-[10px] font-bold text-muted-foreground shadow-[inset_1px_1px_2px_var(--shadow-dark)] dark:border-white/10">
                        +{extraIpsCount}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="pl-0.5 text-xs font-medium text-muted-foreground">
                    {isVietnamese ? "Chưa cấu hình" : "Not configured"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
