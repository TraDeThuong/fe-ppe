"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  ExternalLink,
  Globe,
  HardDrive,
  Lock,
  Plus,
  Radio,
  RefreshCw,
  Server,
  Settings2,
  Shield,
  ShieldAlert,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/providers/locale-provider";
import type { ServiceHealthItem, SystemConfigItem, SystemHealthReport } from "@/types";
import type { SystemTabKey } from "./system-tabs";

export type SystemStatKey = "flags" | "configs" | "health" | "latency";

export interface SystemStatsDetailPanelProps {
  activeStat: SystemStatKey;
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
  canManage?: boolean;
}

export function SystemStatsDetailPanel({
  activeStat,
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
  canManage = true,
}: SystemStatsDetailPanelProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  // Filter for health services
  const [healthFilter, setHealthFilter] = useState<"ALL" | "SERVICE" | "INFRASTRUCTURE">("ALL");

  const services = healthReport?.services ?? [];
  const healthyCount = healthReport?.healthyCount ?? services.filter((s) => s.status === "HEALTHY").length;
  const totalServices = healthReport?.totalServices ?? services.length;
  const avgLatency = healthReport?.averageLatencyMs ?? 24;

  const activeFlagsCount = useMemo(
    () => featureFlags.filter((f) => Boolean(f.value)).length,
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
          <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
            <CheckCircle2 className="h-3 w-3" />
            {t("system.health.statusHealthy")}
          </span>
        );
      case "DEGRADED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">
            <Clock className="h-3 w-3" />
            {t("system.health.statusDegraded")}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-danger/30 bg-danger/10 px-2 py-0.5 text-[11px] font-semibold text-danger">
            <XCircle className="h-3 w-3" />
            {t("system.health.statusDown")}
          </span>
        );
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-white/60 bg-surface/95 p-3.5 sm:p-5 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)] transition-all duration-300 dark:border-black/60 dark:bg-card/95 animate-in fade-in slide-in-from-top-2">
      {/* Specular Rim Top Highlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 sm:inset-x-8 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent"
      />

      {/* Header Toolbar */}
      <div className="mb-3.5 flex items-center justify-between gap-2 border-b border-border/40 pb-3 dark:border-black/50">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[inset_1px_1px_2px_rgba(0,0,0,0.08)] dark:bg-primary/15">
            {activeStat === "flags" && <Cpu className="h-4 w-4 sm:h-4.5 sm:w-4.5" />}
            {activeStat === "configs" && <Settings2 className="h-4 w-4 sm:h-4.5 sm:w-4.5" />}
            {activeStat === "health" && <Server className="h-4 w-4 sm:h-4.5 sm:w-4.5" />}
            {activeStat === "latency" && <Activity className="h-4 w-4 sm:h-4.5 sm:w-4.5" />}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">
                {activeStat === "flags" && t("system.detail.flagsTitle")}
                {activeStat === "configs" && t("system.detail.configsTitle")}
                {activeStat === "health" && t("system.detail.healthTitle")}
                {activeStat === "latency" && t("system.detail.latencyTitle")}
              </h3>

              <Badge variant="outline" size="sm" className="font-mono text-[10px] sm:text-[11px] text-foreground px-2 py-0.5">
                {activeStat === "flags" && `${activeFlagsCount}/${featureFlags.length}`}
                {activeStat === "configs" && `${totalConfigs}`}
                {activeStat === "health" && `${healthyCount}/${totalServices}`}
                {activeStat === "latency" && `${avgLatency} ms`}
              </Badge>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate hidden sm:block">
              {activeStat === "flags" && t("system.detail.flagsDesc")}
              {activeStat === "configs" && t("system.detail.configsDesc")}
              {activeStat === "health" && t("system.detail.healthDesc")}
              {activeStat === "latency" && t("system.detail.latencyDesc")}
            </p>
          </div>
        </div>

        {/* Action Controls & Close */}
        <div className="flex items-center gap-1.5 shrink-0">
          {activeStat === "configs" && onCreateConfig && canManage && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCreateConfig}
              className="h-7 sm:h-8 gap-1 text-[11px] sm:text-xs text-primary hover:text-primary px-2 sm:px-3 rounded-lg"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("system.detail.addConfig")}</span>
            </Button>
          )}

          {activeStat === "health" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRefreshHealth}
              disabled={isRefreshingHealth}
              className="h-7 sm:h-8 gap-1 text-[11px] sm:text-xs px-2 sm:px-3 rounded-lg"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshingHealth ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{t("system.detail.refreshHealth")}</span>
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
            title={t("system.detail.close")}
            aria-label={t("system.detail.close")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Body for: Feature Flags */}
      {activeStat === "flags" && (
        <div className="space-y-3.5">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <div className="rounded-xl border border-border/30 bg-surface-elevated/40 p-2.5 dark:border-black/40">
              <span className="text-[10px] sm:text-xs text-muted-foreground block">
                {t("system.flags.enabled")}
              </span>
              <p className="font-mono text-base sm:text-lg font-bold text-success">
                {activeFlagsCount}
              </p>
            </div>
            <div className="rounded-xl border border-border/30 bg-surface-elevated/40 p-2.5 dark:border-black/40">
              <span className="text-[10px] sm:text-xs text-muted-foreground block">
                {t("system.flags.disabled")}
              </span>
              <p className="font-mono text-base sm:text-lg font-bold text-muted-foreground">
                {featureFlags.length - activeFlagsCount}
              </p>
            </div>
            <div className="rounded-xl border border-border/30 bg-surface-elevated/40 p-2.5 dark:border-black/40">
              <span className="text-[10px] sm:text-xs text-muted-foreground block">
                {isVietnamese ? "Cơ chế cập nhật" : "Update Mechanism"}
              </span>
              <p className="font-mono text-xs font-semibold text-primary mt-1">
                Zero-Downtime Hot Toggle
              </p>
            </div>
            <div className="rounded-xl border border-border/30 bg-surface-elevated/40 p-2.5 dark:border-black/40">
              <span className="text-[10px] sm:text-xs text-muted-foreground block">
                {isVietnamese ? "Đồng bộ bộ nhớ đệm" : "Cache Invalidation"}
              </span>
              <p className="font-mono text-xs font-semibold text-foreground mt-1">
                Redis Pub/Sub Realtime
              </p>
            </div>
          </div>

          {/* Interactive Flags List */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {featureFlags.slice(0, 4).map((flag) => {
              const isEnabled = Boolean(flag.value);
              return (
                <div
                  key={flag.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/30 bg-background/50 p-2.5 sm:p-3 dark:border-black/50 dark:bg-card/70"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-primary truncate">
                        {flag.key}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                          isEnabled
                            ? "bg-success/15 text-success"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isEnabled ? t("system.flags.enabled") : t("system.flags.disabled")}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {flag.description || "Feature flag toggle"}
                    </p>
                  </div>

                  {onToggleFlag && (
                    <button
                      type="button"
                      disabled={!canManage}
                      onClick={() => onToggleFlag(flag, !isEnabled)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-40 ${
                        isEnabled ? "bg-success" : "bg-muted"
                      }`}
                      aria-label={`Toggle ${flag.key}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                          isEnabled ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Action Jump */}
          <div className="flex justify-end pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onSelectTab("flags")}
              className="text-xs gap-1.5 text-primary hover:text-primary rounded-xl"
            >
              <span>{t("system.detail.goToTab", { tab: t("system.tabs.featureFlags") })}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Body for: System Configs */}
      {activeStat === "configs" && (
        <div className="space-y-3.5">
          {/* Categories Grid */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <div className="rounded-xl border border-border/30 bg-surface-elevated/40 p-2.5 dark:border-black/40">
              <span className="text-[10px] sm:text-xs text-muted-foreground block">GENERAL</span>
              <p className="font-mono text-base sm:text-lg font-bold text-foreground">
                {categoryStats.counts.GENERAL || 0}
              </p>
            </div>
            <div className="rounded-xl border border-danger/30 bg-danger/5 p-2.5 dark:border-danger/20">
              <span className="text-[10px] sm:text-xs text-danger font-medium block">SECURITY</span>
              <p className="font-mono text-base sm:text-lg font-bold text-danger">
                {categoryStats.counts.SECURITY || 0}
              </p>
            </div>
            <div className="rounded-xl border border-info/30 bg-info/5 p-2.5 dark:border-info/20">
              <span className="text-[10px] sm:text-xs text-info font-medium block">INTEGRATION</span>
              <p className="font-mono text-base sm:text-lg font-bold text-info">
                {categoryStats.counts.INTEGRATION || 0}
              </p>
            </div>
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-2.5 dark:border-primary/20">
              <span className="text-[10px] sm:text-xs text-primary font-medium block">FEATURE_FLAG</span>
              <p className="font-mono text-base sm:text-lg font-bold text-primary">
                {categoryStats.counts.FEATURE_FLAG || 0}
              </p>
            </div>
          </div>

          {/* Scope Summary & Quick Note */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-border/30 bg-background/50 p-3 text-xs dark:border-black/40 dark:bg-card/70">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Globe className="h-3.5 w-3.5 text-info" />
                <strong className="text-foreground">{categoryStats.publicCount}</strong> {t("system.detail.publicScope")}
              </span>
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Lock className="h-3.5 w-3.5 text-warning" />
                <strong className="text-foreground">{categoryStats.privateCount}</strong> {t("system.detail.privateScope")}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {isVietnamese
                ? "Dữ liệu được mã hóa AES-256 đối với các biến nhạy cảm."
                : "Sensitive keys are encrypted at rest with AES-256."}
            </p>
          </div>

          {/* Bottom Action Jump */}
          <div className="flex items-center justify-between pt-1">
            {onCreateConfig && canManage && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={onCreateConfig}
                className="text-xs gap-1.5 rounded-xl"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t("system.addConfig")}</span>
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onSelectTab("configs")}
              className="text-xs gap-1.5 text-primary hover:text-primary rounded-xl ml-auto"
            >
              <span>{t("system.detail.goToTab", { tab: t("system.tabs.configs") })}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Body for: Microservices Health */}
      {activeStat === "health" && (
        <div className="space-y-3.5">
          {/* Health Filter Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              type="button"
              variant={healthFilter === "ALL" ? "primary" : "outline"}
              size="sm"
              onClick={() => setHealthFilter("ALL")}
              className="h-7 text-xs rounded-lg px-2.5"
            >
              {t("system.health.filterAll", { count: services.length })}
            </Button>
            <Button
              type="button"
              variant={healthFilter === "SERVICE" ? "primary" : "outline"}
              size="sm"
              onClick={() => setHealthFilter("SERVICE")}
              className="h-7 text-xs rounded-lg px-2.5"
            >
              {t("system.health.filterServices", {
                count: services.filter((s) => (s.type || "SERVICE") === "SERVICE").length,
              })}
            </Button>
            <Button
              type="button"
              variant={healthFilter === "INFRASTRUCTURE" ? "primary" : "outline"}
              size="sm"
              onClick={() => setHealthFilter("INFRASTRUCTURE")}
              className="h-7 text-xs rounded-lg px-2.5"
            >
              {t("system.health.filterInfra", {
                count: services.filter((s) => s.type === "INFRASTRUCTURE").length,
              })}
            </Button>
          </div>

          {/* Compact Services List */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-56 overflow-y-auto pr-1">
            {filteredServices.map((svc) => (
              <div
                key={svc.serviceCode}
                className="flex items-center justify-between gap-2 rounded-xl border border-border/30 bg-background/50 p-2.5 text-xs dark:border-black/40 dark:bg-card/70"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        svc.status === "HEALTHY"
                          ? "bg-success animate-pulse"
                          : svc.status === "DEGRADED"
                          ? "bg-warning"
                          : "bg-danger"
                      }`}
                    />
                    <p className="font-semibold text-foreground truncate">{svc.name}</p>
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground block truncate">
                    {svc.serviceCode} :{svc.port}
                  </span>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  {getStatusBadge(svc.status)}
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {svc.latencyMs} ms
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-muted-foreground">
              {isVietnamese ? "Tần suất nhịp tim tự động: 30s" : "Heartbeat cycle: 30s interval"}
            </span>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onSelectTab("health")}
              className="text-xs gap-1.5 text-primary hover:text-primary rounded-xl"
            >
              <span>{t("system.detail.goToTab", { tab: t("system.tabs.health") })}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Body for: Average Latency & Platform */}
      {activeStat === "latency" && (
        <div className="space-y-3.5">
          {/* Latency Thresholds */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
            <div className="rounded-xl border border-success/30 bg-success/5 p-3 dark:border-success/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-success">
                  {t("system.detail.fastLatency")}
                </span>
                <Activity className="h-4 w-4 text-success" />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Traefik Reverse Proxy, Redis Cache, PostgreSQL Local Socket
              </p>
            </div>

            <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 dark:border-warning/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-warning">
                  {t("system.detail.moderateLatency")}
                </span>
                <Clock className="h-4 w-4 text-warning" />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Microservices REST calls, Kafka broker ACK, MinIO S3 I/O
              </p>
            </div>

            <div className="rounded-xl border border-danger/30 bg-danger/5 p-3 dark:border-danger/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-danger">
                  {t("system.detail.slowLatency")}
                </span>
                <ShieldAlert className="h-4 w-4 text-danger" />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Deep AI Model Inference, Large File Video Transcoding
              </p>
            </div>
          </div>

          {/* Infrastructure Nodes Bar */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 text-xs">
            <div className="flex items-center gap-2 rounded-xl border border-border/30 bg-surface-elevated/40 p-2.5 dark:border-black/40">
              <Database className="h-4 w-4 text-primary shrink-0" />
              <div className="truncate">
                <span className="text-muted-foreground text-[10px] block">PostgreSQL</span>
                <span className="font-mono font-semibold text-foreground">Port 5432</span>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border/30 bg-surface-elevated/40 p-2.5 dark:border-black/40">
              <Radio className="h-4 w-4 text-primary shrink-0" />
              <div className="truncate">
                <span className="text-muted-foreground text-[10px] block">Kafka Bus</span>
                <span className="font-mono font-semibold text-foreground">Port 9092</span>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border/30 bg-surface-elevated/40 p-2.5 dark:border-black/40">
              <HardDrive className="h-4 w-4 text-primary shrink-0" />
              <div className="truncate">
                <span className="text-muted-foreground text-[10px] block">MinIO S3</span>
                <span className="font-mono font-semibold text-foreground">Port 9000</span>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border/30 bg-surface-elevated/40 p-2.5 dark:border-black/40">
              <Server className="h-4 w-4 text-primary shrink-0" />
              <div className="truncate">
                <span className="text-muted-foreground text-[10px] block">Traefik</span>
                <span className="font-mono font-semibold text-foreground">Port 80/443</span>
              </div>
            </div>
          </div>

          {/* Bottom Action Jump */}
          <div className="flex justify-end pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onSelectTab("platform")}
              className="text-xs gap-1.5 text-primary hover:text-primary rounded-xl"
            >
              <span>{t("system.detail.goToTab", { tab: t("system.tabs.platform") })}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
