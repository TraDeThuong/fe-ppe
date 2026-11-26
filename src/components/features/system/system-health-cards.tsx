"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Database,
  HelpCircle,
  RefreshCw,
  Server,
  ShieldAlert,
  Wrench,
  X,
  XCircle,
} from "lucide-react";
import { NM } from "@/components/features/ai-test/nm-styles";
import { useMaintenanceStatus } from "@/hooks/maintenance";
import { useRefreshFeedback } from "@/hooks/use-refresh-feedback";
import {
  buildSystemHealthSupportReport,
  explainProbeFailure,
  formatServiceLatencyLabel,
  getServiceImpactGuidance,
} from "@/lib/system-health-guidance";
import { useLocale } from "@/providers/locale-provider";
import {
  AnimatedMetricValue,
  AnimatedNumber,
} from "@/components/ui/animated-number";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type {
  ServiceHealthItem,
  ServiceHealthStatus,
  SystemHealthReport,
} from "@/types";

type SystemStatusFilter = "ALL" | "SERVICE" | "INFRASTRUCTURE" | "ISSUES";

interface SystemHealthCardsProps {
  healthReport?: SystemHealthReport;
  isLoading?: boolean;
  isRefreshing?: boolean;
  isError?: boolean;
  isAdmin?: boolean;
  onRefresh: () => unknown;
}

const STATUS_META: Record<
  ServiceHealthStatus,
  {
    badgeClass: string;
    dotClass: string;
    barClass: string;
    icon: React.ComponentType<{ className?: string }>;
    labelKey: string;
    overallKey: string;
  }
> = {
  HEALTHY: {
    badgeClass: "border-success/30 bg-success/10 text-success",
    dotClass: "bg-success",
    barClass: "bg-success",
    icon: CheckCircle2,
    labelKey: "dashboard.systemCard.statusOk",
    overallKey: "dashboard.systemCard.healthy",
  },
  DEGRADED: {
    badgeClass: "border-warning/30 bg-warning/10 text-warning",
    dotClass: "bg-warning",
    barClass: "bg-warning",
    icon: Clock,
    labelKey: "dashboard.systemCard.statusSlow",
    overallKey: "dashboard.systemCard.degraded",
  },
  DOWN: {
    badgeClass: "border-danger/30 bg-danger/10 text-danger",
    dotClass: "bg-danger",
    barClass: "bg-danger",
    icon: XCircle,
    labelKey: "dashboard.systemCard.statusDown",
    overallKey: "dashboard.systemCard.down",
  },
};

function getLatencyWidthPercent(svc: ServiceHealthItem): number {
  if (svc.status === "DOWN") return 0;
  return Math.min(100, Math.max(10, Math.round((svc.latencyMs / 350) * 100)));
}

