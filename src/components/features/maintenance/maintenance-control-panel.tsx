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
    <div className="space-y-6">
      {/* 1. MASTER TOGGLE SWITCH CARD */}
      <div className="rounded-2xl border border-border/40 bg-background p-5 shadow-[6px_6px_15px_var(--shadow-dark),-6px_-6px_15px_var(--shadow-light)] transition-all sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-all ${
                isEnabled
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-600 shadow-[inset_2px_2px_4px_rgba(244,63,94,0.2)] dark:text-rose-400"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 shadow-[inset_2px_2px_4px_rgba(16,185,129,0.2)] dark:text-emerald-400"
              }`}
            >
              <Power className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground sm:text-lg">
                  {t("maintenance.switch.label")}
                </h3>
                <Badge
                  variant={isEnabled ? (status === "READ_ONLY" ? "warning" : "danger") : "success"}
                  className="px-2.5 py-0.5 text-xs font-semibold"
                >
                  {isEnabled
                    ? status === "READ_ONLY"
                      ? t("maintenance.badge.readOnly")
                      : t("maintenance.badge.active")
                    : t("maintenance.badge.online")}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground sm:text-sm">
                {isEnabled
                  ? t("maintenance.switch.activeDesc")
                  : t("maintenance.switch.inactiveDesc")}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <Switch
              size="lg"
              checked={isEnabled}
              onCheckedChange={handleSwitchChange}
              disabled={isBusy}
              aria-label={t("maintenance.switch.label")}
            />
          </div>
        </div>
      </div>

      {/* 2. CẤU HÌNH THÔNG SỐ VÀ LỊCH TRÌNH */}
      <div className="rounded-2xl border border-border/40 bg-background p-5 shadow-[6px_6px_15px_var(--shadow-dark),-6px_-6px_15px_var(--shadow-light)] sm:p-6">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/30 pb-4">
          <div>
            <h3 className="text-base font-bold text-foreground sm:text-lg flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              {t("maintenance.control.title")}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("maintenance.control.desc")}
            </p>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 sm:pt-0">
            <span className="text-xs text-muted-foreground font-medium mr-1 hidden sm:inline">
              {t("maintenance.presets.title")}:
            </span>
            <button
              type="button"
              onClick={() =>
                applyPreset(
                  30,
                  isVietnamese ? "Bảo trì nâng cấp hệ thống định kỳ (30 phút)" : "Scheduled 30-Minute Maintenance",
                  isVietnamese
                    ? "Hệ thống đang tiến hành nâng cấp hạ tầng mạng và cơ sở dữ liệu định kỳ. Thời gian dự kiến khoảng 30 phút."
                    : "The platform is undergoing scheduled routine network and database maintenance for 30 minutes.",
                  "MAINTENANCE",
                )
              }
              className="inline-flex items-center gap-1 rounded-xl border border-border/40 bg-surface px-2.5 py-1 text-xs font-semibold text-foreground shadow-[inset_1px_1px_2px_rgba(255,255,255,0.7),2px_2px_5px_var(--shadow-dark)] hover:text-primary transition-colors"
            >
              <Clock className="h-3 w-3 text-primary" />
              30m
            </button>
            <button
              type="button"
              onClick={() =>
                applyPreset(
                  60,
                  isVietnamese ? "Nâng cấp cụm Model Trí tuệ Nhân tạo (AI)" : "AI Inference Engine Maintenance",
                  isVietnamese
                    ? "Đang triển khai phiên bản mô hình AI phát hiện PPE mới với độ chính xác cao hơn. Dịch vụ AI tạm dừng trong 60 phút."
                    : "Upgrading AI safety detection models for enhanced precision. AI services are temporarily offline for 60 minutes.",
                  "MAINTENANCE",
                )
              }
              className="inline-flex items-center gap-1 rounded-xl border border-border/40 bg-surface px-2.5 py-1 text-xs font-semibold text-foreground shadow-[inset_1px_1px_2px_rgba(255,255,255,0.7),2px_2px_5px_var(--shadow-dark)] hover:text-primary transition-colors"
            >
              <Flame className="h-3 w-3 text-amber-500" />
              1h AI
            </button>
            <button
              type="button"
              onClick={() =>
                applyPreset(
                  45,
                  isVietnamese ? "Sao lưu dữ liệu định kỳ — Chế độ chỉ đọc" : "Database Backup (Read-Only Mode)",
                  isVietnamese
                    ? "Hệ thống đang tiến hành sao lưu toàn vẹn dữ liệu. Quý người dùng vẫn có thể xem báo cáo nhưng không thể chỉnh sửa."
                    : "Performing comprehensive database backup. Users can view data in read-only mode, but mutations are disabled.",
                  "READ_ONLY",
                )
              }
              className="inline-flex items-center gap-1 rounded-xl border border-border/40 bg-surface px-2.5 py-1 text-xs font-semibold text-foreground shadow-[inset_1px_1px_2px_rgba(255,255,255,0.7),2px_2px_5px_var(--shadow-dark)] hover:text-primary transition-colors"
            >
              <Database className="h-3 w-3 text-blue-500" />
              {isVietnamese ? "Chỉ đọc" : "Read-only"}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Mode Selector */}
          <div>
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
              {t("maintenance.mode.label")}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition-all ${
                  status === "MAINTENANCE"
                    ? "border-rose-500/50 bg-rose-500/5 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.06)]"
                    : "border-border/30 bg-surface hover:border-border/60"
                }`}
              >
                <input
                  type="radio"
                  name="maintenanceMode"
                  value="MAINTENANCE"
                  checked={status === "MAINTENANCE"}
                  onChange={() => setStatus("MAINTENANCE")}
                  className="mt-1 h-4 w-4 text-rose-600 focus:ring-rose-500"
                />
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4 text-rose-500" />
                    {isVietnamese ? "Bảo trì toàn diện" : "Full Maintenance"}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t("maintenance.mode.maintenance")}
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition-all ${
                  status === "READ_ONLY"
                    ? "border-amber-500/50 bg-amber-500/5 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.06)]"
                    : "border-border/30 bg-surface hover:border-border/60"
                }`}
              >
                <input
                  type="radio"
                  name="maintenanceMode"
                  value="READ_ONLY"
                  checked={status === "READ_ONLY"}
                  onChange={() => setStatus("READ_ONLY")}
                  className="mt-1 h-4 w-4 text-amber-600 focus:ring-amber-500"
                />
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    {isVietnamese ? "Chỉ đọc (Read-Only)" : "Read-Only Mode"}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t("maintenance.mode.readOnly")}
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
              {t("maintenance.form.titleLabel")}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("maintenance.form.titlePlaceholder")}
              className="w-full rounded-xl border border-border/40 bg-surface px-3.5 py-2.5 text-sm text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)] transition-colors"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
              {t("maintenance.form.messageLabel")}
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("maintenance.form.messagePlaceholder")}
              className="w-full rounded-xl border border-border/40 bg-surface px-3.5 py-2.5 text-sm text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)] transition-colors resize-y"
            />
          </div>

          {/* Datetime row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                {t("maintenance.form.startAt")}
              </label>
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="w-full rounded-xl border border-border/40 bg-surface px-3.5 py-2 text-sm text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                {t("maintenance.form.estimatedEndAt")}
              </label>
              <input
                type="datetime-local"
                value={estimatedEndAt}
                onChange={(e) => setEstimatedEndAt(e.target.value)}
                className="w-full rounded-xl border border-border/40 bg-surface px-3.5 py-2 text-sm text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)] transition-colors"
              />
            </div>
          </div>

          {/* Bypass Roles selection */}
          <div>
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
              {t("maintenance.form.bypassRoles")}
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {AVAILABLE_ROLES.map((role) => {
                const isSelected = bypassRoles.includes(role);
                const isAdmin = role === "ADMIN";

                return (
                  <button
                    key={role}
                    type="button"
                    disabled={isAdmin}
                    onClick={() => toggleRole(role)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                      isSelected
                        ? "border-primary/50 bg-primary/10 text-primary shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)]"
                        : "border-border/40 bg-surface text-muted-foreground hover:text-foreground"
                    } ${isAdmin ? "opacity-90 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <Shield className="h-3.5 w-3.5" />
                    <span>{role}</span>
                    {isAdmin && (
                      <span className="text-[10px] text-primary/70">
                        ({isVietnamese ? "Mặc định" : "Default"})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bypass IPs */}
          <div>
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Globe2 className="h-4 w-4 text-primary" />
              {t("maintenance.form.bypassIps")}
            </label>
            <input
              type="text"
              value={bypassIpsStr}
              onChange={(e) => setBypassIpsStr(e.target.value)}
              placeholder={t("maintenance.form.bypassIpsPlaceholder")}
              className="w-full rounded-xl border border-border/40 bg-surface px-3.5 py-2.5 text-sm font-mono text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)] transition-colors"
            />
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/30">
            <Button
              variant="primary"
              onClick={handleSaveConfig}
              disabled={isBusy}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {isUpdating ? t("maintenance.btn.saving") : t("maintenance.btn.saveConfig")}
            </Button>
          </div>
        </div>
      </div>

      {/* CONFIRM DIALOGS */}
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
