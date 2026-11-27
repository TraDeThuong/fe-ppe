"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Clock,
  Database,
  Flame,
  Globe2,
  Save,
  Shield,
  ShieldAlert,
  Wrench,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useRoles } from "@/hooks/rbac";
import { useCan } from "@/hooks/use-can";
import { toast } from "@/lib/toast";
import { useLocale } from "@/providers/locale-provider";
import type {
  MaintenanceConfig,
  MaintenanceModeStatus,
  UpdateMaintenancePayload,
} from "@/types";
import { MaintenanceKpiSummary } from "./maintenance-kpi-summary";

export interface MaintenanceControlPanelProps {
  config?: MaintenanceConfig | null;
  loading?: boolean;
  canManage?: boolean;
  onEnable: (data?: any) => Promise<any>;
  onDisable: () => Promise<any>;
  onUpdate: (data: UpdateMaintenancePayload) => Promise<any>;
  isEnabling?: boolean;
  isDisabling?: boolean;
  isUpdating?: boolean;
  onDraftChange?: (draft: Partial<MaintenanceConfig>) => void;
}

const DEFAULT_ROLES = ["ADMIN", "MANAGER", "SAFETY_MANAGER", "SAFETY_OFFICER", "USER"];
const MAX_TITLE_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 2000;

function isValidIpv4(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    if (!/^\d{1,3}$/.test(part)) return false;
    const num = Number(part);
    return num >= 0 && num <= 255;
  });
}

function isValidIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized.startsWith("::ffff:") && normalized.includes(".")) {
    return isValidIpv4(normalized.slice(7));
  }
  if (!/^[0-9a-f:]+$/i.test(normalized)) return false;
  if (normalized.includes(":::")) return false;
  const doubleColonParts = normalized.split("::");
  if (doubleColonParts.length > 2) return false;
  const groups = normalized.split(":").filter(Boolean);
  if (doubleColonParts.length === 1 && groups.length !== 8) return false;
  if (doubleColonParts.length === 2 && groups.length > 7) return false;
  return groups.every((g) => /^[0-9a-f]{1,4}$/i.test(g));
}

function isValidIpOrCidr(raw: string): boolean {
  const entry = raw.trim();
  if (!entry) return false;
  if (entry.includes("/")) {
    const parts = entry.split("/");
    if (parts.length !== 2) return false;
    const [addr, prefixStr] = parts;
    if (!addr || !/^\d{1,3}$/.test(prefixStr)) return false;
    const prefix = Number(prefixStr);
    if (isValidIpv4(addr)) return prefix >= 0 && prefix <= 32;
    if (isValidIpv6(addr)) return prefix >= 0 && prefix <= 128;
    return false;
  }
  return isValidIpv4(entry) || isValidIpv6(entry);
}

