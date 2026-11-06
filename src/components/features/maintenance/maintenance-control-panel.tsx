"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Clock,
  Database,
  Flame,
  Globe2,
  Power,
  RotateCcw,
  Save,
  Shield,
  ShieldAlert,
  Sparkles,
  Wrench,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Switch } from "@/components/ui/form/selection-controls/switch";
import { useLocale } from "@/providers/locale-provider";
import type {
  MaintenanceConfig,
  MaintenanceModeStatus,
  UpdateMaintenancePayload,
} from "@/types";

export interface MaintenanceControlPanelProps {
  config?: MaintenanceConfig | null;
  onEnable: (data?: any) => Promise<any>;
  onDisable: () => Promise<any>;
  onUpdate: (data: UpdateMaintenancePayload) => Promise<any>;
  isEnabling?: boolean;
  isDisabling?: boolean;
  isUpdating?: boolean;
}

const AVAILABLE_ROLES = ["ADMIN", "MANAGER", "SAFETY_MANAGER", "SAFETY_OFFICER", "USER"];

export function MaintenanceControlPanel({
  config,
  onEnable,
  onDisable,
  onUpdate,
  isEnabling = false,
  isDisabling = false,
  isUpdating = false,
}: MaintenanceControlPanelProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  // Form states
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<MaintenanceModeStatus>("MAINTENANCE");
  const [startAt, setStartAt] = useState("");
  const [estimatedEndAt, setEstimatedEndAt] = useState("");
  const [bypassRoles, setBypassRoles] = useState<string[]>(["ADMIN"]);
  const [bypassIpsStr, setBypassIpsStr] = useState("");

  // Dialog states
  const [confirmEnableOpen, setConfirmEnableOpen] = useState(false);
  const [confirmDisableOpen, setConfirmDisableOpen] = useState(false);

  const isEnabled = Boolean(config?.enabled);
  const isBusy = isEnabling || isDisabling || isUpdating;

  // Sync form with config data
  useEffect(() => {
    if (config) {
      setTitle(config.title || "");
      setMessage(config.message || "");
      setStatus(config.status || "MAINTENANCE");
      setBypassRoles(config.bypassRoles || ["ADMIN"]);
      setBypassIpsStr(config.bypassIps?.join(", ") || "");

      if (config.startAt) {
        try {
          const d = new Date(config.startAt);
          setStartAt(d.toISOString().slice(0, 16));
        } catch {
          setStartAt("");
        }
      } else {
        setStartAt("");
      }

      if (config.estimatedEndAt) {
        try {
          const d = new Date(config.estimatedEndAt);
          setEstimatedEndAt(d.toISOString().slice(0, 16));
        } catch {
          setEstimatedEndAt("");
        }
      } else {
        setEstimatedEndAt("");
      }
    }
  }, [config]);

  // Handle Switch Toggle
  const handleSwitchChange = (checked: boolean) => {
    if (checked) {
      setConfirmEnableOpen(true);
    } else {
      setConfirmDisableOpen(true);
    }
  };

  const handleConfirmEnable = async () => {
    const ips = bypassIpsStr
      .split(",")
      .map((ip) => ip.trim())
      .filter(Boolean);

    await onEnable({
      title: title.trim() || undefined,
      message: message.trim() || undefined,
      status: status === "ONLINE" ? "MAINTENANCE" : status,
      startAt: startAt ? new Date(startAt).toISOString() : new Date().toISOString(),
      estimatedEndAt: estimatedEndAt ? new Date(estimatedEndAt).toISOString() : null,
      bypassRoles,
      bypassIps: ips,
    });
    setConfirmEnableOpen(false);
  };

  const handleConfirmDisable = async () => {
    await onDisable();
    setConfirmDisableOpen(false);
  };

  const handleSaveConfig = async () => {
    const ips = bypassIpsStr
      .split(",")
      .map((ip) => ip.trim())
      .filter(Boolean);

    await onUpdate({
      title: title.trim(),
      message: message.trim(),
      status,
      startAt: startAt ? new Date(startAt).toISOString() : null,
      estimatedEndAt: estimatedEndAt ? new Date(estimatedEndAt).toISOString() : null,
      bypassRoles,
      bypassIps: ips,
    });
  };

  // Quick preset templates
  const applyPreset = (minutes: number, customTitle: string, customMessage: string, customStatus: MaintenanceModeStatus = "MAINTENANCE") => {
    const now = new Date();
    const end = new Date(now.getTime() + minutes * 60 * 1000);

    setStartAt(now.toISOString().slice(0, 16));
    setEstimatedEndAt(end.toISOString().slice(0, 16));
    setTitle(customTitle);
    setMessage(customMessage);
    setStatus(customStatus);
  };

  const toggleRole = (role: string) => {
    if (role === "ADMIN") return; // Admin is permanently locked
    setBypassRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };


  return (
    <div className="space-y-5">
      {/* ============================================================
          1. MASTER MAINTENANCE CONTROL
          ============================================================ */}
      <section
        className="
          relative overflow-hidden rounded-2xl border border-border/40
          bg-background p-4 sm:p-5
          shadow-[6px_6px_15px_var(--shadow-dark),-6px_-6px_15px_var(--shadow-light)]
        "
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Status information */}
          <div className="flex min-w-0 items-center gap-3.5">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-all duration-300 ${
                isEnabled
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-600 shadow-[inset_2px_2px_5px_rgba(244,63,94,0.18),inset_-2px_-2px_5px_rgba(255,255,255,0.45)] dark:text-rose-400"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 shadow-[inset_2px_2px_5px_rgba(16,185,129,0.18),inset_-2px_-2px_5px_rgba(255,255,255,0.45)] dark:text-emerald-400"
              }`}
            >
              <Power className="h-5 w-5" />
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-extrabold tracking-tight text-foreground sm:text-base">
                  {t("maintenance.switch.label")}
                </h3>

                <Badge
                  variant={
                    isEnabled
                      ? status === "READ_ONLY"
                        ? "warning"
                        : "danger"
                      : "success"
                  }
                  className="px-2.5 py-0.5 text-[10px] font-bold"
                >
                  {isEnabled
                    ? status === "READ_ONLY"
                      ? t("maintenance.badge.readOnly")
                      : t("maintenance.badge.active")
                    : t("maintenance.badge.online")}
                </Badge>
              </div>

              <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">
                {isEnabled
                  ? t("maintenance.switch.activeDesc")
                  : t("maintenance.switch.inactiveDesc")}
              </p>
            </div>
          </div>

          {/* Recessed Switch Area */}
          <div
            className="
              flex items-center justify-between gap-3 rounded-xl
              border border-border/30 bg-background/70 px-4 py-3
              shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)]
              sm:min-w-[150px] sm:justify-center
            "
          >
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              {isEnabled
                ? isVietnamese ? "Đang bật" : "Enabled"
                : isVietnamese ? "Đang tắt" : "Disabled"}
            </span>

            <Switch
              size="lg"
              checked={isEnabled}
              onCheckedChange={handleSwitchChange}
              disabled={isBusy}
              aria-label={t("maintenance.switch.label")}
            />
          </div>
        </div>
      </section>

      {/* ============================================================
          2. CONFIGURATION CONSOLE
          ============================================================ */}
      <section
        className="
          overflow-hidden rounded-2xl border border-border/40
          bg-background
          shadow-[6px_6px_15px_var(--shadow-dark),-6px_-6px_15px_var(--shadow-light)]
        "
      >
        {/* Section Header */}
        <div className="flex flex-col gap-4 border-b border-border/30 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div
              className="
                flex h-10 w-10 shrink-0 items-center justify-center rounded-xl
                border border-border/30 bg-background
                shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)]
              "
            >
              <Wrench className="h-4.5 w-4.5 text-primary" />
            </div>

            <div>
              <h3 className="text-sm font-extrabold tracking-tight text-foreground sm:text-base">
                {t("maintenance.control.title")}
              </h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {t("maintenance.control.desc")}
              </p>
            </div>
          </div>

          {/* Presets */}
          <div className="rounded-xl border border-border/30 bg-background/60 p-2.5 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
            <div className="mb-2 flex items-center gap-1.5 px-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                {t("maintenance.presets.title")}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  applyPreset(
                    30,
                    isVietnamese
                      ? "Bảo trì nâng cấp hệ thống định kỳ (30 phút)"
                      : "Scheduled 30-Minute Maintenance",
                    isVietnamese
                      ? "Hệ thống đang tiến hành nâng cấp hạ tầng mạng và cơ sở dữ liệu định kỳ. Thời gian dự kiến khoảng 30 phút."
                      : "The platform is undergoing scheduled routine network and database maintenance for 30 minutes.",
                    "MAINTENANCE",
                  )
                }
                className="
                  inline-flex items-center gap-1.5 rounded-lg
                  border border-border/40 bg-surface px-3 py-2
                  text-[11px] font-bold text-foreground
                  shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)]
                  transition-all duration-200
                  hover:-translate-y-0.5 hover:text-primary
                  hover:shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)]
                  active:translate-y-0
                  active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]
                "
              >
                <Clock className="h-3.5 w-3.5 text-primary" />
                30m
              </button>

              <button
                type="button"
                onClick={() =>
                  applyPreset(
                    60,
                    isVietnamese
                      ? "Nâng cấp cụm Model Trí tuệ Nhân tạo (AI)"
                      : "AI Inference Engine Maintenance",
                    isVietnamese
                      ? "Đang triển khai phiên bản mô hình AI phát hiện PPE mới với độ chính xác cao hơn. Dịch vụ AI tạm dừng trong 60 phút."
                      : "Upgrading AI safety detection models for enhanced precision. AI services are temporarily offline for 60 minutes.",
                    "MAINTENANCE",
                  )
                }
                className="
                  inline-flex items-center gap-1.5 rounded-lg
                  border border-border/40 bg-surface px-3 py-2
                  text-[11px] font-bold text-foreground
                  shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)]
                  transition-all duration-200
                  hover:-translate-y-0.5 hover:text-primary
                  hover:shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)]
                  active:translate-y-0
                  active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]
                "
              >
                <Flame className="h-3.5 w-3.5 text-amber-500" />
                1h AI
              </button>

              <button
                type="button"
                onClick={() =>
                  applyPreset(
                    45,
                    isVietnamese
                      ? "Sao lưu dữ liệu định kỳ — Chế độ chỉ đọc"
                      : "Database Backup (Read-Only Mode)",
                    isVietnamese
                      ? "Hệ thống đang tiến hành sao lưu toàn vẹn dữ liệu. Quý người dùng vẫn có thể xem báo cáo nhưng không thể chỉnh sửa."
                      : "Performing comprehensive database backup. Users can view data in read-only mode, but mutations are disabled.",
                    "READ_ONLY",
                  )
                }
                className="
                  inline-flex items-center gap-1.5 rounded-lg
                  border border-border/40 bg-surface px-3 py-2
                  text-[11px] font-bold text-foreground
                  shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)]
                  transition-all duration-200
                  hover:-translate-y-0.5 hover:text-primary
                  hover:shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)]
                  active:translate-y-0
                  active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]
                "
              >
                <Database className="h-3.5 w-3.5 text-blue-500" />
                {isVietnamese ? "Chỉ đọc" : "Read-only"}
              </button>
            </div>
          </div>
        </div>

        {/* Configuration Body */}
        <div className="space-y-5 p-4 sm:p-5">
          {/* --------------------------------------------------------
              A. MAINTENANCE MODE
              -------------------------------------------------------- */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-foreground">
                {t("maintenance.mode.label")}
              </label>
              <span className="text-[10px] text-muted-foreground">
                {isVietnamese ? "Chọn chế độ vận hành" : "Operating mode"}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Full Maintenance */}
              <label
                className={`group relative flex cursor-pointer items-start gap-3.5 overflow-hidden rounded-xl border p-3.5 transition-all duration-200 ${
                  status === "MAINTENANCE"
                    ? "border-rose-500/40 bg-rose-500/[0.045] shadow-[inset_3px_3px_7px_rgba(0,0,0,0.07),inset_-3px_-3px_7px_rgba(255,255,255,0.45)]"
                    : "border-border/30 bg-surface shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] hover:-translate-y-0.5"
                }`}
              >
                <input
                  type="radio"
                  name="maintenanceMode"
                  value="MAINTENANCE"
                  checked={status === "MAINTENANCE"}
                  onChange={() => setStatus("MAINTENANCE")}
                  className="mt-1 h-4 w-4 shrink-0 accent-rose-500 focus:ring-rose-500"
                />

                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 shrink-0 text-rose-500" />
                    <span className="text-xs font-extrabold text-foreground">
                      {isVietnamese ? "Bảo trì toàn diện" : "Full Maintenance"}
                    </span>
                  </div>

                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {t("maintenance.mode.maintenance")}
                  </p>
                </div>

                {status === "MAINTENANCE" && (
                  <div className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-rose-500/60" />
                )}
              </label>

              {/* Read Only */}
              <label
                className={`group relative flex cursor-pointer items-start gap-3.5 overflow-hidden rounded-xl border p-3.5 transition-all duration-200 ${
                  status === "READ_ONLY"
                    ? "border-amber-500/40 bg-amber-500/[0.045] shadow-[inset_3px_3px_7px_rgba(0,0,0,0.07),inset_-3px_-3px_7px_rgba(255,255,255,0.45)]"
                    : "border-border/30 bg-surface shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] hover:-translate-y-0.5"
                }`}
              >
                <input
                  type="radio"
                  name="maintenanceMode"
                  value="READ_ONLY"
                  checked={status === "READ_ONLY"}
                  onChange={() => setStatus("READ_ONLY")}
                  className="mt-1 h-4 w-4 shrink-0 accent-amber-500 focus:ring-amber-500"
                />

                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                    <span className="text-xs font-extrabold text-foreground">
                      {isVietnamese ? "Chỉ đọc (Read-Only)" : "Read-Only Mode"}
                    </span>
                  </div>

                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {t("maintenance.mode.readOnly")}
                  </p>
                </div>

                {status === "READ_ONLY" && (
                  <div className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-amber-500/60" />
                )}
              </label>
            </div>
          </div>

          {/* --------------------------------------------------------
              B. MAINTENANCE ANNOUNCEMENT
              -------------------------------------------------------- */}
          <div
            className="
              space-y-4 rounded-xl border border-border/30 bg-surface/40 p-3.5 sm:p-4
              shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]
            "
          >
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-background shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)]">
                <Wrench className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                {isVietnamese ? "Thông báo bảo trì" : "Maintenance Announcement"}
              </span>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-foreground">
                {t("maintenance.form.titleLabel")}
              </label>

              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("maintenance.form.titlePlaceholder")}
                className="
                  w-full rounded-lg border border-border/40 bg-background
                  px-3.5 py-2.5 text-sm text-foreground
                  shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]
                  transition-all placeholder:text-muted-foreground/60
                  focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/10
                "
              />
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-foreground">
                {t("maintenance.form.messageLabel")}
              </label>

              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("maintenance.form.messagePlaceholder")}
                className="
                  w-full resize-y rounded-lg border border-border/40 bg-background
                  px-3.5 py-3 text-sm leading-relaxed text-foreground
                  shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]
                  transition-all placeholder:text-muted-foreground/60
                  focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/10
                "
              />
            </div>
          </div>

          {/* --------------------------------------------------------
              C. MAINTENANCE SCHEDULE
              -------------------------------------------------------- */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-foreground">
                {isVietnamese ? "Lịch trình bảo trì" : "Maintenance Schedule"}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="min-w-0 space-y-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground">
                  {t("maintenance.form.startAt")}
                </label>

                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  className="
                    w-full min-w-0 rounded-lg border border-border/40 bg-surface
                    px-3 py-2.5 text-xs text-foreground
                    shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]
                    focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/10
                  "
                />
              </div>

              <div className="min-w-0 space-y-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground">
                  {t("maintenance.form.estimatedEndAt")}
                </label>

                <input
                  type="datetime-local"
                  value={estimatedEndAt}
                  onChange={(e) => setEstimatedEndAt(e.target.value)}
                  className="
                    w-full min-w-0 rounded-lg border border-border/40 bg-surface
                    px-3 py-2.5 text-xs text-foreground
                    shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]
                    focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/10
                  "
                />
              </div>
            </div>
          </div>

          {/* --------------------------------------------------------
              D. ACCESS EXCEPTIONS
              -------------------------------------------------------- */}
          <div
            className="
              space-y-4 rounded-xl border border-border/30 bg-surface/40 p-3.5 sm:p-4
              shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]
            "
          >
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-background shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)]">
                <Shield className="h-3.5 w-3.5 text-primary" />
              </div>

              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                {isVietnamese ? "Ngoại lệ truy cập" : "Access Exceptions"}
              </span>
            </div>

            {/* Bypass Roles */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-foreground">
                {t("maintenance.form.bypassRoles")}
              </label>

              <div className="flex flex-wrap gap-2">
                {AVAILABLE_ROLES.map((role) => {
                  const isSelected = bypassRoles.includes(role);
                  const isAdmin = role === "ADMIN";

                  return (
                    <button
                      key={role}
                      type="button"
                      disabled={isAdmin}
                      onClick={() => toggleRole(role)}
                      className={`
                        inline-flex items-center gap-1.5 rounded-lg border px-3 py-2
                        text-[11px] font-bold transition-all duration-200
                        ${
                          isSelected
                            ? "border-primary/40 bg-primary/10 text-primary shadow-[inset_2px_2px_4px_rgba(0,0,0,0.09),inset_-2px_-2px_4px_rgba(255,255,255,0.4)]"
                            : "border-border/40 bg-background text-muted-foreground shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] hover:text-foreground"
                        }
                        ${isAdmin ? "cursor-not-allowed opacity-80" : "cursor-pointer active:shadow-[inset_2px_2px_4px_var(--shadow-dark)]"}
                      `}
                    >
                      <Shield className="h-3.5 w-3.5" />
                      <span>{role}</span>

                      {isAdmin && (
                        <span className="text-[9px] font-medium text-primary/70">
                          ({isVietnamese ? "Mặc định" : "Default"})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bypass IPs */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-foreground">
                <Globe2 className="h-3.5 w-3.5 text-primary" />
                {t("maintenance.form.bypassIps")}
              </label>

              <input
                type="text"
                value={bypassIpsStr}
                onChange={(e) => setBypassIpsStr(e.target.value)}
                placeholder={t("maintenance.form.bypassIpsPlaceholder")}
                className="
                  w-full rounded-lg border border-border/40 bg-background
                  px-3.5 py-2.5 font-mono text-xs text-foreground
                  shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]
                  transition-all placeholder:font-sans placeholder:text-muted-foreground/60
                  focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/10
                "
              />
            </div>
          </div>

          {/* --------------------------------------------------------
              E. SAVE ACTION
              -------------------------------------------------------- */}
          <div className="flex flex-col-reverse gap-3 border-t border-border/30 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              {isVietnamese
                ? "Kiểm tra lại cấu hình trước khi lưu thay đổi."
                : "Review your configuration before saving changes."}
            </p>

            <Button
              variant="primary"
              onClick={handleSaveConfig}
              disabled={isBusy}
              className="
                gap-2 rounded-xl px-5
                shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)]
                transition-all hover:-translate-y-0.5
                hover:shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]
                active:translate-y-0
              "
            >
              <Save className="h-4 w-4" />
              {isUpdating
                ? t("maintenance.btn.saving")
                : t("maintenance.btn.saveConfig")}
            </Button>
          </div>
        </div>
      </section>

      {/* ============================================================
          3. CONFIRM DIALOGS
          ============================================================ */}
      <ConfirmDialog
        open={confirmEnableOpen}
        onClose={() => setConfirmEnableOpen(false)}
        onConfirm={handleConfirmEnable}
        title={t("maintenance.dialog.confirmEnableTitle")}
        description={t("maintenance.dialog.confirmEnableBody")}
        confirmText={t("maintenance.btn.enable")}
        cancelText={t("common.cancel")}
        variant="danger"
        loading={isEnabling}
      />

      <ConfirmDialog
        open={confirmDisableOpen}
        onClose={() => setConfirmDisableOpen(false)}
        onConfirm={handleConfirmDisable}
        title={t("maintenance.dialog.confirmDisableTitle")}
        description={t("maintenance.dialog.confirmDisableBody")}
        confirmText={t("maintenance.btn.disable")}
        cancelText={t("common.cancel")}
        variant="warning"
        loading={isDisabling}
      />
    </div>
  );
}