export function SystemHealthCards({
  healthReport: health,
  isLoading = false,
  isRefreshing = false,
  isError = false,
  isAdmin = false,
  onRefresh,
}: SystemHealthCardsProps) {
  const { t, locale } = useLocale();
  const isVi = locale === "vi-VN";
  const { data: maintenance } = useMaintenanceStatus();

  const [filter, setFilter] = useState<SystemStatusFilter>("ALL");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);

  const {
    isSpinning: isRechecking,
    isSuccess: isRecheckDone,
    lastSyncedLabel: recheckSyncedLabel,
    trigger: triggerRecheck,
  } = useRefreshFeedback({
    onRefresh,
    isRefreshing,
    hasError: isError,
  });

  const isMaintenanceActive = Boolean(maintenance?.enabled);
  const services = useMemo(() => health?.services ?? [], [health?.services]);

  const counts = useMemo(() => {
    let serviceCount = 0;
    let infraCount = 0;
    let issueCount = 0;
    for (const item of services) {
      if (item.type === "INFRASTRUCTURE") infraCount++;
      else serviceCount++;
      if (item.status !== "HEALTHY") issueCount++;
    }
    return {
      all: services.length,
      service: serviceCount,
      infra: infraCount,
      issues: issueCount,
    };
  }, [services]);

  const filteredServices = useMemo(
    () => services.filter((svc) => {
      if (filter === "SERVICE") return (svc.type ?? "SERVICE") === "SERVICE";
      if (filter === "INFRASTRUCTURE") return svc.type === "INFRASTRUCTURE";
      if (filter === "ISSUES") return svc.status !== "HEALTHY";
      return true;
    }),
    [services, filter],
  );

  const selectedService = useMemo(
    () =>
      selectedCode
        ? services.find((svc) => svc.serviceCode === selectedCode) ?? null
        : null,
    [services, selectedCode],
  );

  const issueServices = useMemo(
    () => services.filter((svc) => svc.status !== "HEALTHY"),
    [services],
  );
  const primaryIssue = issueServices[0] ?? null;
  const primaryIssueGuidance = useMemo(
    () =>
      primaryIssue
        ? getServiceImpactGuidance(primaryIssue, { isAdmin, locale })
        : null,
    [primaryIssue, isAdmin, locale],
  );
  const selectedGuidance = useMemo(
    () =>
      selectedService
        ? getServiceImpactGuidance(selectedService, { isAdmin, locale })
        : null,
    [selectedService, isAdmin, locale],
  );

  const handleCopySupportReport = async () => {
    if (!health || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }
    try {
      await navigator.clipboard.writeText(
        buildSystemHealthSupportReport(health, locale),
      );
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2500);
    } catch {
      // Ignore clipboard denial in restricted contexts.
    }
  };

  const overallMeta = STATUS_META[health?.overallStatus ?? "HEALTHY"];
  const OverallIcon = overallMeta.icon;

  const filterTabs: {
    key: SystemStatusFilter;
    label: string;
    count: number;
    tone?: "issue";
  }[] = [
    { key: "ALL", label: t("common.all") || "Tất cả", count: counts.all },
    {
      key: "SERVICE",
      label: t("system.health.typeService"),
      count: counts.service,
    },
    {
      key: "INFRASTRUCTURE",
      label: t("system.health.typeInfra"),
      count: counts.infra,
    },
    ...(counts.issues > 0
      ? [
          {
            key: "ISSUES" as const,
            label: t("dashboard.systemCard.filterIssues"),
            count: counts.issues,
            tone: "issue" as const,
          },
        ]
      : []),
  ];

  const checkedTimeLabel = useMemo(() => {
    if (!health?.checkedAt) return null;
    try {
      return new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      }).format(new Date(health.checkedAt));
    } catch {
      return null;
    }
  }, [health?.checkedAt, locale]);

  return (
<section
  aria-label={t("dashboard.systemCard.title")}
  className={`flex flex-col justify-between rounded-[26px] bg-background p-4 sm:p-5 transition-all duration-300 ${NM.chassis}`}
>
  <div className="space-y-4">
    {/* Header: Không đường kẻ ngang, tách bạch bằng hình khối lồi/lõm */}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {/* Icon Box 2 tầng: Vỏ lồi + Lõi lõm */}
        <div
          className={`flex size-11 shrink-0 items-center justify-center rounded-2xl bg-background text-primary ${NM.extruded}`}
        >
          <div
            className={`flex size-8 items-center justify-center rounded-xl bg-background ${NM.recessed}`}
          >
            <Server className="size-4.5" strokeWidth={2.3} />
          </div>
        </div>

        <div className="min-w-0">
          <h3 className="truncate text-sm font-black tracking-tight text-foreground sm:text-base">
            {t("dashboard.systemCard.title")}
          </h3>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {t("dashboard.systemCard.subtitle")}
          </p>
        </div>
      </div>

      {/* Cụm Trạng thái tổng & Nút Recheck */}
      <div className="flex flex-wrap items-center gap-2.5">
        {health && (
          <div
            className={`inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1.5 text-xs font-extrabold ${NM.recessed} ${overallMeta.badgeClass} border-0`}
          >
            <OverallIcon className="size-3.5 shrink-0" />
            <span>{t(overallMeta.overallKey)}</span>
            <span className="rounded-full bg-background px-1.5 py-0.2 font-mono text-[10px] tabular-nums opacity-90">
              <AnimatedMetricValue value={`${health.healthyCount}/${health.totalServices}`} />
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={triggerRecheck}
          disabled={isRechecking}
          aria-label={t("dashboard.systemCard.recheck")}
          title={
            recheckSyncedLabel
              ? `${t("dashboard.systemCard.recheck")} · ${recheckSyncedLabel}`
              : t("dashboard.systemCard.recheck")
          }
          className={`inline-flex h-8.5 cursor-pointer items-center gap-1.5 rounded-full bg-background px-3.5 text-[11px] font-bold transition-all disabled:opacity-50 ${NM.tactileBtn} ${
            isRecheckDone
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-foreground"
          }`}
        >
          {isRecheckDone ? (
            <Check className="size-3.5 stroke-[2.75] text-emerald-500" />
          ) : (
            <RefreshCw
              className={`size-3.5 text-primary ${isRechecking ? "animate-spin" : ""}`}
              strokeWidth={2.4}
            />
          )}
          <span>
            {isRecheckDone
              ? isVi
                ? "Đã cập nhật"
                : "Updated"
              : t("dashboard.systemCard.recheck")}
          </span>
        </button>
      </div>
    </div>

    {/* Maintenance Mode Alert Banner (Dập nổi nguyên khối, không viền) */}
    {isMaintenanceActive && (
      <div
        className={`flex items-center gap-2.5 rounded-2xl bg-warning/[0.08] p-3 text-xs text-warning ${NM.extruded}`}
      >
        <div
          className={`flex size-7 shrink-0 items-center justify-center rounded-xl bg-background ${NM.recessed}`}
        >
          <ShieldAlert className="size-4" />
        </div>
        <span className="leading-snug">
          <strong className="font-extrabold">
            {isVi ? "Bảo trì hệ thống đang bật:" : "System maintenance active:"}
          </strong>{" "}
          {maintenance?.message ||
            (isVi
              ? "Hệ thống đang trong quá trình bảo trì định kỳ."
              : "The system is undergoing scheduled maintenance.")}
        </span>
      </div>
    )}

    {/* Actionable Impact & Next-Step Banner khi có dịch vụ lỗi */}
    {primaryIssue && primaryIssueGuidance && (
      <div
        role="status"
        className={`space-y-2.5 rounded-2xl bg-danger/[0.06] p-3.5 text-xs ${NM.extruded}`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-xl bg-background text-danger ${NM.recessed}`}
          >
            <AlertTriangle className="size-4" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-extrabold text-foreground">
              {issueServices.length === 1
                ? isVi
                  ? `${primaryIssue.name} đang gián đoạn`
                  : `${primaryIssue.name} is unavailable`
                : isVi
                  ? `${issueServices.length} dịch vụ cần chú ý (ưu tiên: ${primaryIssue.name})`
                  : `${issueServices.length} services need attention (primary: ${primaryIssue.name})`}
            </p>
            <p className="leading-relaxed text-muted-foreground">
              <strong className="text-foreground/90">
                {t("dashboard.systemCard.impactTitle")}:
              </strong>{" "}
              {primaryIssueGuidance.impact}
            </p>
            <p className="leading-relaxed text-muted-foreground">
              <strong className="text-primary">
                {t("dashboard.systemCard.stillWorksTitle")}:
              </strong>{" "}
              {primaryIssueGuidance.stillWorks}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pl-0 sm:pl-10">
          <button
            type="button"
            onClick={() => setSelectedCode(primaryIssue.serviceCode)}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-background px-3 py-1 text-[11px] font-bold text-primary transition-all ${NM.tactileBtn}`}
          >
            <HelpCircle className="size-3.5" />
            <span>{t("dashboard.systemCard.showFixGuide")}</span>
          </button>

          {health && (
            <button
              type="button"
              onClick={() => void handleCopySupportReport()}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-background px-3 py-1 text-[11px] font-bold text-foreground transition-all ${NM.tactileBtn}`}
            >
              {copiedReport ? (
                <Check className="size-3.5 text-primary" />
              ) : (
                <Copy className="size-3.5 text-muted-foreground" />
              )}
              <span>
                {copiedReport
                  ? t("dashboard.systemCard.copiedReport")
                  : t("dashboard.systemCard.copyReport")}
              </span>
            </button>
          )}

          {isAdmin && primaryIssueGuidance.actionHref && (
            <Link
              href={primaryIssueGuidance.actionHref}
              className={`inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1 text-[11px] font-bold text-foreground transition-all hover:text-primary ${NM.tactileBtn}`}
            >
              <Wrench className="size-3 text-primary" />
              <span>{primaryIssueGuidance.actionLabel}</span>
            </Link>
          )}
        </div>
      </div>
    )}

    {/* Thanh Filter Pills (Recessed Track) & Gợi ý bấm kiểm tra */}
    {services.length > 0 && (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          role="tablist"
          aria-label={t("system.health.category")}
          className={`inline-flex flex-wrap items-center gap-1 rounded-2xl bg-background p-1 ${NM.recessed}`}
        >
          {filterTabs.map((tab) => {
            const active = filter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(tab.key)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold transition-all ${
                  active
                    ? `bg-background ${NM.extruded} ${
                        tab.tone === "issue"
                          ? "text-danger"
                          : "text-primary"
                      }`
                    : tab.tone === "issue"
                      ? "text-danger hover:opacity-80"
                      : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 font-mono text-[10px] font-extrabold tabular-nums ${
                    tab.tone === "issue"
                      ? "bg-danger/15 text-danger"
                      : active
                        ? "bg-primary/12 text-primary"
                        : "bg-accent text-accent-foreground"
                  }`}
                >
                  <AnimatedNumber value={tab.count} />
                </span>
              </button>
            );
          })}
        </div>

        <span className="rounded-full bg-background px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
          {t("dashboard.systemCard.inspectHint")}
        </span>
      </div>
    )}

    {/* KHU VỰC CHÍNH: Chia cột thông minh khi mở ngăn kéo chi tiết (Split-Drawer Inspector) */}
    <div
      className={
        selectedService && selectedGuidance
          ? "grid grid-cols-1 gap-3.5 lg:grid-cols-12 lg:items-start"
          : "block"
      }
    >
      {/* CỘT TRÁI (hoặc Toàn chiều rộng): Khay lõm chứa Services Health Grid */}
      <div
        className={`rounded-[20px] bg-background p-2.5 sm:p-3 ${NM.recessed} ${
          selectedService && selectedGuidance ? "lg:col-span-7" : ""
        }`}
      >
        {isLoading ? (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`flex items-center justify-between rounded-2xl bg-background p-3 ${NM.extruded}`}
              >
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-28 rounded-md" />
                  <Skeleton className="h-2.5 w-20 rounded-md" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex h-36 flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="size-6 text-warning" />
            <p className="font-medium">{t("dashboard.data.error")}</p>
            <Button
              size="sm"
              variant="ghost"
              onClick={triggerRecheck}
              disabled={isRechecking}
              className={`rounded-full bg-background px-4 text-xs font-bold text-primary ${NM.tactileBtn}`}
            >
              {t("dashboard.data.retry")}
            </Button>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-xs font-medium text-muted-foreground">
            {services.length === 0
              ? t("dashboard.kpi.noData")
              : t("system.health.noServices")}
          </div>
        ) : (
          <div
            className={`grid grid-cols-1 gap-2.5 p-1 ${
              selectedService && selectedGuidance
                ? "sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"
                : "sm:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {filteredServices.map((svc) => {
              const meta = STATUS_META[svc.status];
              const StatusIcon = meta.icon;
              const isSelected = selectedCode === svc.serviceCode;
              const isInfra = svc.type === "INFRASTRUCTURE";
              const TypeIcon = isInfra ? Database : Server;

              return (
                <button
                  key={svc.serviceCode}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() =>
                    setSelectedCode((prev) =>
                      prev === svc.serviceCode ? null : svc.serviceCode,
                    )
                  }
                  className={`group flex cursor-pointer flex-col gap-2 rounded-2xl bg-background px-3.5 py-2.5 text-left transition-all duration-200 ${
                    isSelected
                      ? `${NM.recessed} ring-1 ring-primary/40`
                      : `${NM.extruded} hover:-translate-y-0.5`
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={`flex size-6 shrink-0 items-center justify-center rounded-lg bg-background ${
                          isSelected ? NM.extruded : NM.recessed
                        }`}
                      >
                        <TypeIcon
                          className={`size-3.5 ${
                            isSelected
                              ? "text-primary"
                              : "text-muted-foreground"
                          }`}
                        />
                      </span>
                      <span
                        className={`truncate text-xs font-extrabold ${
                          isSelected ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {svc.name}
                      </span>
                    </div>

                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-background px-2 py-0.5 text-[10px] font-extrabold ${NM.recessed} ${meta.badgeClass} border-0`}
                    >
                      <StatusIcon className="size-3" />
                      <span>{t(meta.labelKey)}</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate font-mono text-[10px] font-medium text-muted-foreground">
                      {isInfra
                        ? t("system.health.typeInfra")
                        : t("system.health.typeService")}{" "}
                      · :{svc.port}
                    </span>

                    <div className="flex items-center gap-2">
                      {/* Thanh đo độ trễ khắc chìm */}
                      <div
                        className={`h-2 w-14 overflow-hidden rounded-full bg-background p-[2px] ${NM.recessed}`}
                      >
                        {svc.status !== "DOWN" && (
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${meta.barClass}`}
                            style={{
                              width: `${getLatencyWidthPercent(svc)}%`,
                            }}
                          />
                        )}
                      </div>
                      <span className="min-w-[44px] text-right font-mono text-[11px] font-extrabold tabular-nums text-foreground">
                        <AnimatedMetricValue value={formatServiceLatencyLabel(svc)} />
                      </span>
                    </div>
                  </div>

                  {svc.status !== "HEALTHY" && (
                    <p className="truncate text-[10px] font-medium text-danger/90">
                      {explainProbeFailure(svc, locale)}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* CỘT PHẢI: Ngăn kéo kiểm tra chi tiết (Interactive Click-to-Inspect Drawer) */}
      {selectedService && selectedGuidance && (
        <div
          role="region"
          aria-label={selectedService.name}
          className={`space-y-3 rounded-[20px] bg-background p-4 text-xs lg:col-span-5 ${NM.recessed}`}
        >
          {/* Header ngăn kéo */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
                <p className="truncate text-sm font-black text-foreground">
                  {selectedService.name}
                </p>
              </div>
              {isAdmin && (
                <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                  {selectedService.serviceCode} · :{selectedService.port} ·{" "}
                  {selectedService.endpoint}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSelectedCode(null)}
              aria-label="Close detail"
              className={`flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-background text-muted-foreground transition-colors hover:text-foreground ${NM.tactileBtn}`}
            >
              <X className="size-3.5" />
            </button>
          </div>

          {/* 3 Ô thông số kỹ thuật nổi lên trên ngăn kéo */}
          <div className="grid grid-cols-1 min-[400px]:grid-cols-3 gap-2 text-[11px]">
            <div className={`rounded-xl bg-background p-2.5 ${NM.extruded}`}>
              <span className="block text-[10px] font-semibold text-muted-foreground">
                {selectedService.status === "DOWN"
                  ? t("dashboard.systemCard.probeDuration")
                  : t("system.health.tableLatency")}
              </span>
              <span className="mt-0.5 block font-mono text-xs font-black text-foreground">
                {selectedService.status === "DOWN"
                  ? `${formatServiceLatencyLabel(selectedService)}`
                  : `${selectedService.latencyMs}ms`}
              </span>
            </div>

            <div className={`rounded-xl bg-background p-2.5 ${NM.extruded}`}>
              <span className="block text-[10px] font-semibold text-muted-foreground">
                {t("system.health.tableUptime")}
              </span>
              <span className="mt-0.5 block font-mono text-xs font-black text-foreground">
                {selectedService.uptime || "--"}
              </span>
            </div>

            <div className={`rounded-xl bg-background p-2.5 ${NM.extruded}`}>
              <span className="block text-[10px] font-semibold text-muted-foreground">
                {t("dashboard.systemCard.thresholdNote")}
              </span>
              <span className="mt-0.5 block truncate text-xs font-black text-primary">
                {t(STATUS_META[selectedService.status].labelKey)}
              </span>
            </div>
          </div>

          {/* Khối chẩn đoán & các bước xử lý (Không viền, nổi nhẹ) */}
          <div
            className={`space-y-2.5 rounded-2xl bg-background p-3 ${NM.extruded}`}
          >
            <p className="text-[11px] leading-relaxed text-foreground">
              <strong className="font-extrabold">
                {t("dashboard.systemCard.whyTitle")}:
              </strong>{" "}
              {selectedGuidance.why}
            </p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              <strong className="font-bold text-foreground">
                {t("dashboard.systemCard.impactTitle")}:
              </strong>{" "}
              {selectedGuidance.impact}
            </p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              <strong className="font-bold text-primary">
                {t("dashboard.systemCard.stillWorksTitle")}:
              </strong>{" "}
              {selectedGuidance.stillWorks}
            </p>

            {/* Các bước khắc phục nằm trong khay lõm mini */}
            <div className={`rounded-xl bg-background p-2.5 ${NM.recessed}`}>
              <p className="mb-1.5 text-[11px] font-extrabold text-foreground">
                {isAdmin
                  ? t("dashboard.systemCard.adminStepsTitle")
                  : t("dashboard.systemCard.nextStepsTitle")}
              </p>
              <ul className="space-y-1 text-[11px] text-muted-foreground">
                {selectedGuidance.steps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Nút hành động trong ngăn kéo */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {health && (
                <button
                  type="button"
                  onClick={() => void handleCopySupportReport()}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-background px-3 py-1.5 text-[11px] font-bold text-foreground transition-all ${NM.tactileBtn}`}
                >
                  {copiedReport ? (
                    <Check className="size-3 text-primary" />
                  ) : (
                    <Copy className="size-3 text-muted-foreground" />
                  )}
                  <span>
                    {copiedReport
                      ? t("dashboard.systemCard.copiedReport")
                      : t("dashboard.systemCard.copyReport")}
                  </span>
                </button>
              )}

              {isAdmin && selectedGuidance.actionHref && (
                <Link
                  href={selectedGuidance.actionHref}
                  className={`inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1.5 text-[11px] font-bold text-primary transition-all ${NM.tactileBtn}`}
                >
                  <span>{selectedGuidance.actionLabel}</span>
                  <ArrowRight className="size-3" />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  </div>

  {/* Card Footer */}
  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
      <div
        className={`flex size-6 items-center justify-center rounded-lg bg-background text-primary ${NM.recessed}`}
      >
        <Activity className="size-3.5" strokeWidth={2.4} />
      </div>
      <span className="font-semibold text-foreground/85 tabular-nums">
        {health ? (
          <>
            <AnimatedNumber value={health.healthyCount} />/
            <AnimatedNumber value={health.totalServices} /> · TB{" "}
            <AnimatedNumber value={Math.round(health.averageLatencyMs)} />ms
          </>
        ) : (
          "--"
        )}
      </span>
      <span className="hidden opacity-40 sm:inline">•</span>
      <span className="hidden sm:inline">
        {t("dashboard.systemCard.thresholdNote")}
      </span>
      {checkedTimeLabel && (
        <span
          className={`rounded-full bg-background px-2 py-0.5 font-mono text-[10px] font-semibold ${NM.recessed}`}
        >
          {checkedTimeLabel}
        </span>
      )}
    </div>
  </div>
</section>
  );
}