function toLocalDateTimeInput(isoValue: string): string {
  const d = new Date(isoValue);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function MaintenanceControlPanel({
  config,
  loading = false,
  canManage: canManageProp,
  onEnable,
  onDisable,
  onUpdate,
  isEnabling = false,
  isDisabling = false,
  isUpdating = false,
  onDraftChange,
}: MaintenanceControlPanelProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const can = useCan();
  const canManage = canManageProp ?? can("MAINTENANCE_MANAGE");
  const canReadRoles = can("ROLE_READ");
  const { data: rolesData = [] } = useRoles(undefined, {
    enabled: canReadRoles,
  });
  const AVAILABLE_ROLES =
    rolesData.length > 0 ? rolesData.map((r) => r.name) : DEFAULT_ROLES;

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
      setStatus((prev) =>
        config.status === "MAINTENANCE" || config.status === "READ_ONLY"
          ? config.status
          : prev === "READ_ONLY"
            ? "READ_ONLY"
            : "MAINTENANCE",
      );
      setBypassRoles(config.bypassRoles || ["ADMIN"]);
      setBypassIpsStr(config.bypassIps?.join(", ") || "");

      if (config.startAt) {
        setStartAt(toLocalDateTimeInput(config.startAt));
      } else {
        setStartAt("");
      }

      if (config.estimatedEndAt) {
        setEstimatedEndAt(toLocalDateTimeInput(config.estimatedEndAt));
      } else {
        setEstimatedEndAt("");
      }
    }
  }, [config]);

  // Propagate draft changes for Live Preview
  useEffect(() => {
    if (!onDraftChange) return;
    const parsedStart = startAt ? new Date(startAt) : null;
    const parsedEnd = estimatedEndAt ? new Date(estimatedEndAt) : null;
    const ips = bypassIpsStr
      .split(",")
      .map((ip) => ip.trim())
      .filter(Boolean);

    onDraftChange({
      title,
      message,
      status: status === "ONLINE" ? "MAINTENANCE" : status,
      startAt:
        parsedStart && !Number.isNaN(parsedStart.getTime())
          ? parsedStart.toISOString()
          : null,
      estimatedEndAt:
        parsedEnd && !Number.isNaN(parsedEnd.getTime())
          ? parsedEnd.toISOString()
          : null,
      bypassRoles,
      bypassIps: ips,
    });
  }, [
    onDraftChange,
    title,
    message,
    status,
    startAt,
    estimatedEndAt,
    bypassRoles,
    bypassIpsStr,
  ]);

  // Handle Switch Toggle
  const handleSwitchChange = (checked: boolean) => {
    if (!canManage) return;
    if (checked) {
      setConfirmEnableOpen(true);
    } else {
      setConfirmDisableOpen(true);
    }
  };

  const handleConfirmEnable = async () => {
    if (!canManage) return;
    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();

    if (trimmedTitle.length > MAX_TITLE_LENGTH) {
      toast.error(
        isVietnamese
          ? `Tiêu đề thông báo không được vượt quá ${MAX_TITLE_LENGTH} ký tự.`
          : `Notice title must not exceed ${MAX_TITLE_LENGTH} characters.`,
      );
      return;
    }

    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      toast.error(
        isVietnamese
          ? `Nội dung thông báo không được vượt quá ${MAX_MESSAGE_LENGTH} ký tự.`
          : `Notice message must not exceed ${MAX_MESSAGE_LENGTH} characters.`,
      );
      return;
    }

    const resolvedStartAt = startAt
      ? new Date(startAt).toISOString()
      : new Date().toISOString();
    const resolvedEstimatedEndAt = estimatedEndAt
      ? new Date(estimatedEndAt).toISOString()
      : null;

    if (
      resolvedEstimatedEndAt &&
      new Date(resolvedEstimatedEndAt).getTime() <=
        new Date(resolvedStartAt).getTime()
    ) {
      toast.error(
        isVietnamese
          ? "Thời gian dự kiến hoàn tất phải lớn hơn thời gian bắt đầu."
          : "Estimated completion time must be after start time.",
      );
      return;
    }

    const ips = bypassIpsStr
      .split(",")
      .map((ip) => ip.trim())
      .filter(Boolean);

    const invalidIp = ips.find((ip) => !isValidIpOrCidr(ip));
    if (invalidIp) {
      toast.error(
        isVietnamese
          ? `Địa chỉ IP hoặc dải CIDR không hợp lệ: ${invalidIp}`
          : `Invalid IP address or CIDR subnet: ${invalidIp}`,
      );
      return;
    }

    try {
      await onEnable({
        title: trimmedTitle || undefined,
        message: trimmedMessage || undefined,
        status: status === "ONLINE" ? "MAINTENANCE" : status,
        startAt: resolvedStartAt,
        estimatedEndAt: resolvedEstimatedEndAt,
        bypassRoles,
        bypassIps: ips,
      });
      setConfirmEnableOpen(false);
    } catch {
      // Lỗi đã được hiển thị qua mutation toast
    }
  };

  const handleConfirmDisable = async () => {
    if (!canManage) return;
    try {
      await onDisable();
      setConfirmDisableOpen(false);
    } catch {
      // Lỗi đã được hiển thị qua mutation toast
    }
  };

  const handleSaveConfig = async () => {
    if (!canManage) return;
    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();
    if (!trimmedTitle || !trimmedMessage) {
      toast.error(
        isVietnamese
          ? "Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo bảo trì."
          : "Please enter both maintenance notice title and message.",
      );
      return;
    }
    if (trimmedTitle.length > MAX_TITLE_LENGTH) {
      toast.error(
        isVietnamese
          ? `Tiêu đề thông báo không được vượt quá ${MAX_TITLE_LENGTH} ký tự.`
          : `Notice title must not exceed ${MAX_TITLE_LENGTH} characters.`,
      );
      return;
    }
    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      toast.error(
        isVietnamese
          ? `Nội dung thông báo không được vượt quá ${MAX_MESSAGE_LENGTH} ký tự.`
          : `Notice message must not exceed ${MAX_MESSAGE_LENGTH} characters.`,
      );
      return;
    }
    if (startAt && estimatedEndAt && new Date(estimatedEndAt) <= new Date(startAt)) {
      toast.error(
        isVietnamese
          ? "Thời gian dự kiến hoàn tất phải lớn hơn thời gian bắt đầu."
          : "Estimated completion time must be after start time.",
      );
      return;
    }
    const ips = bypassIpsStr
      .split(",")
      .map((ip) => ip.trim())
      .filter(Boolean);

    const invalidIp = ips.find((ip) => !isValidIpOrCidr(ip));
    if (invalidIp) {
      toast.error(
        isVietnamese
          ? `Địa chỉ IP hoặc dải CIDR không hợp lệ: ${invalidIp}`
          : `Invalid IP address or CIDR subnet: ${invalidIp}`,
      );
      return;
    }

    try {
      // Khi bảo trì đang TẮT, không gửi status MAINTENANCE/READ_ONLY qua PUT /maintenance/config
      // vì BE sẽ tự kích hoạt bảo trì ngay lập tức mà bỏ qua công tắc & hộp thoại xác nhận.
      await onUpdate({
        title: trimmedTitle,
        message: trimmedMessage,
        ...(isEnabled ? { status } : {}),
        startAt: startAt ? new Date(startAt).toISOString() : null,
        estimatedEndAt: estimatedEndAt ? new Date(estimatedEndAt).toISOString() : null,
        bypassRoles,
        bypassIps: ips,
      });
    } catch {
      // Lỗi đã được hiển thị qua mutation toast
    }
  };

  // Quick preset templates (dùng giờ địa phương để khớp input datetime-local, tránh lệch 7 tiếng UTC+7)
  const applyPreset = (minutes: number, customTitle: string, customMessage: string, customStatus: MaintenanceModeStatus = "MAINTENANCE") => {
    if (!canManage) return;
    const now = new Date();
    const end = new Date(now.getTime() + minutes * 60 * 1000);

    setStartAt(toLocalDateTimeInput(now.toISOString()));
    setEstimatedEndAt(toLocalDateTimeInput(end.toISOString()));
    setTitle(customTitle);
    setMessage(customMessage);
    setStatus(customStatus);
  };

  const toggleRole = (role: string) => {
    if (!canManage || role === "ADMIN") return; // Admin is permanently locked
    setBypassRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };


  return (
    <div className="space-y-5">
      {/* ============================================================
          1. UNIFIED STATUS & MASTER MAINTENANCE CONTROL
          ============================================================ */}
      <MaintenanceKpiSummary
        config={config}
        loading={loading}
        onToggleSwitch={canManage ? handleSwitchChange : undefined}
        isSwitchDisabled={isBusy || !canManage}
      />

      {!canManage && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-2xl border border-amber-500/35 bg-amber-500/[0.06] px-4 py-3 text-xs text-amber-700 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] dark:text-amber-300"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
          <p className="font-medium leading-relaxed">
            {isVietnamese
              ? "Chế độ chỉ xem (Read-Only): Tài khoản của bạn chỉ có quyền xem cấu hình bảo trì (MAINTENANCE_READ). Cần quyền MAINTENANCE_MANAGE để bật/tắt hoặc lưu thay đổi."
              : "View-only mode: Your account only has permission to view maintenance settings (MAINTENANCE_READ). MAINTENANCE_MANAGE permission is required to toggle or save changes."}
          </p>
        </div>
      )}

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
          {canManage && (
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
                  disabled={isBusy}
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
                  disabled={isBusy}
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
                  disabled={isBusy}
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
          )}
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
                  disabled={!canManage}
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
                  disabled={!canManage}
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
                maxLength={MAX_TITLE_LENGTH}
                disabled={!canManage}
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
                maxLength={MAX_MESSAGE_LENGTH}
                disabled={!canManage}
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
                  disabled={!canManage}
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
                  disabled={!canManage}
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
                      disabled={isAdmin || !canManage}
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
                disabled={!canManage}
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
          {canManage && (
            <div className="flex flex-col-reverse gap-3 border-t border-border/30 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                {isVietnamese
                  ? "Kiểm tra lại cấu hình trước khi lưu thay đổi."
                  : "Review your configuration before saving changes."}
              </p>

              <Button
                variant="primary"
                onClick={handleSaveConfig}
                disabled={isBusy || !canManage}
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
          )}
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