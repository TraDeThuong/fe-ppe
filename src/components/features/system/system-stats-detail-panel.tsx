"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Globe,
  HardDrive,
  Lock,
  Plus,
  Radio,
  Server,
  Settings2,
  ShieldAlert,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshButton } from "@/components/ui/refresh-action";
import { isFeatureFlagEnabled } from "@/lib/system-config";
import { useLocale } from "@/providers/locale-provider";
import type { ServiceHealthItem, SystemConfigItem, SystemHealthReport } from "@/types";
import type { SystemTabKey } from "./system-tabs";

export type SystemStatKey = "flags" | "configs" | "health" | "latency";

export interface SystemStatsDetailPanelProps {
  activeStat: SystemStatKey;
  activeTab?: SystemTabKey;
  totalConfigs: number;
  healthReport?: SystemHealthReport;
  featureFlags: SystemConfigItem[];
  configs?: SystemConfigItem[];
  onClose: () => void;
  onSelectTab: (tab: SystemTabKey) => void;
  onRefreshHealth: () => void;
  isRefreshingHealth?: boolean;
  onCreateConfig?: () => void;
  onToggleFlag?: (flag: SystemConfigItem, enabled: boolean) => void;
  isTogglingFlag?: boolean;
  canManage?: boolean;
}

export function SystemStatsDetailPanel({
  activeStat,
  activeTab,
  totalConfigs,
  healthReport,
  featureFlags,
  configs = [],
  onClose,
  onSelectTab,
  onRefreshHealth,
  isRefreshingHealth = false,
  onCreateConfig,
  onToggleFlag,
  isTogglingFlag = false,
  canManage = true,
}: SystemStatsDetailPanelProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  // Filter for health services
  const [healthFilter, setHealthFilter] = useState<"ALL" | "SERVICE" | "INFRASTRUCTURE">("ALL");

  const services = healthReport?.services ?? [];
  const healthyCount = healthReport?.healthyCount ?? services.filter((s) => s.status === "HEALTHY").length;
  const totalServices = healthReport?.totalServices ?? services.length;
  const avgLatency = healthReport?.averageLatencyMs;

  const activeFlagsCount = useMemo(
    () => featureFlags.filter((f) => isFeatureFlagEnabled(f.value)).length,
    [featureFlags],
  );

  // Category counts for configs
  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {
      GENERAL: 0,
      SECURITY: 0,
      INTEGRATION: 0,
      FEATURE_FLAG: 0,
    };
    let publicCount = 0;
    let privateCount = 0;

    configs.forEach((item) => {
      const cat = String(item.category || "GENERAL");
      counts[cat] = (counts[cat] || 0) + 1;
      if (item.isPublic) publicCount += 1;
      else privateCount += 1;
    });

    return { counts, publicCount, privateCount };
  }, [configs]);

  const filteredServices = useMemo(() => {
    if (healthFilter === "ALL") return services;
    return services.filter((s) => (s.type || "SERVICE") === healthFilter);
  }, [services, healthFilter]);

  const getStatusBadge = (status: "HEALTHY" | "DEGRADED" | "DOWN") => {
    switch (status) {
      case "HEALTHY":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
            <CheckCircle2 className="h-3 w-3" />
            {t("system.health.statusHealthy")}
          </span>
        );
      case "DEGRADED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-background/70 px-2 py-0.5 text-[11px] font-semibold text-foreground dark:bg-black/30">
            <Clock className="h-3 w-3 text-muted-foreground" />
            {t("system.health.statusDegraded")}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/60 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
            <XCircle className="h-3 w-3" />
            {t("system.health.statusDown")}
          </span>
        );
    }
  };

  return (
<div className="relative overflow-hidden rounded-[26px] border border-white/70 bg-surface p-4 sm:p-6 shadow-[9px_9px_20px_var(--shadow-dark),-9px_-9px_20px_rgba(255,255,255,0.88)] transition-all duration-300 dark:border-white/[0.06] dark:bg-card dark:shadow-[9px_9px_22px_rgba(0,0,0,0.58),-4px_-4px_12px_rgba(255,255,255,0.03)] animate-in fade-in slide-in-from-top-2">
  {/* Specular Rim Top Highlight */}
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-x-8 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent"
  />

  {/* =========================================================
      1. HEADER TOOLBAR
  ========================================================= */}
  <div className="relative mb-5 flex flex-wrap items-center justify-between gap-3 pb-4 before:absolute before:inset-x-0 before:bottom-0 before:h-[1px] before:bg-gradient-to-r before:from-primary/35 before:via-border/45 before:to-transparent">
    <div className="flex min-w-0 items-center gap-3.5">
      {/* Extruded + Debossed Emblem Pod */}
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] border border-white/70 bg-surface text-primary shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.9)] dark:border-white/[0.06] dark:bg-card dark:shadow-[4px_4px_10px_rgba(0,0,0,0.5)]">
        <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary/[0.08] shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_rgba(255,255,255,0.75)] dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.65)]">
          {activeStat === "flags" && <Cpu className="h-4.5 w-4.5" />}
          {activeStat === "configs" && <Settings2 className="h-4.5 w-4.5" />}
          {activeStat === "health" && <Server className="h-4.5 w-4.5" />}
          {activeStat === "latency" && <Activity className="h-4.5 w-4.5" />}
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-extrabold tracking-tight text-foreground sm:text-[15px]">
            {activeStat === "flags" && t("system.detail.flagsTitle")}
            {activeStat === "configs" && t("system.detail.configsTitle")}
            {activeStat === "health" && t("system.detail.healthTitle")}
            {activeStat === "latency" && t("system.detail.latencyTitle")}
          </h3>

          {/* Recessed Telemetry Badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-background/65 px-2.5 py-0.5 font-mono text-[11px] font-extrabold text-primary shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] dark:bg-black/30 dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.65)]">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_5px_var(--primary)]" />
            {activeStat === "flags" && `${activeFlagsCount}/${featureFlags.length}`}
            {activeStat === "configs" && `${totalConfigs}`}
            {activeStat === "health" && (healthReport ? `${healthyCount}/${totalServices}` : "--")}
            {activeStat === "latency" && (typeof avgLatency === "number" ? `${avgLatency} ms` : "--")}
          </span>
        </div>
        <p className="mt-0.5 hidden truncate text-xs text-muted-foreground sm:block">
          {activeStat === "flags" && t("system.detail.flagsDesc")}
          {activeStat === "configs" && t("system.detail.configsDesc")}
          {activeStat === "health" && t("system.detail.healthDesc")}
          {activeStat === "latency" && t("system.detail.latencyDesc")}
        </p>
      </div>
    </div>

    {/* Action Controls & Close */}
    <div className="flex shrink-0 items-center gap-2.5">
      {activeStat === "configs" && onCreateConfig && canManage && (
        <button
          type="button"
          onClick={onCreateConfig}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[13px] border border-primary/25 bg-primary/[0.08] px-3.5 text-xs font-extrabold text-primary shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.85)] transition-all duration-150 hover:bg-primary/15 active:shadow-[inset_3px_3px_7px_var(--shadow-dark)] dark:bg-primary/15 dark:shadow-[4px_4px_10px_rgba(0,0,0,0.5)]"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t("system.detail.addConfig")}</span>
        </button>
      )}

      {activeStat === "health" && (
        <RefreshButton
          variant="ghost"
          size="sm"
          onRefresh={onRefreshHealth}
          isRefreshing={isRefreshingHealth}
          label={t("system.detail.refreshHealth")}
          hideLabelOnMobile
          className="h-9 rounded-[13px] border border-white/70 bg-surface px-3.5 text-xs font-extrabold text-foreground shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.85)] hover:text-primary active:shadow-[inset_3px_3px_7px_var(--shadow-dark)] dark:border-white/[0.06] dark:bg-card dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45)]"
        />
      )}

      <button
        type="button"
        onClick={onClose}
        title={t("system.detail.close")}
        aria-label={t("system.detail.close")}
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[13px] border border-white/70 bg-surface text-muted-foreground shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.85)] transition-all duration-150 hover:text-foreground active:shadow-[inset_3px_3px_7px_var(--shadow-dark)] dark:border-white/[0.06] dark:bg-card dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45)]"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  </div>

  {/* =========================================================
      2. BODY FOR: FEATURE FLAGS
  ========================================================= */}
  {activeStat === "flags" && (
    <div className="space-y-4">
      {/* Quick Metrics Tray */}
      <div className="grid grid-cols-2 gap-3 rounded-[20px] bg-background/60 p-3 shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_rgba(255,255,255,0.85)] dark:bg-black/30 dark:shadow-[inset_3px_3px_8px_rgba(0,0,0,0.7)] sm:grid-cols-4">
        <div className="rounded-[15px] border border-white/60 bg-surface p-3 shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_rgba(255,255,255,0.85)] dark:border-white/[0.05] dark:bg-card dark:shadow-[3px_3px_8px_rgba(0,0,0,0.5)]">
          <span className="block text-[10.5px] font-bold text-muted-foreground">
            {t("system.flags.enabled")}
          </span>
          <p className="mt-1 font-mono text-lg font-black tabular-nums text-primary">
            {activeFlagsCount}
          </p>
        </div>

        <div className="rounded-[15px] border border-white/60 bg-surface p-3 shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_rgba(255,255,255,0.85)] dark:border-white/[0.05] dark:bg-card dark:shadow-[3px_3px_8px_rgba(0,0,0,0.5)]">
          <span className="block text-[10.5px] font-bold text-muted-foreground">
            {t("system.flags.disabled")}
          </span>
          <p className="mt-1 font-mono text-lg font-black tabular-nums text-muted-foreground">
            {featureFlags.length - activeFlagsCount}
          </p>
        </div>

        <div className="rounded-[15px] border border-white/60 bg-surface p-3 shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_rgba(255,255,255,0.85)] dark:border-white/[0.05] dark:bg-card dark:shadow-[3px_3px_8px_rgba(0,0,0,0.5)]">
          <span className="block text-[10.5px] font-bold text-muted-foreground">
            {isVietnamese ? "Cơ chế cập nhật" : "Update Mechanism"}
          </span>
          <p className="mt-1.5 font-mono text-xs font-extrabold text-primary">
            Zero-Downtime Hot Toggle
          </p>
        </div>

        <div className="rounded-[15px] border border-white/60 bg-surface p-3 shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_rgba(255,255,255,0.85)] dark:border-white/[0.05] dark:bg-card dark:shadow-[3px_3px_8px_rgba(0,0,0,0.5)]">
          <span className="block text-[10.5px] font-bold text-muted-foreground">
            {isVietnamese ? "Đồng bộ bộ nhớ đệm" : "Cache Invalidation"}
          </span>
          <p className="mt-1.5 font-mono text-xs font-extrabold text-foreground">
            Redis Pub/Sub Realtime
          </p>
        </div>
      </div>

      {/* Interactive Flags List */}
      <div className="grid max-h-72 grid-cols-1 gap-3 overflow-y-auto pr-0.5 sm:grid-cols-2">
        {featureFlags.map((flag) => {
          const isEnabled = isFeatureFlagEnabled(flag.value);
          return (
            <div
              key={flag.id}
              className={`flex items-center justify-between gap-3 rounded-[18px] border p-3.5 transition-all duration-200 ${
                isEnabled
                  ? "border-primary/25 bg-surface shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.85)] dark:border-primary/20 dark:bg-card dark:shadow-[4px_4px_10px_rgba(0,0,0,0.5)]"
                  : "border-white/60 bg-surface shadow-[3px_3px_8px_var(--shadow-dark),-3px_-3px_8px_rgba(255,255,255,0.8)] dark:border-white/[0.05] dark:bg-card dark:shadow-[3px_3px_8px_rgba(0,0,0,0.45)]"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`truncate rounded-md bg-background/65 px-2 py-0.5 font-mono text-xs font-extrabold shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark)] dark:bg-black/30 ${
                      isEnabled ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {flag.key}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold shadow-[inset_1px_1px_3px_var(--shadow-dark)] dark:shadow-[inset_1px_1px_4px_rgba(0,0,0,0.65)] ${
                      isEnabled
                        ? "bg-primary/10 text-primary"
                        : "bg-background/70 text-muted-foreground dark:bg-black/35"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isEnabled ? "bg-primary" : "bg-muted-foreground/40"
                      }`}
                    />
                    {isEnabled
                      ? t("system.flags.enabled")
                      : t("system.flags.disabled")}
                  </span>
                </div>
                <p className="mt-1.5 truncate text-[11.5px] text-muted-foreground">
                  {flag.description || "Feature flag toggle"}
                </p>
              </div>

              {onToggleFlag && (
                <button
                  type="button"
                  role="switch"
                  aria-checked={isEnabled}
                  disabled={!canManage || isTogglingFlag}
                  onClick={() => onToggleFlag(flag, !isEnabled)}
                  aria-label={`Toggle ${flag.key}`}
                  className={`relative inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer items-center rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-40 ${
                    isEnabled
                      ? "bg-primary/15 shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.75)]"
                      : "bg-background/80 shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] dark:bg-black/45 dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.75)]"
                  }`}
                >
                  <span
                    className={`pointer-events-none flex h-[18px] w-[18px] items-center justify-center rounded-full transition-all duration-300 ${
                      isEnabled
                        ? "translate-x-[22px] bg-primary shadow-[1.5px_1.5px_4px_rgba(0,0,0,0.3)]"
                        : "translate-x-[3px] bg-surface shadow-[1.5px_1.5px_4px_var(--shadow-dark)] dark:bg-card"
                    }`}
                  >
                    <span
                      className={`h-1 w-1 rounded-full ${
                        isEnabled ? "bg-primary-foreground" : "bg-muted-foreground/30"
                      }`}
                    />
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Action Jump */}
      {activeTab !== "flags" && (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => onSelectTab("flags")}
            className="inline-flex h-9 items-center gap-1.5 rounded-[13px] border border-white/70 bg-surface px-3.5 text-xs font-extrabold text-primary shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.85)] transition-all duration-150 hover:brightness-105 active:shadow-[inset_3px_3px_7px_var(--shadow-dark)] dark:border-white/[0.06] dark:bg-card dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45)]"
          >
            <span>
              {t("system.detail.goToTab", {
                tab: t("system.tabs.featureFlags"),
              })}
            </span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )}

  {/* =========================================================
      3. BODY FOR: SYSTEM CONFIGS
  ========================================================= */}
  {activeStat === "configs" && (
    <div className="space-y-4">
      {/* Categories Recessed Well */}
      <div className="grid grid-cols-2 gap-3 rounded-[20px] bg-background/60 p-3 shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_rgba(255,255,255,0.85)] dark:bg-black/30 dark:shadow-[inset_3px_3px_8px_rgba(0,0,0,0.7)] sm:grid-cols-4">
        <div className="rounded-[15px] border border-white/60 bg-surface p-3 shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_rgba(255,255,255,0.85)] dark:border-white/[0.05] dark:bg-card dark:shadow-[3px_3px_8px_rgba(0,0,0,0.5)]">
          <span className="block text-[10.5px] font-extrabold tracking-wider text-muted-foreground">
            GENERAL
          </span>
          <p className="mt-1 font-mono text-lg font-black tabular-nums text-foreground">
            {categoryStats.counts.GENERAL || 0}
          </p>
        </div>

        <div className="rounded-[15px] border border-white/60 bg-surface p-3 shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_rgba(255,255,255,0.85)] dark:border-white/[0.05] dark:bg-card dark:shadow-[3px_3px_8px_rgba(0,0,0,0.5)]">
          <span className="block text-[10.5px] font-extrabold tracking-wider text-muted-foreground">
            SECURITY
          </span>
          <p className="mt-1 font-mono text-lg font-black tabular-nums text-foreground">
            {categoryStats.counts.SECURITY || 0}
          </p>
        </div>

        <div className="rounded-[15px] border border-white/60 bg-surface p-3 shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_rgba(255,255,255,0.85)] dark:border-white/[0.05] dark:bg-card dark:shadow-[3px_3px_8px_rgba(0,0,0,0.5)]">
          <span className="block text-[10.5px] font-extrabold tracking-wider text-foreground/80">
            INTEGRATION
          </span>
          <p className="mt-1 font-mono text-lg font-black tabular-nums text-foreground">
            {categoryStats.counts.INTEGRATION || 0}
          </p>
        </div>

        <div className="rounded-[15px] border border-primary/25 bg-surface p-3 shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_rgba(255,255,255,0.85)] dark:border-primary/20 dark:bg-card dark:shadow-[3px_3px_8px_rgba(0,0,0,0.5)]">
          <span className="block text-[10.5px] font-extrabold tracking-wider text-primary">
            FEATURE_FLAG
          </span>
          <p className="mt-1 font-mono text-lg font-black tabular-nums text-primary">
            {categoryStats.counts.FEATURE_FLAG || 0}
          </p>
        </div>
      </div>

      {/* Scope Summary & Security Plaque */}
      <div className="flex flex-col justify-between gap-2.5 rounded-[16px] bg-background/60 px-4 py-3 text-xs shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_rgba(255,255,255,0.85)] dark:bg-black/30 dark:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.7)] sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-2.5 py-1 text-muted-foreground shadow-[2px_2px_4px_var(--shadow-dark)] dark:bg-card dark:shadow-[2px_2px_5px_rgba(0,0,0,0.5)]">
            <Globe className="h-3.5 w-3.5 text-primary" />
            <strong className="font-mono font-extrabold text-foreground">
              {categoryStats.publicCount}
            </strong>{" "}
            {t("system.detail.publicScope")}
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-2.5 py-1 text-muted-foreground shadow-[2px_2px_4px_var(--shadow-dark)] dark:bg-card dark:shadow-[2px_2px_5px_rgba(0,0,0,0.5)]">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            <strong className="font-mono font-extrabold text-foreground">
              {categoryStats.privateCount}
            </strong>{" "}
            {t("system.detail.privateScope")}
          </span>
        </div>

        <p className="text-[11px] font-medium text-muted-foreground">
          {isVietnamese
            ? "Dữ liệu được mã hóa AES-256 đối với các biến nhạy cảm."
            : "Sensitive keys are encrypted at rest with AES-256."}
        </p>
      </div>

      {/* Bottom Action Jump */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        {onCreateConfig && canManage && (
          <button
            type="button"
            onClick={onCreateConfig}
            className="inline-flex h-9 items-center gap-1.5 rounded-[13px] bg-primary px-3.5 text-xs font-extrabold text-primary-foreground shadow-[4px_4px_12px_rgba(var(--primary-rgb),0.35),-3px_-3px_8px_rgba(255,255,255,0.7)] transition-all hover:brightness-105 active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t("system.addConfig")}</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => onSelectTab("configs")}
          className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-[13px] border border-white/70 bg-surface px-3.5 text-xs font-extrabold text-primary shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.85)] transition-all duration-150 hover:brightness-105 active:shadow-[inset_3px_3px_7px_var(--shadow-dark)] dark:border-white/[0.06] dark:bg-card dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45)]"
        >
          <span>
            {t("system.detail.goToTab", { tab: t("system.tabs.configs") })}
          </span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )}

  {/* =========================================================
      4. BODY FOR: MICROSERVICES HEALTH
  ========================================================= */}
  {activeStat === "health" && (
    <div className="space-y-4">
      {/* Recessed Filter Keys */}
      <div className="inline-flex flex-wrap items-center gap-1.5 rounded-[16px] bg-background/60 p-1.5 shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_rgba(255,255,255,0.85)] dark:bg-black/30 dark:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.7)]">
        {[
          {
            key: "ALL" as const,
            label: t("system.health.filterAll", { count: services.length }),
          },
          {
            key: "SERVICE" as const,
            label: t("system.health.filterServices", {
              count: services.filter((s) => (s.type || "SERVICE") === "SERVICE")
                .length,
            }),
          },
          {
            key: "INFRASTRUCTURE" as const,
            label: t("system.health.filterInfra", {
              count: services.filter((s) => s.type === "INFRASTRUCTURE").length,
            }),
          },
        ].map((tab) => {
          const active = healthFilter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setHealthFilter(tab.key)}
              className={`h-8 rounded-[11px] px-3 text-xs font-extrabold transition-all duration-150 ${
                active
                  ? "bg-primary text-primary-foreground shadow-[3px_3px_8px_rgba(0,0,0,0.2)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Recessed Services Container */}
      <div className="rounded-[20px] bg-background/60 p-3 shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_rgba(255,255,255,0.85)] dark:bg-black/30 dark:shadow-[inset_3px_3px_8px_rgba(0,0,0,0.7)]">
        <div className="grid max-h-60 grid-cols-1 gap-2.5 overflow-y-auto p-0.5 pr-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((svc) => (
            <div
              key={svc.serviceCode}
              className="flex items-center justify-between gap-2.5 rounded-[15px] border border-white/60 bg-surface p-3 text-xs shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_rgba(255,255,255,0.85)] transition-transform duration-200 hover:-translate-y-0.5 dark:border-white/[0.05] dark:bg-card dark:shadow-[3px_3px_8px_rgba(0,0,0,0.5)]"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      svc.status === "HEALTHY"
                        ? "animate-pulse bg-primary"
                        : svc.status === "DEGRADED"
                          ? "bg-foreground/60"
                          : "bg-muted-foreground/50"
                    }`}
                  />
                  <p className="truncate font-extrabold text-foreground">
                    {svc.name}
                  </p>
                </div>
                <span className="mt-1 inline-block rounded bg-background/65 px-1.5 py-0.2 font-mono text-[10px] font-bold text-muted-foreground shadow-[inset_1px_1px_2px_var(--shadow-dark)] dark:bg-black/30">
                  {svc.serviceCode} :{svc.port}
                </span>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1">
                {getStatusBadge(svc.status)}
                <span className="font-mono text-[10px] font-bold text-muted-foreground">
                  {svc.latencyMs} ms
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <span className="rounded-lg bg-background/60 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark)] dark:bg-black/30">
          {isVietnamese
            ? "Tần suất nhịp tim tự động: 30s"
            : "Heartbeat cycle: 30s interval"}
        </span>

        <button
          type="button"
          onClick={() => onSelectTab("health")}
          className="inline-flex h-9 items-center gap-1.5 rounded-[13px] border border-white/70 bg-surface px-3.5 text-xs font-extrabold text-primary shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.85)] transition-all duration-150 hover:brightness-105 active:shadow-[inset_3px_3px_7px_var(--shadow-dark)] dark:border-white/[0.06] dark:bg-card dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45)]"
        >
          <span>
            {t("system.detail.goToTab", { tab: t("system.tabs.health") })}
          </span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )}

  {/* =========================================================
      5. BODY FOR: AVERAGE LATENCY & PLATFORM
  ========================================================= */}
  {activeStat === "latency" && (
    <div className="space-y-4">
      {/* Latency Thresholds */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-[18px] border border-primary/25 bg-surface p-3.5 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.85)] dark:border-primary/20 dark:bg-card dark:shadow-[4px_4px_10px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-primary">
              {t("system.detail.fastLatency")}
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark)]">
              <Activity className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Traefik Reverse Proxy, Redis Cache, PostgreSQL Local Socket
          </p>
        </div>

        <div className="rounded-[18px] border border-white/60 bg-surface p-3.5 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.85)] dark:border-white/[0.05] dark:bg-card dark:shadow-[4px_4px_10px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-foreground">
              {t("system.detail.moderateLatency")}
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-background/70 text-foreground/80 shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark)] dark:bg-black/30">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Microservices REST calls, Kafka broker ACK, MinIO S3 I/O
          </p>
        </div>

        <div className="rounded-[18px] border border-white/60 bg-surface p-3.5 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.85)] dark:border-white/[0.05] dark:bg-card dark:shadow-[4px_4px_10px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-muted-foreground">
              {t("system.detail.slowLatency")}
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-background/70 text-muted-foreground shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark)] dark:bg-black/30">
              <ShieldAlert className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Deep AI Model Inference, Large File Video Transcoding
          </p>
        </div>
      </div>

      {/* Infrastructure Nodes Recessed Bar */}
      <div className="grid grid-cols-2 gap-3 rounded-[20px] bg-background/60 p-3 text-xs shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_rgba(255,255,255,0.85)] dark:bg-black/30 dark:shadow-[inset_3px_3px_8px_rgba(0,0,0,0.7)] sm:grid-cols-4">
        {[
          { label: "PostgreSQL", port: "Port 5432", Icon: Database },
          { label: "Kafka Bus", port: "Port 9092", Icon: Radio },
          { label: "MinIO S3", port: "Port 9000", Icon: HardDrive },
          { label: "Traefik", port: "Port 80/443", Icon: Server },
        ].map(({ label, port, Icon }) => (
          <div
            key={label}
            className="flex items-center gap-2.5 rounded-[15px] border border-white/60 bg-surface p-3 shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_rgba(255,255,255,0.85)] dark:border-white/[0.05] dark:bg-card dark:shadow-[3px_3px_8px_rgba(0,0,0,0.5)]"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-primary/[0.08] text-primary shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark)]">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 truncate">
              <span className="block text-[10px] font-bold text-muted-foreground">
                {label}
              </span>
              <span className="font-mono text-xs font-extrabold text-foreground">
                {port}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Action Jump */}
      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={() => onSelectTab("platform")}
          className="inline-flex h-9 items-center gap-1.5 rounded-[13px] border border-white/70 bg-surface px-3.5 text-xs font-extrabold text-primary shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.85)] transition-all duration-150 hover:brightness-105 active:shadow-[inset_3px_3px_7px_var(--shadow-dark)] dark:border-white/[0.06] dark:bg-card dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45)]"
        >
          <span>
            {t("system.detail.goToTab", { tab: t("system.tabs.platform") })}
          </span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )}
</div>
  );
}
